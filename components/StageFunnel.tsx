import { STAGES, type Stage } from '@/lib/types';

interface Props {
  counts: { stage: Stage; count: number }[];
}

// Color-graded indigo ramp across the lifecycle (early → late → closed)
const RAMP = [
  'bg-brand-300',
  'bg-brand-300',
  'bg-brand-400',
  'bg-brand-400',
  'bg-brand-500',
  'bg-brand-500',
  'bg-brand-600',
  'bg-brand-600',
  'bg-brand-700',
  'bg-emerald-500',
  'bg-slate-400',
];

export function StageFunnel({ counts }: Props) {
  const max = Math.max(1, ...counts.map(c => c.count));

  return (
    <div className="space-y-2">
      {counts.map(({ stage, count }, i) => {
        const pct = (count / max) * 100;
        const idx = STAGES.indexOf(stage);
        return (
          <div key={stage} className="flex items-center gap-3">
            <div className="w-28 flex-shrink-0 truncate text-right text-xs font-medium text-slate-500">
              {stage}
            </div>
            <div className="flex h-6 flex-1 items-center">
              <div
                className={`h-full rounded-md transition-all duration-500 ${
                  count > 0 ? RAMP[idx] ?? 'bg-brand-500' : 'bg-slate-100'
                }`}
                style={{ width: count > 0 ? `${Math.max(pct, 6)}%` : '6px' }}
              />
              <span
                className={`ml-2 tabular text-xs font-semibold ${
                  count > 0 ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                {count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
