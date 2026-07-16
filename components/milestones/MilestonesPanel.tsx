'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createMilestone, updateMilestone, completeMilestone, deleteMilestone } from '@/lib/actions/milestones';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Flag, Plus, Pencil, CheckCircle2, Trash2 } from 'lucide-react';

export type MilestoneOwnerRole = 'PMO' | 'IT' | 'BUSINESS' | 'VENDOR';
export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';

export interface MilestoneView {
  id: string;
  title: string;
  description: string | null;
  owner: string;
  ownerRole: MilestoneOwnerRole | null;
  dueDate: string; // ISO date
  status: MilestoneStatus;
  completedAt: string | null; // ISO date
}

const STATUS_TONE: Record<MilestoneStatus, BadgeTone> = {
  NOT_STARTED: 'slate',
  IN_PROGRESS: 'brand',
  BLOCKED: 'danger',
  COMPLETED: 'success',
};

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
};

const OWNER_ROLE_LABEL: Record<MilestoneOwnerRole, string> = {
  PMO: 'PMO',
  IT: 'IT',
  BUSINESS: 'Business',
  VENDOR: 'Vendor',
};

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

const MS_DAY = 86_400_000;

function ageOrDelay(m: MilestoneView): { text: string; cls: string } {
  const due = new Date(m.dueDate).getTime();
  if (m.status === 'COMPLETED') {
    if (!m.completedAt) return { text: 'Completed', cls: 'text-emerald-600' };
    const diffDays = Math.round((new Date(m.completedAt).getTime() - due) / MS_DAY);
    return diffDays > 0
      ? { text: `Completed ${diffDays}d late`, cls: 'text-amber-600' }
      : { text: 'Completed on time', cls: 'text-emerald-600' };
  }
  const diffDays = Math.round((due - Date.now()) / MS_DAY);
  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, cls: 'text-rose-600 font-semibold' };
  if (diffDays === 0) return { text: 'Due today', cls: 'text-amber-600 font-semibold' };
  return { text: `${diffDays}d left`, cls: 'text-slate-500' };
}

interface FormState {
  title: string;
  description: string;
  owner: string;
  ownerRole: MilestoneOwnerRole | '';
  dueDate: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED';
}

const EMPTY_FORM: FormState = { title: '', description: '', owner: '', ownerRole: '', dueDate: '', status: 'NOT_STARTED' };

export function MilestonesPanel({
  initiativeId,
  milestones,
  canEdit,
  canComplete,
}: {
  initiativeId: string;
  milestones: MilestoneView[];
  canEdit: boolean;
  canComplete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState('');

  const closeForm = () => { setMode('none'); setEditingId(null); setForm(EMPTY_FORM); setError(''); };

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setMode('add'); setError(''); };

  const openEdit = (m: MilestoneView) => {
    setForm({
      title: m.title,
      description: m.description ?? '',
      owner: m.owner,
      ownerRole: m.ownerRole ?? '',
      dueDate: m.dueDate,
      status: m.status === 'COMPLETED' ? 'NOT_STARTED' : m.status,
    });
    setEditingId(m.id);
    setMode('edit');
    setError('');
  };

  const submit = () => {
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.owner.trim()) { setError('Owner is required.'); return; }
    if (!form.dueDate) { setError('Due date is required.'); return; }

    startTransition(async () => {
      try {
        if (mode === 'add') {
          await createMilestone(initiativeId, {
            title: form.title,
            description: form.description || undefined,
            owner: form.owner,
            ownerRole: form.ownerRole || undefined,
            dueDate: new Date(form.dueDate),
          });
        } else if (mode === 'edit' && editingId) {
          await updateMilestone(editingId, {
            title: form.title,
            description: form.description || null,
            owner: form.owner,
            ownerRole: form.ownerRole || null,
            dueDate: new Date(form.dueDate),
            status: form.status,
          });
        }
        closeForm();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save this milestone.');
      }
    });
  };

  const complete = (id: string) => {
    startTransition(async () => {
      await completeMilestone(id);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (editingId === id) closeForm();
    startTransition(async () => {
      await deleteMilestone(id);
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Flag className="h-3.5 w-3.5" />
          Milestones
        </h2>
        {canEdit && mode === 'none' && (
          <button onClick={openAdd} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
            <Plus className="h-3.5 w-3.5" /> Add milestone
          </button>
        )}
      </div>

      {milestones.length === 0 && mode === 'none' ? (
        <p className="text-xs text-slate-400">No milestones yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Milestone</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Owner</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Due Date</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Age / Delay</th>
                <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map(m => {
                const age = ageOrDelay(m);
                return (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="px-2 py-2.5">
                      <Badge tone={STATUS_TONE[m.status]} size="sm">{STATUS_LABEL[m.status]}</Badge>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="font-medium text-slate-800">{m.title}</div>
                      {m.description && <div className="mt-0.5 text-xs text-slate-500">{m.description}</div>}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="text-slate-700">{m.owner}</div>
                      {m.ownerRole && <div className="text-[11px] text-slate-400">{OWNER_ROLE_LABEL[m.ownerRole]}</div>}
                    </td>
                    <td className="px-2 py-2.5 tabular text-slate-600">{m.dueDate}</td>
                    <td className={`px-2 py-2.5 tabular ${age.cls}`}>{age.text}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {canComplete && m.status !== 'COMPLETED' && (
                          <button onClick={() => complete(m.id)} disabled={isPending} title="Mark complete" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-60">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => openEdit(m)} disabled={isPending} title="Edit" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600 disabled:opacity-60">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => remove(m.id)} disabled={isPending} title="Delete" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {mode !== 'none' && (
        <div className="mt-4 space-y-2 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
          <p className="text-xs font-medium text-slate-600">{mode === 'add' ? 'New milestone' : 'Edit milestone'}</p>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Title (e.g. UAT Sign-off)" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Description (optional)" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} className={inputCls} placeholder="Owner (accountable person/team)" />
            <select value={form.ownerRole} onChange={e => setForm(f => ({ ...f, ownerRole: e.target.value as FormState['ownerRole'] }))} className={inputCls}>
              <option value="">Owner role: none</option>
              {(['PMO', 'IT', 'BUSINESS', 'VENDOR'] as const).map(r => (
                <option key={r} value={r}>{OWNER_ROLE_LABEL[r]}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
            {mode === 'edit' && (
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as FormState['status'] }))} className={inputCls}>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            )}
          </div>
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={submit} disabled={isPending} className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
              {isPending ? 'Saving…' : mode === 'add' ? 'Add milestone' : 'Save changes'}
            </button>
            <button onClick={closeForm} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
