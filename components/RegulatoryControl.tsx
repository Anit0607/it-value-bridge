'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setRegulatory } from '@/lib/actions/initiatives';
import { ShieldAlert, Pencil } from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

function daysLabel(dueIso: string | null | undefined): string | null {
  if (!dueIso) return null;
  const due = new Date(dueIso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = Math.round((due - today.getTime()) / 86_400_000);
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'due today';
  return `${d}d left`;
}

export function RegulatoryControl({
  initiativeId,
  isRegulatory,
  regulatoryBody,
  regulatoryDueDate,
  canEdit,
}: {
  initiativeId: string;
  isRegulatory: boolean;
  regulatoryBody?: string | null;
  regulatoryDueDate?: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [reg, setReg] = useState(isRegulatory);
  const [body, setBody] = useState(regulatoryBody ?? '');
  const [due, setDue] = useState(regulatoryDueDate ?? '');

  // Hide entirely for non-regulatory items when the viewer can't edit.
  if (!isRegulatory && !canEdit) return null;

  const save = () => {
    startTransition(async () => {
      await setRegulatory(initiativeId, {
        isRegulatory: reg,
        regulatoryBody: body,
        regulatoryDueDate: due || undefined,
      });
      setEditing(false);
      router.refresh();
    });
  };

  const overdue = regulatoryDueDate && new Date(regulatoryDueDate) < new Date();

  if (editing) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Regulatory Commitment</h2>
        <label className="flex items-center gap-2.5">
          <input type="checkbox" checked={reg} onChange={e => setReg(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          <span className="text-sm font-medium text-slate-800">Regulatory / compliance-mandated</span>
        </label>
        {reg && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Regulator / body</label>
              <input value={body} onChange={e => setBody(e.target.value)} className={inputCls} placeholder="e.g. RBI, NPCI, SEBI" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Mandated due date</label>
              <input type="date" value={due ? due.slice(0, 10) : ''} onChange={e => setDue(e.target.value)} className={inputCls} />
            </div>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button onClick={save} disabled={isPending} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
            {isPending ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    );
  }

  if (!isRegulatory) {
    // canEdit only (non-regulatory) — subtle affordance
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-card">
        <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-700">
          <ShieldAlert className="h-4 w-4" />
          Mark as a regulatory commitment
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-5 shadow-card ${overdue ? 'border-rose-300 bg-rose-50/50' : 'border-rose-200 bg-rose-50/30'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
            <ShieldAlert className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-rose-800">
              Regulatory commitment{regulatoryBody ? ` · ${regulatoryBody}` : ''}
            </h2>
            <p className="mt-0.5 text-xs text-rose-700/80">
              {regulatoryDueDate
                ? <>Mandated due {regulatoryDueDate.slice(0, 10)} · <span className="font-semibold">{daysLabel(regulatoryDueDate)}</span></>
                : 'Externally-mandated — timeline fixed by the regulator.'}
            </p>
          </div>
        </div>
        {canEdit && (
          <button onClick={() => setEditing(true)} className="inline-flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>
    </div>
  );
}
