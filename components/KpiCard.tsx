import type { LucideIcon } from 'lucide-react';

type Accent = 'brand' | 'emerald' | 'amber' | 'rose' | 'slate';

interface Props {
  label: string;
  value: number | string;
  sub?: string;
  icon: LucideIcon;
  accent?: Accent;
  onClick?: () => void;
}

const ACCENT_BAR: Record<Accent, string> = {
  brand:   'bg-brand-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
  slate:   'bg-slate-400',
};

const CARD_BG: Record<Accent, string> = {
  brand:   'bg-brand-50/30',
  emerald: 'bg-emerald-50/30',
  amber:   'bg-amber-50/30',
  rose:    'bg-rose-50/30',
  slate:   'bg-white',
};

const ICON_WRAP: Record<Accent, string> = {
  brand:   'bg-brand-100/80 text-brand-600',
  emerald: 'bg-emerald-100/80 text-emerald-600',
  amber:   'bg-amber-100/80 text-amber-600',
  rose:    'bg-rose-100/80 text-rose-600',
  slate:   'bg-slate-100 text-slate-500',
};

const VALUE_TONE: Record<Accent, string> = {
  brand:   'text-slate-900',
  emerald: 'text-emerald-700',
  amber:   'text-amber-700',
  rose:    'text-rose-700',
  slate:   'text-slate-900',
};

export function KpiCard({ label, value, sub, icon: Icon, accent = 'brand', onClick }: Props) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-xl border border-slate-200 p-4 text-left shadow-card transition-shadow ${CARD_BG[accent]} ${
        onClick ? 'cursor-pointer hover:shadow-card-hover' : ''
      }`}
    >
      {/* Left accent bar */}
      <span className={`absolute inset-y-0 left-0 w-1 ${ACCENT_BAR[accent]}`} aria-hidden />

      {/* Label + icon row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${ICON_WRAP[accent]}`}>
          <Icon className="h-[20px] w-[20px]" strokeWidth={2} />
        </span>
      </div>

      {/* Number */}
      <div className="mt-3">
        <span className={`tabular text-3xl font-semibold tracking-tight ${VALUE_TONE[accent]}`}>
          {value}
        </span>
      </div>

      {/* Sub context */}
      {sub && (
        <div className="mt-1">
          <span className="text-[11px] font-medium text-slate-400">{sub}</span>
        </div>
      )}
    </Tag>
  );
}
