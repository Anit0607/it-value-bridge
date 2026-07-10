import type { MonthlyCompletedPoint } from '@/lib/queries/dashboard';

interface Props {
  data: MonthlyCompletedPoint[];
}

/** Simple div-based vertical bar chart — no charting library needed for a single series. */
export function CompletedByMonthChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-xs text-slate-400">No closed initiatives in this period yet.</p>;
  }

  const max = Math.max(1, ...data.map(d => d.count));

  return (
    <div className="flex h-40 items-end gap-2">
      {data.map(({ month, label, count }) => {
        const pct = (count / max) * 100;
        return (
          <div key={month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className={`tabular text-xs font-semibold ${count > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
              {count}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${count > 0 ? 'bg-emerald-500' : 'bg-slate-100'}`}
                style={{ height: count > 0 ? `${Math.max(pct, 6)}%` : '4px' }}
              />
            </div>
            <span className="text-[11px] font-medium text-slate-400">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
