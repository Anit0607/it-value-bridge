'use server';

import { prisma } from '@/lib/db';
import { requireRoleWithOrg } from '@/lib/authz';
import { PMO_EQUIVALENT_ROLES, buildInitiativeVisibilityWhere } from '@/lib/rbac';
import { STAGE_TO_PROCESS_GROUP } from '@/lib/stage-map';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Stage } from '@prisma/client';

const RowInput = z.object({
  title: z.string().min(1),
  requirement: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  category: z.enum(['REVENUE', 'COST_SAVING', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'EFFICIENCY', 'RISK_REDUCTION']),
  metricName: z.string().min(1),
  estimatedAnnualValueInr: z.number().min(0),
});

const ImportInput = z.array(RowInput).min(1);

export type ImportRow = z.infer<typeof RowInput>;

/** Bulk-create demands from an uploaded (Jira/Excel) export. Air-gapped: the
 *  file is parsed in the browser; only validated rows are sent here. */
export async function importDemands(rows: ImportRow[]): Promise<{ created: number }> {
  const user = await requireRoleWithOrg(...PMO_EQUIVALENT_ROLES, 'CIO');
  const parsed = ImportInput.parse(rows);

  await prisma.$transaction(
    parsed.map(r =>
      prisma.demand.create({
        data: {
          title: r.title,
          requirement: r.requirement,
          priority: r.priority,
          raisedByName: user.name,
          raisedById: user.id,
          status: 'RAISED',
          reviewNote: 'Imported from file',
          organizationId: user.organizationId,
          benefitClaims: {
            create: {
              category: r.category,
              metricName: r.metricName,
              unit: 'INR',
              estimatedAnnualValueInr: r.estimatedAnnualValueInr,
            },
          },
        },
      }),
    ),
  );

  revalidatePath('/demands');
  revalidatePath('/value');
  return { created: parsed.length };
}

/**
 * The set of initiatives the caller may attach imported records to — the
 * SAME buildInitiativeVisibilityWhere() every dashboard uses, not just an
 * organization filter. A Program Manager importing milestones/value claims/
 * validations must only be able to link them to their own assigned
 * initiatives, exactly as if they'd created them one at a time through the
 * normal UI.
 */
async function visibleInitiativesForImport(): Promise<{ id: string; title: string }[]> {
  const user = await requireRoleWithOrg(...PMO_EQUIVALENT_ROLES, 'CIO');
  return prisma.initiative.findMany({
    where: buildInitiativeVisibilityWhere(user),
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });
}

/** Lightweight {id, title} list for the Milestones/Value Claims/Validations
 *  tabs to resolve an "initiative_title" CSV column against, client-side,
 *  during preview — before anything is submitted. */
export async function listImportableInitiatives(): Promise<{ id: string; title: string }[]> {
  return visibleInitiativesForImport();
}

/** Re-derives the caller's visible initiative id set server-side and
 *  rejects any submitted initiativeId outside it — defense in depth so a
 *  buggy or tampered client can never attach a record to an initiative the
 *  caller isn't allowed to touch, even though the same check already ran
 *  client-side during preview. */
async function assertAllVisible(initiativeIds: string[]): Promise<void> {
  const visible = await visibleInitiativesForImport();
  const visibleIds = new Set(visible.map(v => v.id));
  for (const id of initiativeIds) {
    if (!visibleIds.has(id)) throw new Error('One or more rows reference an initiative you cannot access.');
  }
}

// ── Initiatives ──────────────────────────────────────────────────────────────

const STAGE_VALUES = ['BRD', 'FSD', 'COMMERCIAL', 'DEVELOPMENT', 'SIT', 'UAT', 'APPSEC', 'CAB_APPROVAL', 'GO_LIVE', 'BUSINESS_VALIDATION', 'CLOSED'] as const;

const InitiativeRowInput = z.object({
  title: z.string().min(1),
  type: z.enum(['CHANGE_REQUEST', 'PROJECT']),
  classification: z.enum(['STRATEGIC', 'MAJOR_PROJECT', 'TACTICAL', 'BAU']),
  currentStage: z.enum(STAGE_VALUES),
  verticalHeadName: z.string().min(1),
  businessSpoc: z.string().min(1),
  businessSponsor: z.string().min(1),
  expectedGoLiveDate: z.coerce.date(),
  benefitCategory: z.enum(['REVENUE', 'COST_SAVING', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'EFFICIENCY', 'RISK_REDUCTION']),
  outcomeDescription: z.string().min(1),
  targetMetric: z.string().min(1),
  programHeadName: z.string().optional(),
  programManagerName: z.string().optional(),
  businessHeadName: z.string().optional(),
  businessUnit: z.string().optional(),
  subBusinessUnit: z.string().optional(),
  isRegulatory: z.boolean().optional(),
  regulatoryBody: z.string().optional(),
  regulatoryDueDate: z.coerce.date().optional(),
  delayed: z.boolean().optional(),
  delaySource: z.enum(['IT', 'BUSINESS', 'VENDOR', 'EXTERNAL']).optional(),
  delayReason: z.string().optional(),
  // Cost — optional. Absent means "not captured"; never defaulted to 0.
  buildCostInr: z.number().min(0).optional(),
  annualRunCostInr: z.number().min(0).optional(),
  tcoHorizonYears: z.number().int().min(1).max(20).optional(),
  investmentCategory: z.enum(['VALUE_GENERATING','REGULATORY_MANDATORY','FOUNDATIONAL','STRATEGIC']).optional(),
});

export type InitiativeImportRow = z.infer<typeof InitiativeRowInput>;

/** Bulk-create initiatives at whatever stage the client's own system says
 *  they're already at — unlike the guided New Initiative form (which always
 *  starts a fresh initiative at BRD), a real portfolio migration is bringing
 *  in initiatives already mid-flight. Each import also gets one HistoryLog
 *  entry and one WaterfallStage row for its current stage so the audit
 *  trail and governance funnel have something honest to show — it does NOT
 *  fabricate the earlier BRD → ... → currentStage history, since that data
 *  isn't part of this import. */
export async function importInitiatives(rows: InitiativeImportRow[]): Promise<{ created: number }> {
  const user = await requireRoleWithOrg(...PMO_EQUIVALENT_ROLES, 'CIO');
  const parsed = z.array(InitiativeRowInput).min(1).parse(rows);
  const today = new Date();

  await prisma.$transaction(
    parsed.map(r => {
      const processGroup = STAGE_TO_PROCESS_GROUP[r.currentStage as Stage];
      const stageExpectedDate = r.expectedGoLiveDate > today ? r.expectedGoLiveDate : new Date(today.getTime() + 21 * 86_400_000);
      return prisma.initiative.create({
        data: {
          title: r.title,
          type: r.type,
          classification: r.classification,
          methodology: 'WATERFALL',
          verticalHeadName: r.verticalHeadName,
          businessSpoc: r.businessSpoc,
          businessSponsor: r.businessSponsor,
          description: r.outcomeDescription,
          benefitCategory: r.benefitCategory,
          outcomeDescription: r.outcomeDescription,
          targetMetric: r.targetMetric,
          expectedGoLiveDate: r.expectedGoLiveDate,
          currentStage: r.currentStage,
          currentProcessGroup: processGroup,
          stageStartDate: today,
          stageExpectedDate,
          lastUpdated: today,
          notes: 'Imported via Client Data Import.',
          delayed: r.delayed ?? false,
          delaySource: r.delayed ? r.delaySource : null,
          delayReason: r.delayed ? (r.delayReason ?? null) : null,
          isRegulatory: r.isRegulatory ?? false,
          regulatoryBody: r.isRegulatory ? (r.regulatoryBody ?? null) : null,
          regulatoryDueDate: r.isRegulatory && r.regulatoryDueDate ? r.regulatoryDueDate : null,
          programHeadName: r.programHeadName || null,
          programManagerName: r.programManagerName || null,
          businessHeadName: r.businessHeadName || null,
          businessUnit: r.businessUnit || null,
          subBusinessUnit: r.subBusinessUnit || null,
          buildCostInr: r.buildCostInr ?? null,
          annualRunCostInr: r.annualRunCostInr ?? null,
          tcoHorizonYears: r.tcoHorizonYears ?? null,
          investmentCategory: r.investmentCategory ?? 'VALUE_GENERATING',
          organizationId: user.organizationId,
          history: {
            create: { stage: r.currentStage, note: 'Imported via Client Data Import.', userId: user.id, userName: user.name },
          },
          stages: {
            create: { stage: r.currentStage, processGroup, expectedDate: stageExpectedDate, startedDate: today },
          },
        },
      });
    }),
  );

  revalidatePath('/pmo');
  revalidatePath('/cio');
  revalidatePath('/value');
  revalidatePath('/report');
  return { created: parsed.length };
}

// ── Milestones ───────────────────────────────────────────────────────────────

const MilestoneRowInput = z.object({
  initiativeId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  owner: z.string().min(1),
  ownerRole: z.enum(['PMO', 'IT', 'BUSINESS', 'VENDOR']).optional(),
  dueDate: z.coerce.date(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED']).optional(),
});

export type MilestoneImportRow = z.infer<typeof MilestoneRowInput>;

/** Bulk-create milestones against EXISTING initiatives, resolved by title to
 *  an id client-side during preview. `status: COMPLETED` is allowed here
 *  even though completeMilestone() is normally the only path to that status
 *  (see the Milestone model comment) — a data migration bringing in
 *  already-completed historical checkpoints is a deliberate, one-time
 *  exception, not a new way to complete a milestone going forward. */
export async function importMilestones(rows: MilestoneImportRow[]): Promise<{ created: number }> {
  await requireRoleWithOrg(...PMO_EQUIVALENT_ROLES, 'CIO');
  const parsed = z.array(MilestoneRowInput).min(1).parse(rows);
  await assertAllVisible(parsed.map(r => r.initiativeId));

  await prisma.$transaction(
    parsed.map(r =>
      prisma.milestone.create({
        data: {
          initiativeId: r.initiativeId,
          title: r.title,
          description: r.description || null,
          owner: r.owner,
          ownerRole: r.ownerRole,
          dueDate: r.dueDate,
          status: r.status ?? 'NOT_STARTED',
          completedAt: r.status === 'COMPLETED' ? r.dueDate : null,
        },
      }),
    ),
  );

  revalidatePath('/pmo');
  revalidatePath('/cio');
  return { created: parsed.length };
}

// ── Value Claims ─────────────────────────────────────────────────────────────

const ValueClaimRowInput = z.object({
  initiativeId: z.string().min(1),
  category: z.enum(['REVENUE', 'COST_SAVING', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'EFFICIENCY', 'RISK_REDUCTION']),
  metricName: z.string().min(1),
  baselineValue: z.number().optional(),
  targetValue: z.number().optional(),
  unit: z.enum(['INR', 'PERCENT', 'DAYS', 'HOURS', 'COUNT', 'RATIO']).optional(),
  estimatedAnnualValueInr: z.number().min(0),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  realizationHorizonMonths: z.number().int().min(1).optional(),
});

export type ValueClaimImportRow = z.infer<typeof ValueClaimRowInput>;

/** Bulk-create benefit claims against existing initiatives. */
export async function importValueClaims(rows: ValueClaimImportRow[]): Promise<{ created: number }> {
  await requireRoleWithOrg(...PMO_EQUIVALENT_ROLES, 'CIO');
  const parsed = z.array(ValueClaimRowInput).min(1).parse(rows);
  await assertAllVisible(parsed.map(r => r.initiativeId));

  await prisma.$transaction(
    parsed.map(r =>
      prisma.benefitClaim.create({
        data: {
          initiativeId: r.initiativeId,
          category: r.category,
          metricName: r.metricName,
          baselineValue: r.baselineValue ?? null,
          targetValue: r.targetValue ?? null,
          unit: r.unit ?? 'INR',
          estimatedAnnualValueInr: r.estimatedAnnualValueInr,
          confidence: r.confidence ?? 'MEDIUM',
          realizationHorizonMonths: r.realizationHorizonMonths ?? 12,
        },
      }),
    ),
  );

  revalidatePath('/value');
  revalidatePath('/report');
  return { created: parsed.length };
}

// ── Business Validations ─────────────────────────────────────────────────────

const ValidationRowInput = z.object({
  initiativeId: z.string().min(1),
  outcomeAchieved: z.enum(['YES', 'PARTIALLY', 'NO']),
  actualResult: z.string().min(1),
  actualMetric: z.string().min(1),
  realizedDate: z.coerce.date().optional(),
});

export type ValidationImportRow = z.infer<typeof ValidationRowInput>;

/** Bulk-upsert business validations — one per initiative (1:1), so a second
 *  row for the same initiative replaces rather than duplicates. Meant for
 *  closed/delivered initiatives, but not schema-enforced against stage:
 *  that's a usage convention, not a technical restriction. */
export async function importValidations(rows: ValidationImportRow[]): Promise<{ created: number }> {
  await requireRoleWithOrg(...PMO_EQUIVALENT_ROLES, 'CIO');
  const parsed = z.array(ValidationRowInput).min(1).parse(rows);
  await assertAllVisible(parsed.map(r => r.initiativeId));

  await prisma.$transaction(
    parsed.map(r =>
      prisma.businessValueRealization.upsert({
        where: { initiativeId: r.initiativeId },
        update: {
          outcomeAchieved: r.outcomeAchieved,
          actualResult: r.actualResult,
          actualMetric: r.actualMetric,
          realizedDate: r.realizedDate ?? null,
        },
        create: {
          initiativeId: r.initiativeId,
          outcomeAchieved: r.outcomeAchieved,
          actualResult: r.actualResult,
          actualMetric: r.actualMetric,
          realizedDate: r.realizedDate ?? null,
        },
      }),
    ),
  );

  revalidatePath('/value');
  revalidatePath('/report');
  revalidatePath('/business');
  return { created: parsed.length };
}
