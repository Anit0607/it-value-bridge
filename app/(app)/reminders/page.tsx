export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listVisibleInitiativesForUser } from '@/lib/actions/initiatives';
import { enrichAll } from '@/lib/queries/enrich';
import { generateReminders } from '@/lib/reminders';
import { sortBySeverity } from '@/components/RemindersPanel';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { ActionCenterClient } from './ActionCenterClient';
import { ListChecks, AlertOctagon, ShieldAlert, Building2, Truck } from 'lucide-react';

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

      <ActionCenterClient reminders={reminders} />
    </div>
  );
}
