'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  generateSecret, verifyTotp, otpauthUri, generateRecoveryCodes, normaliseRecoveryCode,
} from '@/lib/totp';
import { log } from '@/lib/observability';

/**
 * Multi-factor enrolment (docs/ROADMAP.md M5).
 *
 * Every action here acts on the CALLER's own account, resolved from the
 * session. None of them accept a user id — an endpoint that could enrol or
 * disable MFA for an arbitrary user would be a privilege-escalation primitive,
 * and there is no legitimate reason for one to exist.
 */

async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not signed in.');
  return session.user;
}

export interface MfaEnrolment {
  secret: string;
  otpauthUri: string;
}

/**
 * Begin enrolment: generate a secret and return the URI to scan.
 *
 * The secret is stored immediately but `mfaEnabledAt` stays null, so nothing is
 * enforced yet. Someone who abandons enrolment half way is not locked out, and
 * starting again simply overwrites the unconfirmed secret.
 */
export async function beginMfaEnrolment(): Promise<MfaEnrolment> {
  const user = await currentUser();

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mfaEnabledAt: true, email: true },
  });
  if (existing?.mfaEnabledAt) {
    throw new Error('Two-factor authentication is already enabled on this account.');
  }

  const secret = generateSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: secret, mfaEnabledAt: null, mfaRecoveryCodes: [] },
  });

  log.info('mfa.enrolment_started', { op: 'beginMfaEnrolment', userId: user.id, role: user.role });

  return {
    secret,
    otpauthUri: otpauthUri({
      secret,
      accountName: existing?.email ?? user.id,
      issuer: process.env.NEXT_PUBLIC_WORKSPACE_NAME?.trim() || 'IT Value Bridge',
    }),
  };
}

const ConfirmInput = z.object({ token: z.string().min(1, 'Enter the 6-digit code') });

/**
 * Confirm enrolment with a code from the authenticator.
 *
 * Requiring a working code before switching MFA on is the whole point: it
 * proves the secret actually reached the app. Enabling on trust would let a
 * mistyped manual entry lock someone out of their own account.
 *
 * Returns the recovery codes — the ONLY time they are ever shown in plaintext,
 * because they are stored hashed.
 */
export async function confirmMfaEnrolment(input: z.infer<typeof ConfirmInput>): Promise<string[]> {
  const user = await currentUser();
  const parsed = ConfirmInput.parse(input);

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mfaSecret: true, mfaEnabledAt: true },
  });
  if (!row?.mfaSecret) throw new Error('Start enrolment before confirming it.');
  if (row.mfaEnabledAt) throw new Error('Two-factor authentication is already enabled.');

  if (!verifyTotp(row.mfaSecret, parsed.token, Date.now())) {
    log.warn('mfa.enrolment_code_rejected', { op: 'confirmMfaEnrolment', userId: user.id });
    throw new Error('That code did not match. Check your authenticator app and try again.');
  }

  const codes = generateRecoveryCodes();
  const hashed = await Promise.all(codes.map(c => bcrypt.hash(normaliseRecoveryCode(c), 10)));

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabledAt: new Date(), mfaRecoveryCodes: hashed },
  });

  log.info('mfa.enabled', { op: 'confirmMfaEnrolment', userId: user.id, role: user.role });
  revalidatePath('/account/security');
  return codes;
}

const DisableInput = z.object({
  password: z.string().min(1, 'Your password is required'),
});

/**
 * Turn MFA off.
 *
 * Re-authenticates with the password first. Without that, anyone who walks up
 * to an unlocked session could strip the second factor off the account — which
 * would make the control worth very little.
 */
export async function disableMfa(input: z.infer<typeof DisableInput>): Promise<void> {
  const user = await currentUser();
  const parsed = DisableInput.parse(input);

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true, mfaEnabledAt: true },
  });
  if (!row) throw new Error('Account not found.');
  if (!row.mfaEnabledAt) throw new Error('Two-factor authentication is not enabled.');

  if (!(await bcrypt.compare(parsed.password, row.passwordHash))) {
    log.warn('mfa.disable_denied_bad_password', { op: 'disableMfa', userId: user.id });
    throw new Error('That password is not correct.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: null, mfaEnabledAt: null, mfaRecoveryCodes: [] },
  });

  log.warn('mfa.disabled', { op: 'disableMfa', userId: user.id, role: user.role });
  revalidatePath('/account/security');
}

/** Enrolment state for the caller's own account. */
export async function getMfaStatus(): Promise<{ enabled: boolean; enabledAt: string | null; recoveryCodesLeft: number }> {
  const user = await currentUser();
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mfaEnabledAt: true, mfaRecoveryCodes: true },
  });
  return {
    enabled: !!row?.mfaEnabledAt,
    enabledAt: row?.mfaEnabledAt ? row.mfaEnabledAt.toISOString().slice(0, 10) : null,
    recoveryCodesLeft: row?.mfaRecoveryCodes.length ?? 0,
  };
}
