import type { BadgeTone } from './Badge';

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

/**
 * Shared pill-chip styling — used by both URL-driven chips (SavedViewsBar,
 * 5F) and local-state toggle chips (Action Center quick filters, 6A). Same
 * visual language either way; only how a click changes state differs.
 */
export function chipCls(active: boolean, tone: BadgeTone): string {
  return `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? CHIP_ACTIVE[tone] : CHIP[tone]}`;
}
