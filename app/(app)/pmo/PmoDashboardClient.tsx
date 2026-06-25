'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { computeRAG, daysSinceUpdate, daysFromNow } from '@/lib/rag';
import { ItemTable } from '@/components/ItemTable';
import { FilterBar, EMPTY_FILTERS, type Filters } from '@/components/FilterBar';
import type { Item } from '@/lib/types';
import { AlertOctagon, ArrowRight } from 'lucide-react';

export function PmoDashboardClient({ items }: { items: Item[] }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

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
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!i.title.toLowerCase().includes(q) && !i.verticalHead.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, filters]);

  return (
    <>
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
