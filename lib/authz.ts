import { auth } from '@/auth';
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
