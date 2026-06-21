export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getInitiativeItem, getInitiativeValue } from '@/lib/actions/initiatives';
import { ItemDetailClient } from './ItemDetailClient';
import { ValueRealizationPanel } from '@/components/value/ValueRealizationPanel';

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const [item, value] = await Promise.all([
    getInitiativeItem(params.id),
    getInitiativeValue(params.id),
  ]);
  if (!item) notFound();

  const canRecord = session.user.role === 'PMO' || session.user.role === 'CIO';

  return (
    <div className="space-y-4">
      <ItemDetailClient item={item} value={value} />
      {value && value.benefitClaims.length > 0 && (
        <div className="mx-auto max-w-5xl">
          <ValueRealizationPanel initiativeId={params.id} value={value} canRecord={canRecord} />
        </div>
      )}
    </div>
  );
}
