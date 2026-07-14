import type { BadgeTone } from '@/components/ui/Badge';
import type { PortfolioFilterParamKey } from '@/lib/portfolioFilters';

/**
 * Dashboards a saved view can target. cio and pmo mount PortfolioFilterBar
 * and fully apply these query params server-side today; business does not
 * parse portfolio-filter query params yet — it's included here because two
 * of the recommended presets are explicitly "Best For" Business too, and
 * the preset should exist and be ready the moment that page adopts the
 * filter bar, rather than being modelled twice later.
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
 * classification supports a comma-separated OR list, e.g. 'BAU,TACTICAL'.
 */
export interface SavedView {
  id: string;
  label: string;
  description: string;
  /** Where clicking this saved view navigates to. */
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
    allowedViews: ['pmo', 'business'],
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
    allowedViews: ['cio', 'business'],
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
];

/** Saved views offered on a given dashboard, in definition order. */
export function savedViewsFor(view: DashboardView): SavedView[] {
  return SAVED_VIEWS.filter(v => v.allowedViews.includes(view));
}

/** Build the navigable URL (path + query string) for a saved view. */
export function savedViewUrl(view: SavedView): string {
  const params = new URLSearchParams(view.queryParams as Record<string, string>);
  const qs = params.toString();
  return qs ? `${view.targetPath}?${qs}` : view.targetPath;
}
