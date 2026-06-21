import {
  listInitiativesAsItems,
  getInitiativesByVerticalHead,
  getInitiativesBySpoc,
} from '@/lib/actions/initiatives';
import { ragCounts } from '@/lib/rag';
import { STAGES, type Stage } from '@/lib/types';
import { enrichAll, type EnrichedItem } from './enrich';

/** Current month as "YYYY-MM" and a human label, derived once per request. */
function monthContext() {
  const now = new Date();
  return {
    currentMonth: now.toISOString().slice(0, 10).slice(0, 7),
    today: now.toISOString().slice(0, 10),
    monthLabel: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
  };
}

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
  monthLabel: string;
  monthly: {
    committed: EnrichedItem[];
    delivered: EnrichedItem[];
    missed: EnrichedItem[];
  };
}

/** Everything the CIO dashboard needs, aggregated in one place. */
export async function getCioSummary(): Promise<CioSummary> {
  const items = enrichAll(await listInitiativesAsItems());
  const { currentMonth, today, monthLabel } = monthContext();

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

  const committed = items.filter(i => i.committedMonth === currentMonth);
  const delivered = committed.filter(i => i.currentStage === 'Closed');
  const missed = committed.filter(i => i.currentStage !== 'Closed' && i.goLiveDate < today);

  return {
    items,
    totalCount: items.length,
    activeCount: total,
    counts,
    pct,
    pipelineByStage,
    vhSummary,
    monthLabel,
    monthly: { committed, delivered, missed },
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
export async function getPmoList(): Promise<PmoList> {
  const items = enrichAll(await listInitiativesAsItems());
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
