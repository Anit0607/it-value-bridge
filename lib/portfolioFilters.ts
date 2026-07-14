import type { EnrichedItem } from '@/lib/queries/enrich';
import { STAGES, OUTCOME_CATEGORIES, CLASSIFICATION_LABEL } from '@/lib/types';
import type { Stage, ItemType, ItemClassification, RAG, OutcomeCategory, DelaySource } from '@/lib/types';

export const ITEM_TYPES: ItemType[] = ['Change Request', 'Project'];
export const RAG_VALUES: RAG[] = ['Green', 'Amber', 'Red'];
export const DELAY_SOURCE_VALUES: DelaySource[] = ['IT', 'Business', 'Vendor', 'External'];
// Raw InitiativeClassification enum casing — used in URLs/dropdown values
// (e.g. ?classification=STRATEGIC) and translated to the friendly
// ItemClassification stored on EnrichedItem via CLASSIFICATION_LABEL.
export const CLASSIFICATION_KEYS = Object.keys(CLASSIFICATION_LABEL) as (keyof typeof CLASSIFICATION_LABEL)[];

export interface PortfolioFilters {
  // Array so a single saved view can express an OR across tiers (e.g. the
  // "BAU / Tactical Queue" preset needs classification = BAU or Tactical).
  // On the wire this is one comma-separated query value, e.g.
  // ?classification=BAU,TACTICAL — the manual single-select dropdown only
  // ever writes one value, so in practice it's a 1-element array there.
  classification?: ItemClassification[];
  type?: ItemType;
  rag?: RAG;
  stage?: Stage;
  isRegulatory?: boolean;
  delaySource?: DelaySource;
  /** Go-live date falls within the current calendar month. */
  goLiveThisMonth?: boolean;
  /** Not updated in the last 7 days (and not Closed) — mirrors the PMO "Stale Updates" rule. */
  staleOnly?: boolean;
  /** Business Validation stage with no validation recorded yet. */
  pendingValidation?: boolean;
  verticalHead?: string;
  programHead?: string;
  programManager?: string;
  businessHead?: string;
  businessUnit?: string;
  businessSpoc?: string;
  // Array so a preset can express an OR across categories (e.g. Business
  // View's "Revenue / Customer Impact" needs Revenue or Customer Experience).
  // Same comma-separated-on-the-wire convention as classification above.
  benefitCategory?: OutcomeCategory[];
}

// The 16 URL search-param keys PortfolioFilterBar reads/writes — the single
// source of truth for its active-filter count, Reset behavior, and for any
// other caller (e.g. saved views) that needs to build/validate filter
// query strings against the same key set.
export const PORTFOLIO_FILTER_KEYS = [
  'classification',
  'rag',
  'stage',
  'isRegulatory',
  'type',
  'benefitCategory',
  'delaySource',
  'goLiveThisMonth',
  'staleOnly',
  'pendingValidation',
  'verticalHead',
  'programHead',
  'programManager',
  'businessHead',
  'businessUnit',
  'businessSpoc',
] as const;

export type PortfolioFilterParamKey = (typeof PORTFOLIO_FILTER_KEYS)[number];

type SearchParams = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Parse raw URL search params (as passed to a Next.js page component) into
 * a validated PortfolioFilters object. Unrecognised or malformed values are
 * dropped rather than thrown — a bad query string degrades to "no filter
 * applied" for that field, it never crashes the page.
 */
export function parsePortfolioFilters(searchParams: SearchParams): PortfolioFilters {
  const filters: PortfolioFilters = {};

  const classificationRaw = first(searchParams.classification);
  if (classificationRaw) {
    const valid = classificationRaw
      .split(',')
      .map(v => v.trim().toUpperCase())
      .filter((v): v is keyof typeof CLASSIFICATION_LABEL => (CLASSIFICATION_KEYS as string[]).includes(v))
      .map(v => CLASSIFICATION_LABEL[v]);
    if (valid.length > 0) filters.classification = valid;
  }

  const type = first(searchParams.type);
  if (type && (ITEM_TYPES as string[]).includes(type)) {
    filters.type = type as ItemType;
  }

  const rag = first(searchParams.rag);
  if (rag && (RAG_VALUES as string[]).includes(rag)) {
    filters.rag = rag as RAG;
  }

  const stage = first(searchParams.stage);
  if (stage && (STAGES as readonly string[]).includes(stage)) {
    filters.stage = stage as Stage;
  }

  const isRegulatory = first(searchParams.isRegulatory);
  if (isRegulatory === 'true') filters.isRegulatory = true;
  else if (isRegulatory === 'false') filters.isRegulatory = false;

  const delaySource = first(searchParams.delaySource);
  if (delaySource && (DELAY_SOURCE_VALUES as string[]).includes(delaySource)) {
    filters.delaySource = delaySource as DelaySource;
  }

  const goLiveThisMonth = first(searchParams.goLiveThisMonth);
  if (goLiveThisMonth === 'true') filters.goLiveThisMonth = true;

  const staleOnly = first(searchParams.staleOnly);
  if (staleOnly === 'true') filters.staleOnly = true;

  const pendingValidation = first(searchParams.pendingValidation);
  if (pendingValidation === 'true') filters.pendingValidation = true;

  const verticalHead = first(searchParams.verticalHead);
  if (verticalHead) filters.verticalHead = verticalHead;

  const programHead = first(searchParams.programHead);
  if (programHead) filters.programHead = programHead;

  const programManager = first(searchParams.programManager);
  if (programManager) filters.programManager = programManager;

  const businessHead = first(searchParams.businessHead);
  if (businessHead) filters.businessHead = businessHead;

  const businessUnit = first(searchParams.businessUnit);
  if (businessUnit) filters.businessUnit = businessUnit;

  const businessSpoc = first(searchParams.businessSpoc);
  if (businessSpoc) filters.businessSpoc = businessSpoc;

  const benefitCategoryRaw = first(searchParams.benefitCategory);
  if (benefitCategoryRaw) {
    const valid = benefitCategoryRaw
      .split(',')
      .map(v => v.trim())
      .filter((v): v is OutcomeCategory => (OUTCOME_CATEGORIES as string[]).includes(v));
    if (valid.length > 0) filters.benefitCategory = valid;
  }

  return filters;
}

/**
 * Narrow an already-visible, already-enriched item list by PortfolioFilters.
 *
 * SECURITY (5B/5C): this must only ever be called on the result of
 * `enrichAll(await listVisibleInitiativesForUser(user))` — i.e. after
 * organization + role-hierarchy scoping has already happened via
 * buildInitiativeVisibilityWhere(). This function does no data access of
 * its own; it purely filters an in-memory array. Never wire it up to a
 * query that reads all initiatives directly — that would bypass tenant and
 * role-visibility rules.
 *
 *   const visibleItems  = enrichAll(await listVisibleInitiativesForUser(user));
 *   const filteredItems = applyPortfolioFilters(visibleItems, filters);
 */
export function applyPortfolioFilters(items: EnrichedItem[], filters: PortfolioFilters): EnrichedItem[] {
  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  return items.filter(item => {
    if (filters.classification && !filters.classification.includes(item.classification)) return false;
    if (filters.type && item.type !== filters.type) return false;
    if (filters.rag && item.rag !== filters.rag) return false;
    if (filters.stage && item.currentStage !== filters.stage) return false;
    if (filters.isRegulatory !== undefined && item.isRegulatory !== filters.isRegulatory) return false;
    if (filters.delaySource && item.delaySource !== filters.delaySource) return false;
    if (filters.goLiveThisMonth && !item.goLiveDate?.startsWith(thisMonth)) return false;
    if (filters.staleOnly && (item.currentStage === 'Closed' || item.staleDays <= 7)) return false;
    if (filters.pendingValidation && !(item.currentStage === 'Business Validation' && !item.validation)) return false;
    if (filters.verticalHead && item.verticalHead !== filters.verticalHead) return false;
    if (filters.programHead && item.programHeadName !== filters.programHead) return false;
    if (filters.programManager && item.programManagerName !== filters.programManager) return false;
    if (filters.businessHead && item.businessHeadName !== filters.businessHead) return false;
    if (filters.businessUnit && item.businessUnit !== filters.businessUnit) return false;
    if (filters.businessSpoc && item.businessSpoc !== filters.businessSpoc) return false;
    if (filters.benefitCategory && !filters.benefitCategory.includes(item.outcomeCategory)) return false;
    return true;
  });
}
