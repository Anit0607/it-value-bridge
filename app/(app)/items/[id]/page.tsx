export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getInitiativeItem, getInitiativeValue } from '@/lib/actions/initiatives';
import { getInitiativeDependencies, listLinkableInitiatives } from '@/lib/actions/dependencies';
import { ItemDetailClient } from './ItemDetailClient';
import { ValueRealizationPanel } from '@/components/value/ValueRealizationPanel';
import { DependencyPanel } from '@/components/dependencies/DependencyPanel';
import { RegulatoryControl } from '@/components/RegulatoryControl';
import { addMonthsIso, realizationStatus } from '@/lib/value';

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const [item, value, deps, linkOptions] = await Promise.all([
    getInitiativeItem(params.id),
    getInitiativeValue(params.id),
    getInitiativeDependencies(params.id),
    listLinkableInitiatives(params.id),
  ]);
  if (!item) notFound();

  const role = session.user.role;
  const canRecord = role === 'PMO' || role === 'CIO';
  const canEditDeps = role === 'PMO' || role === 'CIO' || role === 'VERTICAL_HEAD';

  // Benefit-realization status for the value panel (computed at render).
  const goLive = item.history.find(h => h.stage === 'Go Live') ?? item.history.find(h => h.stage === 'Closed');
  const goLiveIso = goLive?.date ?? null;
  const realizationDueIso = goLiveIso ? addMonthsIso(goLiveIso, 12) : null;
  const realizationConfirmed =
    !!item.validation ||
    !!value?.benefitClaims.some(c => c.measurements.some(m => m.realizedInr != null));
  const realization = {
    status: realizationStatus({
      isLiveOrClosed: ['Go Live', 'Business Validation', 'Closed'].includes(item.currentStage),
      confirmed: realizationConfirmed,
      dueIso: realizationDueIso,
    }),
    dueIso: realizationDueIso,
  };

  return (
    <div className="space-y-4">
      <ItemDetailClient item={item} value={value} />
      <div className="mx-auto max-w-5xl">
        <RegulatoryControl
          initiativeId={params.id}
          isRegulatory={item.isRegulatory}
          regulatoryBody={item.regulatoryBody}
          regulatoryDueDate={item.regulatoryDueDate}
          canEdit={canRecord}
        />
      </div>
      {value && value.benefitClaims.length > 0 && (
        <div className="mx-auto max-w-5xl">
          <ValueRealizationPanel initiativeId={params.id} value={value} canRecord={canRecord} realization={realization} />
        </div>
      )}
      <div className="mx-auto max-w-5xl">
        <DependencyPanel initiativeId={params.id} deps={deps} options={linkOptions} canEdit={canEditDeps} />
      </div>
    </div>
  );
}
