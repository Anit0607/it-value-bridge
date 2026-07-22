import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, Clock, Lightbulb } from 'lucide-react';

interface Limitation {
  id: number;
  area: string;
  current: string;
  roadmap: string;
  priority: 'high' | 'medium' | 'later';
}

const LIMITATIONS: Limitation[] = [
  {
    id: 1,
    area: 'Organization & Role-Scoped Access',
    current: 'Current release supports organization-scoped and role-scoped access. Some ownership mappings are still name-based and should move to ID-based mapping before broader production rollout.',
    roadmap: 'ID-based ownership mapping is the next hardening step (see Role-Based Access Scoping below for specifics). Full multi-organization tenant isolation — for future deployments serving more than one client organization — is already schema-ready via the `organizationId` field and can be activated in a later infrastructure sprint.',
    priority: 'medium',
  },
  {
    id: 2,
    area: 'Authentication & SSO',
    current: 'Credential-based login (email + password) only. No enterprise SSO, LDAP, Active Directory, or SAML integration.',
    roadmap: 'Auth.js supports OAuth and SAML providers. SSO can be enabled with a provider config change — no schema migration required.',
    priority: 'high',
  },
  {
    id: 3,
    area: 'AI / LLM Narrative',
    current: 'Executive Summary and portfolio insights are rule-based and deterministic. No LLM-generated text. AI toggle is off by default (ENABLE_AI_NARRATIVE=false).',
    roadmap: 'The narrative block is ready to accept Claude API output. Enabling LLM summaries requires a Claude API key and the toggle set to true.',
    priority: 'medium',
  },
  {
    id: 4,
    area: 'PDF Export',
    current: 'Export currently uses browser print (window.print + print CSS). Output quality depends on the user\'s browser and printer driver.',
    roadmap: 'Server-side PDF generation with branded headers, footers, and pagination using a headless browser or PDF library is planned.',
    priority: 'medium',
  },
  {
    id: 5,
    area: 'Real-Time Integrations',
    current: 'No live connections to Jira, ServiceNow, email, or other systems of record yet. CSV import is available for bulk demand entry.',
    roadmap: 'Current version is deliberately a system-of-intelligence that sits on top of existing tools. Live integrations (Jira webhook / REST sync, ServiceNow CR import) are planned after UAT confirms which systems matter most.',
    priority: 'medium',
  },
  {
    id: 6,
    area: 'Outbound Reminders (Email / WhatsApp)',
    current: 'The Action Center surfaces every reminder in-app only. There is no email or WhatsApp delivery of overdue-stage, milestone, or validation-pending alerts yet.',
    roadmap: 'In-app first was a deliberate sequencing choice — outbound automation is added once the reminder rules themselves have been pressure-tested against real usage during UAT, so we don’t spam users with rules that still need tuning.',
    priority: 'medium',
  },
  {
    id: 7,
    area: 'Saved Views',
    current: 'Saved Views on CIO / PMO / Business are a fixed, curated set (e.g. Today’s Escalations, Regulatory Watch) rather than user-defined and database-backed.',
    roadmap: 'The curated presets were built from the filter combinations users actually need on day one. User-defined, saved-to-database views are a natural next step once real usage shows which custom combinations recur most.',
    priority: 'later',
  },
  {
    id: 8,
    area: 'WBS / Gantt Planning',
    current: 'There is no work-breakdown-structure or Gantt-chart view. Delivery is tracked as a linear stage lifecycle (BRD → ... → Closed) with milestones, not task-level scheduling.',
    roadmap: 'This is a deliberate scope boundary, not an oversight. The product is governance and value intelligence — did we deliver value, on time, with sign-off — not a project-planning tool. Teams needing task-level Gantt views are expected to keep using their existing PM tool alongside this platform.',
    priority: 'later',
  },
  {
    id: 9,
    area: 'Demo & Seed Data',
    current: 'All portfolio data visible in this environment is seeded demo data representing a plausible banking IT portfolio, not a live enterprise data feed.',
    roadmap: 'The next milestone is validating that real enterprise data (initiative lists, ownership hierarchies, benefit claims) maps cleanly onto this schema — seed data was built to mirror that exact shape so the transition is low-risk.',
    priority: 'medium',
  },
  {
    id: 10,
    area: 'Role-Based Access Scoping',
    current: 'In some areas, visibility scoping (e.g. Vertical Head, Business Head, Program Manager reporting lines) matches on stored name strings rather than a foreign-key relationship to a user ID.',
    roadmap: 'Acceptable for the current single-tenant deployment where names are unique and stable. Production hardening should move these to ID-based ownership mapping to eliminate any ambiguity from name changes or duplicates.',
    priority: 'medium',
  },
  {
    id: 11,
    area: 'Docker / On-Prem Bundle',
    current: 'Docker Compose for local development exists but the production self-hosted bundle (standalone Next.js + auto-migrate + init) is not yet complete.',
    roadmap: 'next.config `output: standalone` + docker-compose app service + healthcheck + init script are the remaining tasks for the on-prem bundle.',
    priority: 'high',
  },
  {
    id: 12,
    area: 'Mobile / Responsive',
    current: 'Designed for desktop governance workflows. Tablet is functional. Mobile experience is limited — tables and dense dashboards do not adapt fully.',
    roadmap: 'Progressive mobile polish is planned. Key leadership views (CIO KPIs, Action Required) will be prioritised for mobile-first rendering.',
    priority: 'later',
  },
  {
    id: 13,
    area: 'Client UAT Validation',
    current: 'Platform has not yet completed a structured UAT cycle with real client users in a live governance environment.',
    roadmap: 'UAT with 4–5 client testers at Bandhan Bank, followed by structured feedback collection, is the immediate next step.',
    priority: 'high',
  },
];

const PRIORITY_TONE: Record<Limitation['priority'], 'danger' | 'warning' | 'slate'> = {
  high:   'danger',
  medium: 'warning',
  later:  'slate',
};

const PRIORITY_LABEL: Record<Limitation['priority'], string> = {
  high:   'High priority',
  medium: 'Medium priority',
  later:  'Later',
};

export default async function KnownLimitationsPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  if (session.user.role !== 'ADMIN') redirect('/');

  const high   = LIMITATIONS.filter(l => l.priority === 'high').length;
  const medium = LIMITATIONS.filter(l => l.priority === 'medium').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Current Release Scope"
        subtitle="What's in and out of this release — use this to set client expectations clearly during UAT"
      />

      {/* Context banner */}
      <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-5 py-4">
        <p className="text-sm font-semibold text-brand-800">Why this page exists</p>
        <p className="mt-1 text-sm leading-relaxed text-brand-700">
          Naming scope boundaries proactively demonstrates engineering maturity and client readiness.
          Every item below has a clear roadmap path. This is not a list of failures — it is a
          transparent, honest record of what this release does and does not cover.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-700">{high} high priority</span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">{medium} medium priority</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{LIMITATIONS.length - high - medium} later</span>
        </div>
      </div>

      {/* Limitations list */}
      <SectionCard title="Current Release Scope Items" subtitle={`${LIMITATIONS.length} items`} icon={AlertTriangle} tone="warning">
        <div className="space-y-5">
          {LIMITATIONS.map(l => (
            <div key={l.id} className="rounded-xl border border-slate-100 bg-slate-50/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold tabular text-slate-400">#{l.id}</span>
                <span className="text-sm font-semibold text-slate-800">{l.area}</span>
                <Badge tone={PRIORITY_TONE[l.priority]} size="sm">{PRIORITY_LABEL[l.priority]}</Badge>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    <AlertTriangle className="h-3 w-3" /> Current state
                  </p>
                  <p className="text-xs leading-relaxed text-slate-700">{l.current}</p>
                </div>
                <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700">
                    <Clock className="h-3 w-3" /> Roadmap path
                  </p>
                  <p className="text-xs leading-relaxed text-slate-700">{l.roadmap}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Closing note */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <Lightbulb className="h-4 w-4" />
          How to use this in conversations
        </p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-700">
          Share this page with the client&apos;s CIO and UAT stakeholders before the walkthrough.
          Frame it as: <em>&ldquo;Here is what the platform does today, and here is the clear path to production readiness.&rdquo;</em>
          This is stronger than discovering scope gaps during live UAT.
        </p>
      </div>
    </div>
  );
}
