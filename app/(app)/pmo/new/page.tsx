'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/components/RoleProvider';
import { createInitiative } from '@/lib/actions/initiatives';
import { VERTICAL_HEADS } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { BenefitPicker, type BenefitDraft } from '@/components/value/BenefitPicker';
import { Button } from '@/components/ui/Button';
import { formatInr, BENEFIT_CATEGORY_LABEL } from '@/lib/value';
import type { BenefitCategory } from '@prisma/client';
import { CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

const STEPS = [
  { n: 1, label: 'Initiative Identity' },
  { n: 2, label: 'Ownership' },
  { n: 3, label: 'Delivery Commitment' },
  { n: 4, label: 'Business Value' },
  { n: 5, label: 'Regulatory' },
  { n: 6, label: 'Review & Submit' },
];

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 text-sm">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="col-span-2 text-slate-800">{value || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

export default function NewItemPage() {
  const { user } = useRole();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Step 1 — Initiative Identity
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'Change Request' | 'Project'>('Change Request');
  const [requirement, setRequirement] = useState('');

  // Step 2 — Ownership
  const [verticalHead, setVerticalHead] = useState<string>(VERTICAL_HEADS[0] ?? '');
  const [businessSpoc, setBusinessSpoc] = useState('');
  const [businessSponsor, setBusinessSponsor] = useState('');

  // Step 3 — Delivery Commitment
  const [goLiveDate, setGoLiveDate] = useState('');

  // Step 4 — Business Value
  const [benefits, setBenefits] = useState<BenefitDraft[]>([]);

  // Step 5 — Regulatory
  const [isRegulatory, setIsRegulatory] = useState(false);
  const [regBody, setRegBody] = useState('');
  const [regDue, setRegDue] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const validateStep = (n: number): string => {
    if (n === 1) {
      if (!title.trim()) return 'Initiative title is required.';
      if (title.trim().length < 5) return 'Initiative title must be at least 5 characters.';
      if (!requirement.trim()) return 'Brief requirement description is required.';
      if (requirement.trim().length < 20) return 'Requirement description must be at least 20 characters — add enough context for governance.';
    }
    if (n === 2) {
      if (!businessSpoc.trim()) return 'Business SPOC name is required.';
      if (!businessSponsor.trim()) return 'Business Sponsor name is required.';
    }
    if (n === 3) {
      if (!goLiveDate) return 'Expected go-live date is required.';
      if (goLiveDate < today) return 'Go-live date cannot be in the past. Update the date or contact PMO.';
    }
    if (n === 4) {
      if (benefits.length === 0) return 'Define at least one business benefit before proceeding.';
      const noMetric = benefits.find(b => !b.metricName?.trim());
      if (noMetric) return 'Each benefit category needs a metric name (e.g. "Reduce transaction failure rate").';
      const noValue = benefits.find(b => b.estimatedAnnualValueInr <= 0);
      if (noValue) return 'Each benefit must have an estimated annual value greater than ₹0.';
    }
    if (n === 5) {
      if (isRegulatory) {
        if (!regBody.trim()) return 'Regulator / body is required when the initiative is compliance-mandated.';
        if (!regDue) return 'Mandated due date is required when the initiative is compliance-mandated.';
      }
    }
    return '';
  };

  // Soft warning: regulatory due date should not be after go-live date
  const regDueWarning =
    isRegulatory && regDue && goLiveDate && regDue > goLiveDate
      ? `Regulatory due date (${regDue}) is after the go-live date (${goLiveDate}). Consider aligning these or flag the risk.`
      : '';

  const next = () => {
    const msg = validateStep(step);
    if (msg) { setError(msg); return; }
    setError('');
    setStep(s => Math.min(s + 1, 6));
  };

  const back = () => { setError(''); setStep(s => Math.max(s - 1, 1)); };

  const handleSubmit = () => {
    const msg = validateStep(step);
    if (msg) { setError(msg); return; }
    if (!user) return;
    setError('');
    startTransition(async () => {
      try {
        const id = await createInitiative({
          title, type, requirement,
          verticalHead, businessSpoc, businessSponsor,
          goLiveDate, benefits,
          isRegulatory,
          regulatoryBody: isRegulatory ? regBody : undefined,
          regulatoryDueDate: isRegulatory && regDue ? regDue : undefined,
        });
        router.push(`/items/${id}`);
      } catch {
        setError('Failed to create initiative. Please check all fields and try again.');
      }
    });
  };

  if (!user) return null;

  const totalProjectedValue = benefits.reduce((s, b) => s + b.estimatedAnnualValueInr, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Register New IT Initiative"
        subtitle="Define the initiative, ownership, delivery commitment, and business value up front"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      {/* ── Left: form ── */}
      <div className="space-y-6">

      {/* Step indicator */}
      <div className="overflow-x-auto">
        <ol className="flex min-w-max items-center gap-0">
          {STEPS.map((s, i) => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <li key={s.n} className="flex items-center">
                <button
                  type="button"
                  onClick={() => { if (done) { setError(''); setStep(s.n); } }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    active ? 'text-brand-700' : done ? 'cursor-pointer text-brand-600 hover:text-brand-800' : 'cursor-default text-slate-400'
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    done ? 'bg-brand-600 text-white' : active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.n}
                  </span>
                  <span className="hidden sm:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
              </li>
            );
          })}
        </ol>
        <div className="mt-1 h-0.5 rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step panels */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">

        {/* Step 1 — Initiative Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Initiative Identity</h2>
            <p className="text-sm text-slate-500">Name the initiative and describe what needs to be built or changed.</p>
            <Field label="Initiative Title" required>
              <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="e.g. UPI Enhancement v3.0" />
            </Field>
            <Field label="Type" required>
              <select value={type} onChange={e => setType(e.target.value as typeof type)} className={inputCls}>
                <option value="Change Request">Change Request (CR)</option>
                <option value="Project">Project</option>
              </select>
            </Field>
            <Field label="Brief Requirement Description" required>
              <textarea value={requirement} onChange={e => setRequirement(e.target.value)} rows={4} className={inputCls + ' resize-none'} placeholder="Describe what needs to be built or changed, and why it is needed…" />
            </Field>
          </div>
        )}

        {/* Step 2 — Ownership */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Ownership</h2>
            <p className="text-sm text-slate-500">Assign the IT vertical head, business SPOC, and business sponsor for this initiative.</p>
            <Field label="IT Vertical Head" required>
              <select value={verticalHead} onChange={e => setVerticalHead(e.target.value)} className={inputCls}>
                {VERTICAL_HEADS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business SPOC" required>
                <input value={businessSpoc} onChange={e => setBusinessSpoc(e.target.value)} className={inputCls} placeholder="Full name" />
              </Field>
              <Field label="Business Sponsor" required>
                <input value={businessSponsor} onChange={e => setBusinessSponsor(e.target.value)} className={inputCls} placeholder="Full name" />
              </Field>
            </div>
          </div>
        )}

        {/* Step 3 — Delivery Commitment */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Delivery Commitment</h2>
            <p className="text-sm text-slate-500">Set the expected go-live date. This becomes the governance reference for tracking slippage.</p>
            <Field label="Expected Go-Live Date" required>
              <input type="date" value={goLiveDate} onChange={e => setGoLiveDate(e.target.value)} className={inputCls} />
            </Field>
            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-500">
              The go-live date is used to compute commitment slippage in the CIO dashboard and leadership reports.
            </div>
          </div>
        )}

        {/* Step 4 — Business Value */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Business Value</h2>
            <p className="text-sm text-slate-500">Define the measurable business value this initiative will deliver. At least one complete benefit is required.</p>
            <BenefitPicker onChange={setBenefits} />
            {totalProjectedValue > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-2.5">
                <span className="text-sm font-medium text-brand-700">Total projected annual value</span>
                <span className="tabular text-base font-semibold text-brand-700">{formatInr(totalProjectedValue)}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 5 — Regulatory / Compliance */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Regulatory / Compliance</h2>
            <p className="text-sm text-slate-500">Flag this initiative if it is mandated by a regulator such as RBI, NPCI, or SEBI.</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-brand-300">
              <input
                type="checkbox"
                checked={isRegulatory}
                onChange={e => setIsRegulatory(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">Regulatory / compliance-mandated</p>
                <p className="mt-0.5 text-xs text-slate-500">Check this if delivery is required by an external regulator or policy mandate.</p>
              </div>
            </label>
            {isRegulatory && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Regulator / body">
                  <input value={regBody} onChange={e => setRegBody(e.target.value)} className={inputCls} placeholder="e.g. RBI, NPCI, SEBI" />
                </Field>
                <Field label="Mandated due date">
                  <input type="date" value={regDue} onChange={e => setRegDue(e.target.value)} className={inputCls} />
                </Field>
              </div>
            {regDueWarning && (
              <p className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-700">
                ⚠ {regDueWarning}
              </p>
            )}
            )}
            {!isRegulatory && (
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-500">
                Skip this step if the initiative is not externally mandated.
              </div>
            )}
          </div>
        )}

        {/* Step 6 — Review & Submit */}
        {step === 6 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900">Review & Submit</h2>
            <p className="text-sm text-slate-500">Confirm the details below before registering the initiative.</p>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50/40 p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Initiative Identity</p>
                <dl className="divide-y divide-slate-100">
                  <SummaryRow label="Title" value={title} />
                  <SummaryRow label="Type" value={type} />
                  <SummaryRow label="Requirement" value={requirement} />
                </dl>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/40 p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ownership</p>
                <dl className="divide-y divide-slate-100">
                  <SummaryRow label="IT Vertical Head" value={verticalHead} />
                  <SummaryRow label="Business SPOC" value={businessSpoc} />
                  <SummaryRow label="Business Sponsor" value={businessSponsor} />
                </dl>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/40 p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Delivery Commitment</p>
                <dl className="divide-y divide-slate-100">
                  <SummaryRow label="Go-Live Date" value={goLiveDate} />
                </dl>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/40 p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Business Value</p>
                <dl className="divide-y divide-slate-100">
                  <SummaryRow label="Benefits defined" value={`${benefits.length} benefit categor${benefits.length !== 1 ? 'ies' : 'y'}`} />
                </dl>
              </div>
              {isRegulatory && (
                <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rose-500">Regulatory / Compliance</p>
                  <dl className="divide-y divide-rose-100">
                    <SummaryRow label="Regulator" value={regBody || 'Not specified'} />
                    <SummaryRow label="Mandated due" value={regDue || 'Not specified'} />
                  </dl>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        {step > 1 ? (
          <Button variant="secondary" icon={ChevronLeft} onClick={back}>Back</Button>
        ) : (
          <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
        )}
        {step < 6 ? (
          <Button variant="primary" icon={ChevronRight} iconPosition="right" onClick={next}>
            {step === 5 ? 'Review Initiative' : `Next: ${STEPS[step].label}`}
          </Button>
        ) : (
          <Button variant="primary" icon={CheckCircle2} onClick={handleSubmit} loading={isPending}>
            {isPending ? 'Creating…' : 'Submit & Create Initiative'}
          </Button>
        )}
      </div>
      </div>{/* end left column */}

      {/* ── Right: sticky creation summary ── */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Creation Summary</h3>
          </div>
          <dl className="divide-y divide-slate-100 px-5 py-2">
            {[
              { label: 'Type',            value: type === 'Change Request' ? 'CR' : 'Project', show: true },
              { label: 'Title',           value: title, show: !!title },
              { label: 'Vertical Head',   value: verticalHead, show: !!verticalHead },
              { label: 'Business SPOC',   value: businessSpoc, show: !!businessSpoc },
              { label: 'Business Sponsor',value: businessSponsor, show: !!businessSponsor },
              { label: 'Go-Live',         value: goLiveDate, show: !!goLiveDate },
              {
                label: 'Benefits',
                value: benefits.map(b => BENEFIT_CATEGORY_LABEL[b.category as BenefitCategory]).join(', '),
                show: benefits.length > 0,
              },
              {
                label: 'Projected Value',
                value: totalProjectedValue > 0 ? formatInr(totalProjectedValue) : '',
                show: totalProjectedValue > 0,
              },
              { label: 'Regulatory',      value: isRegulatory ? (regBody || 'Yes') : '', show: isRegulatory },
            ].filter(r => r.show).map(r => (
              <div key={r.label} className="py-2.5">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{r.label}</dt>
                <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">{r.value}</dd>
              </div>
            ))}
            {!title && !verticalHead && !goLiveDate && (
              <p className="py-4 text-center text-xs text-slate-400">Start filling the form to see your summary here.</p>
            )}
          </dl>
          <div className="border-t border-slate-100 px-5 py-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Step {step} of {STEPS.length}</span>
              <span>{Math.round(((step - 1) / (STEPS.length - 1)) * 100)}% complete</span>
            </div>
          </div>
        </div>
      </aside>

      </div>{/* end grid */}
    </div>
  );
}
