import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type SectionCardTone = 'default' | 'brand' | 'risk' | 'success' | 'warning';

interface ToneStyle {
  border: string;
  headerBg: string;
  headerBorder: string;
  titleCls: string;
  iconCls: string;
  badgeCls: string;
  divideCls: string;
}

const TONE: Record<SectionCardTone, ToneStyle> = {
  default: {
    border:      'border-slate-200',
    headerBg:    'bg-white',
    headerBorder:'border-slate-100',
    titleCls:    'text-slate-800',
    iconCls:     'text-slate-400',
    badgeCls:    'bg-slate-100 text-slate-600',
    divideCls:   'divide-slate-100',
  },
  brand: {
    border:      'border-brand-200',
    headerBg:    'bg-brand-50/40',
    headerBorder:'border-brand-100',
    titleCls:    'text-brand-800',
    iconCls:     'text-brand-500',
    badgeCls:    'bg-brand-100 text-brand-700',
    divideCls:   'divide-brand-100',
  },
  risk: {
    border:      'border-rose-200',
    headerBg:    'bg-rose-50/40',
    headerBorder:'border-rose-100',
    titleCls:    'text-rose-800',
    iconCls:     'text-rose-500',
    badgeCls:    'bg-rose-100 text-rose-700',
    divideCls:   'divide-rose-50',
  },
  success: {
    border:      'border-emerald-200',
    headerBg:    'bg-emerald-50/40',
    headerBorder:'border-emerald-100',
    titleCls:    'text-emerald-800',
    iconCls:     'text-emerald-500',
    badgeCls:    'bg-emerald-100 text-emerald-700',
    divideCls:   'divide-emerald-100',
  },
  warning: {
    border:      'border-amber-200',
    headerBg:    'bg-amber-50/40',
    headerBorder:'border-amber-100',
    titleCls:    'text-amber-800',
    iconCls:     'text-amber-500',
    badgeCls:    'bg-amber-100 text-amber-700',
    divideCls:   'divide-amber-100',
  },
};

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: SectionCardTone;
  count?: number;
  action?: ReactNode;
  /** Remove body padding for tables/lists that need edge-to-edge layout */
  noPad?: boolean;
  children: ReactNode;
}

export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  tone = 'default',
  count,
  action,
  noPad = false,
  children,
}: SectionCardProps) {
  const t = TONE[tone];

  return (
    <div className={`overflow-hidden rounded-xl border bg-white shadow-card ${t.border}`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b px-5 py-3.5 ${t.headerBg} ${t.headerBorder}`}>
        <h2 className={`flex items-center gap-2 text-sm font-semibold ${t.titleCls}`}>
          {Icon && <Icon className={`h-4 w-4 ${t.iconCls}`} strokeWidth={2} />}
          {title}
          {count !== undefined && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.badgeCls}`}>
              {count}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
          {action}
        </div>
      </div>

      {/* Body */}
      <div className={noPad ? `divide-y ${t.divideCls}` : 'p-5'}>
        {children}
      </div>
    </div>
  );
}
