import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { verifyTotp, normaliseRecoveryCode } from '@/lib/totp';
import { log } from '@/lib/observability';
import type { Role } from '@prisma/client';

/**
 * Checks a submitted recovery code against the stored hashes and, on a match,
 * REMOVES it.
 *
 * Single-use is the whole point: a recovery code that keeps working is a
 * permanent password-equivalent bypass of the second factor. The removal is a
 * conditional update on the exact array we read, so two simultaneous sign-ins
 * with the same code cannot both succeed.
 */
async function consumeRecoveryCode(
  userId: string,
  hashes: string[],
  submitted: string,
): Promise<boolean> {
  const candidate = normaliseRecoveryCode(submitted);
  if (!candidate) return false;

  for (const hash of hashes) {
    if (await bcrypt.compare(candidate, hash)) {
      const { count } = await prisma.user.updateMany({
        where: { id: userId, mfaRecoveryCodes: { has: hash } },
        data: { mfaRecoveryCodes: hashes.filter(h => h !== hash) },
      });
      return count === 1;
    }
  }
  return false;
}

declare module 'next-auth' {
  interface User {
    role: Role;
    verticalHead?: string | null;
    organizationId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      verticalHead?: string | null;
      organizationId?: string | null;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: Role;
    verticalHead?: string | null;
    organizationId?: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        // Optional, and deliberately always accepted rather than requested in a
        // second step. A "now enter your code" prompt would confirm that an
        // account exists AND has MFA enabled before authentication completes,
        // which is free account enumeration. The field is simply always there.
        totp: { label: 'Authenticator code', type: 'text' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const totp = (credentials?.totp as string | undefined) ?? '';
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          log.warn('auth.signin_failed', { op: 'authorize', reason: 'unknown_account' });
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          log.warn('auth.signin_failed', { op: 'authorize', userId: user.id, reason: 'bad_password' });
          return null;
        }

        // Second factor, enforced only once enrolment is CONFIRMED. A stored
        // secret with no mfaEnabledAt is an abandoned enrolment and must not
        // lock the user out of their own account.
        if (user.mfaEnabledAt && user.mfaSecret) {
          const submitted = totp.trim();
          if (!submitted) {
            log.warn('auth.signin_failed', { op: 'authorize', userId: user.id, reason: 'mfa_code_missing' });
            return null;
          }

          const codeOk = verifyTotp(user.mfaSecret, submitted, Date.now());
          const recoveryOk = codeOk ? false : await consumeRecoveryCode(user.id, user.mfaRecoveryCodes, submitted);

          if (!codeOk && !recoveryOk) {
            log.warn('auth.signin_failed', { op: 'authorize', userId: user.id, reason: 'mfa_code_invalid' });
            return null;
          }
          if (recoveryOk) {
            log.warn('auth.recovery_code_used', { op: 'authorize', userId: user.id, role: user.role });
          }
        }

        log.info('auth.signin_ok', {
          op: 'authorize', userId: user.id, role: user.role,
          organizationId: user.organizationId ?? undefined,
          mfa: !!user.mfaEnabledAt,
        });

        // Future enforcement — enable once all users are linked to an org:
        // if (!user.organizationId) throw new Error('User is not assigned to a workspace');

        return {
          id:             user.id,
          email:          user.email,
          name:           user.name,
          role:           user.role,
          verticalHead:   user.verticalHead   ?? null,
          organizationId: user.organizationId ?? null,
        };
      },
    }),
  ],
});
