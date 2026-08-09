'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveInvestmentException } from '@/lib/actions/investment';
import { Badge } from '@/components/ui/Badge';
import { formatInr } from '@/lib/value';
import {
  INVESTMENT_CATEGORY_LABEL,
  GATE_STATUS_LABEL,
  GATE_STATUS_TONE,
  type GateResult,
} from '@/lib/investment';
import type { InvestmentCategory } from '@prisma/client';
import { Scale, ShieldCheck } from 'lucide-react';

export interface ExceptionRecord {
  id: string;
  roiAtApproval: number;
  thresholdAtApproval: number;
  valueInrAtApproval: number;
  tcoInrAtApproval: number;
  justification: string;
  approvedBy: string;
  approvedByRole: string;
  approvedAt: string;
}

export function InvestmentGatePanel({
  initiativeId,
  category,
  gate,
  exceptions,
  canApprove,
}: {
  initiativeId: string;
  category: InvestmentCategory;
  gate: GateResult;
  exceptions: ExceptionRecord[];
  /** CIO/ADMIN only — one tier above the roles that fund initiatives day to day. */
  canApprove: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (justification.trim().length < 20) {
      setError('Justification must be at least 20 characters — this goes on the record.');
      return;
    }
    setError('');
    startTransition(async () => {
      try {
        await approveInvestmentException(initiativeId, { justification });
        setOpen(false);
        setJustification('');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not record the exception.');
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Scale className="h-3.5 w-3.5" />
          Investment Basis
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="slate" size="sm">{INVESTMENT_CATEGORY_LABEL[category]}</Badge>
          <Badge tone={GATE_STATUS_TONE[gate.status]} size="sm">{GATE_STATUS_LABEL[gate.status]}</Badge>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-slate-600">{gate.reason}</p>

      {gate.status === 'exception_required' && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/60 p-4">
          <p className="text-sm font-semibold text-rose-800">Funding requires an approved exception</p>
          <p className="mt-1 text-xs leading-relaxed text-rose-700">
            This is not blocked — below-threshold work can proceed, but only with a written
            justification and sign-off from the CIO. The decision and the numbers behind it are
            recorded permanently.
          </p>

          {canApprove ? (
            open ? (
              <div className="mt-3 space-y-2">
                <textarea
                  rows={3}
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Why is this worth funding despite the shortfall? e.g. it unblocks a regulatory dependency, or protects a key client relationship."
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                {error && <p className="text-xs font-medium text-rose-700">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={submit}
                    disabled={isPending}
                    className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-60"
                  >
                    {isPending ? 'Recording…' : 'Approve exception'}
                  </button>
                  <button
                    onClick={() => { setOpen(false); setError(''); }}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
              >
                <ShieldCheck className="h-4 w-4" />
                Record an exception
              </button>
            )
          ) : (
            <p className="mt-3 text-xs font-medium text-rose-700">
              Only the CIO can approve an exception — one tier above the roles that fund
              initiatives day to day.
            </p>
          )}
        </div>
      )}

      {exceptions.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Exception history · {exceptions.length}
          </p>
          <ul className="space-y-2">
            {exceptions.map(e => (
              <li key={e.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-700">
                    {e.approvedBy} <span className="font-normal text-slate-400">({e.approvedByRole})</span>
                  </span>
                  <span className="tabular text-slate-400">{e.approvedAt}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{e.justification}</p>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Approved at <span className="tabular font-medium text-slate-600">{e.roiAtApproval.toFixed(1)}x</span>{' '}
                  against a {e.thresholdAtApproval.toFixed(1)}x minimum ·{' '}
                  {formatInr(e.valueInrAtApproval)} value vs {formatInr(e.tcoInrAtApproval)} cost
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
