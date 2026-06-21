'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/components/RoleProvider';
import { createInitiative } from '@/lib/actions/initiatives';
import { VERTICAL_HEADS } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { BenefitPicker, type BenefitDraft } from '@/components/value/BenefitPicker';

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
const textareaCls = inputCls + ' resize-none';

export default function NewItemPage() {
  const { user } = useRole();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [benefits, setBenefits] = useState<BenefitDraft[]>([]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setError('');

    // Value-definition gate: at least one fully-quantified benefit.
    if (benefits.length === 0) {
      setError('Define at least one business benefit — value is required before an item can be created.');
      return;
    }
    const incomplete = benefits.find(b => !b.metricName || b.estimatedAnnualValueInr <= 0);
    if (incomplete) {
      setError('Each ticked benefit needs a metric and an estimated value greater than zero.');
      return;
    }

    const fd = new FormData(e.currentTarget);
    const input = {
      title: String(fd.get('title') ?? ''),
      type: String(fd.get('type') ?? 'Project') as 'Change Request' | 'Project',
      verticalHead: String(fd.get('verticalHead') ?? ''),
      businessSpoc: String(fd.get('businessSpoc') ?? ''),
      businessSponsor: String(fd.get('businessSponsor') ?? ''),
      requirement: String(fd.get('requirement') ?? ''),
      goLiveDate: String(fd.get('goLiveDate') ?? ''),
      benefits,
    };

    startTransition(async () => {
      try {
        const id = await createInitiative(input);
        router.push(`/items/${id}`);
      } catch {
        setError('Failed to create item. Please check all fields and try again.');
      }
    });
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Create New Item" subtitle="Add a new Change Request or Project — define its business value up front" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Basic Information</h2>
          <Field label="Title" required>
            <input name="title" required className={inputCls} placeholder="e.g. UPI Enhancement v3.0" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type" required>
              <select name="type" className={inputCls}>
                <option value="Change Request">Change Request</option>
                <option value="Project">Project</option>
              </select>
            </Field>
            <Field label="IT Vertical Head" required>
              <select name="verticalHead" className={inputCls}>
                {VERTICAL_HEADS.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Business SPOC Name" required>
              <input name="businessSpoc" required className={inputCls} placeholder="Full name" />
            </Field>
            <Field label="Business Sponsor Name" required>
              <input name="businessSponsor" required className={inputCls} placeholder="Full name" />
            </Field>
          </div>
          <Field label="Brief Requirement Description" required>
            <textarea name="requirement" required className={textareaCls} rows={3} placeholder="Describe what needs to be built or changed…" />
          </Field>
          <Field label="Expected Go Live Date" required>
            <input type="date" name="goLiveDate" className={inputCls} required />
          </Field>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Business Value <span className="text-rose-500">*</span>
          </h2>
          <BenefitPicker onChange={setBenefits} />
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={isPending} className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
            {isPending ? 'Creating…' : 'Create Item'}
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
