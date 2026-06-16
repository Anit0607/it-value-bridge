'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useRequireAuth } from '@/components/RoleProvider';
import { computeRAG, daysInStage, daysFromNow } from '@/lib/rag';
import { RagBadge } from '@/components/RagBadge';
import { StageProgress } from '@/components/StageProgress';
import { STAGES } from '@/lib/types';
import type { DelaySource } from '@/lib/types';
import {
  ChevronRight,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  History as HistoryIcon,
} from 'lucide-react';

const DELAY_SOURCES: DelaySource[] = ['IT', 'Business', 'Vendor', 'External'];

const ROLE_BACK: Record<string, { href: string; label: string }> = {
  pmo: { href: '/pmo', label: 'Portfolio' },
  cio: { href: '/cio', label: 'Dashboard' },
  vh: { href: '/vertical-head', label: 'My Portfolio' },
  business: { href: '/business', label: 'My Items' },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export default function ItemDetailPage({ params }: { params: { id: string } }) {
  const user = useRequireAuth();
  const { getItem, updateItem, markStageComplete } = useStore();

  const item = getItem(params.id);
  const [note, setNote] = useState('');
  const [completing, setCompleting] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const [localDelayed, setLocalDelayed] = useState<boolean | null>(null);
  const [localDelaySource, setLocalDelaySource] = useState<DelaySource | undefined>(undefined);

  if (!user) return null;

  if (!item) {
    return (
      <div className="py-20 text-center text-sm text-slate-500">
        Item not found.{' '}
        <Link href="/pmo" className="font-medium text-brand-600 hover:underline">
          Back to portfolio
        </Link>
      </div>
    );
  }

  const rag = computeRAG(item);
  const days = daysInStage(item.stageStartDate);
  const daysToEta = daysFromNow(item.stageExpectedDate);
  const stageIdx = STAGES.indexOf(item.currentStage);
  const canProgress = stageIdx < STAGES.length - 1;
  const closed = item.currentStage === 'Closed';
  const currentNotes = localNotes ?? item.notes;
  const currentDelayed = localDelayed ?? item.delayed;
  const currentDelaySource = localDelaySource ?? item.delaySource;
  const back = ROLE_BACK[user.role] ?? ROLE_BACK.pmo;

  const handleComplete = () => {
    setCompleting(true);
    markStageComplete(item.id, note, user.name);
    setNote('');
    setCompleting(false);
  };

  const handleSaveNotes = () => {
    setSavingNotes(true);
    const today = new Date().toISOString().slice(0, 10);
    updateItem({
      ...item,
      notes: currentNotes,
      delayed: currentDelayed,
      delaySource: currentDelayed ? currentDelaySource : undefined,
      lastUpdated: today,
    });
    setLocalNotes(null);
    setLocalDelayed(null);
    setLocalDelaySource(undefined);
    setSavingNotes(false);
  };

  const isDirty = localNotes !== null || localDelayed !== null || localDelaySource !== undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link href={back.href} className="hover:text-brand-600">
          {back.label}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate font-medium text-slate-600">{item.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{item.title}</h1>
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                item.type === 'Project'
                  ? 'bg-violet-50 text-violet-700 ring-violet-600/20'
                  : 'bg-sky-50 text-sky-700 ring-sky-600/20'
              }`}
            >
              {item.type}
            </span>
            <RagBadge rag={rag} />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            ID {item.id} · Created {item.createdAt}
          </p>
        </div>
        {item.currentStage === 'Business Validation' && !item.validation && (
          <Link
            href={`/items/${item.id}/validate`}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-600"
          >
            <ClipboardCheck className="h-4 w-4" />
            Fill Validation
          </Link>
        )}
      </div>

      {/* Stage progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <StageProgress currentStage={item.currentStage} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Item Details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Vertical Head">{item.verticalHead}</Field>
              <Field label="Business SPOC">{item.businessSpoc}</Field>
              <Field label="Business Sponsor">{item.businessSponsor}</Field>
              <Field label="Expected Go Live"><span className="tabular">{item.goLiveDate}</span></Field>
              <div className="col-span-2">
                <dt className="text-xs font-medium text-slate-400">Requirement</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-slate-700">{item.requirement}</dd>
              </div>
            </dl>
          </div>

          {/* Business value */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Business Value</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-xs font-medium text-slate-400">Outcome Category</dt>
                <dd className="mt-1">
                  <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-600/20">
                    {item.outcomeCategory}
                  </span>
                </dd>
              </div>
              <Field label="Target Metric">{item.targetMetric}</Field>
              <div className="col-span-2">
                <dt className="text-xs font-medium text-slate-400">Expected Outcome</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-slate-700">{item.outcomeDescription}</dd>
              </div>
            </dl>
          </div>

          {/* Validation result */}
          {item.validation && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-card">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Business Validation Result
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-xs font-medium text-emerald-700/70">Outcome Achieved</dt>
                  <dd
                    className={`mt-0.5 text-sm font-semibold ${
                      item.validation.outcomeAchieved === 'Yes'
                        ? 'text-emerald-600'
                        : item.validation.outcomeAchieved === 'Partially'
                          ? 'text-amber-600'
                          : 'text-rose-600'
                    }`}
                  >
                    {item.validation.outcomeAchieved}
                  </dd>
                </div>
                <Field label="Actual Metric">{item.validation.actualMetric}</Field>
                <div className="col-span-2">
                  <dt className="text-xs font-medium text-emerald-700/70">Actual Result</dt>
                  <dd className="mt-0.5 text-sm text-slate-700">{item.validation.actualResult}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* Right column — current stage */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <p className="text-xs font-medium text-slate-400">Current Stage</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{item.currentStage}</p>
            </div>
            <dl className="space-y-2.5 px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">RAG Status</dt>
                <dd><RagBadge rag={rag} /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Days in Stage</dt>
                <dd className="tabular font-medium text-slate-800">{closed ? '—' : `${days}d`}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Stage ETA</dt>
                <dd
                  className={`tabular font-medium ${
                    closed ? 'text-slate-400' : daysToEta < 0 ? 'text-rose-600' : daysToEta <= 14 ? 'text-amber-600' : 'text-slate-800'
                  }`}
                >
                  {closed ? '—' : daysToEta < 0 ? `${Math.abs(daysToEta)}d overdue` : item.stageExpectedDate}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Last Updated</dt>
                <dd className="tabular text-slate-600">{item.lastUpdated}</dd>
              </div>
            </dl>

            {!closed && (
              <div className="space-y-4 border-t border-slate-100 px-5 py-4">
                {/* Delayed toggle */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Delayed?</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLocalDelayed(false)}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                        !currentDelayed
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      No
                    </button>
                    <button
                      onClick={() => setLocalDelayed(true)}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                        currentDelayed
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                  {currentDelayed && (
                    <div className="mt-2">
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">Delay Source</label>
                      <select
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        value={currentDelaySource ?? ''}
                        onChange={e => setLocalDelaySource(e.target.value as DelaySource)}
                      >
                        <option value="">Select…</option>
                        {DELAY_SOURCES.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Notes</label>
                  <textarea
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    value={currentNotes}
                    onChange={e => setLocalNotes(e.target.value)}
                    placeholder="Add notes…"
                  />
                </div>

                {isDirty && (
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="w-full rounded-lg border border-brand-300 bg-brand-50 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-60"
                  >
                    {savingNotes ? 'Saving…' : 'Save Notes / Delay Flag'}
                  </button>
                )}

                {canProgress && (
                  <div className="border-t border-slate-100 pt-4">
                    <input
                      type="text"
                      className="mb-2 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      placeholder="Completion note (optional)"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    />
                    <button
                      onClick={handleComplete}
                      disabled={completing}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
                    >
                      {completing ? 'Moving…' : `Complete → ${STAGES[stageIdx + 1]}`}
                      {!completing && <ArrowRight className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <HistoryIcon className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">History Log</h2>
        </div>
        <div className="px-5 py-4">
          <ol className="relative space-y-4 border-l border-slate-200 pl-6">
            {[...item.history].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[26px] flex h-4 w-4 items-center justify-center rounded-full bg-brand-100 ring-4 ring-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{h.stage}</span>
                  <span className="tabular text-xs text-slate-400">{h.date}</span>
                  <span className="text-xs text-slate-400">· {h.user}</span>
                </div>
                {h.note && <p className="mt-0.5 text-sm text-slate-600">{h.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
