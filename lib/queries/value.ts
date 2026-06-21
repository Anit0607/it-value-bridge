import { prisma } from '@/lib/db';
import { fyBounds } from '@/lib/value';
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
  fyLabel: string;
  totals: {
    projected: number;
    signedOff: number;
    realized: number;
    cost: number;
    roiRatio: number; // signed-off value ÷ cost
    initiativesWithValue: number;
    signedOffCount: number;
  };
  realizedThisFy: number;
  deliveredCount: number;
  byCategory: BoardCategoryRow[];
  byOkr: BoardOkrRow[];
  byVertical: BoardVerticalRow[];
  topInitiatives: BoardInitiativeRow[];
}

/** Latest realized ₹ across a claim's measurements (max by measuredAt). */
function latestRealized(measurements: { measuredAt: Date; realizedInr: number | null }[]): number {
  if (measurements.length === 0) return 0;
  const latest = [...measurements].sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
  return latest.realizedInr ?? 0;
}

export async function getBoardSummary(): Promise<BoardSummary> {
  const { start, end, label } = fyBounds();

  const initiatives = await prisma.initiative.findMany({
    include: {
      benefitClaims: { include: { measurements: true } },
      okrLinks: { include: { okr: true } },
    },
  });

  let projected = 0;
  let signedOff = 0;
  let realized = 0;
  let cost = 0;
  let initiativesWithValue = 0;
  let signedOffCount = 0;
  let realizedThisFy = 0;
  let deliveredCount = 0;

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
    if (i.currentStage === 'CLOSED' && i.updatedAt >= start && i.updatedAt <= end) deliveredCount++;

    // per-category rollup (claim-level)
    for (const c of i.benefitClaims) {
      const row = catMap.get(c.category) ?? { category: c.category, projected: 0, signedOff: 0, count: 0 };
      row.projected += c.estimatedAnnualValueInr;
      if (i.valueSignedOff) row.signedOff += c.estimatedAnnualValueInr;
      row.count += 1;
      catMap.set(c.category, row);

      // realized within FY (measurement-level)
      for (const m of c.measurements) {
        if (m.measuredAt >= start && m.measuredAt <= end) realizedThisFy += m.realizedInr ?? 0;
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
    fyLabel: label,
    totals: {
      projected,
      signedOff,
      realized,
      cost,
      roiRatio: cost > 0 ? signedOff / cost : 0,
      initiativesWithValue,
      signedOffCount,
    },
    realizedThisFy,
    deliveredCount,
    byCategory: [...catMap.values()].sort((a, b) => b.projected - a.projected),
    byOkr: [...okrMap.values()].sort((a, b) => b.projected - a.projected),
    byVertical: [...vhMap.values()].sort((a, b) => b.projected - a.projected),
    topInitiatives: initRows.sort((a, b) => b.projected - a.projected).slice(0, 8),
  };
}
