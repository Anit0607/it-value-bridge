'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setDemandStatus, approveDemand } from '@/lib/actions/demands';
import { formatInr, BENEFIT_CATEGORY_LABEL, CATEGORY_TONE, BENEFIT_UNIT_LABEL } from '@/lib/value';
import { DEMAND_STATUS_LABEL, DEMAND_STATUS_TONE, DEMAND_PRIORITY_LABEL, DEMAND_PRIORITY_TONE } from '@/lib/demand';
import { VERTICAL_HEADS } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import type { BenefitCategory, BenefitUnit, DemandStatus, DemandPriority } from '@prisma/client';
import { ChevronLeft, CheckCircle2, ArrowRight } from 'lucide-react';

interface DemandView {
  id: string;
  title: string;
  requirement: string;
  raisedByName: string;
  status: DemandStatus;
  priority: DemandPriority;
  reviewNote: string;
  createdAt: string;
  convertedInitiative: { id: string; title: string } | null;
  benefitClaims: {
    id: string;
    category: BenefitCategory;
    metricName: string;
    unit: BenefitUnit;
    estimatedAnnualValueInr: number;
    baselineValue: number | null;
    targetValue: number | null;
    narrative: string;
  }[];
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

export function DemandDetailClient({ demand, canTriage }: { demand: DemandView; canTriage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState(demand.reviewNote);
  const [showApprove, setShowApprove] = useState(false);
  const [error, setError] = useState('');

  // approval completion fields
  const [type, setType] = useState<'Change Request' | 'Project'>('Project');
  const [verticalHead, setVerticalHead] = useState<string>(VERTICAL_HEADS[0]);
  const [businessSpoc, setBusinessSpoc] = useState(demand.raisedByName);
  const [businessSponsor, setBusinessSponsor] = useState('');
  const [goLiveDate, setGoLiveDate] = useState('');

  const totalValue = demand.benefitClaims.reduce((s, b) => s + b.estimatedAnnualValueInr, 0);
  const converted = !!demand.convertedInitiative;

  const triage = (status: DemandStatus) => {
    startTransition(async () => {
      await setDemandStatus(demand.id, status, note);
      router.refresh();
    });
  };

  const approve = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!businessSponsor.trim() || !goLiveDate) {
      setError('Sponsor and expected go-live date are required to convert.');
      return;
    }
    startTransition(async () => {
      try {
        const initiativeId = await approveDemand(demand.id, { type, verticalHead, businessSpoc, businessSponsor, goLiveDate });
        router.push(`/items/${initiativeId}`);
      } catch {
        setError('Could not convert this demand. Please try again.');
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/demands" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ChevronLeft className="h-4 w-4" />
        Demand funnel
      </Link>

      <PageHeader title={demand.title} subtitle={`Raised by ${demand.raisedByName} · ${demand.createdAt}`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${DEMAND_PRIORITY_TONE[demand.priority]}`}>
            {DEMAND_PRIORITY_LABEL[demand.priority]}
          </span>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${DEMAND_STATUS_TONE[demand.status]}`}>
            {DEMAND_STATUS_LABEL[demand.status]}
          </span>
        </div>
      </PageHeader>

      {converted && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Converted to initiative
          </div>
          <Link href={`/items/${demand.convertedInitiative!.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline">
            {demand.convertedInitiative!.title}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Requirement</h2>
        <p className="text-sm text-slate-700">{demand.requirement}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">Targeted Business Value</h2>
          <span className="text-xs text-slate-400">Total <span className="tabular font-semibold text-brand-700">{formatInr(totalValue)}</span></span>
        </div>
        <div className="divide-y divide-slate-100">
          {demand.benefitClaims.map(b => (
            <div key={b.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <span className={`h-2 w-2 rounded-full ${CATEGORY_TONE[b.category]}`} />
                  {BENEFIT_CATEGORY_LABEL[b.category]}
                </span>
                <span className="tabular text-sm font-semibold text-slate-800">{formatInr(b.estimatedAnnualValueInr)}</span>
              </div>
              <div className="mt-1 text-sm text-slate-600">{b.metricName}</div>
              {b.narrative && <div className="mt-0.5 text-xs text-slate-500">{b.narrative}</div>}
              {(b.baselineValue != null || b.targetValue != null) && (
                <div className="mt-1 text-xs text-slate-400">
                  {b.baselineValue != null && <>baseline {b.baselineValue}{BENEFIT_UNIT_LABEL[b.unit]} </>}
                  {b.targetValue != null && <>→ target {b.targetValue}{BENEFIT_UNIT_LABEL[b.unit]}</>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Triage */}
      {canTriage && !converted && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Triage</h2>
          <label className="mb-1 block text-sm font-medium text-slate-700">Review note</label>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} className={inputCls + ' resize-none'} placeholder="Optional note for this decision…" />

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => triage('UNDER_REVIEW')} disabled={isPending} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60">
              Mark Under Review
            </button>
            <button onClick={() => triage('ON_HOLD')} disabled={isPending} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60">
              Put On Hold
            </button>
            <button onClick={() => triage('REJECTED')} disabled={isPending} className="rounded-lg border border-rose-300 px-3.5 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60">
              Reject
            </button>
            <button onClick={() => setShowApprove(v => !v)} disabled={isPending} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
              <CheckCircle2 className="h-4 w-4" />
              Approve & convert
            </button>
          </div>

          {showApprove && (
            <form onSubmit={approve} className="mt-4 space-y-3 rounded-lg border border-brand-200 bg-brand-50/40 p-4">
              <p className="text-xs font-medium text-slate-600">Complete the initiative details to convert this demand:</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
                  <select value={type} onChange={e => setType(e.target.value as 'Change Request' | 'Project')} className={inputCls}>
                    <option value="Project">Project</option>
                    <option value="Change Request">Change Request</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">IT Vertical Head</label>
                  <select value={verticalHead} onChange={e => setVerticalHead(e.target.value)} className={inputCls}>
                    {VERTICAL_HEADS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Business SPOC</label>
                  <input value={businessSpoc} onChange={e => setBusinessSpoc(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Business Sponsor</label>
                  <input value={businessSponsor} onChange={e => setBusinessSponsor(e.target.value)} className={inputCls} placeholder="Full name" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Expected Go-Live</label>
                  <input type="date" value={goLiveDate} onChange={e => setGoLiveDate(e.target.value)} className={inputCls} />
                </div>
              </div>
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
              <button type="submit" disabled={isPending} className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
                {isPending ? 'Converting…' : 'Confirm & create initiative'}
              </button>
            </form>
          )}
        </div>
      )}

      {demand.reviewNote && !canTriage && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Review note</h2>
          <p className="text-sm text-slate-700">{demand.reviewNote}</p>
        </div>
      )}
    </div>
  );
}
