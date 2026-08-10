import type { StageOption } from '@/lib/types';
import { Check } from 'lucide-react';

interface Props {
  /** The organization's lifecycle, in order. */
  stages: StageOption[];
  /** The current stage's key. */
  currentStage: string;
  compact?: boolean;
}

/**
 * Progress across the organization's own lifecycle.
 *
 * Takes the stage list rather than importing a fixed one, so it renders four
 * steps for a lean workspace and eleven for a regulated bank without knowing
 * which is which.
 */
export function StageProgress({ stages, currentStage, compact = false }: Props) {
  const currentIdx = stages.findIndex(s => s.key === currentStage);

  if (stages.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {stages.map((stage, i) => (
          <div
            key={stage.key}
            title={stage.label}
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
        {stages.map((stage, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={stage.key} className="flex items-start">
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
                  {stage.label}
                </span>
              </div>
              {i < stages.length - 1 && (
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
