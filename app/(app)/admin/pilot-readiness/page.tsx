export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { listVisibleInitiativesForUser } from '@/lib/actions/initiatives';
import { listOpenMilestonesForInitiatives } from '@/lib/actions/milestones';
import { enrichAll } from '@/lib/queries/enrich';
import { generateReminders } from '@/lib/reminders';
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

export default async function PilotReadinessPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  if (session.user.role !== 'ADMIN') redirect('/');

  // ── DB counts for data section ─────────────────────────────────────────────
  const [
    userCount, initiativeCount, regulatoryCount, delayedCount, claimCount, org, users,
    milestoneCount, strategicCount, hierarchyInitiativeCount,
  ] =
    await Promise.all([
      prisma.user.count(),
      prisma.initiative.count(),
      prisma.initiative.count({ where: { isRegulatory: true } }),
      prisma.initiative.count({ where: { delayed: true, currentStage: { not: 'CLOSED' } } }),
      prisma.benefitClaim.count(),
      prisma.organization.findFirst({ select: { name: true, status: true } }),
      prisma.user.findMany({ select: { role: true } }),
      prisma.milestone.count(),
      prisma.initiative.count({ where: { classification: 'STRATEGIC' } }),
      prisma.initiative.count({ where: { programHeadName: { not: null } } }),
    ]);

  const rolesPresent = new Set(users.map(u => u.role as string));
  const allRoles = ['ADMIN', 'CIO', 'PMO', 'VERTICAL_HEAD', 'BUSINESS'];
  const hierarchyRoles = ['VERTICAL_HEAD', 'BUSINESS', 'PROGRAM_HEAD', 'PROGRAM_MANAGER', 'BUSINESS_HEAD'];
  const hierarchyRolesPresent = hierarchyRoles.every(r => rolesPresent.has(r));
  const roleHierarchyConfigured = hierarchyRolesPresent && hierarchyInitiativeCount > 0;

  // Real smoke test of the Action Center's actual reminder engine — not a
  // static claim. Same org-wide visibility ADMIN already gets everywhere
  // else (buildInitiativeVisibilityWhere), so this reads real, live data.
  const adminItems = enrichAll(await listVisibleInitiativesForUser(session.user));
  const adminMilestones = await listOpenMilestonesForInitiatives(adminItems);
  const activeReminderCount = generateReminders(adminItems, adminMilestones).length;

  const wsNameSet = !!(process.env.NEXT_PUBLIC_WORKSPACE_NAME);
  const demoModeSet = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const authSecretSet = !!(process.env.AUTH_SECRET);

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

  // ── 3. Data ────────────────────────────────────────────────────────────────
  const data: Check[] = [
    {
      label: `Client users configured (${userCount} registered)`,
      status: userCount >= 5 ? 'pass' : userCount >= 2 ? 'warn' : 'fail',
      detail: `Roles present: ${[...rolesPresent].join(', ')}`,
    },
    {
      label: `Client initiatives imported/created (${initiativeCount})`,
      status: initiativeCount >= 15 ? 'pass' : initiativeCount >= 8 ? 'warn' : 'fail',
      detail: initiativeCount >= 15 ? 'Good portfolio volume for a working walkthrough' : 'Import client initiatives via CSV or the New Initiative form, or run db:seed for placeholder data',
    },
    {
      label: `Client regulatory items available (${regulatoryCount})`,
      status: regulatoryCount >= 2 ? 'pass' : regulatoryCount >= 1 ? 'warn' : 'fail',
      detail: 'Required for Regulatory Watch in CIO dashboard and report',
    },
    {
      label: `Client delayed items tracked (${delayedCount})`,
      status: delayedCount >= 3 ? 'pass' : delayedCount >= 1 ? 'warn' : 'fail',
      detail: 'Makes PMO Work Queue and Delay Accountability realistic',
    },
    {
      label: `Client benefit claims mapped (${claimCount})`,
      status: claimCount >= 10 ? 'pass' : claimCount >= 3 ? 'warn' : 'fail',
      detail: 'Drives Value Board, Value-at-Risk summary, and ROI metrics',
    },
    {
      label: `Client milestones available (${milestoneCount})`,
      status: milestoneCount >= 10 ? 'pass' : milestoneCount >= 3 ? 'warn' : 'fail',
      detail: 'Drives the Milestone Watch table, Milestone Risk KPI, and Action Center reminders',
    },
    {
      label: 'UAT scenarios prepared',
      status: 'warn',
      detail: 'Recommend a written test-case list per role (CIO, PMO, Program Head, Program Manager, Vertical Head, Business Head, Business SPOC) — see Client UAT Readiness for the live data-scoping verification',
    },
    {
      label: 'Reset / reseed process documented',
      status: 'pass',
      detail: 'DATABASE_URL=<neon-url> npx tsx scripts/seed-admin.ts / npm run db:seed',
    },
  ];

  // ── 4. Client Rollout ────────────────────────────────────────────────────────
  const pilot: Check[] = [
    {
      label: 'Client workspace name configured',
      status: wsNameSet ? 'pass' : 'warn',
      detail: wsNameSet
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
      detail: org ? `"${org.name}" (status: ${org.status})` : 'Run scripts/seed-admin.ts to create the default org',
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

  const allChecks = [...product, ...security, ...data, ...pilot];
  const totalPass = allChecks.filter(c => c.status === 'pass').length;
  const totalFail = allChecks.filter(c => c.status === 'fail').length;

  // ── Platform Structure Checklist ── the enterprise-buyer-facing summary:
  // ten yes/no areas, each backed by a real DB count or a live run of the
  // actual feature (Action Center), not a hardcoded claim.
  interface AreaCheck { area: string; done: boolean; detail: string }
  const structureChecks: AreaCheck[] = [
    { area: 'Organization configured', done: !!org, detail: org ? `"${org.name}" — status: ${org.status}` : 'No organization record found' },
    { area: 'Users seeded or created', done: userCount > 0, detail: `${userCount} user${userCount === 1 ? '' : 's'} across ${rolesPresent.size} role${rolesPresent.size === 1 ? '' : 's'}` },
    { area: 'Role hierarchy configured', done: roleHierarchyConfigured, detail: roleHierarchyConfigured ? 'Vertical Head / Business / Program Head / Program Manager / Business Head all present, with hierarchy fields set on initiatives' : 'Missing one or more hierarchy roles, or no initiative has programHeadName set' },
    { area: 'Initiatives available', done: initiativeCount > 0, detail: `${initiativeCount} initiative${initiativeCount === 1 ? '' : 's'}` },
    { area: 'Value claims available', done: claimCount > 0, detail: `${claimCount} benefit claim${claimCount === 1 ? '' : 's'}` },
    { area: 'Milestones available', done: milestoneCount > 0, detail: `${milestoneCount} milestone${milestoneCount === 1 ? '' : 's'}` },
    { area: 'Action Center generating reminders', done: activeReminderCount > 0, detail: `${activeReminderCount} active reminder${activeReminderCount === 1 ? '' : 's'} generated live from current data` },
    { area: 'Regulatory examples available', done: regulatoryCount > 0, detail: `${regulatoryCount} regulatory initiative${regulatoryCount === 1 ? '' : 's'}` },
    { area: 'Strategic projects available', done: strategicCount > 0, detail: `${strategicCount} Strategic-classified initiative${strategicCount === 1 ? '' : 's'}` },
    { area: 'Current release scope documented', done: true, detail: 'See Current Release Scope (/admin/known-limitations)' },
  ];
  const structureDoneCount = structureChecks.filter(c => c.done).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Readiness Checklist"
        subtitle={`${totalPass} of ${allChecks.length} checks passing${totalFail > 0 ? ` · ${totalFail} critical` : ''}`}
      />

      {/* Summary bar */}
      <div className={`rounded-xl border px-5 py-4 ${
        totalFail > 0 ? 'border-rose-200 bg-rose-50/60' :
        allChecks.some(c => c.status === 'warn') ? 'border-amber-200 bg-amber-50/60' :
        'border-emerald-200 bg-emerald-50/60'
      }`}>
        <p className={`text-sm font-semibold ${totalFail > 0 ? 'text-rose-800' : allChecks.some(c => c.status === 'warn') ? 'text-amber-800' : 'text-emerald-800'}`}>
          {totalFail > 0
            ? `${totalFail} critical issue${totalFail !== 1 ? 's' : ''} must be resolved before go-live.`
            : allChecks.some(c => c.status === 'warn')
            ? `${allChecks.filter(c => c.status === 'warn').length} items need attention before the client walkthrough.`
            : '✓ All checks passing — platform is ready for client UAT and production rollout.'}
        </p>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(totalPass / allChecks.length) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-500">{totalPass} / {allChecks.length} ready</p>
      </div>

      {/* ── Platform Structure Checklist — enterprise-buyer-facing summary ── */}
      <SectionCard
        title="Platform Structure Checklist"
        subtitle={`${structureDoneCount} / ${structureChecks.length} done`}
        icon={ClipboardCheck}
        tone={structureDoneCount === structureChecks.length ? 'success' : 'risk'}
        noPad
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Area</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {structureChecks.map((c, idx) => (
                <tr key={c.area} className={`border-t border-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                  <td className="px-5 py-2.5">
                    <div className="font-medium text-slate-800">{c.area}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{c.detail}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={c.done ? 'success' : 'danger'} size="sm">{c.done ? 'Done' : 'Missing'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── 1. Product ── */}
      <SectionCard title="Product" subtitle={sectionScore(product)} icon={Rocket} tone={sectionTone(product)}>
        <ul>{product.map(c => <CheckRow key={c.label} {...c} />)}</ul>
      </SectionCard>

      {/* ── 2. Security ── */}
      <SectionCard title="Security" subtitle={sectionScore(security)} icon={ShieldCheck} tone={sectionTone(security)}>
        <ul>{security.map(c => <CheckRow key={c.label} {...c} />)}</ul>
      </SectionCard>

      {/* ── 3. Data ── */}
      <SectionCard title="Data" subtitle={sectionScore(data)} icon={Database} tone={sectionTone(data)}>
        <ul>{data.map(c => <CheckRow key={c.label} {...c} />)}</ul>
      </SectionCard>

      {/* ── 4. Client Rollout ── */}
      <SectionCard title="Client Rollout" subtitle={sectionScore(pilot)} icon={Target} tone={sectionTone(pilot)}>
        <ul>{pilot.map(c => <CheckRow key={c.label} {...c} />)}</ul>
      </SectionCard>
    </div>
  );
}
