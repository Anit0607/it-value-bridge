'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from '@/components/RoleProvider';
import { advanceStage, updateNotes, signOffValue, type InitiativeValue } from '@/lib/actions/initiatives';
import { computeRAG, daysInStage, daysFromNow, daysSinceUpdate } from '@/lib/rag';
import { formatInr, BENEFIT_CATEGORY_LABEL, CATEGORY_TONE, BENEFIT_UNIT_LABEL } from '@/lib/value';
import { RagBadge, RagDot } from '@/components/RagBadge';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { StageProgress } from '@/components/StageProgress';
import { SectionCard } from '@/components/ui/SectionCard';
import { STAGES } from '@/lib/types';
import type { Item, DelaySource, Role } from '@/lib/types';
import type { BenefitCategory, BenefitUnit } from '@prisma/client';
import {
  ChevronRight,
  ClipboardCheck,
  CheckCircle2,
  BadgeCheck,
  ShieldAlert,
  ArrowRight,
  History as HistoryIcon,
} from 'lucide-react';

const DELAY_SOURCES: DelaySource[] = ['IT', 'Business', 'Vendor', 'External'];

const ROLE_BACK: Record<Role, { href: string; label: string }> = {
  PMO: { href: '/pmo', label: 'PMO Control Tower' },
  CIO: { href: '/cio', label: 'Command Center' },
  VERTICAL_HEAD: { href: '/vertical-head', label: 'Ownership Workspace' },
  BUSINESS: { href: '/business', label: 'Value Validation' },
};

type AuditEvent = { label: string; tone: BadgeTone };

function getAuditEventType(note: string, isFirst: boolean): AuditEvent {
  const n = note.toLowerCase();
  if (isFirst || n.includes('created') || n.includes('registered'))
    return { label: 'Created', tone: 'success' };
  if (n.includes('moved to') || n.startsWith('move'))
    return { label: 'Stage moved', tone: 'brand' };
  if (n.includes('marked delayed'))
    return { label: 'Delay marked', tone: 'danger' };
  if (n.includes('delay cleared'))
    return { label: 'Delay cleared', tone: 'success' };
  if (n.includes('delay source updated'))
    return { label: 'Delay updated', tone: 'warning' };
  if (n.includes('stage update saved'))
    return { label: 'Notes updated', tone: 'slate' };
  if (n.includes('signed off') || n.includes('sign off'))
    return { label: 'Value signed off', tone: 'success' };
  if (n.includes('validated') || n.includes('validation') || n.includes('outcome'))
    return { label: 'Outcome validated', tone: 'success' };
  if (n.includes('dependency'))
    return { label: 'Dependency added', tone: 'brand' };
  if (n.includes('regulatory'))
    return { label: 'Regulatory updated', tone: 'danger' };
  return { label: 'Updated', tone: 'slate' };
}

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
  const [confirmingAdvance, setConfirmingAdvance] = useState(false);
  const [isPending, startTransition] = useTransition();

  const claims = value?.benefitClaims ?? [];
  const totalValue = claims.reduce((s, b) => s + b.estimatedAnnualValueInr, 0);

  // Role-specific UI permissions (server actions enforce the same rules server-side)
  const canSignOff     = user?.role === 'PMO' || user?.role === 'CIO';
  const canUpdateNotes = user?.role === 'PMO' || user?.role === 'CIO' || user?.role === 'VERTICAL_HEAD';
  const canAdvance     = user?.role === 'PMO' || user?.role === 'CIO' || user?.role === 'VERTICAL_HEAD';
  // canValidate declared below after `closed` is computed

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
  const [localDelayReason, setLocalDelayReason] = useState<string | null>(null);

  const rag = computeRAG(item);
  const days = daysInStage(item.stageStartDate);
  const daysToEta = daysFromNow(item.stageExpectedDate);
  const stageIdx = STAGES.indexOf(item.currentStage);
  const canProgress = stageIdx < STAGES.length - 1;
  const closed = item.currentStage === 'Closed';
  const canValidate = (user?.role === 'BUSINESS' || user?.role === 'PMO' || user?.role === 'CIO') &&
                      item.currentStage === 'Business Validation' && !closed;
  const currentNotes = localNotes ?? item.notes;
  const currentDelayed = localDelayed ?? item.delayed;
  const currentDelaySource = localDelaySource ?? item.delaySource;
  const currentDelayReason = localDelayReason ?? item.delayReason ?? '';
  const back = user ? (ROLE_BACK[user.role] ?? ROLE_BACK.PMO) : ROLE_BACK.PMO;

  // Rule-based action panel
  const requiredActions: { label: string; tone: 'danger' | 'warning' | 'brand' }[] = [];
  if (!closed) {
    if (rag === 'Red' && daysToEta < 0)
      requiredActions.push({ label: 'Escalate delay owner — initiative is overdue', tone: 'danger' });
    if (daysSinceUpdate(item.lastUpdated) > 7)
      requiredActions.push({ label: 'Update stage notes — no update in over 7 days', tone: 'warning' });
    if (item.currentStage === 'Business Validation' && !item.validation)
      requiredActions.push({ label: 'Awaiting business outcome validation from Business SPOC', tone: 'warning' });
    if (item.currentStage === 'AppSec')
      requiredActions.push({ label: 'Awaiting security clearance from AppSec team', tone: 'brand' });
    if (item.currentStage === 'CAB Approval')
      requiredActions.push({ label: 'Awaiting CAB approval before go-live', tone: 'brand' });
    if (item.isRegulatory && item.regulatoryDueDate && daysFromNow(item.regulatoryDueDate) < 14)
      requiredActions.push({ label: `Regulatory deadline approaching: ${item.regulatoryDueDate}`, tone: 'danger' });
  }
  if (closed && !value?.valueSignedOff && totalValue > 0)
    requiredActions.push({ label: 'PMO / CIO value sign-off pending — initiative is closed', tone: 'brand' });
  const isDirty =
    localNotes !== null || localDelayed !== null || localDelaySource !== undefined || localDelayReason !== null;

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
      await updateNotes(item.id, currentNotes, currentDelayed, currentDelaySource, currentDelayReason);
      setLocalNotes(null);
      setLocalDelayed(null);
      setLocalDelaySource(undefined);
      setLocalDelayReason(null);
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">
            Initiative Control Room
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{item.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">
              Current Stage: <span className="font-medium text-slate-700">{item.currentStage}</span>
            </span>
            <span className="text-slate-300">·</span>
            <RagBadge rag={rag} />
            <Badge tone={item.type === 'Project' ? 'violet' : 'sky'} size="sm">
              {item.type === 'Project' ? 'Project' : 'CR'}
            </Badge>
            {item.isRegulatory && (
              <Badge tone="danger" size="sm">
                <ShieldAlert className="mr-1 h-3 w-3" />
                Regulatory{item.regulatoryBody ? ` · ${item.regulatoryBody}` : ''}
              </Badge>
            )}
          </div>
        </div>
        {canValidate && (
          <Link
            href={`/items/${item.id}/validate`}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <ClipboardCheck className="h-4 w-4" />
            Validate Outcome
          </Link>
        )}
      </div>

      {/* Status strip */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
        <dl className="flex min-w-max divide-x divide-slate-100">
          {([
            {
              label: 'Current Stage',
              node: <span className="text-sm font-semibold text-slate-800">{item.currentStage}</span>,
            },
            {
              label: 'Delivery Confidence',
              node: (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <RagDot rag={rag} />
                  {rag}
                </span>
              ),
            },
            {
              label: 'Days in Stage',
              node: <span className="text-sm font-semibold text-slate-800">{days}d</span>,
            },
            {
              label: 'ETA Status',
              node: closed ? (
                <span className="text-sm font-semibold text-emerald-600">Closed</span>
              ) : daysToEta < 0 ? (
                <span className="text-sm font-semibold text-rose-600">{Math.abs(daysToEta)}d overdue</span>
              ) : (
                <span className="text-sm font-semibold text-slate-800">{daysToEta}d to ETA</span>
              ),
            },
            {
              label: 'Delay Source',
              node: item.delaySource ? (
                <Badge tone="danger" size="sm">{item.delaySource}</Badge>
              ) : (
                <span className="text-sm text-slate-400">None</span>
              ),
            },
            {
              label: 'Business Value',
              node: totalValue > 0 ? (
                <span className="text-sm font-semibold text-brand-700">{formatInr(totalValue)}</span>
              ) : (
                <span className="text-sm text-slate-400">—</span>
              ),
            },
            {
              label: 'Regulatory',
              node: item.isRegulatory ? (
                <span className="text-sm font-semibold text-rose-600">{item.regulatoryBody ?? 'Yes'}</span>
              ) : (
                <span className="text-sm text-slate-400">None</span>
              ),
            },
          ] as const).map(f => (
            <div key={f.label} className="flex flex-col gap-1.5 px-4 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">{f.label}</dt>
              <dd>{f.node}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Action Required panel — only shown when there are active actions */}
      {requiredActions.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40 shadow-card">
          <div className="border-b border-amber-100 px-5 py-3">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-800">
              <AlertOctagon className="h-3.5 w-3.5 text-amber-500" />
              Action Required
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                {requiredActions.length}
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-amber-100">
            {requiredActions.map((a, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-3">
                <Badge tone={a.tone} size="sm" className="mt-0.5 shrink-0">
                  {a.tone === 'danger' ? 'Critical' : a.tone === 'warning' ? 'Action' : 'Pending'}
                </Badge>
                <span className="text-sm text-slate-700">{a.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stage progress */}
      <StageProgress currentStage={item.currentStage} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard title="Details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Vertical Head">{item.verticalHead}</Field>
              <Field label="Business SPOC">{item.businessSpoc}</Field>
              <Field label="Business Sponsor">{item.businessSponsor}</Field>
              <Field label="Go Live Date">{item.goLiveDate}</Field>
              <div className="col-span-2">
                <Field label="Requirement">{item.requirement}</Field>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title="Business Value"
            subtitle={totalValue > 0 ? formatInr(totalValue) : undefined}
            action={
              value?.valueSignedOff ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Signed off{value.valueSignOffBy ? ` · ${value.valueSignOffBy}` : ''}
                </span>
              ) : canSignOff && claims.length > 0 ? (
                <button
                  onClick={handleSignOff}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60"
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Sign off value
                </button>
              ) : undefined
            }
          >
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
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Validation Result</p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Outcome Achieved">{item.validation.outcomeAchieved}</Field>
                  <Field label="Actual Metric">{item.validation.actualMetric}</Field>
                  <div className="col-span-2">
                    <Field label="Actual Result">{item.validation.actualResult}</Field>
                  </div>
                </dl>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Audit Trail" icon={HistoryIcon} subtitle={`${item.history.length} events`}>
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {item.history.map((h, i) => {
                const { label, tone } = getAuditEventType(h.note ?? '', i === item.history.length - 1);
                return (
                  <li key={i} className="relative">
                    <div className="absolute -left-[21px] mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white">
                      <span className="h-2 w-2 rounded-full bg-brand-400" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={tone} size="sm">{label}</Badge>
                      <span className="text-[11px] text-slate-400">{h.stage}</span>
                    </div>
                    {h.note && <p className="mt-0.5 text-xs text-slate-600">{h.note}</p>}
                    <p className="mt-0.5 text-[10px] text-slate-400">{h.date} · {h.user}</p>
                  </li>
                );
              })}
            </ol>
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Current Stage metrics */}
          <SectionCard title="Current Stage" subtitle={item.currentStage}>
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
            {!closed && item.stageExpectedDate && (
              <p className="mt-3 text-center text-[11px] text-slate-400">
                Stage ETA: <span className="font-medium text-slate-600">{item.stageExpectedDate}</span>
              </p>
            )}
          </SectionCard>

          {/* Delay Management — PMO / CIO / Vertical Head only */}
          {canUpdateNotes && !closed && (
            <SectionCard title="Delay Management" tone="warning">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Stage notes</label>
                  <textarea
                    rows={3}
                    value={currentNotes}
                    onChange={e => setLocalNotes(e.target.value)}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                    placeholder="Add a note…"
                  />
                </div>
                <div className="flex items-center gap-2">
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
                  <div className="space-y-2">
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none"
                      value={currentDelaySource ?? ''}
                      onChange={e => setLocalDelaySource(e.target.value as DelaySource)}
                    >
                      <option value="">Delay owner / source…</option>
                      {DELAY_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input
                      type="text"
                      value={currentDelayReason}
                      onChange={e => setLocalDelayReason(e.target.value)}
                      placeholder="Reason for delay…"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                    />
                  </div>
                )}
                {isDirty && (
                  <button
                    onClick={handleSaveNotes}
                    disabled={isPending}
                    className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    {isPending ? 'Saving…' : 'Save notes'}
                  </button>
                )}
              </div>
            </SectionCard>
          )}

          {/* Stage Advancement — PMO / CIO / Vertical Head only */}
          {canAdvance && canProgress && !closed && (
            <SectionCard title="Advance Stage" tone="brand">
              <div className="space-y-2">
                {/* Stage transition arrow */}
                <div className="flex items-center justify-center gap-2 rounded-lg bg-brand-50/60 px-3 py-2.5">
                  <span className="text-sm font-semibold text-brand-700">{item.currentStage}</span>
                  <ArrowRight className="h-4 w-4 text-brand-400" strokeWidth={2} />
                  <span className="text-sm font-semibold text-brand-900">{STAGES[stageIdx + 1]}</span>
                </div>

                {confirmingAdvance ? (
                  /* Confirmation panel */
                  <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                    <p className="text-xs font-semibold text-amber-800">
                      You are about to move this initiative from{' '}
                      <span className="font-bold">{item.currentStage}</span> to{' '}
                      <span className="font-bold">{STAGES[stageIdx + 1]}</span>.
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-700">
                      This will reset delay flags, clear stage notes, and create a history entry.
                      This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleComplete}
                        disabled={isPending}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isPending ? 'Moving…' : 'Confirm & advance'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingAdvance(false)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal state */
                  <>
                    <label className="block text-xs font-medium text-slate-600">Completion note</label>
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Note for moving to next stage…"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                    />
                    <button
                      onClick={() => setConfirmingAdvance(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Move to: {STAGES[stageIdx + 1]}
                    </button>
                  </>
                )}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
