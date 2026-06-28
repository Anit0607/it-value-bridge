export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { EditClient } from './EditClient';

export default async function EditInitiativePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  if (session.user.role !== 'PMO' && session.user.role !== 'CIO') redirect(`/items/${params.id}`);

  const item = await prisma.initiative.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      description: true,
      verticalHeadName: true,
      businessSpoc: true,
      businessSponsor: true,
      expectedGoLiveDate: true,
      isRegulatory: true,
      regulatoryBody: true,
      regulatoryDueDate: true,
    },
  });

  if (!item) notFound();

  return (
    <EditClient
      id={item.id}
      defaults={{
        title: item.title,
        requirement: item.description ?? '',
        verticalHead: item.verticalHeadName ?? '',
        businessSpoc: item.businessSpoc ?? '',
        businessSponsor: item.businessSponsor ?? '',
        goLiveDate: item.expectedGoLiveDate ? item.expectedGoLiveDate.toISOString().slice(0, 10) : '',
        isRegulatory: item.isRegulatory,
        regulatoryBody: item.regulatoryBody ?? '',
        regulatoryDueDate: item.regulatoryDueDate
          ? item.regulatoryDueDate.toISOString().slice(0, 10)
          : '',
      }}
    />
  );
}
