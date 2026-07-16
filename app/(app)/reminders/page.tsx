export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listVisibleInitiativesForUser } from '@/lib/actions/initiatives';
import { enrichAll } from '@/lib/queries/enrich';
import { generateReminders, REMINDER_TYPE_LABEL, REMINDER_OWNER_ROLE_LABEL } from '@/lib/reminders';
import { SEVERITY_TONE, sortBySeverity, dueOrAge } from '@/components/RemindersPanel';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { Badge } from '@/components/ui/Badge';
import { ListChecks, AlertOctagon, ShieldAlert, Building2, Truck, Inbox } from 'lucide-react';

export default async function ActionCenterPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const items = enrichAll(await listVisibleInitiativesForUser(session.user));
  const reminders = sortBySeverity(generateReminders(items));

  const totalOpen = reminders.length;
  const critical = reminders.filter(r => r.severity === 'CRITICAL').length;
  const regulatory = reminders.filter(r => r.type === 'REGULATORY_DEADLINE_RISK').length;
  const businessPending = reminders.filter(r => r.type === 'BUSINESS_DELAY').length;
  const vendorPending = reminders.filter(r => r.type === 'VENDOR_DELAY').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Action Center"
        subtitle="Every open, system-generated action across your visible portfolio"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Total Open Actions" value={totalOpen} icon={ListChecks} accent="brand" />
        <KpiCard label="Critical Actions" value={critical} icon={AlertOctagon} accent="rose" />
        <KpiCard label="Regulatory Actions" value={regulatory} icon={ShieldAlert} accent="rose" />
        <KpiCard label="Business Pending" value={businessPending} icon={Building2} accent="amber" />
        <KpiCard label="Vendor Pending" value={vendorPending} icon={Truck} accent="slate" />
      </div>

      <SectionCard title="Open Actions" icon={ListChecks} count={reminders.length} noPad>
        {reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-700">No open actions</p>
            <p className="mt-1 text-xs text-slate-400">Everything in your visible portfolio is on track.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Severity</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Action</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Initiative</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Owner</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Due / Age</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((r, idx) => (
                  <tr key={r.id} className={`border-t border-slate-100 transition-colors hover:bg-brand-50/40 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-5 py-2.5">
                      <Badge tone={SEVERITY_TONE[r.severity]} size="sm">{r.severity}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{r.message}</td>
                    <td className="px-4 py-2.5">
                      <Link href={r.actionHref} className="font-medium text-slate-800 hover:text-brand-700">
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-slate-700">{r.owner}</div>
                      <div className="text-[11px] text-slate-400">{REMINDER_OWNER_ROLE_LABEL[r.ownerRole]}</div>
                    </td>
                    <td className="px-4 py-2.5 tabular text-slate-600">{dueOrAge(r)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{REMINDER_TYPE_LABEL[r.type]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
