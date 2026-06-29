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
    area: 'Multi-tenancy',
    current: 'Single-organisation workspace. All users share one portfolio view. There is no data isolation between different bank teams.',
    roadmap: 'Tenant-level data partitioning via the `organizationId` field already added to the schema — activation is the next infrastructure sprint.',
    priority: 'high',
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
    area: 'External Integrations',
    current: 'No live connections to Jira, ServiceNow, email, or project management tools. CSV import is available for bulk demand entry.',
    roadmap: 'Jira webhook / REST sync, email notifications on stage movement, and ServiceNow CR import are on the product roadmap.',
    priority: 'medium',
  },
  {
    id: 6,
    area: 'Docker / On-Prem Bundle',
    current: 'Docker Compose for local development exists but the production self-hosted bundle (standalone Next.js + auto-migrate + init) is not yet complete.',
    roadmap: 'next.config `output: standalone` + docker-compose app service + healthcheck + init script are the remaining tasks for the on-prem bundle.',
    priority: 'high',
  },
  {
    id: 7,
    area: 'Mobile / Responsive',
    current: 'Designed for desktop governance workflows. Tablet is functional. Mobile experience is limited — tables and dense dashboards do not adapt fully.',
    roadmap: 'Progressive mobile polish is planned. Key leadership views (CIO KPIs, Action Required) will be prioritised for mobile-first rendering.',
    priority: 'later',
  },
  {
    id: 8,
    area: 'External Pilot Validation',
    current: 'Platform has not yet been validated by external enterprise banking users in a real governance environment.',
    roadmap: 'Pilot deployment with 4–5 testers at Bandhan Bank followed by structured feedback collection is the immediate next step.',
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
        title="Known Limitations"
        subtitle="Honest inventory of current MVP gaps — use this in enterprise conversations to build credibility"
      />

      {/* Context banner */}
      <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-5 py-4">
        <p className="text-sm font-semibold text-brand-800">Why this page exists</p>
        <p className="mt-1 text-sm leading-relaxed text-brand-700">
          Listing limitations proactively demonstrates engineering maturity and enterprise readiness.
          Every item below has a clear roadmap path. This is not a list of failures — it is a
          transparent product backlog.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-700">{high} high priority</span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">{medium} medium priority</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{LIMITATIONS.length - high - medium} later</span>
        </div>
      </div>

      {/* Limitations list */}
      <SectionCard title="Current MVP Limitations" subtitle={`${LIMITATIONS.length} items`} icon={AlertTriangle} tone="warning">
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
          Share this page with CIO, mentors, or pilot users before the demo.
          Frame it as: <em>"Here is what the platform does today, and here is the clear path to production readiness."</em>
          This is stronger than discovering gaps during a live demo.
        </p>
      </div>
    </div>
  );
}
