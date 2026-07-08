import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { buildInitiativeVisibilityWhere } from '@/lib/rbac';
import type { Role } from '@prisma/client';

/**
 * Server-side authorization guards for Server Actions.
 *
 * Server Actions are public POST endpoints — UI gating and route middleware do
 * NOT protect them (middleware only checks role by URL path). Every mutating
 * action must therefore assert the caller's role here, and derive the acting
 * user's identity from the session rather than trusting a client-supplied name.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error('Not authenticated');
  return session.user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new Error('Not authorized for this action');
  }
  return user;
}

/**
 * Like requireRole(), but also asserts the user belongs to an organization.
 * Use this guard for any server action that reads or writes business data
 * (initiatives, demands, OKRs, value claims) so tenant context is always verified.
 *
 * Activation path:
 *   Once all users are org-linked (seed + migration clean), swap requireRole()
 *   calls in data-mutating actions to requireRoleWithOrg() to enforce isolation.
 */
export async function requireRoleWithOrg(...roles: Role[]) {
  const user = await requireRole(...roles);

  if (!user.organizationId) {
    throw new Error('User is not assigned to an organization');
  }

  return user as typeof user & { organizationId: string };
}

/**
 * Throws unless `id` resolves to an initiative visible to `user` under
 * buildInitiativeVisibilityWhere() (lib/rbac.ts). Dashboards aren't the only
 * place hierarchy visibility must be enforced — every mutating server action
 * that takes an initiative id (advance stage, edit, validate, sign off, set
 * regulatory, link/unlink dependency, etc.) must call this, not just check
 * organization membership, or a role like PROGRAM_MANAGER could mutate any
 * initiative in the org by guessing/reusing an id outside their assignment.
 */
export async function assertVisibleInitiativeAccess(
  id: string,
  user: {
    role: string;
    name: string;
    verticalHead?: string | null;
    organizationId?: string | null;
  },
): Promise<void> {
  if (!user.organizationId) throw new Error('Missing organization context');

  const exists = await prisma.initiative.findFirst({
    where: {
      id,
      ...buildInitiativeVisibilityWhere({ ...user, organizationId: user.organizationId }),
    },
    select: { id: true },
  });

  if (!exists) throw new Error('Initiative not found in your permitted scope');
}
