'use server';

import { prisma } from '@/lib/db';
import { requireRole, requireRoleWithOrg, assertVisibleInitiativeAccess } from '@/lib/authz';
import { PMO_EQUIVALENT_ROLES, BUSINESS_EQUIVALENT_ROLES, buildInitiativeVisibilityWhere } from '@/lib/rbac';
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
    programHeadName: i.programHeadName,
    programManagerName: i.programManagerName,
    businessHeadName: i.businessHeadName,
    businessUnit: i.businessUnit,
    subBusinessUnit: i.subBusinessUnit,
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
    delayReason: i.delayReason,
    committedMonth: i.committedMonth ?? undefined,
    isRegulatory: i.isRegulatory,
    regulatoryBody: i.regulatoryBody,
    regulatoryDueDate: i.regulatoryDueDate ? iso(i.regulatoryDueDate) : null,
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

/**
 * Role-scoped, org-scoped initiative list. Use this in any page where the
 * caller's role and organization should limit what they see. See
 * buildInitiativeVisibilityWhere() (lib/rbac.ts) for the exact per-role rules.
 */
export async function listVisibleInitiativesForUser(user: {
  role: string;
  name: string;
  verticalHead?: string | null;
  organizationId?: string | null;
}): Promise<Item[]> {
  // If the user has no org context, return nothing (safe default for unlinked accounts)
  if (!user.organizationId) {
    return [];
  }

  const rows = await prisma.initiative.findMany({
    where: buildInitiativeVisibilityWhere({ ...user, organizationId: user.organizationId }),
    include: WITH_RELATIONS,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toItem);
}

/**
 * Tenant-safe single initiative fetch.
 * Adds organizationId + role-based scoping to prevent cross-tenant access via known IDs.
 * Returns null if the initiative does not belong to the user's org or is outside their scope.
 */
export async function getVisibleInitiativeItem(
  id: string,
  user: {
    role: string;
    name: string;
    verticalHead?: string | null;
    organizationId?: string | null;
  },
): Promise<Item | null> {
  // If the user has no org context, show nothing (safe default for unlinked accounts,
  // consistent with listVisibleInitiativesForUser).
  if (!user.organizationId) {
    return null;
  }

  const row = await prisma.initiative.findFirst({
    where: {
      id,
      ...buildInitiativeVisibilityWhere({ ...user, organizationId: user.organizationId }),
    },
    include: WITH_RELATIONS,
  });

  return row ? toItem(row) : null;
}

// ---- Mutations ----

const BenefitInput = z.object({
  category: z.enum(['REVENUE', 'COST_SAVING', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'EFFICIENCY', 'RISK_REDUCTION']),
  metricName: z.string().min(1, 'Benefit metric name is required'),
  unit: z.enum(['INR', 'PERCENT', 'DAYS', 'HOURS', 'COUNT', 'RATIO']),
  estimatedAnnualValueInr: z.number().min(1, 'Benefit estimated value must be greater than zero'),
  baselineValue: z.number().nullable().optional(),
  targetValue: z.number().nullable().optional(),
  narrative: z.string().default(''),
});

const CreateSchema = z.object({
  title: z.string().min(5, 'Initiative title must be at least 5 characters'),
  type: z.enum(['Change Request', 'Project']),
  verticalHead: z.string().min(1, 'IT Vertical Head is required'),
  businessSpoc: z.string().min(1, 'Business SPOC is required'),
  businessSponsor: z.string().min(1, 'Business Sponsor is required'),
  requirement: z.string().min(20, 'Requirement description must be at least 20 characters'),
  goLiveDate: z.string().min(1, 'Go-live date is required'),
  benefits: z.array(BenefitInput).min(1, 'Define at least one quantified benefit'),
  isRegulatory: z.boolean().optional(),
  regulatoryBody: z.string().optional(),
  regulatoryDueDate: z.string().optional(),
  programHeadName: z.string().optional(),
  programManagerName: z.string().optional(),
  businessHeadName: z.string().optional(),
  businessUnit: z.string().optional(),
  subBusinessUnit: z.string().optional(),
}).superRefine((data, ctx) => {
  // Go-live date must not be in the past
  const today = new Date().toISOString().slice(0, 10);
  if (data.goLiveDate && data.goLiveDate < today) {
    ctx.addIssue({ code: 'custom', path: ['goLiveDate'], message: 'Go-live date cannot be in the past' });
  }
  // Regulatory body and due date required when isRegulatory is true
  if (data.isRegulatory) {
    if (!data.regulatoryBody?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['regulatoryBody'], message: 'Regulator/body is required when compliance-mandated' });
    }
    if (!data.regulatoryDueDate) {
      ctx.addIssue({ code: 'custom', path: ['regulatoryDueDate'], message: 'Mandated due date is required when compliance-mandated' });
    }
  }
});

export type CreateInitiativeInput = z.infer<typeof CreateSchema>;

export async function createInitiative(input: CreateInitiativeInput) {
  const user = await requireRoleWithOrg(...PMO_EQUIVALENT_ROLES, 'CIO');
  const userName = user.name;
  const parsed = CreateSchema.parse(input);

  // Primary benefit = highest projected ₹ value; drives the legacy summary fields.
  const primary = [...parsed.benefits].sort(
    (a, b) => b.estimatedAnnualValueInr - a.estimatedAnnualValueInr,
  )[0];
  const totalValue = parsed.benefits.reduce((s, b) => s + b.estimatedAnnualValueInr, 0);

  const today = new Date();
  const expectedDate = new Date(Date.now() + 21 * 86_400_000);
  const okr = await prisma.okr.findFirst({
    where: { category: primary.category, active: true, organizationId: user.organizationId },
  });

  const initiative = await prisma.initiative.create({
    data: {
      title: parsed.title,
      type: parsed.type === 'Project' ? 'PROJECT' : 'CHANGE_REQUEST',
      methodology: 'WATERFALL',
      verticalHeadName: parsed.verticalHead,
      businessSpoc: parsed.businessSpoc,
      businessSponsor: parsed.businessSponsor,
      description: parsed.requirement,
      benefitCategory: primary.category,
      outcomeDescription: primary.narrative || primary.metricName,
      targetMetric: primary.metricName,
      expectedGoLiveDate: new Date(parsed.goLiveDate),
      currentStage: 'BRD',
      currentProcessGroup: 'PLANNING',
      stageStartDate: today,
      stageExpectedDate: expectedDate,
      lastUpdated: today,
      notes: '',
      delayed: false,
      estimatedCostInr: Math.round(totalValue * 0.3),
      valueSignedOff: false,
      organizationId: user.organizationId,
      isRegulatory: parsed.isRegulatory ?? false,
      regulatoryBody: parsed.isRegulatory ? (parsed.regulatoryBody?.trim() || null) : null,
      regulatoryDueDate: parsed.isRegulatory && parsed.regulatoryDueDate ? new Date(parsed.regulatoryDueDate) : null,
      programHeadName: parsed.programHeadName?.trim() || null,
      programManagerName: parsed.programManagerName?.trim() || null,
      businessHeadName: parsed.businessHeadName?.trim() || null,
      businessUnit: parsed.businessUnit?.trim() || null,
      subBusinessUnit: parsed.subBusinessUnit?.trim() || null,
      benefitClaims: {
        create: parsed.benefits.map(b => ({
          category: b.category,
          metricName: b.metricName,
          unit: b.unit,
          estimatedAnnualValueInr: b.estimatedAnnualValueInr,
          baselineValue: b.baselineValue ?? null,
          targetValue: b.targetValue ?? null,
          narrative: b.narrative,
        })),
      },
      okrLinks: okr ? { create: { okrId: okr.id } } : undefined,
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
  revalidatePath('/value');
  return initiative.id;
}

export async function advanceStage(id: string, note: string) {
  const user = await requireRole(...PMO_EQUIVALENT_ROLES, 'CIO', 'VERTICAL_HEAD');
  await assertVisibleInitiativeAccess(id, user);
  const userName = user.name;
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
  delayReason?: string,
) {
  const user = await requireRole(...PMO_EQUIVALENT_ROLES, 'CIO', 'VERTICAL_HEAD');
  await assertVisibleInitiativeAccess(id, user);
  const today = new Date();

  // Diff current state to build a meaningful audit history entry
  const current = await prisma.initiative.findUnique({
    where: { id },
    select: { delayed: true, delaySource: true, delayReason: true, notes: true, currentStage: true },
  });

  const parts: string[] = [];
  if (!current?.delayed && delayed) {
    const src = delaySource ? `: ${delaySource}` : '';
    const rsn = delayReason?.trim() ? ` — ${delayReason.trim()}` : '';
    parts.push(`Marked delayed${src}${rsn}`);
  } else if (current?.delayed && !delayed) {
    parts.push('Delay cleared');
  } else if (current?.delayed && delayed) {
    const srcChanged = current.delaySource !== (delaySource ?? null);
    const rsnChanged = (current.delayReason ?? '') !== (delayReason?.trim() ?? '');
    if (srcChanged || rsnChanged) {
      const src = delaySource ? `: ${delaySource}` : '';
      const rsn = delayReason?.trim() ? ` — ${delayReason.trim()}` : '';
      parts.push(`Delay source updated${src}${rsn}`);
    }
  }
  if (!parts.length && notes.trim() !== (current?.notes ?? '').trim()) {
    parts.push('Stage update saved');
  }
  const historyNote = parts.join('; ');

  await prisma.initiative.update({
    where: { id },
    data: {
      notes,
      delayed,
      delaySource: delayed && delaySource ? (delaySource as any) : null,
      delayReason: delayed ? (delayReason?.trim() || null) : null,
      lastUpdated: today,
      ...(historyNote && current ? {
        history: {
          create: {
            stage: current.currentStage,
            note: historyNote,
            userName: user.name,
            createdAt: today,
          },
        },
      } : {}),
    },
  });

  revalidatePath(`/items/${id}`);
  revalidatePath('/cio');
  revalidatePath('/report');
}

export async function saveValidation(id: string, validation: BusinessValidation) {
  const user = await requireRole(...BUSINESS_EQUIVALENT_ROLES, ...PMO_EQUIVALENT_ROLES, 'CIO');
  await assertVisibleInitiativeAccess(id, user);
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

// ---- Value (benefit claims + sign-off) ----

export interface ValueMeasurementView {
  id: string;
  horizonLabel: string;
  measuredAt: string;
  actualValue: number | null;
  realizedInr: number | null;
  note: string;
  recordedByName: string | null;
}

export interface InitiativeValue {
  estimatedCostInr: number | null;
  actualCostInr: number | null;
  valueSignedOff: boolean;
  valueSignOffBy: string | null;
  benefitClaims: {
    id: string;
    category: string;
    metricName: string;
    unit: string;
    estimatedAnnualValueInr: number;
    baselineValue: number | null;
    targetValue: number | null;
    narrative: string;
    measurements: ValueMeasurementView[];
  }[];
}

export async function getInitiativeValue(
  id: string,
  organizationId: string | null | undefined,
): Promise<InitiativeValue | null> {
  if (!organizationId) return null;
  const i = await prisma.initiative.findFirst({
    where: { id, organizationId },
    select: {
      estimatedCostInr: true,
      actualCostInr: true,
      valueSignedOff: true,
      valueSignOffBy: true,
      benefitClaims: {
        select: {
          id: true, category: true, metricName: true, unit: true,
          estimatedAnnualValueInr: true, baselineValue: true, targetValue: true, narrative: true,
          measurements: { orderBy: { measuredAt: 'desc' } },
        },
        orderBy: { estimatedAnnualValueInr: 'desc' },
      },
    },
  });
  if (!i) return null;
  return {
    ...i,
    benefitClaims: i.benefitClaims.map(c => ({
      ...c,
      measurements: c.measurements.map(m => ({
        id: m.id,
        horizonLabel: m.horizonLabel,
        measuredAt: m.measuredAt.toISOString().slice(0, 10),
        actualValue: m.actualValue,
        realizedInr: m.realizedInr,
        note: m.note,
        recordedByName: m.recordedByName,
      })),
    })),
  };
}

export async function signOffValue(id: string) {
  const user = await requireRole(...PMO_EQUIVALENT_ROLES, 'CIO');
  await assertVisibleInitiativeAccess(id, user);
  const today = new Date();
  const initiative = await prisma.initiative.findUnique({ where: { id }, select: { currentStage: true } });
  await prisma.initiative.update({
    where: { id },
    data: {
      valueSignedOff: true,
      valueSignOffBy: user.name,
      valueSignOffAt: today,
      history: {
        create: {
          stage: initiative?.currentStage ?? null,
          note: `Value signed off by ${user.name}`,
          userName: user.name,
          createdAt: today,
        },
      },
    },
  });
  revalidatePath(`/items/${id}`);
  revalidatePath('/value');
}

const RegulatoryInput = z.object({
  isRegulatory: z.boolean(),
  regulatoryBody: z.string().optional(),
  regulatoryDueDate: z.string().optional(),
});

export type SetRegulatoryInput = z.infer<typeof RegulatoryInput>;

// ─── Edit Initiative Metadata ────────────────────────────────────────────────
const EditSchema = z.object({
  title:           z.string().min(5,  'Title must be at least 5 characters'),
  requirement:     z.string().min(20, 'Requirement must be at least 20 characters'),
  verticalHead:    z.string().min(1,  'IT Vertical Head is required'),
  businessSpoc:    z.string().min(1,  'Business SPOC is required'),
  businessSponsor: z.string().min(1,  'Business Sponsor is required'),
  goLiveDate:      z.string().min(1,  'Go-live date is required'),
  isRegulatory:    z.boolean(),
  regulatoryBody:  z.string().optional(),
  regulatoryDueDate: z.string().optional(),
  programHeadName:    z.string().optional(),
  programManagerName: z.string().optional(),
  businessHeadName:   z.string().optional(),
  businessUnit:       z.string().optional(),
  subBusinessUnit:    z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.isRegulatory) {
    if (!data.regulatoryBody?.trim())
      ctx.addIssue({ code: 'custom', path: ['regulatoryBody'],    message: 'Regulator/body is required when compliance-mandated' });
    if (!data.regulatoryDueDate)
      ctx.addIssue({ code: 'custom', path: ['regulatoryDueDate'], message: 'Mandated due date is required when compliance-mandated' });
  }
});

export type EditInitiativeInput = z.infer<typeof EditSchema>;

export async function updateInitiative(id: string, input: EditInitiativeInput) {
  const user = await requireRole(...PMO_EQUIVALENT_ROLES, 'CIO');
  await assertVisibleInitiativeAccess(id, user);
  const parsed = EditSchema.parse(input);
  const today = new Date();

  // Fetch current values to build a field-level diff for the audit trail
  const current = await prisma.initiative.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      verticalHeadName: true,
      businessSpoc: true,
      businessSponsor: true,
      expectedGoLiveDate: true,
      isRegulatory: true,
      regulatoryBody: true,
      regulatoryDueDate: true,
      programHeadName: true,
      programManagerName: true,
      businessHeadName: true,
      businessUnit: true,
      subBusinessUnit: true,
    },
  });

  const changes: string[] = [];
  if (current) {
    const oldDate = current.expectedGoLiveDate?.toISOString().slice(0, 10) ?? '';
    const newDate = parsed.goLiveDate ?? '';

    if (current.title !== parsed.title.trim())
      changes.push(`Title updated`);
    if ((current.description ?? '') !== parsed.requirement.trim())
      changes.push(`Requirement updated`);
    if ((current.verticalHeadName ?? '') !== parsed.verticalHead)
      changes.push(`Vertical head changed from ${current.verticalHeadName} to ${parsed.verticalHead}`);
    if ((current.businessSpoc ?? '') !== parsed.businessSpoc.trim())
      changes.push(`Business SPOC changed from ${current.businessSpoc ?? '—'} to ${parsed.businessSpoc.trim()}`);
    if ((current.businessSponsor ?? '') !== parsed.businessSponsor.trim())
      changes.push(`Business sponsor changed from ${current.businessSponsor ?? '—'} to ${parsed.businessSponsor.trim()}`);
    if (oldDate !== newDate)
      changes.push(`Go-live date changed from ${oldDate || '—'} to ${newDate}`);
    if (current.isRegulatory !== parsed.isRegulatory)
      changes.push(parsed.isRegulatory ? 'Regulatory flag set to Yes' : 'Regulatory flag cleared');
    else if (parsed.isRegulatory) {
      const oldBody = current.regulatoryBody ?? '';
      const newBody = parsed.regulatoryBody?.trim() ?? '';
      const oldDue  = current.regulatoryDueDate?.toISOString().slice(0, 10) ?? '';
      const newDue  = parsed.regulatoryDueDate ?? '';
      if (oldBody !== newBody)
        changes.push(`Regulator changed from ${oldBody || '—'} to ${newBody || '—'}`);
      if (oldDue !== newDue)
        changes.push(`Regulatory due date changed from ${oldDue || '—'} to ${newDue || '—'}`);
    }

    const assignmentFields: { key: keyof typeof current; label: string; newValue: string | undefined }[] = [
      { key: 'programHeadName', label: 'Program Head', newValue: parsed.programHeadName },
      { key: 'programManagerName', label: 'Program Manager', newValue: parsed.programManagerName },
      { key: 'businessHeadName', label: 'Business Head', newValue: parsed.businessHeadName },
      { key: 'businessUnit', label: 'Business Unit', newValue: parsed.businessUnit },
      { key: 'subBusinessUnit', label: 'Sub Business Unit', newValue: parsed.subBusinessUnit },
    ];
    for (const f of assignmentFields) {
      const oldValue = (current[f.key] as string | null) ?? '';
      const trimmedNew = f.newValue?.trim() ?? '';
      if (oldValue !== trimmedNew) {
        changes.push(`${f.label} changed from ${oldValue || '—'} to ${trimmedNew || '—'}`);
      }
    }
  }
  const historyNote = changes.length > 0 ? changes.join('; ') : 'Initiative metadata updated';

  await prisma.initiative.update({
    where: { id },
    data: {
      title: parsed.title.trim(),
      description: parsed.requirement.trim(),
      verticalHeadName: parsed.verticalHead,
      businessSpoc: parsed.businessSpoc.trim(),
      businessSponsor: parsed.businessSponsor.trim(),
      expectedGoLiveDate: parsed.goLiveDate ? new Date(parsed.goLiveDate) : undefined,
      isRegulatory: parsed.isRegulatory,
      regulatoryBody: parsed.isRegulatory ? (parsed.regulatoryBody?.trim() || null) : null,
      regulatoryDueDate: parsed.isRegulatory && parsed.regulatoryDueDate ? new Date(parsed.regulatoryDueDate) : null,
      programHeadName: parsed.programHeadName?.trim() || null,
      programManagerName: parsed.programManagerName?.trim() || null,
      businessHeadName: parsed.businessHeadName?.trim() || null,
      businessUnit: parsed.businessUnit?.trim() || null,
      subBusinessUnit: parsed.subBusinessUnit?.trim() || null,
      lastUpdated: today,
      history: {
        create: { stage: null, note: historyNote, userName: user.name, createdAt: today },
      },
    },
  });

  revalidatePath(`/items/${id}`);
  revalidatePath('/pmo');
  revalidatePath('/cio');
}

export async function setRegulatory(id: string, input: SetRegulatoryInput) {
  const user = await requireRole(...PMO_EQUIVALENT_ROLES, 'CIO');
  await assertVisibleInitiativeAccess(id, user);
  const parsed = RegulatoryInput.parse(input);
  await prisma.initiative.update({
    where: { id },
    data: {
      isRegulatory: parsed.isRegulatory,
      regulatoryBody: parsed.isRegulatory ? (parsed.regulatoryBody?.trim() || null) : null,
      regulatoryDueDate:
        parsed.isRegulatory && parsed.regulatoryDueDate ? new Date(parsed.regulatoryDueDate) : null,
    },
  });
  revalidatePath(`/items/${id}`);
  revalidatePath('/cio');
  revalidatePath('/report');
}
