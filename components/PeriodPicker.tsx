'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PERIOD_PRESETS, type PeriodKey } from '@/lib/period';
import { CalendarRange } from 'lucide-react';

const selectCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
const dateCls =
  'rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

/**
 * Period selector that drives the page via URL search params (?period= / ?from= / ?to=),
 * so views are shareable and server components can read the range.
 */
export function PeriodPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const key: PeriodKey = (params.get('period') as PeriodKey) || (from || to ? 'custom' : 'this-fy');

  const push = (next: URLSearchParams) => {
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const onPreset = (value: PeriodKey) => {
    const next = new URLSearchParams();
    if (value === 'custom') {
      next.set('period', 'custom');
    } else {
      next.set('period', value);
    }
    push(next);
  };

  const onDate = (field: 'from' | 'to', value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('period', 'custom');
    if (value) next.set(field, value);
    else next.delete(field);
    push(next);
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <CalendarRange className="h-4 w-4 text-slate-400" />
        Period
      </span>
      <select value={key} onChange={e => onPreset(e.target.value as PeriodKey)} className={selectCls}>
        {PERIOD_PRESETS.map(p => (
          <option key={p.key} value={p.key}>{p.label}</option>
        ))}
      </select>
      {key === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={from} onChange={e => onDate('from', e.target.value)} className={dateCls} aria-label="From date" />
          <span className="text-xs text-slate-400">→</span>
          <input type="date" value={to} onChange={e => onDate('to', e.target.value)} className={dateCls} aria-label="To date" />
        </div>
      )}
    </div>
  );
}
