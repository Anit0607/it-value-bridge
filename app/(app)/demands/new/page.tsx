'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDemand } from '@/lib/actions/demands';
import { DEMAND_PRIORITIES, DEMAND_PRIORITY_LABEL } from '@/lib/demand';
import { PageHeader } from '@/components/PageHeader';
import { BenefitPicker, type BenefitDraft } from '@/components/value/BenefitPicker';
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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Targeted Business Value <span className="text-rose-500">*</span>
          </h2>
          <BenefitPicker onChange={setBenefits} />
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
