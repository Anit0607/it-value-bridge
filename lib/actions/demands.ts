'use server';

import { prisma } from '@/lib/db';
import { requireRoleWithOrg } from '@/lib/authz';
import { PMO_EQUIVALENT_ROLES, BUSINESS_EQUIVALENT_ROLES } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getLifecycle } from '@/lib/queries/lifecycle';
import { firstStage } from '@/lib/lifecycle';
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
  // Indicative cost at intake — optional, and never defaulted. Captured here
  // so value-vs-cost can be assessed before funding; carried onto the
  // initiative on approval.
  estimatedCostInr: z.number().min(0).nullable().optional(),
  buildCostInr: z.number().min(0).nullable().optional(),
  annualRunCostInr: z.number().min(0).nullable().optional(),
  tcoHorizonYears: z.number().int().min(1).max(20).nullable().optional(),
  investmentCategory: z.enum(['VALUE_GENERATING','REGULATORY_MANDATORY','FOUNDATIONAL','STRATEGIC']).optional(),
});

export type CreateDemandInput = z.infer<typeof CreateDemandInput>;

export async function createDemand(input: CreateDemandInput) {
  const user = await requireRoleWithOrg(...PMO_EQUIVALENT_ROLES, 'CIO', ...BUSINESS_EQUIVALENT_ROLES, 'VERTICAL_HEAD');
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
      estimatedCostInr: parsed.estimatedCostInr ?? null,
      buildCostInr: parsed.buildCostInr ?? null,
      annualRunCostInr: parsed.annualRunCostInr ?? null,
      tcoHorizonYears: parsed.tcoHorizonYears ?? null,
      investmentCategory: parsed.investmentCategory ?? 'VALUE_GENERATING',
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

export async function listDemands(organizationId: string) {
  return prisma.demand.findMany({
    where: { organizationId },
    include: { benefitClaims: true, convertedInitiative: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listMyDemands(raisedByName: string, organizationId: string) {
  return prisma.demand.findMany({
    where: { raisedByName, organizationId },
    include: { benefitClaims: true, convertedInitiative: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDemand(id: string, organizationId: string) {
  return prisma.demand.findFirst({
    where: { id, organizationId },
    include: { benefitClaims: true, convertedInitiative: { select: { id: true, title: true } } },
  });
}

export async function setDemandStatus(id: string, status: DemandStatus, reviewNote: string) {
  const user = await requireRoleWithOrg(...PMO_EQUIVALENT_ROLES, 'CIO');
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
  const user = await requireRoleWithOrg(...PMO_EQUIVALENT_ROLES, 'CIO');
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

  const lifecycle = await getLifecycle(user.organizationId);
  const start = firstStage(lifecycle);
  if (!start) {
    throw new Error('This workspace has no delivery lifecycle configured. An administrator must set one up first.');
  }

  const initiative = await prisma.initiative.create({
    data: {
      title: demand.title,
      type: completion.type === 'Project' ? 'PROJECT' : 'CHANGE_REQUEST',
      // Demand approval doesn't collect classification yet — defaults to
      // TACTICAL (schema default) until the approval form gains its own
      // field. PMO can reclassify via Edit Initiative once created.
      classification: 'TACTICAL',
      methodology: 'WATERFALL',
      verticalHeadName: completion.verticalHead,
      businessSpoc: completion.businessSpoc,
      businessSponsor: completion.businessSponsor,
      description: demand.requirement,
      benefitCategory: primary.category,
      outcomeDescription: primary.narrative || primary.metricName,
      targetMetric: primary.metricName,
      expectedGoLiveDate: new Date(completion.goLiveDate),
      currentStage: start.key,
      currentProcessGroup: start.processGroup,
      stageStartDate: today,
      stageExpectedDate: expectedDate,
      lastUpdated: today,
      // Carry whatever cost the demand actually captured at intake. This used
      // to synthesise `primary value * 0.3` — the same fabricated denominator
      // M0 removed from createInitiative, which survived here on the demand
      // approval path. Null stays null: an uncosted demand becomes an uncosted
      // initiative, and the Value Board shows "not captured" rather than a guess.
      estimatedCostInr: demand.estimatedCostInr,
      buildCostInr: demand.buildCostInr,
      annualRunCostInr: demand.annualRunCostInr,
      tcoHorizonYears: demand.tcoHorizonYears,
      investmentCategory: demand.investmentCategory,
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
