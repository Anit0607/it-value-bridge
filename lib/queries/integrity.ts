import { prisma } from '@/lib/db';
import { buildInitiativeVisibilityWhere } from '@/lib/rbac';
import { findDoubleCountRisks, type DoubleCountRisk } from '@/lib/integrity';

/**
 * Read side of the M3 integrity controls (docs/ROADMAP.md).
 *
 * Everything here exists so a published number can be traced end to end:
 * who proposed it, who approved it, what it rested on, and whether it was
 * ever restated. See lib/actions/integrity.ts for the write side.
 */

export interface PendingApprovalView {
  id: string;
  kind: 'VALUE_SIGN_OFF' | 'COST_CHANGE';
  summary: string;
  materialityInr: number;
  proposedBy: string;
  proposedByRole: string;
  proposedAt: string;
}

export interface DecidedApprovalView extends PendingApprovalView {
  status: 'APPROVED' | 'REJECTED';
  decidedBy: string | null;
  decidedByRole: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

export interface RestatementView {
  id: string;
  previousValueInr: number;
  newValueInr: number;
  previousTcoInr: number | null;
  newTcoInr: number | null;
  reason: string;
  restatedBy: string;
  restatedByRole: string;
  restatedAt: string;
}

export interface InitiativeIntegrity {
  materialityThresholdInr: number | null;
  pending: PendingApprovalView[];
  decided: DecidedApprovalView[];
  restatements: RestatementView[];
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Chain of custody for one initiative. Org-scoped via the initiative itself —
 * an approval record is only readable if its initiative is.
 */
export async function getInitiativeIntegrity(
  initiativeId: string,
  organizationId: string | null | undefined,
): Promise<InitiativeIntegrity | null> {
  if (!organizationId) return null;

  const initiative = await prisma.initiative.findFirst({
    where: { id: initiativeId, organizationId },
    select: {
      organization: { select: { materialityThresholdInr: true } },
      pendingApprovals: { orderBy: { proposedAt: 'desc' } },
      valueRestatements: { orderBy: { restatedAt: 'desc' } },
    },
  });
  if (!initiative) return null;

  const base = (a: (typeof initiative.pendingApprovals)[number]): PendingApprovalView => ({
    id: a.id,
    kind: a.kind,
    summary: a.summary,
    materialityInr: a.materialityInr,
    proposedBy: a.proposedBy,
    proposedByRole: a.proposedByRole,
    proposedAt: iso(a.proposedAt),
  });

  return {
    materialityThresholdInr: initiative.organization?.materialityThresholdInr ?? null,
    pending: initiative.pendingApprovals.filter(a => a.status === 'PENDING').map(base),
    decided: initiative.pendingApprovals
      .filter(a => a.status !== 'PENDING')
      .map(a => ({
        ...base(a),
        status: a.status as 'APPROVED' | 'REJECTED',
        decidedBy: a.decidedBy,
        decidedByRole: a.decidedByRole,
        decidedAt: a.decidedAt ? iso(a.decidedAt) : null,
        decisionNote: a.decisionNote,
      })),
    restatements: initiative.valueRestatements.map(r => ({
      id: r.id,
      previousValueInr: r.previousValueInr,
      newValueInr: r.newValueInr,
      previousTcoInr: r.previousTcoInr,
      newTcoInr: r.newTcoInr,
      reason: r.reason,
      restatedBy: r.restatedBy,
      restatedByRole: r.restatedByRole,
      restatedAt: iso(r.restatedAt),
    })),
  };
}

/**
 * Portfolio-level double-count review, scoped to what this user can see.
 *
 * Deliberately computed live rather than stored: it is a review prompt, not a
 * finding. See findDoubleCountRisks() in lib/integrity.ts for what it matches on.
 */
export async function getDoubleCountRisks(user: {
  role: string;
  name: string;
  verticalHead?: string | null;
  organizationId?: string | null;
}): Promise<DoubleCountRisk[]> {
  if (!user.organizationId) return [];

  const initiatives = await prisma.initiative.findMany({
    where: buildInitiativeVisibilityWhere({ ...user, organizationId: user.organizationId }),
    select: {
      id: true,
      title: true,
      benefitClaims: { select: { category: true, metricName: true, estimatedAnnualValueInr: true } },
    },
  });

  return findDoubleCountRisks(
    initiatives.flatMap(i =>
      i.benefitClaims.map(c => ({
        initiativeId: i.id,
        initiativeTitle: i.title,
        category: c.category,
        metricName: c.metricName,
        estimatedAnnualValueInr: c.estimatedAnnualValueInr,
      })),
    ),
  );
}

export interface BoardSnapshotView {
  id: string;
  year: number;
  month: number;
  generatedAt: string;
  publishedBy: string | null;
  signedOffValueInr: number | null;
}

/** Published period snapshots — the figures the board actually saw, frozen. */
export async function listBoardSnapshots(
  organizationId: string | null | undefined,
): Promise<BoardSnapshotView[]> {
  if (!organizationId) return [];
  const rows = await prisma.monthlyReport.findMany({
    where: { organizationId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 24,
  });
  return rows.map(r => {
    const payload = (r.payload ?? {}) as {
      publishedBy?: string;
      totals?: { signedOff?: number };
    };
    return {
      id: r.id,
      year: r.year,
      month: r.month,
      generatedAt: r.generatedAt.toISOString().slice(0, 16).replace('T', ' '),
      publishedBy: payload.publishedBy ?? null,
      signedOffValueInr: payload.totals?.signedOff ?? null,
    };
  });
}
