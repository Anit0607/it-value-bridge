'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approvePendingChange, rejectPendingChange, restateValue } from '@/lib/actions/integrity';
import { formatInr } from '@/lib/value';
import type { InitiativeIntegrity } from '@/lib/queries/integrity';
import { ShieldCheck, Check, X, History, FileWarning } from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

const KIND_LABEL: Record<'VALUE_SIGN_OFF' | 'COST_CHANGE', string> = {
  VALUE_SIGN_OFF: 'Value sign-off',
  COST_CHANGE: 'Cost change',
};

/**
 * Chain of custody for this initiative's numbers (docs/ROADMAP.md M3).
 *
 * Shows what is awaiting a second approver, what was decided and by whom, and
 * every restatement. Rendered even when empty for a signed-off initiative,
 * because "nothing was ever changed" is itself the assurance a reviewer wants.
 */
export function IntegrityPanel({
  initiativeId,
  integrity,
  currentUserName,
  canDecide,
  canRestate,
  valueSignedOff,
}: {
  initiativeId: string;
  integrity: InitiativeIntegrity;
  currentUserName: string;
  canDecide: boolean;
  canRestate: boolean;
  valueSignedOff: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [restateOpen, setRestateOpen] = useState(false);
  const [reason, setReason] = useState('');

  const { pending, decided, restatements } = integrity;
  const hasAnything = pending.length > 0 || decided.length > 0 || restatements.length > 0;
  if (!hasAnything && !canRestate) return null;

  const decide = (approvalId: string, approve: boolean) => {
    setError('');
    startTransition(async () => {
      try {
        const note = notes[approvalId]?.trim();
        if (approve) await approvePendingChange(approvalId, { note });
        else await rejectPendingChange(approvalId, { note });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not record the decision.');
      }
    });
  };

  const submitRestatement = () => {
    setError('');
    startTransition(async () => {
      try {
        await restateValue(initiativeId, { reason: reason.trim() });
        setRestateOpen(false);
        setReason('');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not record the restatement.');
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          Chain of Custody
        </h2>
        <span className="text-[11px] text-slate-400">
          {integrity.materialityThresholdInr != null
            ? `Second approver required above ${formatInr(integrity.materialityThresholdInr)}`
            : 'Materiality threshold not configured — changes apply on one signature'}
        </span>
      </div>

      {error && <p className="mb-3 text-xs font-medium text-rose-600">{error}</p>}

      {/* Awaiting a second approver */}
      {pending.length > 0 && (
        <div className="mb-5 space-y-3">
          {pending.map(a => {
            const isOwnProposal = a.proposedBy === currentUserName;
            return (
              <div key={a.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">{KIND_LABEL[a.kind]} awaiting approval</span>
                  <span className="tabular text-xs text-slate-500">{a.proposedAt}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{a.summary}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Proposed by {a.proposedBy} ({a.proposedByRole}) · materiality {formatInr(a.materialityInr)}
                </p>

                {canDecide && (
                  isOwnProposal ? (
                    <p className="mt-2 text-[11px] font-medium text-amber-700">
                      You proposed this — it has to be decided by someone else.
                    </p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      <input
                        value={notes[a.id] ?? ''}
                        onChange={e => setNotes(n => ({ ...n, [a.id]: e.target.value }))}
                        className={inputCls}
                        placeholder="Decision note (optional)"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => decide(a.id, true)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => decide(a.id, false)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Restatements */}
      {restatements.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <FileWarning className="h-3 w-3" />
            Restatements
          </h3>
          <ul className="space-y-2">
            {restatements.map(r => (
              <li key={r.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-800">
                  <span className="tabular">
                    {formatInr(r.previousValueInr)} → <span className="font-semibold">{formatInr(r.newValueInr)}</span>
                  </span>
                  <span className="tabular text-xs text-slate-500">{r.restatedAt}</span>
                </div>
                {(r.previousTcoInr != null || r.newTcoInr != null) && (
                  <p className="mt-0.5 tabular text-[11px] text-slate-500">
                    Cost {r.previousTcoInr != null ? formatInr(r.previousTcoInr) : 'not captured'} →{' '}
                    {r.newTcoInr != null ? formatInr(r.newTcoInr) : 'not captured'}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-600">{r.reason}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Restated by {r.restatedBy} ({r.restatedByRole})
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Decided history */}
      {decided.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <History className="h-3 w-3" />
            Decision history
          </h3>
          <ul className="space-y-1.5">
            {decided.map(a => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 text-xs text-slate-500">
                <span>
                  <span
                    className={`mr-1.5 font-medium ${a.status === 'APPROVED' ? 'text-emerald-700' : 'text-rose-700'}`}
                  >
                    {a.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                  </span>
                  {a.summary} · proposed by {a.proposedBy}, decided by {a.decidedBy ?? '—'}
                  {a.decisionNote ? ` — ${a.decisionNote}` : ''}
                </span>
                <span className="flex-shrink-0 tabular text-slate-400">{a.decidedAt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Restate */}
      {canRestate && valueSignedOff && (
        restateOpen ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <p className="text-xs text-slate-600">
              Restating records the old figure against the new one and clears the sign-off, so the revised value has to
              be committed to again. It does not delete anything.
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="Why is this figure being restated? (minimum 20 characters — this is the record a reviewer reads)"
            />
            <div className="flex gap-2">
              <button
                onClick={submitRestatement}
                disabled={isPending || reason.trim().length < 20}
                className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                {isPending ? 'Recording…' : 'Record restatement'}
              </button>
              <button
                onClick={() => { setRestateOpen(false); setError(''); }}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setRestateOpen(true); setError(''); }}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            <FileWarning className="h-3.5 w-3.5" />
            Restate signed-off value
          </button>
        )
      )}

      {!hasAnything && !valueSignedOff && (
        <p className="text-xs text-slate-400">
          No approvals or restatements recorded. Anything that changes this initiative&apos;s value or cost above the
          materiality threshold will appear here with who proposed it and who approved it.
        </p>
      )}
    </div>
  );
}
