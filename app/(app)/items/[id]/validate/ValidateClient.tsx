'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveValidation } from '@/lib/actions/initiatives';
import type { Item, BusinessValidation } from '@/lib/types';
import { ChevronLeft, CheckCircle2, AlertTriangle } from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

export function ValidateClient({ item, userName }: { item: Item; userName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<BusinessValidation>({
    outcomeAchieved: item.validation?.outcomeAchieved ?? 'Yes',
    actualResult: item.validation?.actualResult ?? '',
    actualMetric: item.validation?.actualMetric ?? '',
  });
  const [saved, setSaved] = useState(false);

  if (item.currentStage !== 'Business Validation') {
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
        <p className="mt-3 font-medium text-amber-800">This item is not in the Business Validation stage.</p>
        <p className="mt-1 text-sm text-amber-700">
          Current stage: <strong>{item.currentStage}</strong>
        </p>
        <Link href={`/items/${item.id}`} className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
          ← View item detail
        </Link>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await saveValidation(item.id, form, userName);
      setSaved(true);
      setTimeout(() => router.push(`/items/${item.id}`), 1200);
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href={`/items/${item.id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
          <ChevronLeft className="h-4 w-4" />
          {item.title}
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Business Validation</h1>
        <p className="mt-0.5 text-sm text-slate-500">Confirm whether the expected business outcome was achieved.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-slate-400">Outcome Category</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{item.outcomeCategory}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">Target Metric</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{item.targetMetric}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-medium text-slate-400">Expected Outcome</dt>
            <dd className="mt-0.5 text-slate-700">{item.outcomeDescription}</dd>
          </div>
        </dl>
      </div>

      {saved ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          <p className="font-semibold">Validation saved! Redirecting…</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Outcome Achieved <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-3">
              {(['Yes', 'Partially', 'No'] as const).map(opt => {
                const selected = form.outcomeAchieved === opt;
                const tone =
                  opt === 'Yes'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : opt === 'Partially'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-rose-500 bg-rose-50 text-rose-700';
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, outcomeAchieved: opt }))}
                    className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                      selected ? tone : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Actual Result <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              className={inputCls + ' resize-none'}
              placeholder="Describe what actually happened after go-live…"
              value={form.actualResult}
              onChange={e => setForm(f => ({ ...f, actualResult: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Actual Metric Achieved <span className="text-rose-500">*</span>
            </label>
            <input
              required
              className={inputCls}
              placeholder={`vs target: ${item.targetMetric}`}
              value={form.actualMetric}
              onChange={e => setForm(f => ({ ...f, actualMetric: e.target.value }))}
            />
            <p className="mt-1 text-xs text-slate-400">Target: {item.targetMetric}</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {isPending ? 'Saving…' : 'Submit Validation'}
            </button>
            <Link
              href={`/items/${item.id}`}
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
