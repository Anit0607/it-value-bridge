'use server';

import { prisma } from '@/lib/db';
import { requireRole, requireRoleWithOrg, assertVisibleInitiativeAccess } from '@/lib/authz';
import { computeTco } from '@/lib/value';
import { evaluateInvestmentGate } from '@/lib/investment';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Approving a below-threshold investment is deliberately restricted to CIO
 * (and ADMIN) — one tier above the PMO-equivalent roles that create and fund
 * initiatives day to day. A PMO manager cannot wave through their own
 * initiative's shortfall; that separation is the entire point of the control.
 */
async function requireExceptionApprover() {
  return requireRole('CIO', 'ADMIN');
}

const ApproveExceptionInput = z.object({
  justification: z.string().min(20, 'Justification must be at least 20 characters'),
});

export type ApproveExceptionInput = z.infer<typeof ApproveExceptionInput>;

/**
 * Record an approved exception for a value-generating initiative whose ROI is
 * below the organization's threshold.
 *
 * Refuses when the gate does not actually call for one — you cannot pre-approve
 * an exception against an initiative that passes, has no threshold set, or has
 * no value/cost recorded. Otherwise the exception log fills with approvals that
 * were never needed and stops meaning anything.
 *
 * Writes a NEW row every time (never updates), so re-approval after the numbers
 * move preserves the full sequence of decisions.
 */
export async function approveInvestmentException(initiativeId: string, input: ApproveExceptionInput) {
  const user = await requireExceptionApprover();
  await assertVisibleInitiativeAccess(initiativeId, user);
  const parsed = ApproveExceptionInput.parse(input);

  const initiative = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    select: {
      currentStage: true,
      investmentCategory: true,
      estimatedCostInr: true, actualCostInr: true,
      buildCostInr: true, annualRunCostInr: true, tcoHorizonYears: true,
      benefitClaims: { select: { estimatedAnnualValueInr: true } },
      organization: { select: { roiThreshold: true } },
    },
  });
  if (!initiative) throw new Error('Initiative not found');

  const valueInr = initiative.benefitClaims.reduce((s, c) => s + c.estimatedAnnualValueInr, 0);
  const tcoInr = computeTco(initiative);
  const threshold = initiative.organization?.roiThreshold ?? null;

  const gate = evaluateInvestmentGate({
    category: initiative.investmentCategory,
    valueInr,
    tcoInr,
    threshold,
  });

  if (gate.status !== 'exception_required') {
    throw new Error(`No exception is required for this initiative — ${gate.reason}`);
  }

  // gate.status === 'exception_required' guarantees roi, threshold and tcoInr
  // are all non-null — the branches above return before this point otherwise.
  await prisma.investmentException.create({
    data: {
      initiative: { connect: { id: initiativeId } },
      roiAtApproval: gate.roi!,
      thresholdAtApproval: gate.threshold!,
      valueInrAtApproval: valueInr,
      tcoInrAtApproval: tcoInr!,
      justification: parsed.justification.trim(),
      approvedBy: user.name,
      approvedByRole: user.role,
    },
  });

  await prisma.historyLog.create({
    data: {
      initiativeId,
      stage: initiative.currentStage,
      note:
        `Investment exception approved by ${user.name} (${user.role}) — ` +
        `${gate.roi!.toFixed(1)}x against a ${gate.threshold!.toFixed(1)}x minimum. ${parsed.justification.trim()}`,
      userId: user.id,
      userName: user.name,
    },
  });

  revalidatePath(`/items/${initiativeId}`);
  revalidatePath('/value');
}

const ThresholdInput = z.object({
  // null clears the threshold and deactivates the gate — a legitimate choice,
  // not an error. Never defaulted to a number.
  roiThreshold: z.number().min(0).max(100).nullable(),
});

export type SetRoiThresholdInput = z.infer<typeof ThresholdInput>;

/** Set (or clear) the organization's minimum ROI for value-generating work. */
export async function setRoiThreshold(input: SetRoiThresholdInput) {
  const user = await requireRoleWithOrg('ADMIN', 'CIO');
  const parsed = ThresholdInput.parse(input);

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { roiThreshold: parsed.roiThreshold },
  });

  revalidatePath('/admin/workspace');
  revalidatePath('/value');
}
