import { prisma } from '@/lib/db';
import { addMonthsIso, realizationStatus, type RealizationStatus } from '@/lib/value';
import { inPeriod, type Period } from '@/lib/period';
import { buildInitiativeVisibilityWhere } from '@/lib/rbac';
import type { BenefitCategory, Stage } from '@prisma/client';

export interface BoardCategoryRow {
  category: BenefitCategory;
  projected: number;
  signedOff: number;
  count: number;
}

export interface BoardOkrRow {
  okr: string;
  owner: string;
  target: string;
  projected: number;
  count: number;
}

export interface BoardVerticalRow {
  vh: string;
  projected: number;
  count: number;
}

export interface BoardInitiativeRow {
  id: string;
  title: string;
  category: BenefitCategory;
  projected: number;
  stage: Stage;
  signedOff: boolean;
}

export interface BoardSummary {
  totals: {
    projected: number;
    signedOff: number;
    realized: number;
    cost: number;
    roiRatio: number; // signed-off value ÷ cost
    initiativesWithValue: number;
    signedOffCount: number;
  };
  periodLabel: string;
  realizedInPeriod: number;
  deliveredInPeriod: number;
  byCategory: BoardCategoryRow[];
  byOkr: BoardOkrRow[];
  byVertical: BoardVerticalRow[];
  topInitiatives: BoardInitiativeRow[];
  realization: {
    realizedCount: number;
    pendingCount: number;
    overdueCount: number;
    unconfirmedValueInr: number; // projected ₹ of live/closed items not yet confirmed
    rows: {
      id: string;
      title: string;
      status: RealizationStatus;
      dueIso: string | null;
      projected: number;
    }[];
  };
}

const LIVE_OR_CLOSED: Stage[] = ['GO_LIVE', 'BUSINESS_VALIDATION', 'CLOSED'];

/** Latest realized ₹ across a claim's measurements (max by measuredAt). */
function latestRealized(measurements: { measuredAt: Date; realizedInr: number | null }[]): number {
  if (measurements.length === 0) return 0;
  const latest = [...measurements].sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
  return latest.realizedInr ?? 0;
}

/**
 * `user` scopes every initiative this reads through the SAME
 * buildInitiativeVisibilityWhere() every dashboard uses — not just the
 * organization boundary, but role-based visibility too. This matters here:
 * /value and /report are reachable by PROGRAM_HEAD and PROGRAM_MANAGER
 * (PMO_EQUIVALENT_ROLES), and those roles must only see the value of
 * initiatives assigned to them, not the whole organization's portfolio.
 * Passing a bare organizationId would silently over-share for those two
 * roles even though it correctly excludes other organizations.
 */
export async function getBoardSummary(
  period: Period,
  user: { role: string; name: string; verticalHead?: string | null; organizationId?: string | null },
): Promise<BoardSummary> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const where = user.organizationId
    ? buildInitiativeVisibilityWhere({ ...user, organizationId: user.organizationId })
    : { organizationId: '__no_active_organization__' }; // no org context — see nothing, same safe default as listVisibleInitiativesForUser
  const initiatives = await prisma.initiative.findMany({
    where,
    include: {
      benefitClaims: { include: { measurements: true } },
      okrLinks: { include: { okr: true } },
      valueRealization: { select: { id: true } },
      history: {
        where: { stage: { in: ['GO_LIVE', 'CLOSED'] } },
        orderBy: { createdAt: 'asc' },
        select: { stage: true, createdAt: true },
      },
    },
  });

  let projected = 0;
  let signedOff = 0;
  let realized = 0;
  let cost = 0;
  let initiativesWithValue = 0;
  let signedOffCount = 0;
  let realizedInPeriod = 0;
  let deliveredInPeriod = 0;
  let realizedCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let unconfirmedValueInr = 0;
  const realizationRows: BoardSummary['realization']['rows'] = [];

  const catMap = new Map<BenefitCategory, BoardCategoryRow>();
  const okrMap = new Map<string, BoardOkrRow>();
  const vhMap = new Map<string, BoardVerticalRow>();
  const initRows: BoardInitiativeRow[] = [];

  for (const i of initiatives) {
    const initProjected = i.benefitClaims.reduce((s, c) => s + c.estimatedAnnualValueInr, 0);
    if (initProjected > 0) initiativesWithValue++;
    projected += initProjected;
    if (i.valueSignedOff) {
      signedOff += initProjected;
      signedOffCount++;
    }
    cost += i.actualCostInr ?? i.estimatedCostInr ?? 0;

    const initRealized = i.benefitClaims.reduce((s, c) => s + latestRealized(c.measurements), 0);
    realized += initRealized;
    const closedEntry = i.history.find(h => h.stage === 'CLOSED');
    const closedIso = closedEntry ? closedEntry.createdAt.toISOString().slice(0, 10) : null;
    if (i.currentStage === 'CLOSED' && inPeriod(closedIso, period)) deliveredInPeriod++;

    // Benefit-realization lifecycle (computed at render)
    const goLiveEntry = i.history.find(h => h.stage === 'GO_LIVE') ?? i.history.find(h => h.stage === 'CLOSED');
    const goLiveIso = goLiveEntry ? goLiveEntry.createdAt.toISOString().slice(0, 10) : null;
    const horizon = i.benefitClaims.length
      ? Math.min(...i.benefitClaims.map(c => c.realizationHorizonMonths))
      : 12;
    const dueIso = goLiveIso ? addMonthsIso(goLiveIso, horizon) : null;
    const confirmed =
      !!i.valueRealization || i.benefitClaims.some(c => c.measurements.some(m => m.realizedInr != null));
    const rStatus = realizationStatus({
      isLiveOrClosed: LIVE_OR_CLOSED.includes(i.currentStage),
      confirmed,
      dueIso,
      todayIso,
    });
    if (rStatus !== 'na' && initProjected > 0) {
      if (rStatus === 'realized') realizedCount++;
      else if (rStatus === 'overdue') { overdueCount++; unconfirmedValueInr += initProjected; }
      else { pendingCount++; unconfirmedValueInr += initProjected; }
      realizationRows.push({ id: i.id, title: i.title, status: rStatus, dueIso, projected: initProjected });
    }

    // per-category rollup (claim-level)
    for (const c of i.benefitClaims) {
      const row = catMap.get(c.category) ?? { category: c.category, projected: 0, signedOff: 0, count: 0 };
      row.projected += c.estimatedAnnualValueInr;
      if (i.valueSignedOff) row.signedOff += c.estimatedAnnualValueInr;
      row.count += 1;
      catMap.set(c.category, row);

      // realized within the selected period (measurement-level)
      for (const m of c.measurements) {
        if (inPeriod(m.measuredAt.toISOString().slice(0, 10), period)) realizedInPeriod += m.realizedInr ?? 0;
      }
    }

    // per-OKR rollup
    for (const link of i.okrLinks) {
      const row = okrMap.get(link.okr.id) ?? {
        okr: link.okr.name,
        owner: link.okr.owner,
        target: link.okr.targetStatement,
        projected: 0,
        count: 0,
      };
      row.projected += initProjected;
      row.count += 1;
      okrMap.set(link.okr.id, row);
    }

    // per-vertical rollup
    const vh = vhMap.get(i.verticalHeadName) ?? { vh: i.verticalHeadName, projected: 0, count: 0 };
    vh.projected += initProjected;
    vh.count += 1;
    vhMap.set(i.verticalHeadName, vh);

    if (initProjected > 0) {
      const primary = [...i.benefitClaims].sort((a, b) => b.estimatedAnnualValueInr - a.estimatedAnnualValueInr)[0];
      initRows.push({
        id: i.id,
        title: i.title,
        category: primary.category,
        projected: initProjected,
        stage: i.currentStage,
        signedOff: i.valueSignedOff,
      });
    }
  }

  return {
    periodLabel: period.label,
    totals: {
      projected,
      signedOff,
      realized,
      cost,
      roiRatio: cost > 0 ? signedOff / cost : 0,
      initiativesWithValue,
      signedOffCount,
    },
    realizedInPeriod,
    deliveredInPeriod,
    byCategory: [...catMap.values()].sort((a, b) => b.projected - a.projected),
    byOkr: [...okrMap.values()].sort((a, b) => b.projected - a.projected),
    byVertical: [...vhMap.values()].sort((a, b) => b.projected - a.projected),
    topInitiatives: initRows.sort((a, b) => b.projected - a.projected).slice(0, 8),
    realization: {
      realizedCount,
      pendingCount,
      overdueCount,
      unconfirmedValueInr,
      rows: realizationRows.sort((a, b) => {
        const order: Record<RealizationStatus, number> = { overdue: 0, pending: 1, realized: 2, na: 3 };
        return order[a.status] - order[b.status] || (a.dueIso ?? '').localeCompare(b.dueIso ?? '');
      }),
    },
  };
}
