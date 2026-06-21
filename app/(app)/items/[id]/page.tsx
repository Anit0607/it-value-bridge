export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getInitiativeItem, getInitiativeValue } from '@/lib/actions/initiatives';
import { ItemDetailClient } from './ItemDetailClient';

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const [item, value] = await Promise.all([
    getInitiativeItem(params.id),
    getInitiativeValue(params.id),
  ]);
  if (!item) notFound();
  return <ItemDetailClient item={item} value={value} />;
}
