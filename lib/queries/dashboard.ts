import {
  listInitiativesAsItems,
  listVisibleInitiativesForUser,
  getInitiativesByVerticalHead,
  getInitiativesBySpoc,
} from '@/lib/actions/initiatives';
import type { AuthUser } from '@/lib/types';
import { ragCounts } from '@/lib/rag';
import { STAGES, type Stage } from '@/lib/types';
import { inPeriod, onOrBeforeEnd, type Period } from '@/lib/period';
import { enrichAll, type EnrichedItem } from './enrich';

const closureDate = (i: EnrichedItem) => i.history.find(h => h.stage === 'Closed')?.date ?? null;

export interface VhSummaryRow {
  vh: string;
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
  periodLabel: string;
  monthly: {
    committed: EnrichedItem[];
    delivered: EnrichedItem[];
    missed: EnrichedItem[];
  };
  regulatory: EnrichedItem[];
  delays: EnrichedItem[];
}

/** Everything the CIO dashboard needs, aggregated in one place. */
export async function getCioSummary(period: Period): Promise<CioSummary> {
  const items = enrichAll(await listInitiativesAsItems());

  const active = items.filter(i => i.currentStage !== 'Closed');
  const counts = ragCounts(active.map(i => i.rag));
  const total = active.length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const pipelineByStage = STAGES.map(s => ({
    stage: s,
    count: items.filter(i => i.currentStage === s).length,
  }));

  const activeVHs = [...new Set(items.map(i => i.verticalHead))].sort();
  const vhSummary: VhSummaryRow[] = activeVHs
    .map(vh => {
      const vhItems = items.filter(i => i.verticalHead === vh);
      const c = ragCounts(vhItems.map(i => i.rag));
      const lastUpdated = vhItems.map(i => i.lastUpdated).sort().reverse()[0] ?? '—';
      return { vh, total: vhItems.length, ...c, lastUpdated };
    })
    .sort((a, b) => b.red - a.red || b.amber - a.amber);

  // Promised to go live in the window; delivered = closed by the window's end.
  const committed = items.filter(i => inPeriod(i.goLiveDate, period));
  const delivered = committed.filter(i => {
    const cd = closureDate(i);
    return !!cd && onOrBeforeEnd(cd, period);
  });
  const missed = committed.filter(i => {
    const cd = closureDate(i);
    return !cd || !onOrBeforeEnd(cd, period);
  });

  // Regulatory commitments, open ones first, soonest external deadline first.
  const regulatory = items
    .filter(i => i.isRegulatory)
    .sort((a, b) => {
      const ac = a.currentStage === 'Closed' ? 1 : 0;
      const bc = b.currentStage === 'Closed' ? 1 : 0;
      if (ac !== bc) return ac - bc;
      return (a.regulatoryDueDate ?? '9999').localeCompare(b.regulatoryDueDate ?? '9999');
    });

  // Delays flagged on active items, worst slip first.
  const slip = (i: EnrichedItem) => (i.etaDays < 0 ? -i.etaDays : i.staleDays);
  const delays = items
    .filter(i => i.delayed && i.currentStage !== 'Closed')
    .sort((a, b) => slip(b) - slip(a));

  return {
    items,
    totalCount: items.length,
    activeCount: total,
    counts,
    pct,
    pipelineByStage,
    vhSummary,
    periodLabel: period.label,
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
export async function getPmoList(user?: Pick<AuthUser, 'role' | 'name' | 'verticalHead'>): Promise<PmoList> {
  const raw = user ? await listVisibleInitiativesForUser(user) : await listInitiativesAsItems();
  const items = enrichAll(raw);
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
export async function getVhItems(verticalHead: string): Promise<VhItems> {
  const items = enrichAll(await getInitiativesByVerticalHead(verticalHead));
  return { items, counts: ragCounts(items.map(i => i.rag)) };
}

export interface BusinessValidations {
  items: EnrichedItem[];
  pending: EnrichedItem[];
}

/** Items where the user is Business SPOC, plus the pending-validation subset. */
export async function getBusinessValidations(spocName: string): Promise<BusinessValidations> {
  const items = enrichAll(await getInitiativesBySpoc(spocName));
  const pending = items.filter(i => i.currentStage === 'Business Validation' && !i.validation);
  return { items, pending };
}
