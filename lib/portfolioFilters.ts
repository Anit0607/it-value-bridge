import type { EnrichedItem } from '@/lib/queries/enrich';
import { STAGES, OUTCOME_CATEGORIES, CLASSIFICATION_LABEL } from '@/lib/types';
import type { Stage, ItemType, ItemClassification, RAG, OutcomeCategory } from '@/lib/types';

export const ITEM_TYPES: ItemType[] = ['Change Request', 'Project'];
export const RAG_VALUES: RAG[] = ['Green', 'Amber', 'Red'];
// Raw InitiativeClassification enum casing — used in URLs/dropdown values
// (e.g. ?classification=STRATEGIC) and translated to the friendly
// ItemClassification stored on EnrichedItem via CLASSIFICATION_LABEL.
export const CLASSIFICATION_KEYS = Object.keys(CLASSIFICATION_LABEL) as (keyof typeof CLASSIFICATION_LABEL)[];

export interface PortfolioFilters {
  classification?: ItemClassification;
  type?: ItemType;
  rag?: RAG;
  stage?: Stage;
  isRegulatory?: boolean;
  verticalHead?: string;
  programHead?: string;
  programManager?: string;
  businessHead?: string;
  businessUnit?: string;
  businessSpoc?: string;
  benefitCategory?: OutcomeCategory;
}

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

  const classification = first(searchParams.classification)?.toUpperCase();
  if (classification && (CLASSIFICATION_KEYS as string[]).includes(classification)) {
    filters.classification = CLASSIFICATION_LABEL[classification as keyof typeof CLASSIFICATION_LABEL];
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

  const benefitCategory = first(searchParams.benefitCategory);
  if (benefitCategory && (OUTCOME_CATEGORIES as string[]).includes(benefitCategory)) {
    filters.benefitCategory = benefitCategory as OutcomeCategory;
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
  return items.filter(item => {
    if (filters.classification && item.classification !== filters.classification) return false;
    if (filters.type && item.type !== filters.type) return false;
    if (filters.rag && item.rag !== filters.rag) return false;
    if (filters.stage && item.currentStage !== filters.stage) return false;
    if (filters.isRegulatory !== undefined && item.isRegulatory !== filters.isRegulatory) return false;
    if (filters.verticalHead && item.verticalHead !== filters.verticalHead) return false;
    if (filters.programHead && item.programHeadName !== filters.programHead) return false;
    if (filters.programManager && item.programManagerName !== filters.programManager) return false;
    if (filters.businessHead && item.businessHeadName !== filters.businessHead) return false;
    if (filters.businessUnit && item.businessUnit !== filters.businessUnit) return false;
    if (filters.businessSpoc && item.businessSpoc !== filters.businessSpoc) return false;
    if (filters.benefitCategory && item.outcomeCategory !== filters.benefitCategory) return false;
    return true;
  });
}
