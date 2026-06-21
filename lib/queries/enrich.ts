import { computeRAG, daysInStage, daysFromNow, daysSinceUpdate } from '@/lib/rag';
import type { Item, RAG } from '@/lib/types';

/**
 * The single enrichment point for the whole app.
 *
 * Every dashboard, table and detail view derives its RAG / "days in stage" /
 * "ETA" / staleness from THIS function so the frozen rules (Appendix B) can
 * never drift between screens. RAG is computed here, never stored.
 */
export interface EnrichedItem extends Item {
  rag: RAG;
  /** Whole days since the current stage started (>= 0). */
  daysInStage: number;
  /** Days until stageExpectedDate; negative means overdue. */
  etaDays: number;
  /** Whole days since lastUpdated; used for the "stale >= 7d" rule. */
  staleDays: number;
}

export function enrich(item: Item): EnrichedItem {
  return {
    ...item,
    rag: computeRAG(item),
    daysInStage: daysInStage(item.stageStartDate),
    etaDays: daysFromNow(item.stageExpectedDate),
    staleDays: daysSinceUpdate(item.lastUpdated),
  };
}

export function enrichAll(items: Item[]): EnrichedItem[] {
  return items.map(enrich);
}
