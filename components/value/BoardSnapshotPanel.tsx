'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { publishBoardSnapshot } from '@/lib/actions/integrity';
import { formatInr } from '@/lib/value';
import type { BoardSnapshotView } from '@/lib/queries/integrity';
import { Camera, Archive } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Period snapshots (docs/ROADMAP.md M3).
 *
 * If the board saw a figure in July, that figure must still be reproducible in
 * August after the underlying data has moved. A live recomputation cannot do
 * that — only a stored snapshot can. Publishing freezes the figures with the
 * name of whoever published them.
 */
export function BoardSnapshotPanel({
  snapshots,
  canPublish,
}: {
  snapshots: BoardSnapshotView[];
  canPublish: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const existing = snapshots.find(s => s.year === year && s.month === month);

  const publish = () => {
    setError('');
    startTransition(async () => {
      try {
        await publishBoardSnapshot(year, month);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not publish the snapshot.');
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Archive className="h-4 w-4 text-slate-400" />
        Published Board Snapshots
      </h2>

      <p className="mb-4 text-xs leading-relaxed text-slate-500">
        Everything above is computed live and moves as the portfolio changes. Publishing a period freezes these
        figures so the number the board actually saw can still be produced months later, with the name of whoever
        published it.
      </p>

      {canPublish && (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">Month</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none"
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">Year</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <button
            onClick={publish}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            <Camera className="h-3.5 w-3.5" />
            {isPending ? 'Publishing…' : existing ? 'Re-publish period' : 'Publish period'}
          </button>
          {existing && (
            <span className="text-[11px] text-amber-700">
              This period is already published. Re-publishing overwrites it and records a new timestamp.
            </span>
          )}
        </div>
      )}

      {error && <p className="mb-3 text-xs font-medium text-rose-600">{error}</p>}

      {snapshots.length === 0 ? (
        <p className="text-xs text-slate-400">
          No period has been published yet. Until one is, board figures exist only as a live calculation.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {snapshots.map(s => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-700">
                {MONTHS[s.month - 1]} {s.year}
              </span>
              <span className="flex items-center gap-3 text-slate-500">
                {s.signedOffValueInr != null && (
                  <span className="tabular font-semibold text-slate-700">{formatInr(s.signedOffValueInr)} signed off</span>
                )}
                {s.publishedBy && <span>by {s.publishedBy}</span>}
                <span className="tabular text-slate-400">{s.generatedAt}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
