'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateInitiative, type EditInitiativeInput } from '@/lib/actions/initiatives';
import { VERTICAL_HEADS } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Button } from '@/components/ui/Button';
import { Save } from 'lucide-react';

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

interface Props {
  id: string;
  defaults: {
    title: string;
    requirement: string;
    verticalHead: string;
    businessSpoc: string;
    businessSponsor: string;
    goLiveDate: string;
    isRegulatory: boolean;
    regulatoryBody: string;
    regulatoryDueDate: string;
    programHeadName: string;
    programManagerName: string;
    businessHeadName: string;
    businessUnit: string;
    subBusinessUnit: string;
  };
}

export function EditClient({ id, defaults }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [title, setTitle] = useState(defaults.title);
  const [requirement, setRequirement] = useState(defaults.requirement);
  const [verticalHead, setVerticalHead] = useState<string>(defaults.verticalHead);
  const [businessSpoc, setBusinessSpoc] = useState(defaults.businessSpoc);
  const [businessSponsor, setBusinessSponsor] = useState(defaults.businessSponsor);
  const [goLiveDate, setGoLiveDate] = useState(defaults.goLiveDate);
  const [isRegulatory, setIsRegulatory] = useState(defaults.isRegulatory);
  const [regulatoryBody, setRegulatoryBody] = useState(defaults.regulatoryBody);
  const [regulatoryDueDate, setRegulatoryDueDate] = useState(defaults.regulatoryDueDate);
  const [programHeadName, setProgramHeadName] = useState(defaults.programHeadName);
  const [programManagerName, setProgramManagerName] = useState(defaults.programManagerName);
  const [businessHeadName, setBusinessHeadName] = useState(defaults.businessHeadName);
  const [businessUnit, setBusinessUnit] = useState(defaults.businessUnit);
  const [subBusinessUnit, setSubBusinessUnit] = useState(defaults.subBusinessUnit);

  const validate = (): string => {
    if (!title.trim() || title.trim().length < 5) return 'Title must be at least 5 characters.';
    if (!requirement.trim() || requirement.trim().length < 20) return 'Requirement must be at least 20 characters.';
    if (!businessSpoc.trim()) return 'Business SPOC is required.';
    if (!businessSponsor.trim()) return 'Business Sponsor is required.';
    if (!goLiveDate) return 'Expected go-live date is required.';
    if (isRegulatory && !regulatoryBody.trim()) return 'Regulator/body is required when compliance-mandated.';
    if (isRegulatory && !regulatoryDueDate) return 'Mandated due date is required when compliance-mandated.';
    return '';
  };

  const handleSave = () => {
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');

    const input: EditInitiativeInput = {
      title, requirement, verticalHead,
      businessSpoc, businessSponsor, goLiveDate,
      isRegulatory,
      regulatoryBody: isRegulatory ? regulatoryBody : undefined,
      regulatoryDueDate: isRegulatory ? regulatoryDueDate : undefined,
      programHeadName: programHeadName || undefined,
      programManagerName: programManagerName || undefined,
      businessHeadName: businessHeadName || undefined,
      businessUnit: businessUnit || undefined,
      subBusinessUnit: subBusinessUnit || undefined,
    };

    startTransition(async () => {
      try {
        await updateInitiative(id, input);
        router.push(`/items/${id}?edited=1`);
      } catch {
        setError('Failed to save changes. Please try again.');
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Edit Initiative"
        subtitle="Update metadata only — stage, audit trail, and value sign-off remain governed"
      />

      <div className="space-y-5">
        {/* Identity */}
        <SectionCard title="Initiative Identity">
          <div className="space-y-4">
            <Field label="Title" required>
              <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Requirement Description" required>
              <textarea value={requirement} onChange={e => setRequirement(e.target.value)} rows={4} className={inputCls + ' resize-none'} />
            </Field>
          </div>
        </SectionCard>

        {/* Ownership */}
        <SectionCard title="Ownership">
          <div className="space-y-4">
            <Field label="IT Vertical Head" required>
              <select value={verticalHead} onChange={e => setVerticalHead(e.target.value)} className={inputCls}>
                {VERTICAL_HEADS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business SPOC" required>
                <input value={businessSpoc} onChange={e => setBusinessSpoc(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Business Sponsor" required>
                <input value={businessSponsor} onChange={e => setBusinessSponsor(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* Manager-level assignment */}
        <SectionCard title="Assignment" subtitle="Optional — controls which managers see this initiative in their own workspace">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Program Head">
                <input value={programHeadName} onChange={e => setProgramHeadName(e.target.value)} className={inputCls} placeholder="Name of assigned Program Head" />
              </Field>
              <Field label="Program Manager">
                <input value={programManagerName} onChange={e => setProgramManagerName(e.target.value)} className={inputCls} placeholder="Name of assigned Program Manager" />
              </Field>
            </div>
            <Field label="Business Head">
              <input value={businessHeadName} onChange={e => setBusinessHeadName(e.target.value)} className={inputCls} placeholder="Name of assigned Business Head" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business Unit">
                <input value={businessUnit} onChange={e => setBusinessUnit(e.target.value)} className={inputCls} placeholder="e.g. Retail Banking" />
              </Field>
              <Field label="Sub Business Unit">
                <input value={subBusinessUnit} onChange={e => setSubBusinessUnit(e.target.value)} className={inputCls} placeholder="e.g. Retail Lending" />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* Delivery */}
        <SectionCard title="Delivery Commitment">
          <Field label="Expected Go-Live Date" required>
            <input type="date" value={goLiveDate} onChange={e => setGoLiveDate(e.target.value)} className={inputCls} />
          </Field>
        </SectionCard>

        {/* Regulatory */}
        <SectionCard title="Regulatory / Compliance">
          <div className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-brand-300">
              <input
                type="checkbox"
                checked={isRegulatory}
                onChange={e => setIsRegulatory(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">Regulatory / compliance-mandated</p>
                <p className="mt-0.5 text-xs text-slate-500">RBI, NPCI, SEBI, internal audit, compliance, cyber, or statutory requirement.</p>
              </div>
            </label>
            {isRegulatory && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Regulator / body" required>
                  <input value={regulatoryBody} onChange={e => setRegulatoryBody(e.target.value)} className={inputCls} placeholder="e.g. RBI, NPCI, SEBI" />
                </Field>
                <Field label="Mandated due date" required>
                  <input type="date" value={regulatoryDueDate} onChange={e => setRegulatoryDueDate(e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{error}</p>}

      <div className="flex items-center gap-3">
        <Button variant="primary" icon={Save} onClick={handleSave} loading={isPending}>
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
        <Button variant="secondary" onClick={() => router.push(`/items/${id}`)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
