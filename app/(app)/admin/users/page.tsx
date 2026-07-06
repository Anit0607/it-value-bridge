export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { UserManagementClient } from './UserManagementClient';

export default async function UserManagementPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  if (session.user.role !== 'ADMIN') redirect('/');

  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      verticalHead: true,
      createdAt: true,
      organization: { select: { name: true, status: true } },
      programHeadName: true,
      programManagerName: true,
      businessHeadName: true,
      businessUnit: true,
      subBusinessUnit: true,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="View all pilot users, assign roles, and create new accounts"
      />
      <UserManagementClient
        users={users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          verticalHead: u.verticalHead,
          createdAt: u.createdAt.toISOString().slice(0, 10),
          organizationName: u.organization?.name ?? null,
          organizationStatus: u.organization?.status ?? null,
          programHeadName: u.programHeadName,
          programManagerName: u.programManagerName,
          businessHeadName: u.businessHeadName,
          businessUnit: u.businessUnit,
          subBusinessUnit: u.subBusinessUnit,
        }))}
      />
    </div>
  );
}
