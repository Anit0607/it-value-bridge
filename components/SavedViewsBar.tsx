'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { PORTFOLIO_FILTER_KEYS } from '@/lib/portfolioFilters';
import { savedViewsFor, type DashboardView, type SavedView } from '@/lib/savedViews';
import { chipCls } from '@/components/ui/Chip';

/** Label for the reset-to-unfiltered chip, per dashboard. */
const RESET_LABEL: Record<DashboardView, string> = {
  cio: 'All Portfolio',
  pmo: 'All Portfolio',
  business: 'My Business Portfolio',
};

interface Props {
  view: DashboardView;
}

/**
 * Preset saved-view chips (lib/savedViews.ts) for a dashboard. Each chip is a
 * plain navigation on the SAME PortfolioFilterBar model every manual
 * dropdown reads/writes (lib/portfolioFilters.ts) — there is no separate
 * saved-view filtering logic here, just a shortcut into it.
 *
 * Links are always built from the CURRENT pathname, never a saved view's own
 * targetPath — a view allowed on multiple dashboards (e.g. Regulatory Watch
 * on both cio and pmo) must keep the user on whichever dashboard they
 * clicked it from, never bounce them to a different workspace. Non-portfolio
 * params already on the URL (period, from, to) are preserved; only the
 * PORTFOLIO_FILTER_KEYS are replaced, matching the "click a saved view"
 * mental model of resetting filters, not the whole page's context.
 */
export function SavedViewsBar({ view }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const views = savedViewsFor(view);
  if (views.length === 0) return null;

  const buildHref = (queryParams: SavedView['queryParams']) => {
    const next = new URLSearchParams(searchParams.toString());
    PORTFOLIO_FILTER_KEYS.forEach(k => next.delete(k));
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const matches = (queryParams: SavedView['queryParams']) =>
    PORTFOLIO_FILTER_KEYS.every(k => (searchParams.get(k) ?? '') === (queryParams[k] ?? ''));

  const isAllPortfolio = PORTFOLIO_FILTER_KEYS.every(k => !searchParams.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <LayoutGrid className="h-4 w-4 text-slate-400" />
        Saved Views
      </span>

      <Link href={buildHref({})} className={chipCls(isAllPortfolio, 'slate')}>
        {RESET_LABEL[view]}
      </Link>

      {views.map(v => (
        <Link
          key={v.id}
          href={buildHref(v.queryParams)}
          title={v.description}
          className={chipCls(matches(v.queryParams), v.tone)}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}
