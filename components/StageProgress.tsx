import { STAGES, type Stage } from '@/lib/types';
import { Check } from 'lucide-react';

interface Props {
  currentStage: Stage;
  compact?: boolean;
}

export function StageProgress({ currentStage, compact = false }: Props) {
  const currentIdx = STAGES.indexOf(currentStage);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {STAGES.map((stage, i) => (
          <div
            key={stage}
            title={stage}
            className={`h-1.5 flex-1 rounded-full ${
              i < currentIdx ? 'bg-brand-500' : i === currentIdx ? 'bg-brand-700' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex min-w-max items-start gap-0">
        {STAGES.map((stage, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={stage} className="flex items-start">
              <div className="flex w-16 flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                    done
                      ? 'bg-brand-600 text-white'
                      : active
                        ? 'bg-brand-700 text-white ring-4 ring-brand-100'
                        : 'border border-slate-300 bg-white text-slate-400'
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </div>
                <span
                  className={`mt-1.5 text-center text-[10px] leading-tight ${
                    active
                      ? 'font-semibold text-brand-700'
                      : done
                        ? 'text-brand-500'
                        : 'text-slate-400'
                  }`}
                >
                  {stage}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={`mt-3.5 h-0.5 w-4 rounded-full ${
                    i < currentIdx ? 'bg-brand-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
