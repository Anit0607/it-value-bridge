'use client';

import { STAGES, VERTICAL_HEADS } from '@/lib/types';
import type { Stage, RAG, ItemType } from '@/lib/types';
import { Search, X } from 'lucide-react';

export interface Filters {
  stage: Stage | '';
  rag: RAG | '';
  verticalHead: string;
  type: ItemType | '';
  search: string;
  regulatory: boolean;
}

export const EMPTY_FILTERS: Filters = {
  stage: '', rag: '', verticalHead: '', type: '', search: '', regulatory: false,
};

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const selectCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

export function FilterBar({ filters, onChange }: Props) {
  const set =
    (key: keyof Filters) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      onChange({ ...filters, [key]: e.target.value });

  const hasFilters =
    filters.stage || filters.rag || filters.verticalHead || filters.type || filters.search || filters.regulatory;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search items…"
          value={filters.search}
          onChange={set('search')}
          className="w-56 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>
      <select value={filters.stage} onChange={set('stage')} className={selectCls}>
        <option value="">All Stages</option>
        {STAGES.map(s => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select value={filters.rag} onChange={set('rag')} className={selectCls}>
        <option value="">All RAG</option>
        <option value="Green">Green</option>
        <option value="Amber">Amber</option>
        <option value="Red">Red</option>
      </select>
      <select value={filters.verticalHead} onChange={set('verticalHead')} className={selectCls}>
        <option value="">All Verticals</option>
        {VERTICAL_HEADS.map(vh => (
          <option key={vh} value={vh}>
            {vh}
          </option>
        ))}
      </select>
      <select value={filters.type} onChange={set('type')} className={selectCls}>
        <option value="">All Types</option>
        <option value="Change Request">Change Request</option>
        <option value="Project">Project</option>
      </select>
      <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors ${filters.regulatory ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}>
        <input
          type="checkbox"
          checked={filters.regulatory}
          onChange={e => onChange({ ...filters, regulatory: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
        />
        Regulatory only
      </label>
      {hasFilters && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
