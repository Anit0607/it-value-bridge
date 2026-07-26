import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Badge } from '@/components/ui/Badge';
import { Users, Layers, Building2, TrendingUp, Flag, ShieldAlert, Clock, BadgeCheck, ListOrdered } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MappingField {
  field: string;
  schemaField: string;
  required: boolean;
  notes?: string;
}

interface DataAreaMapping {
  id: number;
  area: string;
  icon: LucideIcon;
  purpose: string;
  fields: MappingField[];
}

const AREAS: DataAreaMapping[] = [
  {
    id: 1,
    area: 'Users',
    icon: Users,
    purpose: 'Every login, every dashboard, and every visibility rule starts here — get this wrong and nothing downstream scopes correctly.',
    fields: [
      { field: 'Full name', schemaField: 'User.name', required: true, notes: 'Must exactly match the name used on any initiative field that references this person (Vertical Head, Business SPOC, Program Head, Program Manager, Business Head) — matching is by name string, not ID.' },
      { field: 'Email', schemaField: 'User.email', required: true, notes: 'Unique — used as the login identifier.' },
      { field: 'Role', schemaField: 'User.role', required: true, notes: 'One of: ADMIN, CIO, PMO, VERTICAL_HEAD, BUSINESS, PROGRAM_HEAD, PROGRAM_MANAGER, BUSINESS_HEAD.' },
      { field: 'Organization', schemaField: 'User.organizationId', required: true, notes: 'The client workspace this user belongs to — every role-based visibility check is scoped by this.' },
      { field: 'Vertical Head name', schemaField: 'User.verticalHead', required: false, notes: 'Only for VERTICAL_HEAD users — their own name key, used to scope which initiatives they see.' },
      { field: 'Program Head name', schemaField: 'User.programHeadName', required: false, notes: 'Reporting-line metadata: who this user’s Program Head is.' },
      { field: 'Program Manager name', schemaField: 'User.programManagerName', required: false, notes: 'Reporting-line metadata: who this user’s Program Manager is.' },
      { field: 'Business Head name', schemaField: 'User.businessHeadName', required: false, notes: 'Reporting-line metadata: who this user’s Business Head is.' },
      { field: 'Business unit', schemaField: 'User.businessUnit', required: false, notes: 'e.g. "Retail Banking".' },
      { field: 'Sub-business unit', schemaField: 'User.subBusinessUnit', required: false, notes: 'e.g. "Digital Channels".' },
    ],
  },
  {
    id: 2,
    area: 'Initiatives',
    icon: Layers,
    purpose: 'The core portfolio record every dashboard, report, and reminder is built from.',
    fields: [
      { field: 'Title', schemaField: 'Initiative.title', required: true },
      { field: 'Type', schemaField: 'Initiative.type', required: true, notes: 'CHANGE_REQUEST or PROJECT.' },
      { field: 'Classification', schemaField: 'Initiative.classification', required: true, notes: 'STRATEGIC, MAJOR_PROJECT, TACTICAL, or BAU.' },
      { field: 'Current stage', schemaField: 'Initiative.currentStage', required: true, notes: 'One of 11 waterfall stages: BRD, FSD, COMMERCIAL, DEVELOPMENT, SIT, UAT, APPSEC, CAB_APPROVAL, GO_LIVE, BUSINESS_VALIDATION, CLOSED.' },
      { field: 'Owner (Vertical Head)', schemaField: 'Initiative.verticalHeadName', required: true, notes: 'Must exactly match a User.verticalHead value for that Vertical Head to see this initiative.' },
      { field: 'Business SPOC', schemaField: 'Initiative.businessSpoc', required: true, notes: 'Must exactly match a BUSINESS-role User.name.' },
      { field: 'Business Sponsor', schemaField: 'Initiative.businessSponsor', required: true },
      { field: 'Go-live date', schemaField: 'Initiative.expectedGoLiveDate', required: true },
      { field: 'Benefit category (summary)', schemaField: 'Initiative.benefitCategory', required: true, notes: 'REVENUE, COST_SAVING, CUSTOMER_EXPERIENCE, COMPLIANCE, EFFICIENCY, or RISK_REDUCTION.' },
      { field: 'Outcome description', schemaField: 'Initiative.outcomeDescription', required: true },
      { field: 'Target metric', schemaField: 'Initiative.targetMetric', required: true },
    ],
  },
  {
    id: 3,
    area: 'Hierarchy',
    icon: Building2,
    purpose: 'Determines exactly what each enterprise role sees — Program Head and Program Manager visibility depends entirely on these matching a real user’s name.',
    fields: [
      { field: 'Vertical Head', schemaField: 'Initiative.verticalHeadName', required: true, notes: 'Same field as in Initiatives above — listed again because it is the most load-bearing hierarchy field.' },
      { field: 'Program Head', schemaField: 'Initiative.programHeadName', required: false, notes: 'Required for that Program Head to see this initiative at all — see Current Release Scope for the name-matching caveat.' },
      { field: 'Program Manager', schemaField: 'Initiative.programManagerName', required: false, notes: 'Required for that Program Manager to see this initiative at all.' },
      { field: 'Business Head', schemaField: 'Initiative.businessHeadName', required: false, notes: 'Required for that Business Head to see this initiative at all.' },
      { field: 'Business unit', schemaField: 'Initiative.businessUnit', required: false },
      { field: 'Sub-business unit', schemaField: 'Initiative.subBusinessUnit', required: false },
    ],
  },
  {
    id: 4,
    area: 'Value Claims',
    icon: TrendingUp,
    purpose: 'Every ₹ figure on the Value Board, Value Report, and ROI metrics is built from these — an initiative with no claim shows zero value everywhere.',
    fields: [
      { field: 'Benefit category', schemaField: 'BenefitClaim.category', required: true, notes: 'REVENUE, COST_SAVING, CUSTOMER_EXPERIENCE, COMPLIANCE, EFFICIENCY, or RISK_REDUCTION.' },
      { field: 'Metric name', schemaField: 'BenefitClaim.metricName', required: true, notes: 'e.g. "UPI transaction drop rate".' },
      { field: 'Baseline value', schemaField: 'BenefitClaim.baselineValue', required: false },
      { field: 'Target value', schemaField: 'BenefitClaim.targetValue', required: false },
      { field: 'Unit', schemaField: 'BenefitClaim.unit', required: true, notes: 'INR, PERCENT, DAYS, HOURS, COUNT, or RATIO — defaults to INR.' },
      { field: 'Estimated annual value', schemaField: 'BenefitClaim.estimatedAnnualValueInr', required: true, notes: 'The ₹ figure driving every board rollup.' },
      { field: 'Confidence', schemaField: 'BenefitClaim.confidence', required: true, notes: 'HIGH, MEDIUM, or LOW.' },
      { field: 'Realization horizon (months)', schemaField: 'BenefitClaim.realizationHorizonMonths', required: false, notes: 'Defaults to 12.' },
      { field: 'Linked initiative or demand', schemaField: 'BenefitClaim.initiativeId / demandId', required: true, notes: 'At least one link is required.' },
    ],
  },
  {
    id: 5,
    area: 'Milestones',
    icon: Flag,
    purpose: 'Drives the Milestone Watch table, Milestone Risk KPI, and Action Center milestone reminders.',
    fields: [
      { field: 'Title', schemaField: 'Milestone.title', required: true, notes: 'e.g. "UAT Sign-off".' },
      { field: 'Description', schemaField: 'Milestone.description', required: false },
      { field: 'Owner (person/team)', schemaField: 'Milestone.owner', required: true },
      { field: 'Owner role', schemaField: 'Milestone.ownerRole', required: false, notes: 'PMO, IT, BUSINESS, or VENDOR.' },
      { field: 'Due date', schemaField: 'Milestone.dueDate', required: true },
      { field: 'Status', schemaField: 'Milestone.status', required: true, notes: 'NOT_STARTED, IN_PROGRESS, BLOCKED, or COMPLETED — defaults to NOT_STARTED.' },
      { field: 'Linked initiative', schemaField: 'Milestone.initiativeId', required: true },
    ],
  },
  {
    id: 6,
    area: 'Regulatory',
    icon: ShieldAlert,
    purpose: 'Feeds Regulatory Watch on the CIO dashboard and the Regulatory Deadline Risk reminder type.',
    fields: [
      { field: 'Regulatory flag', schemaField: 'Initiative.isRegulatory', required: true, notes: 'Defaults to false.' },
      { field: 'Regulatory body', schemaField: 'Initiative.regulatoryBody', required: true, notes: 'Required whenever the flag is true — e.g. RBI, NPCI, SEBI.' },
      { field: 'Regulatory due date', schemaField: 'Initiative.regulatoryDueDate', required: true, notes: 'Required whenever the flag is true.' },
    ],
  },
  {
    id: 7,
    area: 'Delays',
    icon: Clock,
    purpose: 'Feeds the PMO Work Queue, Delay Accountability, and Business/Vendor Delay reminders.',
    fields: [
      { field: 'Delayed flag', schemaField: 'Initiative.delayed', required: true, notes: 'Defaults to false.' },
      { field: 'Delay source', schemaField: 'Initiative.delaySource', required: true, notes: 'Required whenever the flag is true — IT, BUSINESS, VENDOR, or EXTERNAL.' },
      { field: 'Delay reason', schemaField: 'Initiative.delayReason', required: false, notes: 'Free text — recommended whenever a delay source is set.' },
    ],
  },
  {
    id: 8,
    area: 'Validations',
    icon: BadgeCheck,
    purpose: 'The Business SPOC’s outcome sign-off — drives the Value Delivered & Validated report section and confirms benefit realization.',
    fields: [
      { field: 'Outcome achieved', schemaField: 'BusinessValueRealization.outcomeAchieved', required: true, notes: 'YES, PARTIALLY, or NO.' },
      { field: 'Actual result', schemaField: 'BusinessValueRealization.actualResult', required: true, notes: 'Free text summary of what actually happened.' },
      { field: 'Actual metric', schemaField: 'BusinessValueRealization.actualMetric', required: true, notes: 'The measured value against the initiative’s target metric.' },
      { field: 'Realized date', schemaField: 'BusinessValueRealization.realizedDate', required: false },
      { field: 'Linked initiative', schemaField: 'BusinessValueRealization.initiativeId', required: true, notes: 'One validation per initiative.' },
    ],
  },
];

const IMPORT_ORDER = [
  { step: 1, label: 'Organization', detail: 'The client workspace every other record links to.' },
  { step: 2, label: 'Users', detail: 'Including hierarchy name fields — needed before initiatives can reference them by name.' },
  { step: 3, label: 'Initiatives', detail: 'Including hierarchy, regulatory, and delay fields, since those live on the same record.' },
  { step: 4, label: 'Milestones, Value Claims, Validations', detail: 'Each links to an initiative that must already exist.' },
];

export default async function ClientDataReadinessPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  if (session.user.role !== 'ADMIN') redirect('/');

  const totalFields = AREAS.reduce((s, a) => s + a.fields.length, 0);
  const requiredFields = AREAS.reduce((s, a) => s + a.fields.filter(f => f.required).length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Data Mapping"
        subtitle={`${AREAS.length} data areas · ${requiredFields} required fields of ${totalFields} total — a template for mapping the client's own data onto this schema`}
      />

      {/* Context banner */}
      <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-5 py-4">
        <p className="text-sm font-semibold text-brand-800">Why this page exists</p>
        <p className="mt-1 text-sm leading-relaxed text-brand-700">
          This is a mapping template, not an import tool — a full CSV/mapping engine for every data area below is
          intentionally out of scope for now (see Current Release Scope). Use this page to plan how the client&apos;s
          own spreadsheets or source systems map onto these exact fields before any real import happens, whether
          that import runs through a future guided tool or a one-time migration script.
        </p>
      </div>

      {/* Recommended import order */}
      <SectionCard title="Recommended Import Order" icon={ListOrdered} tone="brand">
        <ol className="space-y-3">
          {IMPORT_ORDER.map(o => (
            <li key={o.step} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {o.step}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800">{o.label}</p>
                <p className="text-xs text-slate-500">{o.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* Per-area mapping tables */}
      {AREAS.map(a => {
        const areaRequired = a.fields.filter(f => f.required).length;
        return (
          <SectionCard
            key={a.id}
            title={`${a.id}. ${a.area}`}
            subtitle={`${areaRequired} / ${a.fields.length} fields required`}
            icon={a.icon}
            noPad
          >
            <p className="border-b border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500">{a.purpose}</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Field</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Maps To</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Required</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {a.fields.map((f, idx) => (
                    <tr key={f.field} className={`border-t border-slate-100 align-top ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-5 py-3 font-medium text-slate-800">{f.field}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{f.schemaField}</td>
                      <td className="px-4 py-3">
                        <Badge tone={f.required ? 'brand' : 'slate'} size="sm">{f.required ? 'Required' : 'Optional'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs leading-relaxed text-slate-500">{f.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
}
