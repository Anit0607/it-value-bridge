'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from '@/components/RoleProvider';
import { advanceStage, updateNotes, signOffValue, type InitiativeValue } from '@/lib/actions/initiatives';
import { computeRAG, daysInStage, daysFromNow } from '@/lib/rag';
import { formatInr, BENEFIT_CATEGORY_LABEL, CATEGORY_TONE, BENEFIT_UNIT_LABEL } from '@/lib/value';
import { RagBadge } from '@/components/RagBadge';
import { StageProgress } from '@/components/StageProgress';
import { STAGES } from '@/lib/types';
import type { Item, DelaySource, Role } from '@/lib/types';
import type { BenefitCategory, BenefitUnit } from '@prisma/client';
import {
  ChevronRight,
  ClipboardCheck,
  CheckCircle2,
  BadgeCheck,
  ArrowRight,
  History as HistoryIcon,
} from 'lucide-react';

const DELAY_SOURCES: DelaySource[] = ['IT', 'Business', 'Vendor', 'External'];

const ROLE_BACK: Record<Role, { href: string; label: string }> = {
  PMO: { href: '/pmo', label: 'Portfolio' },
  CIO: { href: '/cio', label: 'Dashboard' },
  VERTICAL_HEAD: { href: '/vertical-head', label: 'My Portfolio' },
  BUSINESS: { href: '/business', label: 'My Items' },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export function ItemDetailClient({ item, value }: { item: Item; value: InitiativeValue | null }) {
  const { user } = useRole();
  const router = useRouter();
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();

  const claims = value?.benefitClaims ?? [];
  const totalValue = claims.reduce((s, b) => s + b.estimatedAnnualValueInr, 0);
  const canSignOff = user?.role === 'PMO' || user?.role === 'CIO';

  const handleSignOff = () => {
    if (!user) return;
    startTransition(async () => {
      await signOffValue(item.id);
      router.refresh();
    });
  };
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const [localDelayed, setLocalDelayed] = useState<boolean | null>(null);
  const [localDelaySource, setLocalDelaySource] = useState<DelaySource | undefined>(undefined);

  const rag = computeRAG(item);
  const days = daysInStage(item.stageStartDate);
  const daysToEta = daysFromNow(item.stageExpectedDate);
  const stageIdx = STAGES.indexOf(item.currentStage);
  const canProgress = stageIdx < STAGES.length - 1;
  const closed = item.currentStage === 'Closed';
  const currentNotes = localNotes ?? item.notes;
  const currentDelayed = localDelayed ?? item.delayed;
  const currentDelaySource = localDelaySource ?? item.delaySource;
  const back = user ? (ROLE_BACK[user.role] ?? ROLE_BACK.PMO) : ROLE_BACK.PMO;
  const isDirty = localNotes !== null || localDelayed !== null || localDelaySource !== undefined;

  const handleComplete = () => {
    if (!user) return;
    startTransition(async () => {
      await advanceStage(item.id, note);
      setNote('');
      router.refresh();
    });
  };

  const handleSaveNotes = () => {
    if (!user) return;
    startTransition(async () => {
      await updateNotes(item.id, currentNotes, currentDelayed, currentDelaySource);
      setLocalNotes(null);
      setLocalDelayed(null);
      setLocalDelaySource(undefined);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link href={back.href} className="hover:text-brand-600">
          {back.label}
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-300" />
        <span className="text-slate-700">{item.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {item.type}
            </span>
            <RagBadge rag={rag} />
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{item.title}</h1>
        </div>
        {!closed && item.currentStage === 'Business Validation' && (
          <Link
            href={`/items/${item.id}/validate`}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-600"
          >
            <ClipboardCheck className="h-4 w-4" />
            Validate Outcome
          </Link>
        )}
      </div>

      {/* Stage progress */}
      <StageProgress currentStage={item.currentStage} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Vertical Head">{item.verticalHead}</Field>
              <Field label="Business SPOC">{item.businessSpoc}</Field>
              <Field label="Business Sponsor">{item.businessSponsor}</Field>
              <Field label="Go Live Date">{item.goLiveDate}</Field>
              <div className="col-span-2">
                <Field label="Requirement">{item.requirement}</Field>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Business Value</h2>
              <div className="flex items-center gap-2">
                {totalValue > 0 && (
                  <span className="text-xs text-slate-400">
                    Total <span className="tabular font-semibold text-brand-700">{formatInr(totalValue)}</span>
                  </span>
                )}
                {value?.valueSignedOff ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Signed off{value.valueSignOffBy ? ` · ${value.valueSignOffBy}` : ''}
                  </span>
                ) : (
                  canSignOff && claims.length > 0 && (
                    <button
                      onClick={handleSignOff}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60"
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Sign off value
                    </button>
                  )
                )}
              </div>
            </div>

            {claims.length > 0 ? (
              <ul className="space-y-2.5">
                {claims.map(b => (
                  <li key={b.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800">
                        <span className={`h-2 w-2 rounded-full ${CATEGORY_TONE[b.category as BenefitCategory]}`} />
                        {BENEFIT_CATEGORY_LABEL[b.category as BenefitCategory]}
                      </span>
                      <span className="tabular text-sm font-semibold text-slate-800">{formatInr(b.estimatedAnnualValueInr)}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{b.metricName}</div>
                    {b.narrative && <div className="mt-0.5 text-xs text-slate-500">{b.narrative}</div>}
                    {(b.baselineValue != null || b.targetValue != null) && (
                      <div className="mt-1 text-xs text-slate-400">
                        {b.baselineValue != null && <>baseline {b.baselineValue}{BENEFIT_UNIT_LABEL[b.unit as BenefitUnit]} </>}
                        {b.targetValue != null && <>→ target {b.targetValue}{BENEFIT_UNIT_LABEL[b.unit as BenefitUnit]}</>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Field label="Outcome Category">{item.outcomeCategory}</Field>
                <Field label="Target Metric">{item.targetMetric}</Field>
                <div className="col-span-2">
                  <Field label="Expected Outcome">{item.outcomeDescription}</Field>
                </div>
              </dl>
            )}

            {item.validation && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Validation Result</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Outcome Achieved">{item.validation.outcomeAchieved}</Field>
                  <Field label="Actual Metric">{item.validation.actualMetric}</Field>
                  <div className="col-span-2">
                    <Field label="Actual Result">{item.validation.actualResult}</Field>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* History */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <HistoryIcon className="h-3.5 w-3.5" />
              History
            </h2>
            <ol className="relative space-y-3 border-l border-slate-200 pl-5">
              {item.history.map((h, i) => (
                <li key={i} className="relative">
                  <div className="absolute -left-[21px] mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white">
                    <span className="h-2 w-2 rounded-full bg-brand-400" />
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-semibold text-slate-700">{h.stage}</span>
                    <span className="text-[11px] text-slate-400">{h.date} · {h.user}</span>
                  </div>
                  {h.note && <p className="mt-0.5 text-xs text-slate-500">{h.note}</p>}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Current stage card */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Current Stage</h2>
            <div className="mb-4 text-lg font-semibold text-slate-900">{item.currentStage}</div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 py-2.5">
                <div className="tabular text-xl font-semibold text-slate-900">{days}</div>
                <div className="text-[11px] text-slate-500">days in stage</div>
              </div>
              <div className={`rounded-lg py-2.5 ${daysToEta < 0 ? 'bg-rose-50' : daysToEta <= 14 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                <div className={`tabular text-xl font-semibold ${daysToEta < 0 ? 'text-rose-600' : daysToEta <= 14 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {Math.abs(daysToEta)}
                </div>
                <div className="text-[11px] text-slate-500">{daysToEta < 0 ? 'days overdue' : 'days to ETA'}</div>
              </div>
            </div>

            {!closed && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                {/* Notes */}
                <label className="mb-1 block text-xs font-medium text-slate-600">Stage notes</label>
                <textarea
                  rows={3}
                  value={currentNotes}
                  onChange={e => setLocalNotes(e.target.value)}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                  placeholder="Add a note…"
                />

                {/* Delay flag */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="delayed"
                    checked={currentDelayed}
                    onChange={e => setLocalDelayed(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="delayed" className="text-sm text-slate-700">Mark as delayed</label>
                </div>
                {currentDelayed && (
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none"
                    value={currentDelaySource ?? ''}
                    onChange={e => setLocalDelaySource(e.target.value as DelaySource)}
                  >
                    <option value="">Select delay source…</option>
                    {DELAY_SOURCES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}

                {isDirty && (
                  <button
                    onClick={handleSaveNotes}
                    disabled={isPending}
                    className="mt-3 w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    {isPending ? 'Saving…' : 'Save notes'}
                  </button>
                )}
              </div>
            )}

            {/* Advance stage */}
            {canProgress && !closed && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <label className="mb-1 block text-xs font-medium text-slate-600">Completion note</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={`Note for moving to next stage…`}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                />
                <button
                  onClick={handleComplete}
                  disabled={isPending}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isPending ? 'Moving…' : `Complete & advance`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
