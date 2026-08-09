'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDemand } from '@/lib/actions/demands';
import { DEMAND_PRIORITIES, DEMAND_PRIORITY_LABEL } from '@/lib/demand';
import { PageHeader } from '@/components/PageHeader';
import { BenefitPicker, type BenefitDraft } from '@/components/value/BenefitPicker';
import { computeTco, formatInr, DEFAULT_TCO_HORIZON_YEARS } from '@/lib/value';
import type { DemandPriority } from '@prisma/client';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

export default function RaiseDemandPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [requirement, setRequirement] = useState('');
  const [priority, setPriority] = useState<DemandPriority>('MEDIUM');
  const [benefits, setBenefits] = useState<BenefitDraft[]>([]);
  const [buildCostCr, setBuildCostCr] = useState('');
  const [annualRunCostCr, setAnnualRunCostCr] = useState('');
  const [tcoHorizonYears, setTcoHorizonYears] = useState('');

  // "" → null (not captured). Never coerce a blank cost field to 0.
  const crToInr = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const n = parseFloat(t);
    return Number.isFinite(n) && n >= 0 ? n * 10_000_000 : null;
  };
  const toYears = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) && n >= 1 && n <= 20 ? n : null;
  };
  const demandTco = computeTco({
    buildCostInr: crToInr(buildCostCr),
    annualRunCostInr: crToInr(annualRunCostCr),
    tcoHorizonYears: toYears(tcoHorizonYears),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (benefits.length === 0) {
      setError('Select at least one benefit category and describe it.');
      return;
    }
    const incomplete = benefits.find(b => !b.metricName || b.estimatedAnnualValueInr <= 0);
    if (incomplete) {
      setError('Each ticked benefit needs a metric and an estimated value greater than zero.');
      return;
    }

    startTransition(async () => {
      try {
        const id = await createDemand({
          title, requirement, priority, benefits,
          buildCostInr: crToInr(buildCostCr),
          annualRunCostInr: crToInr(annualRunCostCr),
          tcoHorizonYears: toYears(tcoHorizonYears),
        });
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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Targeted Business Value <span className="text-rose-500">*</span>
          </h2>
          <BenefitPicker onChange={setBenefits} />
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Indicative Cost</h2>
          <p className="text-xs leading-relaxed text-slate-500">
            Optional. A rough figure here lets this demand be weighed on value versus cost before
            it&apos;s funded — leave blank if genuinely unknown rather than guessing.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Build cost (₹ Cr)</label>
              <input
                type="number" step="any" min="0"
                value={buildCostCr}
                onChange={e => setBuildCostCr(e.target.value)}
                className={inputCls}
                placeholder="one-off"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Annual run cost (₹ Cr)</label>
              <input
                type="number" step="any" min="0"
                value={annualRunCostCr}
                onChange={e => setAnnualRunCostCr(e.target.value)}
                className={inputCls}
                placeholder="per year"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Horizon (years)</label>
              <input
                type="number" step="1" min="1" max="20"
                value={tcoHorizonYears}
                onChange={e => setTcoHorizonYears(e.target.value)}
                className={inputCls}
                placeholder={String(DEFAULT_TCO_HORIZON_YEARS)}
              />
            </div>
          </div>
          {demandTco != null && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Total cost of ownership: <span className="tabular font-semibold text-slate-800">{formatInr(demandTco)}</span>
            </p>
          )}
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
