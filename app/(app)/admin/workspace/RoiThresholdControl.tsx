'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setRoiThreshold } from '@/lib/actions/investment';
import { Scale } from 'lucide-react';

/**
 * Sets the minimum ROI a value-generating initiative must clear before it needs
 * an approved exception.
 *
 * Deliberately starts empty with no suggested default. Required return varies
 * enormously by sector and cost of capital — pre-filling "1.5x" would be a
 * fabricated number of exactly the kind removed in M0, and would anchor the
 * client to a figure nobody in their organization actually owns.
 */
export function RoiThresholdControl({ current }: { current: number | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(current != null ? String(current) : '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const save = (next: number | null) => {
    setError('');
    setSaved(false);
    startTransition(async () => {
      try {
        await setRoiThreshold({ roiThreshold: next });
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save the threshold.');
      }
    });
  };

  const submit = () => {
    const t = value.trim();
    if (!t) return save(null);
    const n = parseFloat(t);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      setError('Enter a multiple between 0 and 100, or clear the field to disable the gate.');
      return;
    }
    save(n);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-500">
        The minimum return a <strong>value-generating</strong> initiative must clear. Below-threshold
        work is never blocked — it is escalated for written justification and CIO approval.
        Regulatory, foundational and strategic work is not measured against this at all.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Minimum ROI</label>
          <div className="flex items-center gap-2">
            <input
              type="number" step="0.1" min="0" max="100"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="not set"
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <span className="text-sm text-slate-500">x</span>
          </div>
        </div>
        <button
          onClick={submit}
          disabled={isPending}
          className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        {current != null && (
          <button
            onClick={() => { setValue(''); save(null); }}
            disabled={isPending}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      {saved && !error && <p className="text-xs font-medium text-emerald-600">Saved.</p>}

      <p className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
        <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        {current == null
          ? 'No threshold is set, so the ROI gate is inactive. Nothing is flagged as an exception until a figure is recorded here.'
          : `Value-generating initiatives below ${current.toFixed(1)}x are flagged as requiring an approved exception.`}
      </p>
    </div>
  );
}
