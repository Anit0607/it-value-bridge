'use server';

import { prisma } from '@/lib/db';
import { requireRoleWithOrg } from '@/lib/authz';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { STAGE_TO_PROCESS_GROUP } from '@/lib/stage-map';
import type { DemandStatus } from '@prisma/client';

const BenefitInput = z.object({
  category: z.enum(['REVENUE', 'COST_SAVING', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'EFFICIENCY', 'RISK_REDUCTION']),
  metricName: z.string().min(1),
  unit: z.enum(['INR', 'PERCENT', 'DAYS', 'HOURS', 'COUNT', 'RATIO']),
  baselineValue: z.number().nullable().optional(),
  targetValue: z.number().nullable().optional(),
  estimatedAnnualValueInr: z.number().min(0),
  narrative: z.string().default(''),
});

const CreateDemandInput = z.object({
  title: z.string().min(1),
  requirement: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  benefits: z.array(BenefitInput).min(1, 'Add at least one benefit'),
});

export type CreateDemandInput = z.infer<typeof CreateDemandInput>;

export async function createDemand(input: CreateDemandInput) {
  const user = await requireRoleWithOrg('PMO', 'CIO', 'BUSINESS', 'VERTICAL_HEAD');
  const parsed = CreateDemandInput.parse(input);

  const demand = await prisma.demand.create({
    data: {
      title: parsed.title,
      requirement: parsed.requirement,
      priority: parsed.priority,
      raisedByName: user.name,
      raisedById: user.id,
      status: 'RAISED',
      organizationId: user.organizationId,
      benefitClaims: {
        create: parsed.benefits.map(b => ({
          category: b.category,
          metricName: b.metricName,
          unit: b.unit,
          baselineValue: b.baselineValue ?? null,
          targetValue: b.targetValue ?? null,
          estimatedAnnualValueInr: b.estimatedAnnualValueInr,
          narrative: b.narrative,
        })),
      },
    },
  });

  revalidatePath('/demands');
  return demand.id;
}

export async function listDemands() {
  return prisma.demand.findMany({
    include: { benefitClaims: true, convertedInitiative: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listMyDemands(raisedByName: string) {
  return prisma.demand.findMany({
    where: { raisedByName },
    include: { benefitClaims: true, convertedInitiative: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDemand(id: string) {
  return prisma.demand.findUnique({
    where: { id },
    include: { benefitClaims: true, convertedInitiative: { select: { id: true, title: true } } },
  });
}

export async function setDemandStatus(id: string, status: DemandStatus, reviewNote: string) {
  const user = await requireRoleWithOrg('PMO', 'CIO');
  const { count } = await prisma.demand.updateMany({
    where: { id, organizationId: user.organizationId },
    data: { status, reviewNote },
  });
  if (count === 0) throw new Error('Demand not found in your organization');
  revalidatePath('/demands');
  revalidatePath(`/demands/${id}`);
}

const ApproveInput = z.object({
  type: z.enum(['Change Request', 'Project']),
  verticalHead: z.string().min(1),
  businessSpoc: z.string().min(1),
  businessSponsor: z.string().min(1),
  goLiveDate: z.string().min(1),
});

export type ApproveDemandInput = z.infer<typeof ApproveInput>;

export async function approveDemand(id: string, input: ApproveDemandInput) {
  const user = await requireRoleWithOrg('PMO', 'CIO');
  const completion = ApproveInput.parse(input);

  const demand = await prisma.demand.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { benefitClaims: true },
  });
  if (!demand) throw new Error('Demand not found in your organization');
  if (demand.convertedInitiativeId) throw new Error('Demand already converted');
  if (demand.benefitClaims.length === 0) throw new Error('Demand has no benefit claims');

  // Primary benefit = highest projected ₹ value.
  const primary = [...demand.benefitClaims].sort(
    (a, b) => b.estimatedAnnualValueInr - a.estimatedAnnualValueInr,
  )[0];

  const today = new Date();
  const expectedDate = new Date(Date.now() + 21 * 86_400_000);
  const okr = await prisma.okr.findFirst({
    where: { category: primary.category, active: true, organizationId: user.organizationId },
  });

  const initiative = await prisma.initiative.create({
    data: {
      title: demand.title,
      type: completion.type === 'Project' ? 'PROJECT' : 'CHANGE_REQUEST',
      methodology: 'WATERFALL',
      verticalHeadName: completion.verticalHead,
      businessSpoc: completion.businessSpoc,
      businessSponsor: completion.businessSponsor,
      description: demand.requirement,
      benefitCategory: primary.category,
      outcomeDescription: primary.narrative || primary.metricName,
      targetMetric: primary.metricName,
      expectedGoLiveDate: new Date(completion.goLiveDate),
      currentStage: 'BRD',
      currentProcessGroup: STAGE_TO_PROCESS_GROUP['BRD'],
      stageStartDate: today,
      stageExpectedDate: expectedDate,
      lastUpdated: today,
      estimatedCostInr: Math.round(primary.estimatedAnnualValueInr * 0.3),
      valueSignedOff: false,
      organizationId: user.organizationId,
      benefitClaims: {
        create: demand.benefitClaims.map(b => ({
          category: b.category,
          metricName: b.metricName,
          unit: b.unit,
          baselineValue: b.baselineValue,
          targetValue: b.targetValue,
          estimatedAnnualValueInr: b.estimatedAnnualValueInr,
          confidence: b.confidence,
          realizationHorizonMonths: b.realizationHorizonMonths,
          narrative: b.narrative,
        })),
      },
      okrLinks: okr ? { create: { okrId: okr.id } } : undefined,
      history: {
        create: {
          stage: 'BRD',
          note: `Approved from demand by ${user.name}`,
          userName: user.name,
          createdAt: today,
        },
      },
    },
  });

  await prisma.demand.update({
    where: { id },
    data: { status: 'APPROVED', convertedInitiativeId: initiative.id, reviewNote: 'Approved and converted to initiative.' },
  });

  revalidatePath('/demands');
  revalidatePath('/pmo');
  revalidatePath('/value');
  return initiative.id;
}
