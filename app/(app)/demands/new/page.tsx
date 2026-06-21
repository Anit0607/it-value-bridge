'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDemand } from '@/lib/actions/demands';
import {
  BENEFIT_CATEGORIES,
  BENEFIT_CATEGORY_LABEL,
  CATEGORY_TONE,
  BENEFIT_UNITS,
  BENEFIT_UNIT_LABEL,
  formatInr,
} from '@/lib/value';
import { DEMAND_PRIORITIES, DEMAND_PRIORITY_LABEL } from '@/lib/demand';
import { PageHeader } from '@/components/PageHeader';
import type { BenefitCategory, BenefitUnit, DemandPriority } from '@prisma/client';

type BenefitRow = {
  checked: boolean;
  metricName: string;
  narrative: string;
  amount: string;
  scale: number; // multiplier to rupees
  unit: BenefitUnit;
  baseline: string;
  target: string;
};

const SCALES = [
  { label: '₹ Cr', mult: 10_000_000 },
  { label: '₹ Lakh', mult: 100_000 },
  { label: '₹', mult: 1 },
];

const emptyRow = (): BenefitRow => ({
  checked: false,
  metricName: '',
  narrative: '',
  amount: '',
  scale: 10_000_000,
  unit: 'INR',
  baseline: '',
  target: '',
});

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

export default function RaiseDemandPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [requirement, setRequirement] = useState('');
  const [priority, setPriority] = useState<DemandPriority>('MEDIUM');
  const [rows, setRows] = useState<Record<BenefitCategory, BenefitRow>>(
    () => Object.fromEntries(BENEFIT_CATEGORIES.map(c => [c, emptyRow()])) as Record<BenefitCategory, BenefitRow>,
  );

  const update = (cat: BenefitCategory, patch: Partial<BenefitRow>) =>
    setRows(prev => ({ ...prev, [cat]: { ...prev[cat], ...patch } }));

  const checkedCats = BENEFIT_CATEGORIES.filter(c => rows[c].checked);
  const totalValue = checkedCats.reduce((sum, c) => {
    const n = parseFloat(rows[c].amount);
    return sum + (isNaN(n) ? 0 : n * rows[c].scale);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (checkedCats.length === 0) {
      setError('Select at least one benefit category and describe it.');
      return;
    }
    for (const c of checkedCats) {
      const r = rows[c];
      if (!r.metricName.trim() || !r.amount.trim()) {
        setError(`Fill the metric and estimated value for "${BENEFIT_CATEGORY_LABEL[c]}".`);
        return;
      }
    }

    const benefits = checkedCats.map(c => {
      const r = rows[c];
      return {
        category: c,
        metricName: r.metricName.trim(),
        unit: r.unit,
        estimatedAnnualValueInr: parseFloat(r.amount) * r.scale,
        baselineValue: r.baseline ? parseFloat(r.baseline) : null,
        targetValue: r.target ? parseFloat(r.target) : null,
        narrative: r.narrative.trim(),
      };
    });

    startTransition(async () => {
      try {
        const id = await createDemand({ title, requirement, priority, benefits });
        router.push(`/demands/${id}`);
      } catch {
        setError('Could not raise the demand. Please check the fields and try again.');
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Raise a Demand" subtitle="Describe the requirement and the business value it should deliver" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Requirement</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title <span className="text-rose-500">*</span></label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="e.g. WhatsApp banking for account queries" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">What do you need? <span className="text-rose-500">*</span></label>
            <textarea required rows={3} value={requirement} onChange={e => setRequirement(e.target.value)} className={inputCls + ' resize-none'} placeholder="Describe the business requirement…" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as DemandPriority)} className={inputCls}>
              {DEMAND_PRIORITIES.map(p => (
                <option key={p} value={p}>{DEMAND_PRIORITY_LABEL[p]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Targeted Business Value <span className="text-rose-500">*</span></h2>
            {totalValue > 0 && (
              <span className="text-xs font-medium text-slate-500">
                Total: <span className="tabular font-semibold text-brand-700">{formatInr(totalValue)}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Tick every benefit this requirement targets, and quantify it.</p>

          <div className="space-y-2">
            {BENEFIT_CATEGORIES.map(cat => {
              const r = rows[cat];
              return (
                <div key={cat} className={`rounded-lg border ${r.checked ? 'border-brand-300 bg-brand-50/30' : 'border-slate-200'} p-3 transition-colors`}>
                  <label className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={r.checked}
                      onChange={e => update(cat, { checked: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_TONE[cat]}`} />
                    <span className="text-sm font-medium text-slate-800">{BENEFIT_CATEGORY_LABEL[cat]}</span>
                  </label>

                  {r.checked && (
                    <div className="mt-3 grid grid-cols-1 gap-3 pl-7 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-600">Metric / what improves <span className="text-rose-500">*</span></label>
                        <input value={r.metricName} onChange={e => update(cat, { metricName: e.target.value })} className={inputCls} placeholder="e.g. Reduce call-centre volume" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-600">How is it achieved? (optional)</label>
                        <input value={r.narrative} onChange={e => update(cat, { narrative: e.target.value })} className={inputCls} placeholder="Short description of the benefit" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Estimated annual value <span className="text-rose-500">*</span></label>
                        <div className="flex gap-2">
                          <input type="number" min="0" step="any" value={r.amount} onChange={e => update(cat, { amount: e.target.value })} className={inputCls} placeholder="0" />
                          <select value={r.scale} onChange={e => update(cat, { scale: Number(e.target.value) })} className="rounded-lg border border-slate-300 px-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none">
                            {SCALES.map(s => (
                              <option key={s.label} value={s.mult}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Metric unit</label>
                        <select value={r.unit} onChange={e => update(cat, { unit: e.target.value as BenefitUnit })} className={inputCls}>
                          {BENEFIT_UNITS.map(u => (
                            <option key={u} value={u}>{BENEFIT_UNIT_LABEL[u]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Baseline (today, optional)</label>
                        <input type="number" step="any" value={r.baseline} onChange={e => update(cat, { baseline: e.target.value })} className={inputCls} placeholder="e.g. 100" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Target (optional)</label>
                        <input type="number" step="any" value={r.target} onChange={e => update(cat, { target: e.target.value })} className={inputCls} placeholder="e.g. 70" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={isPending} className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
            {isPending ? 'Submitting…' : 'Submit Demand'}
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
