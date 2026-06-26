'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { computeRAG, daysSinceUpdate, daysFromNow } from '@/lib/rag';
import { ItemTable } from '@/components/ItemTable';
import { FilterBar, EMPTY_FILTERS, type Filters } from '@/components/FilterBar';
import type { Item, DelaySource, Stage } from '@/lib/types';
import { AlertOctagon, ArrowRight } from 'lucide-react';

interface Chip {
  key: string;
  label: string;
  active: (f: Filters) => boolean;
  apply: (f: Filters) => Filters;
  clear: (f: Filters) => Filters;
  tone: string;
  activeTone: string;
}

const CHIPS: Chip[] = [
  {
    key: 'red',
    label: 'Red only',
    active: f => f.rag === 'Red',
    apply: f => ({ ...f, rag: 'Red' as const }),
    clear: f => ({ ...f, rag: '' }),
    tone: 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
    activeTone: 'border-rose-400 bg-rose-50 text-rose-700',
  },
  {
    key: 'amber',
    label: 'Amber only',
    active: f => f.rag === 'Amber',
    apply: f => ({ ...f, rag: 'Amber' as const }),
    clear: f => ({ ...f, rag: '' }),
    tone: 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700',
    activeTone: 'border-amber-400 bg-amber-50 text-amber-700',
  },
  {
    key: 'stale',
    label: 'Stale >7d',
    active: f => f.staleOnly,
    apply: f => ({ ...f, staleOnly: true }),
    clear: f => ({ ...f, staleOnly: false }),
    tone: 'border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700',
    activeTone: 'border-orange-400 bg-orange-50 text-orange-700',
  },
  {
    key: 'due',
    label: 'Due this week',
    active: f => f.dueThisWeek,
    apply: f => ({ ...f, dueThisWeek: true }),
    clear: f => ({ ...f, dueThisWeek: false }),
    tone: 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
    activeTone: 'border-brand-400 bg-brand-50 text-brand-700',
  },
  {
    key: 'regulatory',
    label: 'Regulatory',
    active: f => f.regulatory,
    apply: f => ({ ...f, regulatory: true }),
    clear: f => ({ ...f, regulatory: false }),
    tone: 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
    activeTone: 'border-rose-400 bg-rose-50 text-rose-700',
  },
  {
    key: 'business',
    label: 'Business delay',
    active: f => f.delaySource === 'Business',
    apply: f => ({ ...f, delaySource: 'Business' as DelaySource }),
    clear: f => ({ ...f, delaySource: '' }),
    tone: 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700',
    activeTone: 'border-violet-400 bg-violet-50 text-violet-700',
  },
  {
    key: 'vendor',
    label: 'Vendor delay',
    active: f => f.delaySource === 'Vendor',
    apply: f => ({ ...f, delaySource: 'Vendor' as DelaySource }),
    clear: f => ({ ...f, delaySource: '' }),
    tone: 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-800',
    activeTone: 'border-slate-500 bg-slate-100 text-slate-800',
  },
  {
    key: 'appsec',
    label: 'AppSec pending',
    active: f => f.stage === 'AppSec',
    apply: f => ({ ...f, stage: 'AppSec' as Stage }),
    clear: f => ({ ...f, stage: '' }),
    tone: 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700',
    activeTone: 'border-emerald-400 bg-emerald-50 text-emerald-700',
  },
  {
    key: 'uat',
    label: 'UAT pending',
    active: f => f.stage === 'UAT',
    apply: f => ({ ...f, stage: 'UAT' as Stage }),
    clear: f => ({ ...f, stage: '' }),
    tone: 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700',
    activeTone: 'border-sky-400 bg-sky-50 text-sky-700',
  },
];

interface QueueItem {
  label: string;
  desc: string;
  count: number;
  apply: () => void;
  accent: string;
  countCls: string;
}

export function PmoDashboardClient({ items }: { items: Item[] }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const queue = useMemo((): QueueItem[] => [
    {
      label: 'Overdue Stage Updates',
      desc: 'past their stage deadline',
      count: items.filter(i => i.currentStage !== 'Closed' && daysFromNow(i.stageExpectedDate) < 0).length,
      apply: () => setFilters({ ...EMPTY_FILTERS, rag: 'Red' as const }),
      accent: 'border-rose-200 bg-rose-50/50',
      countCls: 'text-rose-600',
    },
    {
      label: 'Stale Updates',
      desc: 'not updated in the last 7 days',
      count: items.filter(i => i.currentStage !== 'Closed' && daysSinceUpdate(i.lastUpdated) > 7).length,
      apply: () => setFilters({ ...EMPTY_FILTERS, staleOnly: true }),
      accent: 'border-orange-200 bg-orange-50/50',
      countCls: 'text-orange-600',
    },
    {
      label: 'Due This Week',
      desc: 'stage deadline in the next 7 days',
      count: items.filter(i => { const d = daysFromNow(i.stageExpectedDate); return i.currentStage !== 'Closed' && d >= 0 && d <= 7; }).length,
      apply: () => setFilters({ ...EMPTY_FILTERS, dueThisWeek: true }),
      accent: 'border-brand-200 bg-brand-50/50',
      countCls: 'text-brand-600',
    },
    {
      label: 'Business Pending',
      desc: 'delay attributed to business side',
      count: items.filter(i => i.currentStage !== 'Closed' && i.delaySource === 'Business').length,
      apply: () => setFilters({ ...EMPTY_FILTERS, delaySource: 'Business' as DelaySource }),
      accent: 'border-violet-200 bg-violet-50/50',
      countCls: 'text-violet-600',
    },
    {
      label: 'Vendor Pending',
      desc: 'delay attributed to vendor',
      count: items.filter(i => i.currentStage !== 'Closed' && i.delaySource === 'Vendor').length,
      apply: () => setFilters({ ...EMPTY_FILTERS, delaySource: 'Vendor' as DelaySource }),
      accent: 'border-amber-200 bg-amber-50/50',
      countCls: 'text-amber-600',
    },
    {
      label: 'AppSec / UAT Pending',
      desc: 'in security review or UAT stage',
      count: items.filter(i => i.currentStage === 'AppSec' || i.currentStage === 'UAT').length,
      apply: () => setFilters({ ...EMPTY_FILTERS, stage: 'AppSec' as Stage }),
      accent: 'border-emerald-200 bg-emerald-50/50',
      countCls: 'text-emerald-600',
    },
  ], [items]);

  const needsAttention = useMemo(
    () => items.filter(i => i.currentStage !== 'Closed' && computeRAG(i) === 'Red'),
    [items],
  );

  const filtered = useMemo(() => {
    return items.filter(i => {
      const rag = computeRAG(i);
      if (filters.stage && i.currentStage !== filters.stage) return false;
      if (filters.rag && rag !== filters.rag) return false;
      if (filters.verticalHead && i.verticalHead !== filters.verticalHead) return false;
      if (filters.type && i.type !== filters.type) return false;
      if (filters.regulatory && !i.isRegulatory) return false;
      if (filters.staleOnly && (i.currentStage === 'Closed' || daysSinceUpdate(i.lastUpdated) <= 7)) return false;
      if (filters.dueThisWeek) {
        const d = daysFromNow(i.stageExpectedDate);
        if (i.currentStage === 'Closed' || d < 0 || d > 7) return false;
      }
      if (filters.delaySource && i.delaySource !== filters.delaySource) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!i.title.toLowerCase().includes(q) && !i.verticalHead.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, filters]);

  const toggleChip = (chip: Chip) =>
    setFilters(f => chip.active(f) ? chip.clear(f) : chip.apply(f));

  return (
    <>
      {/* Work Queue */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Work Queue</h2>
        </div>
        <div className="grid grid-cols-2 divide-slate-100 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
          {queue.map((q, i) => (
            <button
              key={q.label}
              type="button"
              onClick={q.apply}
              className={`group flex flex-col gap-1.5 border-b p-4 text-left transition-colors hover:bg-slate-50 lg:border-b-0 ${q.accent} ${i % 2 === 1 ? 'border-l border-slate-100 lg:border-l-0' : ''}`}
            >
              <span className={`tabular text-3xl font-semibold leading-none ${q.countCls}`}>
                {q.count}
              </span>
              <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                {q.label}
              </span>
              <span className="text-[11px] leading-snug text-slate-500">{q.desc}</span>
              <span className="mt-1 text-[11px] font-semibold text-brand-600 group-hover:underline">
                View items →
              </span>
            </button>
          ))}
        </div>
      </div>

      {needsAttention.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-800">
            <AlertOctagon className="h-4 w-4 text-rose-500" />
            Needs Attention
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
              {needsAttention.length}
            </span>
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {needsAttention.map(i => {
              const stale = daysSinceUpdate(i.lastUpdated);
              const overdue = daysFromNow(i.stageExpectedDate) < 0;
              return (
                <Link
                  key={i.id}
                  href={`/items/${i.id}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-rose-100 bg-white px-3.5 py-2.5 shadow-sm transition-colors hover:border-rose-300"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800 group-hover:text-brand-700">{i.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{i.currentStage}</div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                      {overdue ? `${Math.abs(daysFromNow(i.stageExpectedDate))}d overdue` : `stale ${stale}d`}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand-500" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Quick filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Quick filters
          </span>
          {CHIPS.map(chip => {
            const isActive = chip.active(filters);
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => toggleChip(chip)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive ? chip.activeTone : chip.tone
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Full filter bar */}
        <div className="flex items-center justify-between">
          <FilterBar filters={filters} onChange={setFilters} />
          <span className="hidden flex-shrink-0 text-xs text-slate-400 sm:block">
            {filtered.length} of {items.length}
          </span>
        </div>
        <ItemTable items={filtered} />
      </div>
    </>
  );
}
