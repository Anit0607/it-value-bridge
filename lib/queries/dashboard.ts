import { listVisibleInitiativesForUser } from '@/lib/actions/initiatives';
import { prisma } from '@/lib/db';
import type { AuthUser } from '@/lib/types';
import { ragCounts } from '@/lib/rag';
import { STAGES, type Stage, type RAG } from '@/lib/types';
import { inPeriod, onOrBeforeEnd, type Period } from '@/lib/period';
import { applyPortfolioFilters, type PortfolioFilters } from '@/lib/portfolioFilters';
import { enrichAll, type EnrichedItem } from './enrich';

const closureDate = (i: EnrichedItem) => i.history.find(h => h.stage === 'Closed')?.date ?? null;

const monthKey = (dateIso: string) => dateIso.slice(0, 7); // YYYY-MM
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });
};

/** Inclusive list of YYYY-MM keys spanning two ISO dates. */
function monthRange(fromIso: string, toIso: string): string[] {
  const keys: string[] = [];
  let [y, m] = fromIso.slice(0, 7).split('-').map(Number);
  const [toY, toM] = toIso.slice(0, 7).split('-').map(Number);
  while (y < toY || (y === toY && m <= toM)) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return keys;
}

export interface MonthlyCompletedPoint {
  month: string; // YYYY-MM
  label: string; // "Apr"
  count: number;
}

// Strategic Projects Status: formal classification = STRATEGIC (5E).
export interface StrategicProjectRow {
  id: string;
  title: string;
  currentStage: Stage;
  rag: RAG;
  goLiveDate: string;
  projectedValue: number;
  isRegulatory: boolean;
  regulatoryBody: string | null | undefined;
  owner: string;
}

export interface PortfolioFilterOptions {
  verticalHeads: string[];
  programHeads: string[];
  programManagers: string[];
  businessHeads: string[];
  businessUnits: string[];
  businessSpocs: string[];
}

export interface VhSummaryRow {
  vh: string;
  total: number;
  green: number;
  amber: number;
  red: number;
  lastUpdated: string;
}

export interface BusinessOwnershipRow {
  owner: string;
  businessUnit: string;
  total: number;
  green: number;
  amber: number;
  red: number;
  lastUpdated: string;
}

export interface CioSummary {
  items: EnrichedItem[];
  totalCount: number;
  activeCount: number;
  counts: { green: number; amber: number; red: number };
  pct: (n: number) => number;
  pipelineByStage: { stage: Stage; count: number }[];
  vhSummary: VhSummaryRow[];
  /** Business-side counterpart to vhSummary — grouped by Business Head (falling
   *  back to Business Sponsor), interim view ahead of 5E's full filter toggle. */
  businessOwnership: BusinessOwnershipRow[];
  periodLabel: string;
  /** Initiatives closed within the selected period — delivery completion,
   *  not to be confused with monthly.delivered (business-value confirmation
   *  against what was promised for the period). */
  deliveredProjects: EnrichedItem[];
  /** Closed-initiative count per calendar month, respecting the selected period. */
  completedByMonth: MonthlyCompletedPoint[];
  /** Initiatives with formal classification = Strategic, within the active
   *  portfolio filters (5E). */
  strategicProjects: StrategicProjectRow[];
  /** Distinct hierarchy values across the full org-visible set (before
   *  portfolio filters are applied) — feeds PortfolioFilterBar's dropdowns
   *  so options never shrink as filters narrow results. */
  filterOptions: PortfolioFilterOptions;
  monthly: {
    committed: EnrichedItem[];
    delivered: EnrichedItem[];
    missed: EnrichedItem[];
  };
  regulatory: EnrichedItem[];
  delays: EnrichedItem[];
}

const RAG_RANK: Record<RAG, number> = { Red: 0, Amber: 1, Green: 2 };

/** Everything the CIO dashboard needs, aggregated in one place. */
export async function getCioSummary(
  period: Period,
  user: Pick<AuthUser, 'role' | 'name' | 'verticalHead'> & { organizationId?: string | null },
  filters: PortfolioFilters = {},
): Promise<CioSummary> {
  // Org + role-hierarchy scoped (5B/5C) — the ONLY read of all initiatives.
  const items = enrichAll(await listVisibleInitiativesForUser(user));

  // Dropdown option lists reflect the full visible set, before filters are
  // applied, so choices never shrink as the user narrows the view.
  const distinct = (values: (string | null | undefined)[]) =>
    [...new Set(values.filter((v): v is string => !!v))].sort();
  const filterOptions: PortfolioFilterOptions = {
    verticalHeads: distinct(items.map(i => i.verticalHead)),
    programHeads: distinct(items.map(i => i.programHeadName)),
    programManagers: distinct(items.map(i => i.programManagerName)),
    businessHeads: distinct(items.map(i => i.businessHeadName)),
    businessUnits: distinct(items.map(i => i.businessUnit)),
    businessSpocs: distinct(items.map(i => i.businessSpoc)),
  };

  // Everything below this line is scoped by the portfolio filter bar, ON TOP
  // OF the org/role visibility above — filtering narrows an already-visible
  // set, it never widens or re-queries it (5B/5C stays intact).
  const filteredItems = applyPortfolioFilters(items, filters);

  const active = filteredItems.filter(i => i.currentStage !== 'Closed');
  const counts = ragCounts(active.map(i => i.rag));
  const total = active.length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const pipelineByStage = STAGES.map(s => ({
    stage: s,
    count: filteredItems.filter(i => i.currentStage === s).length,
  }));

  const activeVHs = [...new Set(filteredItems.map(i => i.verticalHead))].sort();
  const vhSummary: VhSummaryRow[] = activeVHs
    .map(vh => {
      const vhItems = filteredItems.filter(i => i.verticalHead === vh);
      const c = ragCounts(vhItems.map(i => i.rag));
      const lastUpdated = vhItems.map(i => i.lastUpdated).sort().reverse()[0] ?? '—';
      return { vh, total: vhItems.length, ...c, lastUpdated };
    })
    .sort((a, b) => b.red - a.red || b.amber - a.amber);

  // Business-side ownership: Business Head when set, else Business Sponsor.
  // Interim grouping ahead of 5E's full filter toggle — no new classification
  // rules, just a re-slice of the same items by who owns them on the business side.
  const businessOwner = (i: EnrichedItem) => i.businessHeadName || i.businessSponsor;
  const activeOwners = [...new Set(filteredItems.map(businessOwner))].sort();
  const businessOwnership: BusinessOwnershipRow[] = activeOwners
    .map(owner => {
      const ownerItems = filteredItems.filter(i => businessOwner(i) === owner);
      const c = ragCounts(ownerItems.map(i => i.rag));
      const lastUpdated = ownerItems.map(i => i.lastUpdated).sort().reverse()[0] ?? '—';
      const unitCounts = new Map<string, number>();
      for (const i of ownerItems) {
        const unit = i.businessUnit || '—';
        unitCounts.set(unit, (unitCounts.get(unit) ?? 0) + 1);
      }
      const businessUnit = [...unitCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { owner, businessUnit, total: ownerItems.length, ...c, lastUpdated };
    })
    .sort((a, b) => b.red - a.red || b.amber - a.amber);

  // Strategic Projects Status: formal classification = STRATEGIC (5E),
  // within the active portfolio filters. Value pulled separately since
  // Item/EnrichedItem doesn't carry benefit claims.
  const strategicItems = filteredItems.filter(i => i.classification === 'Strategic');
  const strategicValueRows = strategicItems.length
    ? await prisma.initiative.findMany({
        where: { id: { in: strategicItems.map(i => i.id) } },
        select: { id: true, benefitClaims: { select: { estimatedAnnualValueInr: true } } },
      })
    : [];
  const strategicValueById = new Map(
    strategicValueRows.map(r => [r.id, r.benefitClaims.reduce((s, b) => s + b.estimatedAnnualValueInr, 0)]),
  );
  const strategicProjects: StrategicProjectRow[] = strategicItems
    .map(item => ({ item, value: strategicValueById.get(item.id) ?? 0 }))
    .sort((a, b) => RAG_RANK[a.item.rag] - RAG_RANK[b.item.rag] || b.value - a.value)
    .map(({ item, value }) => ({
      id: item.id,
      title: item.title,
      currentStage: item.currentStage,
      rag: item.rag,
      goLiveDate: item.goLiveDate,
      projectedValue: value,
      isRegulatory: item.isRegulatory,
      regulatoryBody: item.regulatoryBody,
      owner: item.verticalHead,
    }));

  // Delivery completion: initiatives closed within the selected period,
  // regardless of when they were originally promised. Distinct from
  // "delivered" below, which is a business-value confirmation against what
  // was committed for the period.
  const deliveredProjects = filteredItems.filter(i => inPeriod(closureDate(i), period));

  // Month-wise trend of the same closed items. When the period has bounds,
  // zero-fill every month in range so the chart reads as a continuous
  // timeline; for "All time" (no bounds) fall back to the months that
  // actually have data, capped to the most recent 12 to stay readable.
  let monthKeys = period.from && period.to
    ? monthRange(period.from, period.to)
    : [...new Set(deliveredProjects.map(i => monthKey(closureDate(i)!)))].sort();
  if (!period.from || !period.to) monthKeys = monthKeys.slice(-12);
  const completedByMonth: MonthlyCompletedPoint[] = monthKeys.map(key => ({
    month: key,
    label: monthLabel(key),
    count: deliveredProjects.filter(i => monthKey(closureDate(i)!) === key).length,
  }));

  // Promised to go live in the window; delivered = closed by the window's end.
  const committed = filteredItems.filter(i => inPeriod(i.goLiveDate, period));
  const delivered = committed.filter(i => {
    const cd = closureDate(i);
    return !!cd && onOrBeforeEnd(cd, period);
  });
  const missed = committed.filter(i => {
    const cd = closureDate(i);
    return !cd || !onOrBeforeEnd(cd, period);
  });

  // Regulatory commitments, open ones first, soonest external deadline first.
  const regulatory = filteredItems
    .filter(i => i.isRegulatory)
    .sort((a, b) => {
      const ac = a.currentStage === 'Closed' ? 1 : 0;
      const bc = b.currentStage === 'Closed' ? 1 : 0;
      if (ac !== bc) return ac - bc;
      return (a.regulatoryDueDate ?? '9999').localeCompare(b.regulatoryDueDate ?? '9999');
    });

  // Delays flagged on active items, worst slip first.
  const slip = (i: EnrichedItem) => (i.etaDays < 0 ? -i.etaDays : i.staleDays);
  const delays = filteredItems
    .filter(i => i.delayed && i.currentStage !== 'Closed')
    .sort((a, b) => slip(b) - slip(a));

  return {
    items: filteredItems,
    totalCount: items.length,
    activeCount: total,
    counts,
    pct,
    pipelineByStage,
    vhSummary,
    businessOwnership,
    periodLabel: period.label,
    deliveredProjects,
    completedByMonth,
    strategicProjects,
    filterOptions,
    monthly: { committed, delivered, missed },
    regulatory,
    delays,
  };
}

export interface PmoList {
  items: EnrichedItem[];
  activeCount: number;
  counts: { green: number; amber: number; red: number };
}

/**
 * Full portfolio for the PMO dashboard. Filtering stays client-side (instant
 * UX over a small dataset) — this returns every enriched item plus headline
 * counts for the KPI cards.
 */
export async function getPmoList(
  user: Pick<AuthUser, 'role' | 'name' | 'verticalHead'> & { organizationId?: string | null },
): Promise<PmoList> {
  const items = enrichAll(await listVisibleInitiativesForUser(user));
  const active = items.filter(i => i.currentStage !== 'Closed');
  return {
    items,
    activeCount: active.length,
    counts: ragCounts(active.map(i => i.rag)),
  };
}

export interface VhItems {
  items: EnrichedItem[];
  counts: { green: number; amber: number; red: number };
}

/** Items scoped to one Vertical Head, enriched, with headline counts. */
export async function getVhItems(
  user: Pick<AuthUser, 'role' | 'name' | 'verticalHead'> & { organizationId?: string | null },
): Promise<VhItems> {
  const items = enrichAll(await listVisibleInitiativesForUser(user));
  return { items, counts: ragCounts(items.map(i => i.rag)) };
}

export interface BusinessValidations {
  items: EnrichedItem[];
  pending: EnrichedItem[];
}

/** Items where the user is Business SPOC, plus the pending-validation subset. */
export async function getBusinessValidations(
  user: Pick<AuthUser, 'role' | 'name' | 'verticalHead'> & { organizationId?: string | null },
): Promise<BusinessValidations> {
  const items = enrichAll(await listVisibleInitiativesForUser(user));
  const pending = items.filter(i => i.currentStage === 'Business Validation' && !i.validation);
  return { items, pending };
}
