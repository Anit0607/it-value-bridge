import type { ReactNode } from 'react';

// ─── A. KPI Card ────────────────────────────────────────────────────────────
// Already implemented as components/KpiCard.tsx — import from there.

// ─── B. Section Card ────────────────────────────────────────────────────────
// Used for dashboard blocks: Work Queue, Regulatory Watch, Vertical Summary, etc.
// Header uses border-b border-slate-100; body defaults to p-5.
// Set noPad to true for tables / lists that should run edge-to-edge.

interface SectionCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  noPad?: boolean;
  children: ReactNode;
}

export function SectionCard({ title, subtitle, action, noPad = false, children }: SectionCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <div className="flex items-center gap-3">
          {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
          {action}
        </div>
      </div>
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </div>
  );
}

// ─── C. Insight Card ────────────────────────────────────────────────────────
// Used for portfolio insights, leadership focus, and positive-signal blocks.
// Variant 'success' switches to emerald for "all clear" state.

interface InsightCardProps {
  variant?: 'default' | 'success';
  children: ReactNode;
}

export function InsightCard({ variant = 'default', children }: InsightCardProps) {
  const cls =
    variant === 'success'
      ? 'border-emerald-100 bg-emerald-50/60'
      : 'border-brand-100 bg-brand-50/60';
  return (
    <div className={`rounded-xl border px-4 py-3 text-xs font-medium ${cls}`}>
      {children}
    </div>
  );
}

// ─── D. Risk Card ───────────────────────────────────────────────────────────
// Used for red/attention sections: Needs Attention, Delays, Regulatory Watch.

interface RiskCardProps {
  title: ReactNode;
  count?: number;
  subtitle?: ReactNode;
  children: ReactNode;
}

export function RiskCard({ title, count, subtitle, children }: RiskCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-rose-100 px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-rose-800">
          {title}
          {count !== undefined && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
              {count}
            </span>
          )}
        </h2>
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>
      <div className="divide-y divide-rose-50">{children}</div>
    </div>
  );
}
