'use client';

import { STAGES, VERTICAL_HEADS } from '@/lib/types';
import type { Stage, RAG, ItemType, DelaySource } from '@/lib/types';
import { Search, X } from 'lucide-react';

export interface Filters {
  stage: Stage | '';
  rag: RAG | '';
  verticalHead: string;
  type: ItemType | '';
  search: string;
  regulatory: boolean;
  staleOnly: boolean;
  dueThisWeek: boolean;
  delaySource: DelaySource | '';
  goLiveThisMonth: boolean;
}

export const EMPTY_FILTERS: Filters = {
  stage: '', rag: '', verticalHead: '', type: '', search: '',
  regulatory: false, staleOnly: false, dueThisWeek: false, delaySource: '',
  goLiveThisMonth: false,
};

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const selectCls =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 select-none">
      {children}
    </span>
  );
}

export function FilterBar({ filters, onChange }: Props) {
  const set =
    (key: keyof Filters) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      onChange({ ...filters, [key]: e.target.value });

  const hasFilters =
    filters.stage || filters.rag || filters.verticalHead || filters.type || filters.search ||
    filters.regulatory || filters.staleOnly || filters.dueThisWeek || filters.delaySource ||
    filters.goLiveThisMonth;

  return (
    <div className="space-y-2">
      {/* Search row */}
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title or vertical…"
          value={filters.search}
          onChange={set('search')}
          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      {/* Grouped filter row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">

        {/* Delivery Health */}
        <div className="flex items-center gap-1.5">
          <GroupLabel>Delivery Health</GroupLabel>
          <select value={filters.stage} onChange={set('stage')} className={selectCls}>
            <option value="">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.rag} onChange={set('rag')} className={selectCls}>
            <option value="">All Confidence</option>
            <option value="Green">Green</option>
            <option value="Amber">Amber</option>
            <option value="Red">Red</option>
          </select>
        </div>

        {/* Ownership */}
        <div className="flex items-center gap-1.5">
          <GroupLabel>Ownership</GroupLabel>
          <select value={filters.verticalHead} onChange={set('verticalHead')} className={selectCls}>
            <option value="">All Verticals</option>
            {VERTICAL_HEADS.map(vh => <option key={vh} value={vh}>{vh}</option>)}
          </select>
        </div>

        {/* Governance */}
        <div className="flex items-center gap-1.5">
          <GroupLabel>Governance</GroupLabel>
          <select value={filters.type} onChange={set('type')} className={selectCls}>
            <option value="">All Types</option>
            <option value="Change Request">CR</option>
            <option value="Project">Project</option>
          </select>
          <label className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors ${filters.regulatory ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
            <input
              type="checkbox"
              checked={filters.regulatory}
              onChange={e => onChange({ ...filters, regulatory: e.target.checked })}
              className="h-3 w-3 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            Regulatory
          </label>
        </div>

        {hasFilters && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
