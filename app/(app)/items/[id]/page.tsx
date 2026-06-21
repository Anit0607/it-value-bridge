export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getInitiativeItem } from '@/lib/actions/initiatives';
import { ItemDetailClient } from './ItemDetailClient';

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const item = await getInitiativeItem(params.id);
  if (!item) notFound();
  return <ItemDetailClient item={item} />;
}
