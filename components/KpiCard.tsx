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
  brand: 'bg-brand-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
};

const ICON_WRAP: Record<Accent, string> = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-500',
};

const VALUE_TONE: Record<Accent, string> = {
  brand: 'text-slate-900',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  slate: 'text-slate-900',
};

export function KpiCard({ label, value, sub, icon: Icon, accent = 'brand', onClick }: Props) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card transition-shadow ${
        onClick ? 'cursor-pointer hover:shadow-card-hover' : ''
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${ACCENT_BAR[accent]}`} aria-hidden />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${ICON_WRAP[accent]}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`tabular text-3xl font-semibold tracking-tight ${VALUE_TONE[accent]}`}>
          {value}
        </span>
        {sub && <span className="text-xs font-medium text-slate-400">{sub}</span>}
      </div>
    </Tag>
  );
}
