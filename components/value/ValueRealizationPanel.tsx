'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addValueMeasurement } from '@/lib/actions/value';
import { formatInr, BENEFIT_CATEGORY_LABEL, CATEGORY_TONE, BENEFIT_UNIT_LABEL, type RealizationStatus } from '@/lib/value';
import type { InitiativeValue } from '@/lib/actions/initiatives';
import type { BenefitCategory, BenefitUnit } from '@prisma/client';
import { LineChart, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const REALIZATION_BADGE: Record<RealizationStatus, { label: string; cls: string; Icon: typeof Clock } | null> = {
  realized: { label: 'Realized', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', Icon: CheckCircle2 },
  pending: { label: 'Realization pending', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20', Icon: Clock },
  overdue: { label: 'Realization overdue', cls: 'bg-rose-50 text-rose-700 ring-rose-600/20', Icon: AlertTriangle },
  na: null,
};

const HORIZONS = ['+3m', '+6m', '+12m'] as const;

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

function latestRealized(measurements: InitiativeValue['benefitClaims'][number]['measurements']): number {
  if (measurements.length === 0) return 0;
  // getInitiativeValue returns measurements ordered desc by measuredAt
  return measurements[0].realizedInr ?? 0;
}

export function ValueRealizationPanel({
  initiativeId,
  value,
  canRecord,
  realization,
}: {
  initiativeId: string;
  value: InitiativeValue;
  canRecord: boolean;
  realization?: { status: RealizationStatus; dueIso: string | null };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openClaim, setOpenClaim] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ horizonLabel: '+3m' as (typeof HORIZONS)[number], realizedInr: '', scale: 10_000_000, actualValue: '', note: '' });

  const claims = value.benefitClaims;
  if (claims.length === 0) return null;

  const totalProjected = claims.reduce((s, c) => s + c.estimatedAnnualValueInr, 0);
  const totalRealized = claims.reduce((s, c) => s + latestRealized(c.measurements), 0);
  const realizationPct = totalProjected > 0 ? Math.round((totalRealized / totalProjected) * 100) : 0;

  const badge = realization && realization.status !== 'na' ? REALIZATION_BADGE[realization.status] : null;
  const BadgeIcon = badge?.Icon;

  const submit = (claimId: string) => {
    setError('');
    const realized = form.realizedInr ? parseFloat(form.realizedInr) * form.scale : null;
    const actual = form.actualValue ? parseFloat(form.actualValue) : null;
    if (realized == null && actual == null) {
      setError('Enter a realized ₹ value or an actual metric reading.');
      return;
    }
    startTransition(async () => {
      try {
        await addValueMeasurement({
          benefitClaimId: claimId,
          initiativeId,
          horizonLabel: form.horizonLabel,
          realizedInr: realized,
          actualValue: actual,
          note: form.note.trim(),
        });
        setOpenClaim(null);
        setForm({ horizonLabel: '+3m', realizedInr: '', scale: 10_000_000, actualValue: '', note: '' });
        router.refresh();
      } catch {
        setError('Could not save the reading. Please try again.');
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <LineChart className="h-3.5 w-3.5" />
            Value Realization
          </h2>
          {badge && BadgeIcon && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${badge.cls}`}>
              <BadgeIcon className="h-3 w-3" />
              {badge.label}
              {realization?.dueIso && realization.status !== 'realized' ? ` · due ${realization.dueIso}` : ''}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          Realized <span className="tabular font-semibold text-emerald-600">{formatInr(totalRealized)}</span>
          {' '}of {formatInr(totalProjected)} ({realizationPct}%)
        </span>
      </div>

      <div className="space-y-4">
        {claims.map(c => {
          const realized = latestRealized(c.measurements);
          const pct = c.estimatedAnnualValueInr > 0 ? Math.min(100, Math.round((realized / c.estimatedAnnualValueInr) * 100)) : 0;
          return (
            <div key={c.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <span className={`h-2 w-2 rounded-full ${CATEGORY_TONE[c.category as BenefitCategory]}`} />
                  {BENEFIT_CATEGORY_LABEL[c.category as BenefitCategory]}
                </span>
                <span className="text-xs text-slate-500">
                  <span className="tabular font-semibold text-emerald-600">{formatInr(realized)}</span> / {formatInr(c.estimatedAnnualValueInr)}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{c.metricName}</div>

              {/* projected vs realized bar */}
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>

              {/* measurement history */}
              {c.measurements.length > 0 && (
                <ul className="mt-2.5 space-y-1">
                  {c.measurements.map(m => (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        <span className="font-medium text-slate-700">{m.horizonLabel}</span>
                        {m.realizedInr != null && <> · {formatInr(m.realizedInr)}</>}
                        {m.actualValue != null && <> · actual {m.actualValue}{BENEFIT_UNIT_LABEL[c.unit as BenefitUnit]}</>}
                        {m.note && <> · {m.note}</>}
                      </span>
                      <span className="flex-shrink-0 tabular text-slate-400">{m.measuredAt}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* record form */}
              {canRecord && (
                openClaim === c.id ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">Horizon</label>
                        <select value={form.horizonLabel} onChange={e => setForm(f => ({ ...f, horizonLabel: e.target.value as (typeof HORIZONS)[number] }))} className={inputCls}>
                          {HORIZONS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">Realized value</label>
                        <div className="flex gap-1.5">
                          <input type="number" step="any" min="0" value={form.realizedInr} onChange={e => setForm(f => ({ ...f, realizedInr: e.target.value }))} className={inputCls} placeholder="0" />
                          <select value={form.scale} onChange={e => setForm(f => ({ ...f, scale: Number(e.target.value) }))} className="rounded-lg border border-slate-300 px-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none">
                            <option value={10_000_000}>₹ Cr</option>
                            <option value={100_000}>₹ Lakh</option>
                            <option value={1}>₹</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">Actual {BENEFIT_UNIT_LABEL[c.unit as BenefitUnit]}</label>
                        <input type="number" step="any" value={form.actualValue} onChange={e => setForm(f => ({ ...f, actualValue: e.target.value }))} className={inputCls} placeholder="—" />
                      </div>
                    </div>
                    <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={inputCls} placeholder="Note (optional)" />
                    {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => submit(c.id)} disabled={isPending} className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
                        {isPending ? 'Saving…' : 'Save reading'}
                      </button>
                      <button onClick={() => { setOpenClaim(null); setError(''); }} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setOpenClaim(c.id); setError(''); }} className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                    <Plus className="h-3.5 w-3.5" />
                    Record realized value
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
