'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { CsvImportPanel, norm, type PreviewRow } from '@/components/import/CsvImportPanel';
import {
  importDemands, importInitiatives, importMilestones, importValueClaims, importValidations,
  listImportableInitiatives,
  type ImportRow, type InitiativeImportRow, type MilestoneImportRow, type ValueClaimImportRow, type ValidationImportRow,
} from '@/lib/actions/import';
import { BENEFIT_CATEGORY_LABEL, BENEFIT_CATEGORIES, BENEFIT_UNIT_LABEL, BENEFIT_UNITS, CONFIDENCE_LABEL, formatInr } from '@/lib/value';
import { STAGE_LABEL, LABEL_TO_STAGE } from '@/lib/stage-map';
import { INVESTMENT_CATEGORIES, INVESTMENT_CATEGORY_LABEL } from '@/lib/investment';
import { CLASSIFICATION_LABEL } from '@/lib/types';
import type { BenefitCategory, DemandPriority, Confidence, BenefitUnit, InitiativeClassification, MilestoneOwnerRole, MilestoneStatus, OutcomeAchieved, InvestmentCategory } from '@prisma/client';
import { Layers, Flag, TrendingUp, BadgeCheck, Lightbulb, Users, Info } from 'lucide-react';

// ── Shared lookups (label -> enum), all keyed through norm() so "Cost Saving",
// "cost_saving", and "COST SAVING" all resolve the same way. ─────────────────

const CATEGORY_LOOKUP: Record<string, BenefitCategory> = Object.fromEntries([
  ...BENEFIT_CATEGORIES.map(c => [norm(c), c]),
  ...BENEFIT_CATEGORIES.map(c => [norm(BENEFIT_CATEGORY_LABEL[c]), c]),
]);

const PRIORITY_LOOKUP: Record<string, DemandPriority> = {
  low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL',
};

const STAGE_LOOKUP: Record<string, keyof typeof STAGE_LABEL> = Object.fromEntries(
  Object.entries(LABEL_TO_STAGE).map(([label, stage]) => [norm(label), stage]),
);

const CLASSIFICATION_LOOKUP: Record<string, InitiativeClassification> = Object.fromEntries(
  Object.entries(CLASSIFICATION_LABEL).map(([key, label]) => [norm(label), key as InitiativeClassification]),
);

const TYPE_LOOKUP: Record<string, 'CHANGE_REQUEST' | 'PROJECT'> = {
  project: 'PROJECT', changerequest: 'CHANGE_REQUEST', cr: 'CHANGE_REQUEST',
};

const DELAY_SOURCE_LOOKUP: Record<string, 'IT' | 'BUSINESS' | 'VENDOR' | 'EXTERNAL'> = {
  it: 'IT', business: 'BUSINESS', vendor: 'VENDOR', external: 'EXTERNAL',
};

const OWNER_ROLE_LOOKUP: Record<string, MilestoneOwnerRole> = {
  pmo: 'PMO', it: 'IT', business: 'BUSINESS', vendor: 'VENDOR',
};

const MILESTONE_STATUS_LOOKUP: Record<string, MilestoneStatus> = {
  notstarted: 'NOT_STARTED', inprogress: 'IN_PROGRESS', blocked: 'BLOCKED', completed: 'COMPLETED',
};

const UNIT_LOOKUP: Record<string, BenefitUnit> = Object.fromEntries([
  ...BENEFIT_UNITS.map(u => [norm(u), u]),
  ...BENEFIT_UNITS.map(u => [norm(BENEFIT_UNIT_LABEL[u]), u]),
]);

const CONFIDENCE_LOOKUP: Record<string, Confidence> = Object.fromEntries(
  (['HIGH', 'MEDIUM', 'LOW'] as Confidence[]).map(c => [norm(CONFIDENCE_LABEL[c]), c]),
);

const INVESTMENT_CATEGORY_LOOKUP: Record<string, InvestmentCategory> = Object.fromEntries([
  ...INVESTMENT_CATEGORIES.map(c => [norm(c), c]),
  ...INVESTMENT_CATEGORIES.map(c => [norm(INVESTMENT_CATEGORY_LABEL[c]), c]),
]);

const OUTCOME_LOOKUP: Record<string, OutcomeAchieved> = { yes: 'YES', partially: 'PARTIALLY', no: 'NO' };

const boolFrom = (s: string): boolean => ['yes', 'true', '1'].includes(s.trim().toLowerCase());

const get = (cells: string[], idx: number) => (idx >= 0 ? (cells[idx] ?? '').trim() : '');

// ── Tabs ───────────────────────────────────────────────────────────────────

type TabKey = 'initiatives' | 'milestones' | 'valueClaims' | 'validations' | 'demands' | 'users';

const TABS: { key: TabKey; label: string; icon: typeof Layers }[] = [
  { key: 'initiatives', label: 'Initiatives / Projects', icon: Layers },
  { key: 'milestones', label: 'Milestones', icon: Flag },
  { key: 'valueClaims', label: 'Value Claims', icon: TrendingUp },
  { key: 'validations', label: 'Business Validations', icon: BadgeCheck },
  { key: 'demands', label: 'Demands', icon: Lightbulb },
  { key: 'users', label: 'Users / Role Mapping', icon: Users },
];

const INITIATIVE_TEMPLATE =
  'title,type,classification,stage,vertical_head,business_spoc,business_sponsor,go_live_date,benefit_category,outcome_description,target_metric,program_head,program_manager,business_head,business_unit,sub_business_unit,is_regulatory,regulatory_body,regulatory_due_date,delayed,delay_source,delay_reason,build_cost_cr,annual_run_cost_cr,tco_horizon_years,investment_category\n' +
  'UPI Enhancement v3.0,Project,Strategic,SIT,Rajesh Kumar,Anil Kumar,Ramesh Jain,2026-12-15,Revenue,Enable UPI Lite for offline payments,Increase UPI transaction volume by 15%,Karan Mehta,Neha Kapoor,Rohit Malhotra,Retail Banking,Digital Channels,Yes,NPCI,2026-11-01,No,,,8,1.5,3,Value-generating\n';

const MILESTONE_TEMPLATE =
  'initiative_title,title,description,owner,owner_role,due_date,status\n' +
  'UPI Enhancement v3.0,SIT Completion,,Priya Sharma,IT,2026-10-15,In Progress\n';

const VALUE_CLAIM_TEMPLATE =
  'initiative_title,category,metric_name,baseline_value,target_value,unit,value_cr,confidence,realization_horizon_months\n' +
  'UPI Enhancement v3.0,Revenue,UPI transaction volume,100,115,Percent,25,High,12\n';

const VALIDATION_TEMPLATE =
  'initiative_title,outcome_achieved,actual_result,actual_metric,realized_date\n' +
  'UPI Enhancement v3.0,Yes,Delivered 18% volume increase against 15% target,18,2026-11-20\n';

const DEMAND_TEMPLATE =
  'title,requirement,priority,category,metric,value_cr\n' +
  'WhatsApp banking,Balance & statement over WhatsApp,High,Customer Experience,Reduce call-centre volume,3\n' +
  'Pre-approved loans,Show pre-approved offers on net banking,High,Revenue,Incremental disbursal,25\n';

const USERS_TEMPLATE =
  'name,email,role,vertical_head,program_head,program_manager,business_head,business_unit,sub_business_unit\n' +
  'Suresh Patel,suresh.patel@client.com,PROGRAM_MANAGER,,Karan Mehta,,,Retail Banking,Digital Channels\n';

export default function ImportPage() {
  const [tab, setTab] = useState<TabKey>('initiatives');
  const [initiatives, setInitiatives] = useState<{ id: string; title: string }[] | null>(null);
  const [initiativesError, setInitiativesError] = useState('');

  useEffect(() => {
    if (tab === 'milestones' || tab === 'valueClaims' || tab === 'validations') {
      if (initiatives != null) return;
      listImportableInitiatives()
        .then(setInitiatives)
        .catch(() => setInitiativesError('Could not load your visible initiatives — refresh and try again.'));
    }
  }, [tab, initiatives]);

  const initiativeLookup = new Map((initiatives ?? []).map(i => [norm(i.title), i]));
  const noInitiatives = initiatives != null && initiatives.length === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Client Data Import"
        subtitle="Bring the client's real portfolio into the platform — fully on-prem CSV import, no external calls"
      />

      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-px">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                active ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'initiatives' && (
        <CsvImportPanel<InitiativeImportRow>
          entityLabel="initiative"
          entityLabelPlural="initiatives"
          template={INITIATIVE_TEMPLATE}
          templateFilename="initiative-import-template.csv"
          requiredHeaders={['title', 'type', 'classification', 'stage', 'vertical_head', 'business_spoc', 'business_sponsor', 'go_live_date', 'benefit_category', 'outcome_description', 'target_metric']}
          columnsHint={
            <>
              Required: <code className="rounded bg-slate-100 px-1 py-0.5">title</code>, <code className="rounded bg-slate-100 px-1 py-0.5">type</code>, <code className="rounded bg-slate-100 px-1 py-0.5">classification</code>, <code className="rounded bg-slate-100 px-1 py-0.5">stage</code>, <code className="rounded bg-slate-100 px-1 py-0.5">vertical_head</code>, <code className="rounded bg-slate-100 px-1 py-0.5">business_spoc</code>, <code className="rounded bg-slate-100 px-1 py-0.5">business_sponsor</code>, <code className="rounded bg-slate-100 px-1 py-0.5">go_live_date</code>, <code className="rounded bg-slate-100 px-1 py-0.5">benefit_category</code>, <code className="rounded bg-slate-100 px-1 py-0.5">outcome_description</code>, <code className="rounded bg-slate-100 px-1 py-0.5">target_metric</code>.
              Optional: <code className="rounded bg-slate-100 px-1 py-0.5">program_head</code>, <code className="rounded bg-slate-100 px-1 py-0.5">program_manager</code>, <code className="rounded bg-slate-100 px-1 py-0.5">business_head</code>, <code className="rounded bg-slate-100 px-1 py-0.5">business_unit</code>, <code className="rounded bg-slate-100 px-1 py-0.5">sub_business_unit</code>, <code className="rounded bg-slate-100 px-1 py-0.5">is_regulatory</code>, <code className="rounded bg-slate-100 px-1 py-0.5">regulatory_body</code>, <code className="rounded bg-slate-100 px-1 py-0.5">regulatory_due_date</code>, <code className="rounded bg-slate-100 px-1 py-0.5">delayed</code>, <code className="rounded bg-slate-100 px-1 py-0.5">delay_source</code>, <code className="rounded bg-slate-100 px-1 py-0.5">delay_reason</code>, <code className="rounded bg-slate-100 px-1 py-0.5">build_cost_cr</code>, <code className="rounded bg-slate-100 px-1 py-0.5">annual_run_cost_cr</code>, <code className="rounded bg-slate-100 px-1 py-0.5">tco_horizon_years</code>, <code className="rounded bg-slate-100 px-1 py-0.5">investment_category</code>.
              See <Link href="/admin/client-data-readiness" className="font-medium text-brand-600 hover:underline">Client Data Mapping</Link> for full field detail.
            </>
          }
          note="Brings initiatives in at whatever stage they're already at — this does not fabricate the earlier stage history, only a starting snapshot."
          previewHead={['Title', 'Stage', 'Vertical Head', 'Go-Live']}
          renderPreviewRow={r => [r.title, STAGE_LABEL[r.currentStage], r.verticalHeadName, r.expectedGoLiveDate.toISOString().slice(0, 10)]}
          onSubmit={importInitiatives}
          parseRow={(cells, col) => {
            const title = get(cells, col('title'));
            const type = TYPE_LOOKUP[norm(get(cells, col('type')))];
            const classification = CLASSIFICATION_LOOKUP[norm(get(cells, col('classification')))];
            const currentStage = STAGE_LOOKUP[norm(get(cells, col('stage')))];
            const verticalHeadName = get(cells, col('vertical_head'));
            const businessSpoc = get(cells, col('business_spoc'));
            const businessSponsor = get(cells, col('business_sponsor'));
            const goLiveRaw = get(cells, col('go_live_date'));
            const benefitCategory = CATEGORY_LOOKUP[norm(get(cells, col('benefit_category')))];
            const outcomeDescription = get(cells, col('outcome_description'));
            const targetMetric = get(cells, col('target_metric'));

            if (!title) return { row: null, error: 'Missing title' };
            if (!type) return { row: null, error: `Unknown type "${get(cells, col('type'))}"` };
            if (!classification) return { row: null, error: `Unknown classification "${get(cells, col('classification'))}"` };
            if (!currentStage) return { row: null, error: `Unknown stage "${get(cells, col('stage'))}"` };
            if (!verticalHeadName || !businessSpoc || !businessSponsor) return { row: null, error: 'Missing vertical_head / business_spoc / business_sponsor' };
            const expectedGoLiveDate = new Date(goLiveRaw);
            if (!goLiveRaw || isNaN(expectedGoLiveDate.getTime())) return { row: null, error: 'Invalid go_live_date' };
            if (!benefitCategory) return { row: null, error: `Unknown benefit_category "${get(cells, col('benefit_category'))}"` };
            if (!outcomeDescription || !targetMetric) return { row: null, error: 'Missing outcome_description / target_metric' };

            const isRegulatory = boolFrom(get(cells, col('is_regulatory')));
            const delayed = boolFrom(get(cells, col('delayed')));
            const delaySourceRaw = get(cells, col('delay_source'));
            const delaySource = delaySourceRaw ? DELAY_SOURCE_LOOKUP[norm(delaySourceRaw)] : undefined;
            if (delayed && delaySourceRaw && !delaySource) return { row: null, error: `Unknown delay_source "${delaySourceRaw}"` };
            const regDueRaw = get(cells, col('regulatory_due_date'));
            const regulatoryDueDate = regDueRaw ? new Date(regDueRaw) : undefined;
            if (regDueRaw && isNaN((regulatoryDueDate as Date).getTime())) return { row: null, error: 'Invalid regulatory_due_date' };

            // Cost columns are optional and expressed in ₹ Crore. A blank cell
            // stays undefined ("not captured") rather than becoming 0 — a
            // guessed denominator is exactly what M0 removed.
            const catRaw = get(cells, col('investment_category'));
            const investmentCategory = catRaw ? INVESTMENT_CATEGORY_LOOKUP[norm(catRaw)] : undefined;
            if (catRaw && !investmentCategory) return { row: null, error: `Unknown investment_category "${catRaw}"` };

            const buildCr = get(cells, col('build_cost_cr'));
            const runCr = get(cells, col('annual_run_cost_cr'));
            const horizon = get(cells, col('tco_horizon_years'));
            if (buildCr && !Number.isFinite(parseFloat(buildCr))) return { row: null, error: 'Invalid build_cost_cr' };
            if (runCr && !Number.isFinite(parseFloat(runCr))) return { row: null, error: 'Invalid annual_run_cost_cr' };
            if (horizon && !Number.isFinite(parseInt(horizon, 10))) return { row: null, error: 'Invalid tco_horizon_years' };

            return {
              row: {
                title, type, classification, currentStage, verticalHeadName, businessSpoc, businessSponsor,
                expectedGoLiveDate, benefitCategory, outcomeDescription, targetMetric,
                buildCostInr: buildCr ? parseFloat(buildCr) * 10_000_000 : undefined,
                annualRunCostInr: runCr ? parseFloat(runCr) * 10_000_000 : undefined,
                tcoHorizonYears: horizon ? parseInt(horizon, 10) : undefined,
                investmentCategory,
                programHeadName: get(cells, col('program_head')) || undefined,
                programManagerName: get(cells, col('program_manager')) || undefined,
                businessHeadName: get(cells, col('business_head')) || undefined,
                businessUnit: get(cells, col('business_unit')) || undefined,
                subBusinessUnit: get(cells, col('sub_business_unit')) || undefined,
                isRegulatory,
                regulatoryBody: get(cells, col('regulatory_body')) || undefined,
                regulatoryDueDate,
                delayed,
                delaySource,
                delayReason: get(cells, col('delay_reason')) || undefined,
              },
            };
          }}
        />
      )}

      {tab === 'milestones' && (
        <CsvImportPanel<MilestoneImportRow>
          entityLabel="milestone"
          entityLabelPlural="milestones"
          template={MILESTONE_TEMPLATE}
          templateFilename="milestone-import-template.csv"
          requiredHeaders={['initiative_title', 'title', 'owner', 'due_date']}
          disabled={noInitiatives}
          disabledReason="No initiatives are visible to you yet — import initiatives first, or ask PMO to assign you one."
          columnsHint={
            <>
              Required: <code className="rounded bg-slate-100 px-1 py-0.5">initiative_title</code>, <code className="rounded bg-slate-100 px-1 py-0.5">title</code>, <code className="rounded bg-slate-100 px-1 py-0.5">owner</code>, <code className="rounded bg-slate-100 px-1 py-0.5">due_date</code>.
              Optional: <code className="rounded bg-slate-100 px-1 py-0.5">description</code>, <code className="rounded bg-slate-100 px-1 py-0.5">owner_role</code>, <code className="rounded bg-slate-100 px-1 py-0.5">status</code>.
            </>
          }
          note={initiativesError || `initiative_title must exactly match an existing initiative's title${initiatives ? ` — ${initiatives.length} visible to you` : ''}. Initiatives whose value is already signed off are locked — restate the value there before adding claims.`}
          previewHead={['Initiative', 'Milestone', 'Owner', 'Due Date', 'Status']}
          renderPreviewRow={r => [initiatives?.find(i => i.id === r.initiativeId)?.title ?? r.initiativeId, r.title, r.owner, r.dueDate.toISOString().slice(0, 10), r.status ?? 'NOT_STARTED']}
          onSubmit={importMilestones}
          parseRow={(cells, col) => {
            const initiativeTitle = get(cells, col('initiative_title'));
            const match = initiativeLookup.get(norm(initiativeTitle));
            const title = get(cells, col('title'));
            const owner = get(cells, col('owner'));
            const dueRaw = get(cells, col('due_date'));
            const dueDate = new Date(dueRaw);

            if (!initiativeTitle) return { row: null, error: 'Missing initiative_title' };
            if (!match) return { row: null, error: `No visible initiative titled "${initiativeTitle}"` };
            if (!title || !owner) return { row: null, error: 'Missing title / owner' };
            if (!dueRaw || isNaN(dueDate.getTime())) return { row: null, error: 'Invalid due_date' };

            const ownerRoleRaw = get(cells, col('owner_role'));
            const ownerRole = ownerRoleRaw ? OWNER_ROLE_LOOKUP[norm(ownerRoleRaw)] : undefined;
            if (ownerRoleRaw && !ownerRole) return { row: null, error: `Unknown owner_role "${ownerRoleRaw}"` };
            const statusRaw = get(cells, col('status'));
            const status = statusRaw ? MILESTONE_STATUS_LOOKUP[norm(statusRaw)] : undefined;
            if (statusRaw && !status) return { row: null, error: `Unknown status "${statusRaw}"` };

            return {
              row: {
                initiativeId: match.id, title, owner, dueDate,
                description: get(cells, col('description')) || undefined,
                ownerRole, status,
              },
            };
          }}
        />
      )}

      {tab === 'valueClaims' && (
        <CsvImportPanel<ValueClaimImportRow>
          entityLabel="value claim"
          entityLabelPlural="value claims"
          template={VALUE_CLAIM_TEMPLATE}
          templateFilename="value-claim-import-template.csv"
          requiredHeaders={['initiative_title', 'category', 'metric_name', 'value_cr']}
          disabled={noInitiatives}
          disabledReason="No initiatives are visible to you yet — import initiatives first, or ask PMO to assign you one."
          columnsHint={
            <>
              Required: <code className="rounded bg-slate-100 px-1 py-0.5">initiative_title</code>, <code className="rounded bg-slate-100 px-1 py-0.5">category</code>, <code className="rounded bg-slate-100 px-1 py-0.5">metric_name</code>, <code className="rounded bg-slate-100 px-1 py-0.5">value_cr</code> (₹ crore).
              Optional: <code className="rounded bg-slate-100 px-1 py-0.5">baseline_value</code>, <code className="rounded bg-slate-100 px-1 py-0.5">baseline_source</code>, <code className="rounded bg-slate-100 px-1 py-0.5">target_value</code>, <code className="rounded bg-slate-100 px-1 py-0.5">target_source</code>, <code className="rounded bg-slate-100 px-1 py-0.5">unit</code>, <code className="rounded bg-slate-100 px-1 py-0.5">confidence</code>, <code className="rounded bg-slate-100 px-1 py-0.5">realization_horizon_months</code>.
              The two <code className="rounded bg-slate-100 px-1 py-0.5">_source</code> columns record where each figure came from — they are what lets a claim be defended later.
            </>
          }
          note={initiativesError || `initiative_title must exactly match an existing initiative's title${initiatives ? ` — ${initiatives.length} visible to you` : ''}.`}
          previewHead={['Initiative', 'Category', 'Metric', 'Value']}
          renderPreviewRow={r => [initiatives?.find(i => i.id === r.initiativeId)?.title ?? r.initiativeId, BENEFIT_CATEGORY_LABEL[r.category], r.metricName, formatInr(r.estimatedAnnualValueInr)]}
          onSubmit={importValueClaims}
          parseRow={(cells, col) => {
            const initiativeTitle = get(cells, col('initiative_title'));
            const match = initiativeLookup.get(norm(initiativeTitle));
            const category = CATEGORY_LOOKUP[norm(get(cells, col('category')))];
            const metricName = get(cells, col('metric_name'));
            const valueCrRaw = get(cells, col('value_cr'));
            const valueCr = parseFloat(valueCrRaw);

            if (!initiativeTitle) return { row: null, error: 'Missing initiative_title' };
            if (!match) return { row: null, error: `No visible initiative titled "${initiativeTitle}"` };
            if (!category) return { row: null, error: `Unknown category "${get(cells, col('category'))}"` };
            if (!metricName) return { row: null, error: 'Missing metric_name' };
            if (isNaN(valueCr) || valueCr < 0) return { row: null, error: 'Invalid value_cr' };

            const unitRaw = get(cells, col('unit'));
            const unit = unitRaw ? UNIT_LOOKUP[norm(unitRaw)] : undefined;
            if (unitRaw && !unit) return { row: null, error: `Unknown unit "${unitRaw}"` };
            const confidenceRaw = get(cells, col('confidence'));
            const confidence = confidenceRaw ? CONFIDENCE_LOOKUP[norm(confidenceRaw)] : undefined;
            if (confidenceRaw && !confidence) return { row: null, error: `Unknown confidence "${confidenceRaw}"` };
            const baselineRaw = get(cells, col('baseline_value'));
            const targetRaw = get(cells, col('target_value'));
            const horizonRaw = get(cells, col('realization_horizon_months'));

            return {
              row: {
                initiativeId: match.id, category, metricName,
                estimatedAnnualValueInr: valueCr * 10_000_000,
                unit, confidence,
                baselineValue: baselineRaw ? parseFloat(baselineRaw) : undefined,
                targetValue: targetRaw ? parseFloat(targetRaw) : undefined,
                baselineSource: get(cells, col('baseline_source')) || undefined,
                targetSource: get(cells, col('target_source')) || undefined,
                realizationHorizonMonths: horizonRaw ? parseInt(horizonRaw, 10) : undefined,
              },
            };
          }}
        />
      )}

      {tab === 'validations' && (
        <CsvImportPanel<ValidationImportRow>
          entityLabel="validation"
          entityLabelPlural="validations"
          template={VALIDATION_TEMPLATE}
          templateFilename="validation-import-template.csv"
          requiredHeaders={['initiative_title', 'outcome_achieved', 'actual_result', 'actual_metric']}
          disabled={noInitiatives}
          disabledReason="No initiatives are visible to you yet — import initiatives first, or ask PMO to assign you one."
          columnsHint={
            <>
              Required: <code className="rounded bg-slate-100 px-1 py-0.5">initiative_title</code>, <code className="rounded bg-slate-100 px-1 py-0.5">outcome_achieved</code>, <code className="rounded bg-slate-100 px-1 py-0.5">actual_result</code>, <code className="rounded bg-slate-100 px-1 py-0.5">actual_metric</code>.
              Optional: <code className="rounded bg-slate-100 px-1 py-0.5">realized_date</code>. Typically used for closed/delivered initiatives — not enforced against stage.
            </>
          }
          note={initiativesError || `initiative_title must exactly match an existing initiative's title${initiatives ? ` — ${initiatives.length} visible to you` : ''}. A second row for the same initiative replaces the first.`}
          previewHead={['Initiative', 'Outcome', 'Actual Result', 'Actual Metric']}
          renderPreviewRow={r => [initiatives?.find(i => i.id === r.initiativeId)?.title ?? r.initiativeId, r.outcomeAchieved, r.actualResult, r.actualMetric]}
          onSubmit={importValidations}
          parseRow={(cells, col) => {
            const initiativeTitle = get(cells, col('initiative_title'));
            const match = initiativeLookup.get(norm(initiativeTitle));
            const outcomeAchieved = OUTCOME_LOOKUP[norm(get(cells, col('outcome_achieved')))];
            const actualResult = get(cells, col('actual_result'));
            const actualMetric = get(cells, col('actual_metric'));

            if (!initiativeTitle) return { row: null, error: 'Missing initiative_title' };
            if (!match) return { row: null, error: `No visible initiative titled "${initiativeTitle}"` };
            if (!outcomeAchieved) return { row: null, error: `Unknown outcome_achieved "${get(cells, col('outcome_achieved'))}"` };
            if (!actualResult || !actualMetric) return { row: null, error: 'Missing actual_result / actual_metric' };

            const realizedRaw = get(cells, col('realized_date'));
            const realizedDate = realizedRaw ? new Date(realizedRaw) : undefined;
            if (realizedRaw && isNaN((realizedDate as Date).getTime())) return { row: null, error: 'Invalid realized_date' };

            return { row: { initiativeId: match.id, outcomeAchieved, actualResult, actualMetric, realizedDate } };
          }}
        />
      )}

      {tab === 'demands' && (
        <CsvImportPanel<ImportRow>
          entityLabel="demand"
          entityLabelPlural="demands"
          template={DEMAND_TEMPLATE}
          templateFilename="demand-import-template.csv"
          requiredHeaders={['title', 'requirement', 'category', 'metric', 'value_cr']}
          columnsHint={
            <>
              Required: <code className="rounded bg-slate-100 px-1 py-0.5">title</code>, <code className="rounded bg-slate-100 px-1 py-0.5">requirement</code>, <code className="rounded bg-slate-100 px-1 py-0.5">category</code>, <code className="rounded bg-slate-100 px-1 py-0.5">metric</code>, <code className="rounded bg-slate-100 px-1 py-0.5">value_cr</code>. Optional: <code className="rounded bg-slate-100 px-1 py-0.5">priority</code>.
            </>
          }
          previewHead={['Title', 'Category', 'Metric', 'Value']}
          renderPreviewRow={r => [r.title, BENEFIT_CATEGORY_LABEL[r.category], r.metricName, formatInr(r.estimatedAnnualValueInr)]}
          onSubmit={importDemands}
          parseRow={(cells, col) => {
            const title = get(cells, col('title'));
            const requirement = get(cells, col('requirement'));
            const category = CATEGORY_LOOKUP[norm(get(cells, col('category')))];
            const metricName = get(cells, col('metric'));
            const valueCr = parseFloat(get(cells, col('value_cr')));
            const priority = PRIORITY_LOOKUP[get(cells, col('priority')).toLowerCase()] ?? 'MEDIUM';

            if (!title || !requirement || !metricName) return { row: null, error: 'Missing title / requirement / metric' };
            if (!category) return { row: null, error: `Unknown category "${get(cells, col('category'))}"` };
            if (isNaN(valueCr) || valueCr < 0) return { row: null, error: 'Invalid value_cr' };

            return { row: { title, requirement, priority, category, metricName, estimatedAnnualValueInr: valueCr * 10_000_000 } };
          }}
        />
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <Info className="h-4 w-4" />
              Template only in this release
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-700">
              Bulk user import isn&apos;t wired up yet — download the template below to prepare the client&apos;s user
              and role-hierarchy list, then hand it to an Admin to create accounts one at a time via{' '}
              <Link href="/admin/users" className="font-medium underline">User Management</Link>. Field-by-field
              detail is in <Link href="/admin/client-data-readiness" className="font-medium underline">Client Data Mapping</Link>.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-3 text-xs leading-relaxed text-slate-500">
              Columns: <code className="rounded bg-slate-100 px-1 py-0.5">name</code>, <code className="rounded bg-slate-100 px-1 py-0.5">email</code>, <code className="rounded bg-slate-100 px-1 py-0.5">role</code>, <code className="rounded bg-slate-100 px-1 py-0.5">vertical_head</code>, <code className="rounded bg-slate-100 px-1 py-0.5">program_head</code>, <code className="rounded bg-slate-100 px-1 py-0.5">program_manager</code>, <code className="rounded bg-slate-100 px-1 py-0.5">business_head</code>, <code className="rounded bg-slate-100 px-1 py-0.5">business_unit</code>, <code className="rounded bg-slate-100 px-1 py-0.5">sub_business_unit</code>.
            </div>
            <button
              onClick={() => {
                const blob = new Blob([USERS_TEMPLATE], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'user-role-mapping-template.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Download template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
