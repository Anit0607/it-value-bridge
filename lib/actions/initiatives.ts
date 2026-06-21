'use server';

import { prisma } from '@/lib/db';
import { STAGE_LABEL, STAGE_TO_PROCESS_GROUP, nextStage } from '@/lib/stage-map';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Item, Stage, OutcomeCategory, DelaySource, BusinessValidation } from '@/lib/types';
import type { BenefitCategory, Stage as PrismaStage } from '@prisma/client';

// ---- Adapter: Prisma Initiative → UI Item type ----

type InitiativeWithRelations = Awaited<ReturnType<typeof prisma.initiative.findFirstOrThrow>> & {
  history: { stage: PrismaStage | null; createdAt: Date; userName: string; note: string }[];
  valueRealization: { outcomeAchieved: string; actualResult: string; actualMetric: string } | null;
};

function benefitToOutcome(cat: BenefitCategory): OutcomeCategory {
  const map: Record<BenefitCategory, OutcomeCategory> = {
    REVENUE: 'Revenue',
    COST_SAVING: 'Cost Saving',
    CUSTOMER_EXPERIENCE: 'Customer Experience',
    COMPLIANCE: 'Compliance',
    EFFICIENCY: 'Efficiency',
    RISK_REDUCTION: 'Risk Reduction',
  };
  return map[cat];
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toItem(i: InitiativeWithRelations): Item {
  return {
    id: i.id,
    title: i.title,
    type: i.type === 'PROJECT' ? 'Project' : 'Change Request',
    verticalHead: i.verticalHeadName,
    businessSpoc: i.businessSpoc,
    businessSponsor: i.businessSponsor,
    requirement: i.description,
    outcomeCategory: benefitToOutcome(i.benefitCategory),
    outcomeDescription: i.outcomeDescription,
    targetMetric: i.targetMetric,
    goLiveDate: iso(i.expectedGoLiveDate),
    currentStage: STAGE_LABEL[i.currentStage] as Stage,
    stageStartDate: iso(i.stageStartDate),
    stageExpectedDate: iso(i.stageExpectedDate),
    lastUpdated: iso(i.lastUpdated),
    notes: i.notes,
    delayed: i.delayed,
    delaySource: i.delaySource as DelaySource | undefined,
    committedMonth: i.committedMonth ?? undefined,
    validation: i.valueRealization
      ? {
          outcomeAchieved:
            i.valueRealization.outcomeAchieved === 'YES'
              ? 'Yes'
              : i.valueRealization.outcomeAchieved === 'PARTIALLY'
                ? 'Partially'
                : 'No',
          actualResult: i.valueRealization.actualResult,
          actualMetric: i.valueRealization.actualMetric,
        }
      : undefined,
    history: i.history
      .filter(h => h.stage !== null)
      .map(h => ({
        stage: STAGE_LABEL[h.stage!] as Stage,
        date: iso(h.createdAt),
        user: h.userName,
        note: h.note,
      })),
    createdAt: iso(i.createdAt),
  };
}

const WITH_RELATIONS = {
  history: { orderBy: { createdAt: 'asc' as const } },
  valueRealization: true,
};

// ---- Queries ----

export async function listInitiativesAsItems(): Promise<Item[]> {
  const rows = await prisma.initiative.findMany({
    include: WITH_RELATIONS,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toItem);
}

export async function getInitiativeItem(id: string): Promise<Item | null> {
  const row = await prisma.initiative.findUnique({
    where: { id },
    include: WITH_RELATIONS,
  });
  return row ? toItem(row) : null;
}

export async function getInitiativesByVerticalHead(verticalHead: string): Promise<Item[]> {
  const rows = await prisma.initiative.findMany({
    where: { verticalHeadName: verticalHead },
    include: WITH_RELATIONS,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toItem);
}

export async function getInitiativesBySpoc(spocName: string): Promise<Item[]> {
  const rows = await prisma.initiative.findMany({
    where: { businessSpoc: spocName },
    include: WITH_RELATIONS,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toItem);
}

// ---- Mutations ----

const CreateSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['Change Request', 'Project']),
  verticalHead: z.string().min(1),
  businessSpoc: z.string().min(1),
  businessSponsor: z.string().min(1),
  requirement: z.string().min(1),
  outcomeCategory: z.enum(['Revenue', 'Cost Saving', 'Customer Experience', 'Compliance', 'Efficiency', 'Risk Reduction']),
  outcomeDescription: z.string().min(1),
  targetMetric: z.string().min(1),
  goLiveDate: z.string().min(1),
});

const OUTCOME_TO_BENEFIT: Record<string, BenefitCategory> = {
  Revenue: 'REVENUE',
  'Cost Saving': 'COST_SAVING',
  'Customer Experience': 'CUSTOMER_EXPERIENCE',
  Compliance: 'COMPLIANCE',
  Efficiency: 'EFFICIENCY',
  'Risk Reduction': 'RISK_REDUCTION',
};

export async function createInitiative(userName: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateSchema.parse(raw);

  const today = new Date();
  const expectedDate = new Date(Date.now() + 21 * 86_400_000);

  const initiative = await prisma.initiative.create({
    data: {
      title: parsed.title,
      type: parsed.type === 'Project' ? 'PROJECT' : 'CHANGE_REQUEST',
      methodology: 'WATERFALL',
      verticalHeadName: parsed.verticalHead,
      businessSpoc: parsed.businessSpoc,
      businessSponsor: parsed.businessSponsor,
      description: parsed.requirement,
      benefitCategory: OUTCOME_TO_BENEFIT[parsed.outcomeCategory],
      outcomeDescription: parsed.outcomeDescription,
      targetMetric: parsed.targetMetric,
      expectedGoLiveDate: new Date(parsed.goLiveDate),
      currentStage: 'BRD',
      currentProcessGroup: 'PLANNING',
      stageStartDate: today,
      stageExpectedDate: expectedDate,
      lastUpdated: today,
      notes: '',
      delayed: false,
      history: {
        create: {
          stage: 'BRD',
          note: 'Item created',
          userName,
          createdAt: today,
        },
      },
    },
  });

  revalidatePath('/pmo');
  revalidatePath('/cio');
  return initiative.id;
}

export async function advanceStage(id: string, note: string, userName: string) {
  const initiative = await prisma.initiative.findUnique({ where: { id } });
  if (!initiative) throw new Error('Initiative not found');

  const next = nextStage(initiative.currentStage);
  if (!next) return;

  const today = new Date();
  const nextExpected = new Date(Date.now() + 14 * 86_400_000);

  await prisma.initiative.update({
    where: { id },
    data: {
      currentStage: next,
      currentProcessGroup: STAGE_TO_PROCESS_GROUP[next],
      stageStartDate: today,
      stageExpectedDate: nextExpected,
      lastUpdated: today,
      notes: '',
      delayed: false,
      delaySource: null,
      history: {
        create: {
          stage: next,
          note: note || `Moved to ${STAGE_LABEL[next]}`,
          userName,
          createdAt: today,
        },
      },
    },
  });

  revalidatePath(`/items/${id}`);
  revalidatePath('/pmo');
  revalidatePath('/cio');
}

export async function updateNotes(
  id: string,
  notes: string,
  delayed: boolean,
  delaySource: string | undefined,
  userName: string,
) {
  const today = new Date();
  await prisma.initiative.update({
    where: { id },
    data: {
      notes,
      delayed,
      delaySource: delayed && delaySource ? (delaySource as any) : null,
      lastUpdated: today,
    },
  });

  revalidatePath(`/items/${id}`);
}

export async function saveValidation(id: string, validation: BusinessValidation, _userName: string) {
  const initiative = await prisma.initiative.findUnique({ where: { id } });
  if (!initiative || initiative.currentStage !== 'BUSINESS_VALIDATION') {
    throw new Error('Item not in Business Validation stage');
  }

  const outcomeMap: Record<string, 'YES' | 'PARTIALLY' | 'NO'> = {
    Yes: 'YES',
    Partially: 'PARTIALLY',
    No: 'NO',
  };

  await prisma.businessValueRealization.upsert({
    where: { initiativeId: id },
    update: {
      outcomeAchieved: outcomeMap[validation.outcomeAchieved],
      actualResult: validation.actualResult,
      actualMetric: validation.actualMetric,
    },
    create: {
      initiativeId: id,
      outcomeAchieved: outcomeMap[validation.outcomeAchieved],
      actualResult: validation.actualResult,
      actualMetric: validation.actualMetric,
    },
  });

  revalidatePath(`/items/${id}`);
  revalidatePath('/business');
}
