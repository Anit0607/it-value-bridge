import type { BadgeTone } from '@/components/ui/Badge';
import type { PortfolioFilterParamKey } from '@/lib/portfolioFilters';

/**
 * Dashboards that currently mount PortfolioFilterBar. Extend this union
 * (and add the matching entry to DASHBOARD_VIEW_PATH below) as more views
 * adopt the filter bar — vertical-head and business don't yet.
 */
export type DashboardView = 'cio' | 'pmo';

export const DASHBOARD_VIEW_PATH: Record<DashboardView, string> = {
  cio: '/cio',
  pmo: '/pmo',
};

/**
 * A named, reusable slice of the portfolio — a preset combination of
 * PortfolioFilterBar query params with a label a user can click instead of
 * setting each dropdown by hand.
 *
 * queryParams values use the same on-the-wire casing PortfolioFilterBar
 * itself writes (e.g. classification is the raw InitiativeClassification
 * enum casing — 'STRATEGIC', not the friendly 'Strategic' — because that's
 * what parsePortfolioFilters() expects in the URL; rag/type/benefitCategory
 * use their natural friendly casing, e.g. 'Red', 'Project', 'Revenue').
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
    id: 'strategic-red',
    label: 'Strategic Red Items',
    description: 'Strategic initiatives currently in Red status',
    targetPath: '/cio',
    allowedViews: ['cio', 'pmo'],
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
    id: 'major-project-portfolio',
    label: 'Major Project Portfolio',
    description: 'Large-scale initiatives classified as Major Project',
    targetPath: '/pmo',
    allowedViews: ['cio', 'pmo'],
    queryParams: { classification: 'MAJOR_PROJECT' },
    tone: 'brand',
  },
  {
    id: 'tactical-at-risk',
    label: 'Tactical At Risk',
    description: 'Tactical initiatives currently in Amber status',
    targetPath: '/pmo',
    allowedViews: ['cio', 'pmo'],
    queryParams: { classification: 'TACTICAL', rag: 'Amber' },
    tone: 'warning',
  },
  {
    id: 'bau-portfolio',
    label: 'BAU Portfolio',
    description: 'Routine, business-as-usual initiatives',
    targetPath: '/pmo',
    allowedViews: ['pmo'],
    queryParams: { classification: 'BAU' },
    tone: 'slate',
  },
  {
    id: 'projects-only',
    label: 'Projects Only',
    description: 'Delivery type = Project, excluding Change Requests',
    targetPath: '/pmo',
    allowedViews: ['cio', 'pmo'],
    queryParams: { type: 'Project' },
    tone: 'sky',
  },
  {
    id: 'revenue-value',
    label: 'Revenue-Driving Initiatives',
    description: 'Initiatives whose primary business value category is Revenue',
    targetPath: '/cio',
    allowedViews: ['cio', 'pmo'],
    queryParams: { benefitCategory: 'Revenue' },
    tone: 'success',
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
