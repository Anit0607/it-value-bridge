'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setMaterialityThreshold } from '@/lib/actions/integrity';
import { formatInr } from '@/lib/value';
import { UserCheck } from 'lucide-react';

/**
 * Sets the ₹ level at which a value sign-off or a cost change stops being a
 * one-signature decision.
 *
 * Deliberately starts empty. Four-eyes applied to every ₹20 lakh BAU change
 * gets routed around within a month, and a routed-around control manufactures
 * false assurance — worse than no control. What counts as material is the
 * organization's own judgement, so no default is suggested.
 */
export function MaterialityThresholdControl({ current }: { current: number | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(current != null ? String(current / 10_000_000) : '');
  const [scale, setScale] = useState(10_000_000);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const save = (next: number | null) => {
    setError('');
    setSaved(false);
    startTransition(async () => {
      try {
        await setMaterialityThreshold({ materialityThresholdInr: next });
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
    if (!Number.isFinite(n) || n < 0) {
      setError('Enter an amount, or clear the field to switch maker-checker off.');
      return;
    }
    save(Math.round(n * scale));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-500">
        Above this amount, a value sign-off or a cost change cannot take effect on one signature — it becomes a
        proposal that <strong>a different person</strong> must approve. Below it, changes apply immediately.
        The check is enforced on the server, not by hiding a button.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Materiality threshold</label>
          <div className="flex items-center gap-2">
            <input
              type="number" step="any" min="0"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="not set"
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <select
              value={scale}
              onChange={e => setScale(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none"
            >
              <option value={10_000_000}>₹ Cr</option>
              <option value={100_000}>₹ Lakh</option>
              <option value={1}>₹</option>
            </select>
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
        <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        {current == null
          ? 'No threshold is set, so maker-checker is off and every sign-off and cost change applies on one signature.'
          : `Sign-offs and cost movements of ${formatInr(current)} or more require a second approver. ` +
            'A cost change is measured by the size of the movement, not the new total.'}
      </p>
    </div>
  );
}
