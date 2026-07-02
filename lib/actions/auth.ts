'use server';

import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/authz';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const SignUpSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signUpAction(formData: FormData): Promise<{ error?: string }> {
  const raw = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const parsed = SignUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: 'An account with this email already exists.' };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Single-org pilot: self-signups join the one pilot workspace.
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'BUSINESS',
      organizationId: org?.id ?? null,
    },
  });

  return {};
}

// ── Admin: create any pilot user with a specified role ────────────────────────
const CreatePilotUserSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters'),
  email:       z.string().email('Valid email required'),
  role:        z.enum(['ADMIN', 'CIO', 'PMO', 'VERTICAL_HEAD', 'BUSINESS']),
  verticalHead: z.string().optional(),
  password:    z.string().min(8, 'Password must be at least 8 characters'),
});

export type CreatePilotUserInput = z.infer<typeof CreatePilotUserSchema>;

export async function createPilotUser(
  input: CreatePilotUserInput,
): Promise<{ error?: string }> {
  const admin = await requireRole('ADMIN' as any);

  const parsed = CreatePilotUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, email, role, verticalHead, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: 'An account with this email already exists.' };

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role as any,
      verticalHead: role === 'VERTICAL_HEAD' ? (verticalHead ?? name) : null,
      organizationId: admin.organizationId ?? null,
    },
  });

  return {};
}
