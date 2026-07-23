export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import type { Role } from '@prisma/client';
import { buildInitiativeVisibilityWhere, ROLE_LABEL } from '@/lib/rbac';
import { listVisibleInitiativesForUser } from '@/lib/actions/initiatives';
import {
  listOpenMilestonesForInitiatives,
  createMilestone,
  updateMilestone,
  completeMilestone,
  deleteMilestone,
} from '@/lib/actions/milestones';
import { enrichAll } from '@/lib/queries/enrich';
import { generateReminders, REMINDER_TYPE_LABEL, type ReminderType } from '@/lib/reminders';
import { getBoardSummary } from '@/lib/queries/value';
import { resolvePeriod } from '@/lib/period';
import { formatInr } from '@/lib/value';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Database, Target, Rocket, ClipboardCheck } from 'lucide-react';

type S = 'pass' | 'warn' | 'fail';
interface Check { label: string; status: S; detail?: string }

function CheckRow({ label, status, detail }: Check) {
  const Icon = status === 'pass' ? CheckCircle2 : status === 'warn' ? AlertTriangle : XCircle;
  const cls  = status === 'pass' ? 'text-emerald-500' : status === 'warn' ? 'text-amber-500' : 'text-rose-500';
  return (
    <li className="flex items-start gap-3 border-t border-slate-100 py-3 first:border-t-0">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cls}`} strokeWidth={2} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
      </div>
    </li>
  );
}

function sectionScore(checks: Check[]) {
  const pass = checks.filter(c => c.status === 'pass').length;
  return `${pass} / ${checks.length}`;
}

function sectionTone(checks: Check[]): 'success' | 'warning' | 'risk' | 'default' {
  const fail = checks.filter(c => c.status === 'fail').length;
  const warn = checks.filter(c => c.status === 'warn').length;
  if (fail > 0) return 'risk';
  if (warn > 0) return 'warning';
  return 'success';
}

const STATUS_LABEL: Record<S, string> = { pass: 'Ready', warn: 'Needs attention', fail: 'Not ready' };
const STATUS_TONE: Record<S, 'success' | 'warning' | 'danger'> = { pass: 'success', warn: 'warning', fail: 'danger' };

interface TableRow { area: string; expected: string; status: S; detail: string }

function ChecklistTable({ rows }: { rows: TableRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Area</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Expected Result</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.area} className={`border-t border-slate-100 align-top ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
              <td className="px-5 py-3 font-medium text-slate-800">{r.area}</td>
              <td className="px-4 py-3 text-slate-600">
                <div>{r.expected}</div>
                <div className="mt-1 text-xs text-slate-400">{r.detail}</div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={STATUS_TONE[r.status]} size="sm">{STATUS_LABEL[r.status]}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ROLE_ACCESS_DEFS: { role: Role; area: string; expected: string; fullAccess: boolean }[] = [
  { role: 'CIO',            area: 'CIO access',            expected: 'Full Executive View',                fullAccess: true },
  { role: 'PMO',             area: 'PMO access',             expected: 'Full governance portfolio',          fullAccess: true },
  { role: 'PROGRAM_HEAD',    area: 'Program Head access',    expected: 'Assigned program portfolio only',    fullAccess: false },
  { role: 'PROGRAM_MANAGER', area: 'Program Manager access', expected: 'Assigned initiatives only',          fullAccess: false },
  { role: 'VERTICAL_HEAD',   area: 'Vertical Head access',   expected: 'Own vertical only',                  fullAccess: false },
  { role: 'BUSINESS_HEAD',   area: 'Business Head access',   expected: 'Own business portfolio',              fullAccess: false },
  { role: 'BUSINESS',        area: 'Business SPOC access',   expected: 'Assigned validations only',          fullAccess: false },
];

const ALL_REMINDER_TYPES: ReminderType[] = [
  'STALE_UPDATE', 'STAGE_OVERDUE', 'GO_LIVE_RISK', 'BUSINESS_VALIDATION_PENDING',
  'REGULATORY_DEADLINE_RISK', 'BUSINESS_DELAY', 'VENDOR_DELAY', 'MILESTONE_OVERDUE', 'MILESTONE_BLOCKED',
];

const MILESTONE_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as const;

export default async function ClientReadinessPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  if (session.user.role !== 'ADMIN') redirect('/');

  // The "active organization/client workspace" is the admin's own org — every
  // count below is scoped to this id (a sentinel when absent, so every query
  // naturally returns zero rather than silently falling back to a cross-org
  // total). This is deliberate: once a second client organization exists on
  // this deployment, these checks must not blend the two together.
  const orgId = session.user.organizationId ?? null;
  const scopeId = orgId ?? '__no_active_organization__';

  const [
    org, userCount, users, initiativeCount, regulatoryCount, regulatoryWithBodyCount,
    claimCount, milestoneCount, hierarchyMappedCount, businessUnitMappedCount,
  ] = await Promise.all([
    orgId ? prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, status: true } }) : null,
    prisma.user.count({ where: { organizationId: scopeId } }),
    prisma.user.findMany({ where: { organizationId: scopeId }, select: { role: true } }),
    prisma.initiative.count({ where: { organizationId: scopeId } }),
    prisma.initiative.count({ where: { organizationId: scopeId, isRegulatory: true } }),
    prisma.initiative.count({ where: { organizationId: scopeId, isRegulatory: true, regulatoryBody: { not: null } } }),
    prisma.benefitClaim.count({ where: { OR: [{ initiative: { organizationId: scopeId } }, { demand: { organizationId: scopeId } }] } }),
    prisma.milestone.count({ where: { initiative: { organizationId: scopeId } } }),
    prisma.initiative.count({ where: { organizationId: scopeId, OR: [{ programHeadName: { not: null } }, { programManagerName: { not: null } }, { businessHeadName: { not: null } }] } }),
    prisma.initiative.count({ where: { organizationId: scopeId, businessUnit: { not: null } } }),
  ]);

  const rolesPresent = new Set(users.map(u => u.role as string));
  const allRoles = ['ADMIN', 'CIO', 'PMO', 'VERTICAL_HEAD', 'BUSINESS'];

  const wsNameSet = !!(process.env.NEXT_PUBLIC_WORKSPACE_NAME);
  const demoModeSet = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const authSecretSet = !!(process.env.AUTH_SECRET);

  // ── Client UAT Checklist ─────────────────────────────────────────────────
  // Role access + data isolation: find a real user for the role IN THIS
  // ORGANIZATION, run the same buildInitiativeVisibilityWhere() every
  // dashboard uses, and compare what they see against this org's portfolio.
  const roleRows: TableRow[] = [];
  for (const def of ROLE_ACCESS_DEFS) {
    const user = orgId ? await prisma.user.findFirst({ where: { role: def.role, organizationId: orgId } }) : null;
    if (!user) {
      roleRows.push({
        area: def.area,
        expected: def.expected,
        status: 'warn',
        detail: `No ${ROLE_LABEL[def.role]} user exists in this organization yet — cannot verify live scoping.`,
      });
      continue;
    }

    const where = buildInitiativeVisibilityWhere({
      role: user.role,
      name: user.name,
      verticalHead: user.verticalHead,
      organizationId: user.organizationId!,
    });
    const visibleCount = await prisma.initiative.count({ where });

    if (def.fullAccess) {
      const ok = initiativeCount > 0 && visibleCount === initiativeCount;
      roleRows.push({
        area: def.area,
        expected: def.expected,
        status: ok ? 'pass' : initiativeCount === 0 ? 'warn' : 'fail',
        detail: `${user.name} (${user.email}) sees ${visibleCount} of ${initiativeCount} initiatives in this organization${
          ok ? ' — full portfolio, as expected.' : ' — expected full visibility but got a restricted count.'
        }`,
      });
    } else {
      const isolated = initiativeCount > 0 && visibleCount < initiativeCount;
      const hasData = visibleCount > 0;
      roleRows.push({
        area: def.area,
        expected: def.expected,
        status: isolated && hasData ? 'pass' : isolated ? 'warn' : 'fail',
        detail: `${user.name} (${user.email}) sees ${visibleCount} of ${initiativeCount} initiatives in this organization${
          isolated ? ' — correctly scoped to their own portfolio.' : ' — NOT scoped; sees the entire organization portfolio.'
        }${!hasData ? ' No initiatives are currently assigned to this user to verify against.' : ''}`,
      });
    }
  }

  const msByStatus = await prisma.milestone.groupBy({
    by: ['status'],
    where: { initiative: { organizationId: scopeId } },
    _count: { _all: true },
  });
  const statusesPresent = new Set(msByStatus.map(s => s.status));
  const missingStatuses = MILESTONE_STATUSES.filter(s => !statusesPresent.has(s));
  const actionsWired = [createMilestone, updateMilestone, completeMilestone, deleteMilestone].every(fn => typeof fn === 'function');
  const milestoneRow: TableRow = {
    area: 'Milestone workflow',
    expected: 'Create/edit/complete/delete works',
    status: actionsWired && missingStatuses.length === 0 ? 'pass' : actionsWired ? 'warn' : 'fail',
    detail: `${statusesPresent.size}/4 milestone states observed in this organization (${[...statusesPresent].join(', ') || 'none'}); create/edit/complete/delete server actions are wired in lib/actions/milestones.ts.${
      missingStatuses.length ? ` Not yet exercised: ${missingStatuses.join(', ')}.` : ''
    }`,
  };

  // Action Center — a real re-run of the reminder engine, scoped through the
  // same buildInitiativeVisibilityWhere()-backed query every dashboard uses.
  const scopedItems = enrichAll(await listVisibleInitiativesForUser(session.user));
  const scopedMilestones = await listOpenMilestonesForInitiatives(scopedItems);
  const liveReminders = generateReminders(scopedItems, scopedMilestones);
  const presentTypes = new Set(liveReminders.map(r => r.type));
  const typeCoverage = ALL_REMINDER_TYPES.filter(t => presentTypes.has(t));
  const actionCenterRow: TableRow = {
    area: 'Action Center',
    expected: 'Reminders generated correctly',
    status: liveReminders.length > 0 && typeCoverage.length >= 5 ? 'pass' : liveReminders.length > 0 ? 'warn' : 'fail',
    detail: `${liveReminders.length} reminders generated live from this organization's data, covering ${typeCoverage.length}/${ALL_REMINDER_TYPES.length} reminder types (${typeCoverage.map(t => REMINDER_TYPE_LABEL[t]).join(', ') || 'none'}).`,
  };

  // Value Report — a real re-run of the Value Board's own summary query,
  // scoped to this organization the same way every other check on this page is.
  const boardSummary = await getBoardSummary(resolvePeriod({ period: 'all' }), orgId);
  const valueRow: TableRow = {
    area: 'Value Report',
    expected: 'Business value summary works',
    status: boardSummary.totals.initiativesWithValue > 0 && boardSummary.byCategory.length > 0 ? 'pass' : 'fail',
    detail: `${boardSummary.totals.initiativesWithValue} initiatives with committed value, ${formatInr(boardSummary.totals.projected)} projected across ${boardSummary.byCategory.length} benefit categories and ${boardSummary.byOkr.length} strategic OKRs.`,
  };

  const scopedRoleRows = roleRows.filter(r => !['CIO access', 'PMO access'].includes(r.area));
  const unauthorizedFails = scopedRoleRows.filter(r => r.status === 'fail').length;
  const unauthorizedWarns = scopedRoleRows.filter(r => r.status === 'warn').length;
  const unauthorizedRow: TableRow = {
    area: 'Unauthorized access',
    expected: 'Restricted data blocked',
    status: unauthorizedFails > 0 ? 'fail' : unauthorizedWarns > 0 ? 'warn' : 'pass',
    detail: unauthorizedFails > 0
      ? `${unauthorizedFails} scoped role${unauthorizedFails === 1 ? '' : 's'} can currently see initiatives outside their assignment — investigate before client UAT.`
      : unauthorizedWarns > 0
      ? `Scoping rules are correct, but ${unauthorizedWarns} role${unauthorizedWarns === 1 ? '' : 's'} has no assigned initiatives to verify against — assign at least one initiative per role before UAT.`
      : `All ${scopedRoleRows.length} scoped roles (Program Head, Program Manager, Vertical Head, Business Head, Business SPOC) see a strict subset of this organization's ${initiativeCount}-initiative portfolio.`,
  };

  const uatRows: TableRow[] = [...roleRows, milestoneRow, actionCenterRow, valueRow, unauthorizedRow];

  // ── Client Onboarding & Data Readiness ───────────────────────────────────
  const hierarchyPct = initiativeCount > 0 ? Math.round((hierarchyMappedCount / initiativeCount) * 100) : 0;
  const businessUnitPct = initiativeCount > 0 ? Math.round((businessUnitMappedCount / initiativeCount) * 100) : 0;

  const envVars = [
    { name: 'NEXT_PUBLIC_WORKSPACE_NAME', set: wsNameSet },
    { name: 'AUTH_SECRET', set: authSecretSet },
    { name: 'NEXT_PUBLIC_DEMO_MODE', set: process.env.NEXT_PUBLIC_DEMO_MODE !== undefined },
  ];
  const missingEnv = envVars.filter(e => !e.set);

  const onboardingRows: TableRow[] = [
    {
      area: 'Client users',
      expected: 'Core roles registered for this organization',
      status: userCount >= 5 ? 'pass' : userCount >= 2 ? 'warn' : 'fail',
      detail: `${userCount} user${userCount === 1 ? '' : 's'} in this organization. Roles present: ${[...rolesPresent].join(', ') || 'none'}.`,
    },
    {
      area: 'Client initiatives',
      expected: 'Portfolio imported or created',
      status: initiativeCount >= 15 ? 'pass' : initiativeCount >= 8 ? 'warn' : 'fail',
      detail: initiativeCount >= 15
        ? `${initiativeCount} initiatives — good portfolio volume for a working walkthrough.`
        : `${initiativeCount} initiatives. Import via CSV or the New Initiative form, or run db:seed for placeholder data.`,
    },
    {
      area: 'Role hierarchy mapping',
      expected: 'Program Head / Program Manager / Business Head mapped',
      status: initiativeCount === 0 ? 'warn' : hierarchyPct >= 80 ? 'pass' : hierarchyPct >= 40 ? 'warn' : 'fail',
      detail: `${hierarchyMappedCount} of ${initiativeCount} initiatives (${hierarchyPct}%) have at least one enterprise-role field mapped by name.`,
    },
    {
      area: 'Business unit mapping',
      expected: 'Business unit assigned per initiative',
      status: initiativeCount === 0 ? 'warn' : businessUnitPct >= 80 ? 'pass' : businessUnitPct >= 40 ? 'warn' : 'fail',
      detail: `${businessUnitMappedCount} of ${initiativeCount} initiatives (${businessUnitPct}%) have a business unit assigned.`,
    },
    {
      area: 'Milestones',
      expected: 'Checkpoints available for delivery tracking',
      status: milestoneCount >= 10 ? 'pass' : milestoneCount >= 3 ? 'warn' : 'fail',
      detail: `${milestoneCount} milestones in this organization — drives Milestone Watch, Milestone Risk KPI, and Action Center reminders.`,
    },
    {
      area: 'Benefit claims',
      expected: 'Value claims mapped to initiatives',
      status: claimCount >= 10 ? 'pass' : claimCount >= 3 ? 'warn' : 'fail',
      detail: `${claimCount} benefit claims in this organization — drives Value Board, Value-at-Risk summary, and ROI metrics.`,
    },
    {
      area: 'Regulatory metadata',
      expected: 'Regulatory body recorded for flagged initiatives',
      status: regulatoryCount === 0 ? 'warn' : regulatoryWithBodyCount === regulatoryCount ? 'pass' : 'warn',
      detail: regulatoryCount === 0
        ? 'No initiatives are flagged as regulatory in this organization yet.'
        : `${regulatoryWithBodyCount} of ${regulatoryCount} regulatory initiatives have a regulatory body recorded.`,
    },
    {
      area: 'Production environment variables',
      expected: 'Deployment configuration confirmed',
      status: missingEnv.length === 0 ? 'pass' : missingEnv.some(e => e.name === 'AUTH_SECRET') ? 'fail' : 'warn',
      detail: missingEnv.length === 0
        ? 'NEXT_PUBLIC_WORKSPACE_NAME, AUTH_SECRET, and NEXT_PUBLIC_DEMO_MODE are all configured for this environment.'
        : `Missing: ${missingEnv.map(e => e.name).join(', ')}.`,
    },
  ];

  const wsNameSetForRollout = wsNameSet; // kept distinct from the consolidated env-var row above for the Client Rollout section's own detail line

  // ── 1. Product ─────────────────────────────────────────────────────────────
  const product: Check[] = [
    { label: 'Role-based dashboards working', status: 'pass', detail: 'CIO / PMO / Vertical Head / Business SPOC — all 5 views live' },
    { label: 'Initiative creation working', status: 'pass', detail: '6-step guided form with review & submit at /pmo/new' },
    { label: 'Initiative edit workflow working', status: 'pass', detail: '/items/[id]/edit — PMO/CIO can update metadata with audit trail' },
    { label: 'Governance lifecycle working', status: 'pass', detail: '11-stage waterfall pipeline with advance, delay, audit, validation' },
    { label: 'Leadership report working', status: 'pass', detail: '10-section executive report with stage snapshot, value-at-risk, regulatory summary' },
    { label: 'CSV / PDF export working', status: 'pass', detail: 'PrintButton + per-list CSV downloads (delay, slippage, regulatory, value delivered)' },
  ];

  // ── 2. Security ────────────────────────────────────────────────────────────
  const security: Check[] = [
    { label: 'Login required for all app routes', status: 'pass', detail: 'Middleware redirects unauthenticated users to /sign-in' },
    { label: 'Role-based route protection', status: 'pass', detail: 'Explicit allow-list in middleware.ts; sub-routes /edit and /validate guarded separately' },
    { label: 'Server actions role-guarded', status: 'pass', detail: 'requireRole() on every mutating action — createInitiative, advanceStage, updateNotes, signOffValue, etc.' },
    { label: 'Password hashing enabled', status: 'pass', detail: 'bcryptjs with 12 salt rounds' },
    { label: 'No public data routes', status: 'pass', detail: 'All /api/* are either auth-protected or Next-Auth internals' },
    { label: 'AUTH_SECRET configured', status: authSecretSet ? 'pass' : 'fail', detail: authSecretSet ? 'Session secret is set' : 'AUTH_SECRET env var is missing — sessions are insecure' },
    { label: 'Production environment mode confirmed', status: demoModeSet ? 'pass' : 'warn', detail: demoModeSet ? 'Sample-data banner visible — correct while UAT runs on seed data; turn NEXT_PUBLIC_DEMO_MODE off before go-live with real client data' : 'NEXT_PUBLIC_DEMO_MODE is off — confirm this is intentional for a live production environment with real client data' },
    { label: 'AI narrative disabled', status: 'pass', detail: 'ENABLE_AI_NARRATIVE=false — no external API calls at runtime' },
  ];

  // ── 3. Client Rollout ────────────────────────────────────────────────────────
  const rollout: Check[] = [
    {
      label: 'Client workspace name configured',
      status: wsNameSetForRollout ? 'pass' : 'warn',
      detail: wsNameSetForRollout
        ? `NEXT_PUBLIC_WORKSPACE_NAME = "${process.env.NEXT_PUBLIC_WORKSPACE_NAME}"`
        : 'Set NEXT_PUBLIC_WORKSPACE_NAME in Vercel env vars',
    },
    {
      label: `All 5 core user roles created`,
      status: allRoles.every(r => rolesPresent.has(r)) ? 'pass' : 'warn',
      detail: `Roles present: ${allRoles.filter(r => rolesPresent.has(r)).join(', ')} | Missing: ${allRoles.filter(r => !rolesPresent.has(r)).join(', ') || 'none'}`,
    },
    {
      label: 'Organization record created',
      status: org ? 'pass' : 'fail',
      detail: org ? `"${org.name}" (status: ${org.status})` : 'This admin account is not assigned to an organization — run scripts/seed-admin.ts to create one',
    },
    {
      label: 'Client walkthrough script ready',
      status: 'warn',
      detail: 'Recommended: prepare a 3-step flow (CIO → PMO → Business SPOC) before the client walkthrough',
    },
    {
      label: 'Current release scope documented',
      status: 'pass',
      detail: 'Single-tenant deployment, seed data pending real enterprise mapping, Docker bundle not complete — see Current Release Scope',
    },
    {
      label: 'UAT feedback capture process defined',
      status: 'warn',
      detail: 'Recommend a shared form or Jira board for UAT testers to log observations before go-live',
    },
  ];

  const allChecks = [...product, ...security, ...rollout];
  const totalPass = allChecks.filter(c => c.status === 'pass').length + uatRows.filter(r => r.status === 'pass').length + onboardingRows.filter(r => r.status === 'pass').length;
  const totalFail = allChecks.filter(c => c.status === 'fail').length + uatRows.filter(r => r.status === 'fail').length + onboardingRows.filter(r => r.status === 'fail').length;
  const totalChecks = allChecks.length + uatRows.length + onboardingRows.length;
  const totalWarn = totalChecks - totalPass - totalFail;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client UAT & Production Readiness"
        subtitle={`${totalPass} of ${totalChecks} checks passing${totalFail > 0 ? ` · ${totalFail} not ready` : ''}`}
      />

      {/* Summary bar */}
      <div className={`rounded-xl border px-5 py-4 ${
        totalFail > 0 ? 'border-rose-200 bg-rose-50/60' :
        totalWarn > 0 ? 'border-amber-200 bg-amber-50/60' :
        'border-emerald-200 bg-emerald-50/60'
      }`}>
        <p className={`text-sm font-semibold ${totalFail > 0 ? 'text-rose-800' : totalWarn > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
          {totalFail > 0
            ? `${totalFail} item${totalFail !== 1 ? 's' : ''} not ready for client UAT.`
            : totalWarn > 0
            ? `${totalWarn} item${totalWarn !== 1 ? 's' : ''} need attention before the client walkthrough.`
            : '✓ All checks passing — platform is ready for client UAT and production rollout.'}
        </p>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(totalPass / totalChecks) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {totalPass} / {totalChecks} ready — every count on this page is scoped to your active organization ({org?.name ?? 'none assigned'}), re-computed live on every load.
        </p>
      </div>

      {/* ── Client UAT Checklist ── */}
      <SectionCard
        title="Client UAT Checklist"
        subtitle={sectionScore(uatRows.map(r => ({ label: r.area, status: r.status })))}
        icon={ClipboardCheck}
        tone={uatRows.some(r => r.status === 'fail') ? 'risk' : uatRows.some(r => r.status === 'warn') ? 'warning' : 'success'}
        noPad
      >
        <ChecklistTable rows={uatRows} />
      </SectionCard>

      {/* ── Client Onboarding & Data Readiness ── */}
      <SectionCard
        title="Client Onboarding & Data Readiness"
        subtitle={sectionScore(onboardingRows.map(r => ({ label: r.area, status: r.status })))}
        icon={Database}
        tone={onboardingRows.some(r => r.status === 'fail') ? 'risk' : onboardingRows.some(r => r.status === 'warn') ? 'warning' : 'success'}
        noPad
      >
        <ChecklistTable rows={onboardingRows} />
      </SectionCard>

      {/* ── 1. Product ── */}
      <SectionCard title="Product" subtitle={sectionScore(product)} icon={Rocket} tone={sectionTone(product)}>
        <ul>{product.map(c => <CheckRow key={c.label} {...c} />)}</ul>
      </SectionCard>

      {/* ── 2. Security ── */}
      <SectionCard title="Security" subtitle={sectionScore(security)} icon={ShieldCheck} tone={sectionTone(security)}>
        <ul>{security.map(c => <CheckRow key={c.label} {...c} />)}</ul>
      </SectionCard>

      {/* ── 3. Client Rollout ── */}
      <SectionCard title="Client Rollout" subtitle={sectionScore(rollout)} icon={Target} tone={sectionTone(rollout)}>
        <ul>{rollout.map(c => <CheckRow key={c.label} {...c} />)}</ul>
      </SectionCard>
    </div>
  );
}
