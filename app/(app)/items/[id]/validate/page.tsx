export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getVisibleInitiativeItem } from '@/lib/actions/initiatives';
import { ValidateClient } from './ValidateClient';

export default async function ValidatePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  // Tenant-safe fetch — org + role scoped
  const item = await getVisibleInitiativeItem(params.id, session.user);
  if (!item) notFound();

  return <ValidateClient item={item} />;
}
