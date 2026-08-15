import { formatInr } from '@/lib/value';
import { accuracyTone, type DimensionGroup } from '@/lib/learning';
import { Lock } from 'lucide-react';

const TONE_BAR: Record<string, string> = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-300',
};

/**
 * Claim accuracy grouped by sponsor, vertical or category.
 *
 * Rows below the evidence floor are rendered WITH their sample size and an
 * explicit "withheld" state rather than being hidden. Hiding them would make
 * the page look confidently sparse instead of honestly thin — and the whole
 * point is that a reader can see how much is actually behind each figure.
 */
export function AccuracyByDimension({
  title,
  subtitle,
  groups,
}: {
  title: string;
  subtitle: string;
  groups: DimensionGroup[];
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <p className="mt-2 text-xs text-slate-400">
          Nothing to group yet — no initiative here has both a frozen promise and a sourced realized figure.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <p className="mb-4 mt-0.5 text-xs text-slate-500">{subtitle}</p>

      <div className="space-y-2.5">
        {groups.map(g => {
          const pct = g.medianAccuracy != null ? Math.round(g.medianAccuracy * 100) : 0;
          const tone = accuracyTone(g.medianAccuracy);
          return (
            <div key={g.key} className="flex items-center gap-3">
              <div className="w-32 flex-shrink-0 truncate text-xs font-medium text-slate-600" title={g.key}>
                {g.key}
              </div>

              <div className="flex h-5 flex-1 items-center">
                {g.reportable ? (
                  <>
                    <div className="relative h-full flex-1 overflow-hidden rounded bg-slate-100">
                      <div
                        className={`h-full rounded ${TONE_BAR[tone]}`}
                        // Capped at 100% width so a 300% overdelivery does not
                        // blow out the layout; the number beside it is exact.
                        style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                      />
                    </div>
                    <span className="ml-2 w-12 flex-shrink-0 text-right tabular text-xs font-semibold text-slate-700">
                      {pct}%
                    </span>
                  </>
                ) : (
                  <div className="flex flex-1 items-center gap-1.5 text-[11px] text-slate-400">
                    <Lock className="h-3 w-3 shrink-0" />
                    <span className="truncate" title={g.withheldReason}>{g.withheldReason}</span>
                  </div>
                )}
              </div>

              {/* Sample size is shown on every row, reportable or not. */}
              <div className="w-16 flex-shrink-0 text-right text-[11px] text-slate-400">
                n={g.sampleSize}
              </div>
              <div className="hidden w-40 flex-shrink-0 text-right tabular text-[11px] text-slate-500 sm:block">
                {formatInr(g.totalRealizedInr)} of {formatInr(g.totalPromisedInr)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
