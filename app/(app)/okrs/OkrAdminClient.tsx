'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createOkr, updateOkr, setOkrActive, type OkrRollup } from '@/lib/actions/okr';
import { formatInr, BENEFIT_CATEGORIES, BENEFIT_CATEGORY_LABEL, CATEGORY_TONE } from '@/lib/value';
import { PageHeader } from '@/components/PageHeader';
import type { BenefitCategory } from '@prisma/client';
import { Target, Plus, Pencil } from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

type Draft = { name: string; description: string; category: BenefitCategory | ''; owner: string; targetStatement: string };

const emptyDraft = (): Draft => ({ name: '', description: '', category: '', owner: '', targetStatement: '' });

export function OkrAdminClient({ okrs }: { okrs: OkrRollup[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null); // okr id or 'new'
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [error, setError] = useState('');

  const startNew = () => { setEditing('new'); setDraft(emptyDraft()); setError(''); };
  const startEdit = (o: OkrRollup) => {
    setEditing(o.id);
    setDraft({ name: o.name, description: o.description, category: o.category ?? '', owner: o.owner, targetStatement: o.targetStatement });
    setError('');
  };

  const save = () => {
    if (!draft.name.trim()) { setError('Name is required.'); return; }
    const input = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      category: draft.category || null,
      owner: draft.owner.trim(),
      targetStatement: draft.targetStatement.trim(),
    };
    startTransition(async () => {
      try {
        if (editing === 'new') await createOkr(input);
        else if (editing) await updateOkr(editing, input);
        setEditing(null);
        router.refresh();
      } catch {
        setError('Could not save the OKR.');
      }
    });
  };

  const toggleActive = (o: OkrRollup) => {
    startTransition(async () => {
      await setOkrActive(o.id, !o.active);
      router.refresh();
    });
  };

  const Form = (
    <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Name <span className="text-rose-500">*</span></label>
          <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className={inputCls} placeholder="e.g. Grow digital transaction revenue" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Benefit category</label>
          <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value as BenefitCategory | '' }))} className={inputCls}>
            <option value="">— none —</option>
            {BENEFIT_CATEGORIES.map(c => <option key={c} value={c}>{BENEFIT_CATEGORY_LABEL[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Owner</label>
          <input value={draft.owner} onChange={e => setDraft(d => ({ ...d, owner: e.target.value }))} className={inputCls} placeholder="Accountable exec" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Target statement</label>
          <input value={draft.targetStatement} onChange={e => setDraft(d => ({ ...d, targetStatement: e.target.value }))} className={inputCls} placeholder="e.g. +₹150Cr digital revenue in FY27" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
          <input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} className={inputCls} placeholder="Optional" />
        </div>
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={isPending} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
          {isPending ? 'Saving…' : 'Save OKR'}
        </button>
        <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Strategic OKRs" subtitle="Define the business metrics initiatives are mapped to and the value they contribute">
        {editing !== 'new' && (
          <button onClick={startNew} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700">
            <Plus className="h-4 w-4" />
            New OKR
          </button>
        )}
      </PageHeader>

      {editing === 'new' && Form}

      <div className="space-y-3">
        {okrs.map(o => (
          <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            {editing === o.id ? (
              Form
            ) : (
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Target className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">{o.name}</h3>
                    {o.category && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200">
                        <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_TONE[o.category]}`} />
                        {BENEFIT_CATEGORY_LABEL[o.category]}
                      </span>
                    )}
                    {!o.active && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">inactive</span>}
                  </div>
                  {o.targetStatement && <p className="mt-0.5 text-xs text-slate-500">{o.targetStatement}{o.owner ? ` · owner ${o.owner}` : ''}</p>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-4">
                  <div className="text-right">
                    <div className="tabular text-sm font-semibold text-slate-800">{formatInr(o.projected)}</div>
                    <div className="text-[11px] text-slate-400">{o.count} initiative{o.count !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => startEdit(o)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => toggleActive(o)} disabled={isPending} className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60">
                      {o.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
