import { auth } from '@/auth';

/**
 * Returns the authenticated session user, asserting both authentication
 * and organization membership. Use in server actions and server pages
 * where tenant context is required.
 *
 * When enforcement is ready, uncomment the organizationId guard in auth.ts
 * and this helper will naturally throw for unlinked users.
 */
export async function requireTenantUser() {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  if (!session.user.organizationId) {
    throw new Error('User is not assigned to an organization');
  }

  return session.user;
}

/**
 * Returns a Prisma `where` fragment scoped to the user's organization.
 * Add to any query that should be tenant-scoped once multi-org is enforced.
 *
 * Usage:
 *   const user = await requireTenantUser();
 *   const items = await prisma.initiative.findMany({
 *     where: { ...tenantWhere(user), currentStage: 'UAT' },
 *   });
 */
export function tenantWhere(user: { organizationId?: string | null }) {
  if (!user.organizationId) {
    throw new Error('Missing organization context');
  }

  return { organizationId: user.organizationId };
}
