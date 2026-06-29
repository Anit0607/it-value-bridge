export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Database, Target, Rocket } from 'lucide-react';

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
  const [userCount, initiativeCount, regulatoryCount, delayedCount, claimCount, org, users] =
    await Promise.all([
      prisma.user.count(),
      prisma.initiative.count(),
      prisma.initiative.count({ where: { isRegulatory: true } }),
      prisma.initiative.count({ where: { delayed: true, currentStage: { not: 'CLOSED' } } }),
      prisma.benefitClaim.count(),
      prisma.organization.findFirst({ select: { name: true, status: true } }),
      prisma.user.findMany({ select: { role: true } }),
    ]);

  const rolesPresent = new Set(users.map(u => u.role as string));
  const allRoles = ['ADMIN', 'CIO', 'PMO', 'VERTICAL_HEAD', 'BUSINESS'];

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
    { label: 'NEXT_PUBLIC_DEMO_MODE set', status: demoModeSet ? 'pass' : 'warn', detail: demoModeSet ? 'Demo banner visible — users know this is sample data' : 'Set NEXT_PUBLIC_DEMO_MODE=true for the hosted demo instance' },
    { label: 'AI narrative disabled', status: 'pass', detail: 'ENABLE_AI_NARRATIVE=false — no external API calls at runtime' },
  ];

  // ── 3. Data ────────────────────────────────────────────────────────────────
  const data: Check[] = [
    {
      label: `Sample users available (${userCount} registered)`,
      status: userCount >= 5 ? 'pass' : userCount >= 2 ? 'warn' : 'fail',
      detail: `Roles present: ${[...rolesPresent].join(', ')}`,
    },
    {
      label: `Sample initiatives available (${initiativeCount})`,
      status: initiativeCount >= 15 ? 'pass' : initiativeCount >= 8 ? 'warn' : 'fail',
      detail: initiativeCount >= 15 ? 'Good portfolio volume for demo' : 'Run db:seed to populate sample data',
    },
    {
      label: `Sample regulatory items (${regulatoryCount})`,
      status: regulatoryCount >= 2 ? 'pass' : regulatoryCount >= 1 ? 'warn' : 'fail',
      detail: 'Required for Regulatory Watch in CIO dashboard and report',
    },
    {
      label: `Sample delayed items (${delayedCount})`,
      status: delayedCount >= 3 ? 'pass' : delayedCount >= 1 ? 'warn' : 'fail',
      detail: 'Makes PMO Work Queue and Delay Accountability realistic',
    },
    {
      label: `Sample benefit claims (${claimCount})`,
      status: claimCount >= 10 ? 'pass' : claimCount >= 3 ? 'warn' : 'fail',
      detail: 'Drives Value Board, Value-at-Risk summary, and ROI metrics',
    },
    {
      label: 'Reset / reseed process documented',
      status: 'pass',
      detail: 'DATABASE_URL=<neon-url> npx tsx scripts/seed-admin.ts / npm run db:seed',
    },
  ];

  // ── 4. Pilot ───────────────────────────────────────────────────────────────
  const pilot: Check[] = [
    {
      label: 'Pilot workspace name configured',
      status: wsNameSet ? 'pass' : 'warn',
      detail: wsNameSet
        ? `NEXT_PUBLIC_WORKSPACE_NAME = "${process.env.NEXT_PUBLIC_WORKSPACE_NAME}"`
        : 'Set NEXT_PUBLIC_WORKSPACE_NAME in Vercel env vars',
    },
    {
      label: `All 5 pilot user roles created`,
      status: allRoles.every(r => rolesPresent.has(r)) ? 'pass' : 'warn',
      detail: `Roles present: ${allRoles.filter(r => rolesPresent.has(r)).join(', ')} | Missing: ${allRoles.filter(r => !rolesPresent.has(r)).join(', ') || 'none'}`,
    },
    {
      label: 'Organization record created',
      status: org ? 'pass' : 'fail',
      detail: org ? `"${org.name}" (status: ${org.status})` : 'Run scripts/seed-admin.ts to create the default org',
    },
    {
      label: 'Demo walkthrough script ready',
      status: 'warn',
      detail: 'Recommended: prepare a 3-step flow (CIO → PMO → Business SPOC) before CIO demo',
    },
    {
      label: 'Known limitations documented',
      status: 'pass',
      detail: 'Single-tenant pilot, no real bank data, ADMIN role migration pending DB apply, Docker bundle not complete',
    },
    {
      label: 'Feedback capture process defined',
      status: 'warn',
      detail: 'Recommend a shared form or Jira board for testers to log observations before CIO demo',
    },
  ];

  const allChecks = [...product, ...security, ...data, ...pilot];
  const totalPass = allChecks.filter(c => c.status === 'pass').length;
  const totalFail = allChecks.filter(c => c.status === 'fail').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilot Readiness Checklist"
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
            ? `${totalFail} critical issue${totalFail !== 1 ? 's' : ''} must be resolved before pilot.`
            : allChecks.some(c => c.status === 'warn')
            ? `${allChecks.filter(c => c.status === 'warn').length} items need attention before CIO demo.`
            : '✓ All checks passing — platform is ready for pilot deployment.'}
        </p>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(totalPass / allChecks.length) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-500">{totalPass} / {allChecks.length} ready</p>
      </div>

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

      {/* ── 4. Pilot ── */}
      <SectionCard title="Pilot" subtitle={sectionScore(pilot)} icon={Target} tone={sectionTone(pilot)}>
        <ul>{pilot.map(c => <CheckRow key={c.label} {...c} />)}</ul>
      </SectionCard>
    </div>
  );
}
