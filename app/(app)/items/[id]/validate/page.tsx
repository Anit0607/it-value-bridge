export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getInitiativeItem } from '@/lib/actions/initiatives';
import { ValidateClient } from './ValidateClient';

export default async function ValidatePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const item = await getInitiativeItem(params.id);
  if (!item) notFound();

  return <ValidateClient item={item} />;
}
