export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getVisibleInitiativeItem } from '@/lib/actions/initiatives';
import { isPmoEquivalent } from '@/lib/rbac';
import { EditClient } from './EditClient';

/** ₹ → ₹ Crore string for the form. null stays blank, not "0". */
function inrToCr(v: number | null | undefined): string {
  return v == null ? '' : String(v / 10_000_000);
}

export default async function EditInitiativePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  if (!isPmoEquivalent(session.user.role) && session.user.role !== 'CIO' && session.user.role !== 'ADMIN') {
    redirect(`/items/${params.id}`);
  }

  // Tenant-safe fetch — org + role scoped
  const item = await getVisibleInitiativeItem(params.id, session.user);
  if (!item) notFound();

  return (
    <EditClient
      id={item.id}
      defaults={{
        title:            item.title,
        requirement:      item.requirement ?? '',
        classification:   item.classification,
        verticalHead:     item.verticalHead ?? '',
        businessSpoc:     item.businessSpoc ?? '',
        businessSponsor:  item.businessSponsor ?? '',
        goLiveDate:       item.goLiveDate ?? '',
        isRegulatory:     item.isRegulatory,
        regulatoryBody:   item.regulatoryBody ?? '',
        regulatoryDueDate: item.regulatoryDueDate ?? '',
        programHeadName:    item.programHeadName ?? '',
        programManagerName: item.programManagerName ?? '',
        businessHeadName:    item.businessHeadName ?? '',
        businessUnit:        item.businessUnit ?? '',
        subBusinessUnit:     item.subBusinessUnit ?? '',
        // Stored in ₹, edited in ₹ Crore. `?? ''` keeps "not captured" blank
        // rather than pre-filling a misleading 0.
        buildCostCr:      inrToCr(item.buildCostInr),
        annualRunCostCr:  inrToCr(item.annualRunCostInr),
        tcoHorizonYears:  item.tcoHorizonYears != null ? String(item.tcoHorizonYears) : '',
        actualCostCr:     inrToCr(item.actualCostInr),
      }}
    />
  );
}
