'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { PORTFOLIO_FILTER_KEYS } from '@/lib/portfolioFilters';
import { savedViewsFor, savedViewUrl, type DashboardView, type SavedView } from '@/lib/savedViews';
import type { BadgeTone } from '@/components/ui/Badge';

const CHIP: Record<BadgeTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
  danger:  'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  brand:   'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100',
  violet:  'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
  sky:     'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
  slate:   'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
};

const CHIP_ACTIVE: Record<BadgeTone, string> = {
  success: 'border-emerald-600 bg-emerald-600 text-white',
  warning: 'border-amber-500 bg-amber-500 text-white',
  danger:  'border-rose-600 bg-rose-600 text-white',
  brand:   'border-brand-600 bg-brand-600 text-white',
  violet:  'border-violet-600 bg-violet-600 text-white',
  sky:     'border-sky-600 bg-sky-600 text-white',
  slate:   'border-slate-600 bg-slate-600 text-white',
};

const chipCls = (active: boolean, tone: BadgeTone) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? CHIP_ACTIVE[tone] : CHIP[tone]}`;

interface Props {
  view: DashboardView;
}

/**
 * Preset saved-view chips (lib/savedViews.ts) for a dashboard. Each chip is a
 * plain navigation to that view's query string on the SAME PortfolioFilterBar
 * model every manual dropdown reads/writes (lib/portfolioFilters.ts) — there
 * is no separate saved-view filtering logic here, just a shortcut into it.
 * Clicking a chip replaces the current filter state entirely (it does not
 * merge with whatever the manual filter bar currently has set), matching the
 * "click a saved view" mental model: e.g. Strategic Red Items always goes to
 * exactly /cio?classification=STRATEGIC&rag=Red.
 */
export function SavedViewsBar({ view }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const views = savedViewsFor(view);
  if (views.length === 0) return null;

  const matches = (queryParams: SavedView['queryParams']) =>
    PORTFOLIO_FILTER_KEYS.every(k => (searchParams.get(k) ?? '') === (queryParams[k] ?? ''));

  const isAllPortfolio = PORTFOLIO_FILTER_KEYS.every(k => !searchParams.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <LayoutGrid className="h-4 w-4 text-slate-400" />
        Saved Views
      </span>

      <Link href={pathname} className={chipCls(isAllPortfolio, 'slate')}>
        All Portfolio
      </Link>

      {views.map(v => (
        <Link
          key={v.id}
          href={savedViewUrl(v)}
          title={v.description}
          className={chipCls(matches(v.queryParams), v.tone)}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}
