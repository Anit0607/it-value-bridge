'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useRequireAuth } from '@/components/RoleProvider';
import { VERTICAL_HEADS, OUTCOME_CATEGORIES } from '@/lib/types';
import type { Item, ItemType, OutcomeCategory } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';

function Field({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
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
  const user = useRequireAuth();
  const { addItem } = useStore();
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    type: 'Change Request' as ItemType,
    verticalHead: VERTICAL_HEADS[0],
    businessSpoc: '',
    businessSponsor: '',
    requirement: '',
    outcomeCategory: 'Revenue' as OutcomeCategory,
    outcomeDescription: '',
    targetMetric: '',
    goLiveDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const today = new Date().toISOString().slice(0, 10);
    const expectedDate = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
    const id = `item-${Date.now()}`;
    const item: Item = {
      id,
      ...form,
      currentStage: 'BRD',
      stageStartDate: today,
      stageExpectedDate: expectedDate,
      lastUpdated: today,
      notes: '',
      delayed: false,
      history: [{ stage: 'BRD', date: today, user: user?.name ?? 'PMO', note: 'Item created' }],
      createdAt: today,
    };
    addItem(item);
    router.push(`/items/${id}`);
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Create New Item" subtitle="Add a new Change Request or Project to the portfolio" />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Basic Information</h2>
          <Field label="Title" required>
            <input required className={inputCls} value={form.title} onChange={set('title')} placeholder="e.g. UPI Enhancement v3.0" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type" required>
              <select className={inputCls} value={form.type} onChange={set('type')}>
                <option value="Change Request">Change Request</option>
                <option value="Project">Project</option>
              </select>
            </Field>
            <Field label="IT Vertical Head" required>
              <select className={inputCls} value={form.verticalHead} onChange={set('verticalHead')}>
                {VERTICAL_HEADS.map(v => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Business SPOC Name" required>
              <input className={inputCls} value={form.businessSpoc} onChange={set('businessSpoc')} placeholder="Full name" />
            </Field>
            <Field label="Business Sponsor Name" required>
              <input className={inputCls} value={form.businessSponsor} onChange={set('businessSponsor')} placeholder="Full name" />
            </Field>
          </div>
          <Field label="Brief Requirement Description" required>
            <textarea
              className={textareaCls}
              rows={3}
              value={form.requirement}
              onChange={set('requirement')}
              placeholder="Describe what needs to be built or changed…"
            />
          </Field>
        </div>

        {/* Business value */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Business Value</h2>
          <Field label="Expected Business Outcome Category" required>
            <select className={inputCls} value={form.outcomeCategory} onChange={set('outcomeCategory')}>
              {OUTCOME_CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Expected Outcome Description" required>
            <textarea
              className={textareaCls}
              rows={2}
              value={form.outcomeDescription}
              onChange={set('outcomeDescription')}
              placeholder="What specifically will improve? e.g. Reduce call centre volume by 30%"
            />
          </Field>
          <Field label="Target Metric" required>
            <input className={inputCls} value={form.targetMetric} onChange={set('targetMetric')} placeholder="e.g. Reduce TAT by 30%" />
          </Field>
          <Field label="Expected Go Live Date" required>
            <input type="date" className={inputCls} value={form.goLiveDate} onChange={set('goLiveDate')} required />
          </Field>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create Item'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
