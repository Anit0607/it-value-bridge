'use server';

import { prisma } from '@/lib/db';
import { requireRole, requireRoleWithOrg, assertVisibleInitiativeAccess } from '@/lib/authz';
import { PMO_EQUIVALENT_ROLES } from '@/lib/rbac';
import { computeTco, formatInr } from '@/lib/value';
import { isMaterial } from '@/lib/integrity';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/**
 * Integrity controls (docs/ROADMAP.md M3).
 *
 * The rule these all serve: we never claim a number is *correct* — no system
 * can guarantee a forecast was right. We claim it is **traceable, attributed
 * and auditable**: you can always see whose number it is, what it rested on,
 * who approved it, whether anyone changed it, and what it became.
 */

// ── Shared helpers ───────────────────────────────────────────────────────────

async function loadValueState(initiativeId: string) {
  const initiative = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    select: {
      currentStage: true,
      valueSignedOff: true,
      signedOffValueInr: true,
      signedOffTcoInr: true,
      estimatedCostInr: true, actualCostInr: true,
      buildCostInr: true, annualRunCostInr: true, tcoHorizonYears: true,
      benefitClaims: { select: { estimatedAnnualValueInr: true } },
      organization: { select: { materialityThresholdInr: true } },
    },
  });
  if (!initiative) throw new Error('Initiative not found');
  return {
    initiative,
    valueInr: initiative.benefitClaims.reduce((s, c) => s + c.estimatedAnnualValueInr, 0),
    tcoInr: computeTco(initiative),
    threshold: initiative.organization?.materialityThresholdInr ?? null,
  };
}

// ── Maker-checker: value sign-off ────────────────────────────────────────────

/**
 * Propose a value sign-off that is too material to take effect on one
 * signature. The initiative is NOT signed off here — a different person must
 * approve the pending record first.
 *
 * Callers should route here only when isMaterial() says to; below the
 * threshold, signOffValue() applies immediately as before.
 */
export async function proposeValueSignOff(initiativeId: string) {
  const user = await requireRole(...PMO_EQUIVALENT_ROLES, 'CIO');
  await assertVisibleInitiativeAccess(initiativeId, user);
  const { initiative, valueInr, tcoInr, threshold } = await loadValueState(initiativeId);

  if (initiative.valueSignedOff) throw new Error('Value is already signed off for this initiative.');
  if (!isMaterial(valueInr, threshold)) {
    throw new Error('This sign-off is below the materiality threshold and does not need a second approver.');
  }

  const existing = await prisma.pendingApproval.findFirst({
    where: { initiativeId, kind: 'VALUE_SIGN_OFF', status: 'PENDING' },
  });
  if (existing) throw new Error('A sign-off approval is already pending for this initiative.');

  await prisma.pendingApproval.create({
    data: {
      initiative: { connect: { id: initiativeId } },
      kind: 'VALUE_SIGN_OFF',
      payload: { valueInr, tcoInr },
      summary:
        `Sign off ${formatInr(valueInr)} projected annual value` +
        (tcoInr != null ? ` against ${formatInr(tcoInr)} total cost` : ' (cost not captured)'),
      materialityInr: valueInr,
      proposedBy: user.name,
      proposedByRole: user.role,
    },
  });

  await prisma.historyLog.create({
    data: {
      initiativeId,
      stage: initiative.currentStage,
      note: `Value sign-off proposed by ${user.name} — ${formatInr(valueInr)}, awaiting a second approver`,
      userId: user.id,
      userName: user.name,
    },
  });

  revalidatePath(`/items/${initiativeId}`);
}

const DecisionInput = z.object({
  note: z.string().optional(),
});

/**
 * Approve a pending change. The approver must be a DIFFERENT person from the
 * proposer — that comparison is the entire control, and it lives here on the
 * server rather than in a disabled button.
 */
export async function approvePendingChange(approvalId: string, input: z.infer<typeof DecisionInput> = {}) {
  const user = await requireRole(...PMO_EQUIVALENT_ROLES, 'CIO');
  const parsed = DecisionInput.parse(input);

  const approval = await prisma.pendingApproval.findUnique({ where: { id: approvalId } });
  if (!approval) throw new Error('Approval request not found');
  if (approval.status !== 'PENDING') throw new Error('This request has already been decided.');
  await assertVisibleInitiativeAccess(approval.initiativeId, user);

  // Four eyes. Compared by name because that is what is recorded on the
  // proposal; a user renaming themselves mid-flight is a far smaller risk than
  // silently allowing self-approval.
  if (approval.proposedBy === user.name) {
    throw new Error('You proposed this change — it must be approved by someone else.');
  }

  const today = new Date();
  const payload = approval.payload as { valueInr?: number; tcoInr?: number | null; cost?: Record<string, number | null> };

  if (approval.kind === 'VALUE_SIGN_OFF') {
    await prisma.initiative.update({
      where: { id: approval.initiativeId },
      data: {
        valueSignedOff: true,
        valueSignOffBy: user.name,
        valueSignOffAt: today,
        signedOffValueInr: payload.valueInr ?? 0,
        signedOffTcoInr: payload.tcoInr ?? null,
      },
    });
  } else {
    await prisma.initiative.update({
      where: { id: approval.initiativeId },
      data: {
        buildCostInr: payload.cost?.buildCostInr ?? null,
        annualRunCostInr: payload.cost?.annualRunCostInr ?? null,
        tcoHorizonYears: payload.cost?.tcoHorizonYears ?? null,
        actualCostInr: payload.cost?.actualCostInr ?? null,
        lastUpdated: today,
      },
    });
  }

  await prisma.pendingApproval.update({
    where: { id: approvalId },
    data: {
      status: 'APPROVED',
      decidedBy: user.name,
      decidedByRole: user.role,
      decidedAt: today,
      decisionNote: parsed.note?.trim() || null,
    },
  });

  await prisma.historyLog.create({
    data: {
      initiativeId: approval.initiativeId,
      note:
        `${approval.summary} — approved by ${user.name} (${user.role}), proposed by ${approval.proposedBy}` +
        (parsed.note?.trim() ? `. ${parsed.note.trim()}` : ''),
      userId: user.id,
      userName: user.name,
    },
  });

  revalidatePath(`/items/${approval.initiativeId}`);
  revalidatePath('/value');
}

/** Reject a pending change. Recorded, not deleted — a refusal is governance history. */
export async function rejectPendingChange(approvalId: string, input: z.infer<typeof DecisionInput> = {}) {
  const user = await requireRole(...PMO_EQUIVALENT_ROLES, 'CIO');
  const parsed = DecisionInput.parse(input);

  const approval = await prisma.pendingApproval.findUnique({ where: { id: approvalId } });
  if (!approval) throw new Error('Approval request not found');
  if (approval.status !== 'PENDING') throw new Error('This request has already been decided.');
  await assertVisibleInitiativeAccess(approval.initiativeId, user);
  if (approval.proposedBy === user.name) {
    throw new Error('You proposed this change — it must be decided by someone else.');
  }

  await prisma.pendingApproval.update({
    where: { id: approvalId },
    data: {
      status: 'REJECTED',
      decidedBy: user.name,
      decidedByRole: user.role,
      decidedAt: new Date(),
      decisionNote: parsed.note?.trim() || null,
    },
  });

  await prisma.historyLog.create({
    data: {
      initiativeId: approval.initiativeId,
      note:
        `${approval.summary} — REJECTED by ${user.name} (${user.role}), proposed by ${approval.proposedBy}` +
        (parsed.note?.trim() ? `. ${parsed.note.trim()}` : ''),
      userId: user.id,
      userName: user.name,
    },
  });

  revalidatePath(`/items/${approval.initiativeId}`);
}

// ── Restatement ──────────────────────────────────────────────────────────────

const RestateInput = z.object({
  reason: z.string().min(20, 'A restatement reason must be at least 20 characters'),
});

export type RestateValueInput = z.infer<typeof RestateInput>;

/**
 * Formally restate a signed-off value.
 *
 * Financial reporting does not quietly edit a published figure — it restates,
 * visibly. Once value is signed off the claim is locked; changing it means
 * recording what it was, what it became and why, then clearing the sign-off so
 * the new number has to be committed to again rather than inheriting the old
 * approval.
 */
export async function restateValue(initiativeId: string, input: RestateValueInput) {
  const user = await requireRole(...PMO_EQUIVALENT_ROLES, 'CIO');
  await assertVisibleInitiativeAccess(initiativeId, user);
  const parsed = RestateInput.parse(input);
  const { initiative, valueInr, tcoInr } = await loadValueState(initiativeId);

  if (!initiative.valueSignedOff) {
    throw new Error('This initiative has no signed-off value to restate — edit the claim directly instead.');
  }

  const previousValue = initiative.signedOffValueInr ?? 0;
  const previousTco = initiative.signedOffTcoInr ?? null;

  await prisma.valueRestatement.create({
    data: {
      initiative: { connect: { id: initiativeId } },
      previousValueInr: previousValue,
      newValueInr: valueInr,
      previousTcoInr: previousTco,
      newTcoInr: tcoInr,
      reason: parsed.reason.trim(),
      restatedBy: user.name,
      restatedByRole: user.role,
    },
  });

  // Clearing sign-off is the point: a restated figure is no longer the one that
  // was approved, so it must be signed off again on its own merits.
  await prisma.initiative.update({
    where: { id: initiativeId },
    data: {
      valueSignedOff: false,
      valueSignOffBy: null,
      valueSignOffAt: null,
      signedOffValueInr: null,
      signedOffTcoInr: null,
    },
  });

  await prisma.historyLog.create({
    data: {
      initiativeId,
      stage: initiative.currentStage,
      note:
        `Value restated by ${user.name} (${user.role}) — ${formatInr(previousValue)} → ${formatInr(valueInr)}. ` +
        `Sign-off cleared and must be re-approved. ${parsed.reason.trim()}`,
      userId: user.id,
      userName: user.name,
    },
  });

  revalidatePath(`/items/${initiativeId}`);
  revalidatePath('/value');
}

// ── Materiality configuration ────────────────────────────────────────────────

const MaterialityInput = z.object({
  materialityThresholdInr: z.number().min(0).nullable(),
});

/** Set (or clear) the ₹ level at which changes require a second approver. */
export async function setMaterialityThreshold(input: z.infer<typeof MaterialityInput>) {
  const user = await requireRoleWithOrg('ADMIN', 'CIO');
  const parsed = MaterialityInput.parse(input);

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { materialityThresholdInr: parsed.materialityThresholdInr },
  });

  revalidatePath('/admin/workspace');
}

// ── Period snapshot ──────────────────────────────────────────────────────────

/**
 * Freeze the current board figures for a period.
 *
 * If the board saw ₹231 Cr in July, that number must still be reproducible in
 * August after the underlying data has moved. Live recomputation cannot do
 * that; a stored snapshot can. Re-publishing the same period overwrites it and
 * is recorded by `generatedAt`.
 */
export async function publishBoardSnapshot(year: number, month: number) {
  const user = await requireRoleWithOrg('CIO', 'ADMIN', ...PMO_EQUIVALENT_ROLES);

  const { getBoardSummary } = await import('@/lib/queries/value');
  const { resolvePeriod } = await import('@/lib/period');
  const summary = await getBoardSummary(resolvePeriod({ period: 'all' }), user);

  // Round-tripped through JSON deliberately: this is a frozen snapshot, so it
  // must be plain data with no dependence on today's TypeScript interfaces.
  // A snapshot read back in 2028 should not need the 2026 types to make sense.
  const payload: Prisma.InputJsonValue = JSON.parse(
    JSON.stringify({
      publishedBy: user.name,
      publishedByRole: user.role,
      totals: summary.totals,
      byInvestmentCategory: summary.byInvestmentCategory,
      byCategory: summary.byCategory,
      roiThreshold: summary.roiThreshold,
      gateCounts: summary.gateCounts,
    }),
  );

  await prisma.monthlyReport.upsert({
    where: { organizationId_year_month: { organizationId: user.organizationId, year, month } },
    update: { payload, generatedAt: new Date() },
    create: { organizationId: user.organizationId, year, month, payload },
  });

  revalidatePath('/value');
}
