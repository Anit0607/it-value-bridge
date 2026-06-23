export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getInitiativeItem, getInitiativeValue } from '@/lib/actions/initiatives';
import { getInitiativeDependencies, listLinkableInitiatives } from '@/lib/actions/dependencies';
import { ItemDetailClient } from './ItemDetailClient';
import { ValueRealizationPanel } from '@/components/value/ValueRealizationPanel';
import { DependencyPanel } from '@/components/dependencies/DependencyPanel';
import { RegulatoryControl } from '@/components/RegulatoryControl';

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
          <ValueRealizationPanel initiativeId={params.id} value={value} canRecord={canRecord} />
        </div>
      )}
      <div className="mx-auto max-w-5xl">
        <DependencyPanel initiativeId={params.id} deps={deps} options={linkOptions} canEdit={canEditDeps} />
      </div>
    </div>
  );
}
