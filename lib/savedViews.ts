import type { BadgeTone } from '@/components/ui/Badge';
import type { PortfolioFilterParamKey } from '@/lib/portfolioFilters';

/**
 * Dashboards a saved view can target. cio and pmo mount the full
 * PortfolioFilterBar dropdown UI; business intentionally does not — it only
 * renders SavedViewsBar (a handful of presets, no manual dropdowns) to stay
 * simpler than PMO, but it still parses/applies the same query params
 * server-side via parsePortfolioFilters()/applyPortfolioFilters().
 */
export type DashboardView = 'cio' | 'pmo' | 'business';

export const DASHBOARD_VIEW_PATH: Record<DashboardView, string> = {
  cio: '/cio',
  pmo: '/pmo',
  business: '/business',
};

/**
 * A named, reusable slice of the portfolio — a preset combination of
 * PortfolioFilterBar query params with a label a user can click instead of
 * setting each dropdown by hand. These are curated, developer-defined
 * presets (this file), not user-created persistent saved views — there is
 * no save/edit/delete UI, and none is planned here.
 *
 * queryParams values use the same on-the-wire casing PortfolioFilterBar
 * itself writes (e.g. classification is the raw InitiativeClassification
 * enum casing — 'STRATEGIC', not the friendly 'Strategic' — because that's
 * what parsePortfolioFilters() expects in the URL; rag/type/benefitCategory
 * use their natural friendly casing, e.g. 'Red', 'Project', 'Revenue').
 * classification and benefitCategory both support a comma-separated OR
 * list, e.g. 'BAU,TACTICAL' or 'Revenue,Customer Experience'.
 */
export interface SavedView {
  id: string;
  label: string;
  description: string;
  /**
   * The dashboard this preset was authored for. NOT used to build the link —
   * SavedViewsBar always links within the CURRENT page's pathname, so a
   * saved view allowed on multiple dashboards (e.g. Regulatory Watch on both
   * cio and pmo) keeps the user on whichever one they clicked it from. Kept
   * as documentation/default-context metadata only.
   */
  targetPath: string;
  /** Which dashboards should offer this saved view (e.g. in a picker). */
  allowedViews: DashboardView[];
  queryParams: Partial<Record<PortfolioFilterParamKey, string>>;
  tone: BadgeTone;
}

export const SAVED_VIEWS: SavedView[] = [
  {
    id: 'todays-escalations',
    label: "Today's Escalations",
    description: 'Initiatives currently in Red / escalation status',
    targetPath: '/pmo',
    allowedViews: ['pmo'],
    queryParams: { rag: 'Red' },
    tone: 'danger',
  },
  {
    id: 'strategic-red',
    label: 'Strategic Red Items',
    description: 'Strategic initiatives currently in Red status',
    targetPath: '/cio',
    allowedViews: ['cio'],
    queryParams: { classification: 'STRATEGIC', rag: 'Red' },
    tone: 'danger',
  },
  {
    id: 'regulatory-watch',
    label: 'Regulatory Watch',
    description: 'All initiatives with an externally-mandated regulatory deadline',
    targetPath: '/cio',
    allowedViews: ['cio', 'pmo'],
    queryParams: { isRegulatory: 'true' },
    tone: 'danger',
  },
  {
    id: 'vendor-delays',
    label: 'Vendor Delays',
    description: 'Initiatives currently blocked on a vendor',
    targetPath: '/pmo',
    allowedViews: ['pmo'],
    queryParams: { delaySource: 'Vendor' },
    tone: 'slate',
  },
  {
    id: 'business-pending',
    label: 'Business Pending',
    description: 'Initiatives currently delayed on the business side',
    targetPath: '/pmo',
    allowedViews: ['pmo'],
    queryParams: { delaySource: 'Business' },
    tone: 'violet',
  },
  {
    id: 'this-month-golive',
    label: 'This Month Go-Live',
    description: 'Initiatives with an expected go-live date in the current calendar month',
    targetPath: '/pmo',
    allowedViews: ['pmo'],
    queryParams: { goLiveThisMonth: 'true' },
    tone: 'brand',
  },
  {
    id: 'stale-updates',
    label: 'Stale Updates',
    description: 'Initiatives not updated in the last 7 days',
    targetPath: '/pmo',
    allowedViews: ['pmo'],
    queryParams: { staleOnly: 'true' },
    tone: 'warning',
  },
  {
    id: 'major-projects',
    label: 'Major Projects',
    description: 'Large-scale initiatives classified as Major Project',
    targetPath: '/cio',
    allowedViews: ['cio', 'pmo'],
    queryParams: { classification: 'MAJOR_PROJECT' },
    tone: 'violet',
  },
  {
    id: 'revenue-impact',
    label: 'Revenue Impact',
    description: 'Initiatives whose primary business value category is Revenue',
    targetPath: '/cio',
    allowedViews: ['cio'],
    queryParams: { benefitCategory: 'Revenue' },
    tone: 'success',
  },
  {
    id: 'bau-tactical-queue',
    label: 'BAU / Tactical Queue',
    description: 'Routine and medium-sized initiatives — BAU or Tactical classification',
    targetPath: '/pmo',
    allowedViews: ['pmo'],
    queryParams: { classification: 'BAU,TACTICAL' },
    tone: 'slate',
  },
  {
    id: 'pending-validation',
    label: 'Pending Validation',
    description: 'Items awaiting business validation',
    targetPath: '/business',
    allowedViews: ['business'],
    queryParams: { pendingValidation: 'true' },
    tone: 'warning',
  },
  {
    id: 'revenue-customer-impact',
    label: 'Revenue / Customer Impact',
    description: 'Value category focus — Revenue or Customer Experience',
    targetPath: '/business',
    allowedViews: ['business'],
    queryParams: { benefitCategory: 'Revenue,Customer Experience' },
    tone: 'success',
  },
  {
    id: 'delayed-by-business',
    label: 'Delayed by Business',
    description: 'Business-owned delays',
    targetPath: '/business',
    allowedViews: ['business'],
    queryParams: { delaySource: 'Business' },
    tone: 'violet',
  },
];

/** Saved views offered on a given dashboard, in definition order. */
export function savedViewsFor(view: DashboardView): SavedView[] {
  return SAVED_VIEWS.filter(v => v.allowedViews.includes(view));
}
