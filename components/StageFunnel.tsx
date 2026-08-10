interface FunnelRow {
  key: string;
  label: string;
  count: number;
  /** Marks the final stage so it reads as an outcome rather than a bottleneck. */
  isTerminal?: boolean;
  /** Marks the stage at which the thing is live. */
  isGoLiveGate?: boolean;
}

interface Props {
  counts: FunnelRow[];
}

// Indigo ramp deepening across the lifecycle, computed from position rather
// than a fixed eleven-entry list — a four-stage lifecycle gets the same visual
// progression as an eleven-stage one.
const RAMP = ['bg-brand-300', 'bg-brand-400', 'bg-brand-500', 'bg-brand-600', 'bg-brand-700'];

function toneFor(row: FunnelRow, index: number, total: number): string {
  if (row.isTerminal) return 'bg-slate-400';
  if (row.isGoLiveGate) return 'bg-emerald-500';
  if (total <= 1) return RAMP[0];
  const step = Math.round((index / (total - 1)) * (RAMP.length - 1));
  return RAMP[step];
}

export function StageFunnel({ counts }: Props) {
  const max = Math.max(1, ...counts.map(c => c.count));

  return (
    <div className="space-y-2">
      {counts.map((row, i) => {
        const pct = (row.count / max) * 100;
        return (
          <div key={row.key} className="flex items-center gap-3">
            <div className="w-28 flex-shrink-0 truncate text-right text-xs font-medium text-slate-500">
              {row.label}
            </div>
            <div className="flex h-6 flex-1 items-center">
              <div
                className={`h-full rounded-md transition-all duration-500 ${
                  row.count > 0 ? toneFor(row, i, counts.length) : 'bg-slate-100'
                }`}
                style={{ width: row.count > 0 ? `${Math.max(pct, 6)}%` : '6px' }}
              />
              <span
                className={`ml-2 tabular text-xs font-semibold ${
                  row.count > 0 ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                {row.count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
