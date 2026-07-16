'use server';

import { prisma } from '@/lib/db';
import { requireRole, assertVisibleInitiativeAccess } from '@/lib/authz';
import { PMO_EQUIVALENT_ROLES, BUSINESS_EQUIVALENT_ROLES } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Milestone } from '@prisma/client';

/**
 * Server actions for per-initiative milestone checkpoints (lightweight —
 * see the Milestone model comment in schema.prisma for what this is NOT).
 *
 * SECURITY: every action here asserts initiative visibility BEFORE touching
 * a milestone. listMilestones/createMilestone take an initiativeId directly
 * and check it up front. updateMilestone/completeMilestone/deleteMilestone
 * only take a milestoneId, so each first resolves that id to its PARENT
 * initiativeId (requireMilestoneInitiativeId below) and asserts visibility
 * on that — a milestone can never be mutated by id alone just because the
 * caller happens to know/guess it, mirroring the same guard every
 * initiative-mutating action in lib/actions/initiatives.ts and
 * lib/actions/dependencies.ts already uses.
 *
 * PERMISSIONS (6B — simple, role-only; no "business-owned milestone" scoping
 * yet, that's a later pass):
 *   View            — any role whose visibility already covers the
 *                      initiative (assertVisibleInitiativeAccess is the gate;
 *                      listMilestones has no separate role check).
 *   Create/Edit/Delete — PMO-equivalent (PMO/PROGRAM_HEAD/PROGRAM_MANAGER) + CIO.
 *   Complete           — the above, plus VERTICAL_HEAD and Business-equivalent
 *                      (BUSINESS/BUSINESS_HEAD) — anyone who can see the
 *                      initiative can mark a milestone complete, but only
 *                      PMO/CIO can create, edit, or delete one.
 */

async function requireEditor() {
  return requireRole(...PMO_EQUIVALENT_ROLES, 'CIO');
}

async function requireCompleter() {
  return requireRole(...PMO_EQUIVALENT_ROLES, 'CIO', 'VERTICAL_HEAD', ...BUSINESS_EQUIVALENT_ROLES);
}

/** Resolve a milestone id to its parent initiativeId, or throw if it doesn't exist. */
async function requireMilestoneInitiativeId(milestoneId: string): Promise<string> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: { initiativeId: true },
  });
  if (!milestone) throw new Error('Milestone not found');
  return milestone.initiativeId;
}

export async function listMilestones(
  initiativeId: string,
  user: { role: string; name: string; verticalHead?: string | null; organizationId?: string | null },
): Promise<Milestone[]> {
  await assertVisibleInitiativeAccess(initiativeId, user);
  return prisma.milestone.findMany({
    where: { initiativeId },
    orderBy: { dueDate: 'asc' },
  });
}

const CreateMilestoneInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  owner: z.string().min(1),
  ownerRole: z.enum(['PMO', 'IT', 'BUSINESS', 'VENDOR']).optional(),
  dueDate: z.coerce.date(),
});

export type CreateMilestoneInput = z.infer<typeof CreateMilestoneInput>;

export async function createMilestone(initiativeId: string, input: CreateMilestoneInput): Promise<Milestone> {
  const user = await requireEditor();
  await assertVisibleInitiativeAccess(initiativeId, user);
  const parsed = CreateMilestoneInput.parse(input);

  const milestone = await prisma.milestone.create({
    data: {
      initiativeId,
      title: parsed.title.trim(),
      description: parsed.description?.trim() || null,
      owner: parsed.owner.trim(),
      ownerRole: parsed.ownerRole,
      dueDate: parsed.dueDate,
    },
  });

  revalidatePath(`/items/${initiativeId}`);
  return milestone;
}

// Deliberately excludes COMPLETED — completeMilestone() is the only path to
// that status, so completedAt can never drift out of sync with status.
const UpdateMilestoneInput = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  owner: z.string().min(1).optional(),
  ownerRole: z.enum(['PMO', 'IT', 'BUSINESS', 'VENDOR']).nullable().optional(),
  dueDate: z.coerce.date().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED']).optional(),
});

export type UpdateMilestoneInput = z.infer<typeof UpdateMilestoneInput>;

export async function updateMilestone(milestoneId: string, input: UpdateMilestoneInput): Promise<Milestone> {
  const user = await requireEditor();
  const initiativeId = await requireMilestoneInitiativeId(milestoneId);
  await assertVisibleInitiativeAccess(initiativeId, user);
  const parsed = UpdateMilestoneInput.parse(input);

  const milestone = await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      ...(parsed.title !== undefined && { title: parsed.title.trim() }),
      ...(parsed.description !== undefined && { description: parsed.description?.trim() || null }),
      ...(parsed.owner !== undefined && { owner: parsed.owner.trim() }),
      ...(parsed.ownerRole !== undefined && { ownerRole: parsed.ownerRole }),
      ...(parsed.dueDate !== undefined && { dueDate: parsed.dueDate }),
      ...(parsed.status !== undefined && { status: parsed.status }),
    },
  });

  revalidatePath(`/items/${initiativeId}`);
  return milestone;
}

/** The only path to status = COMPLETED — also stamps completedAt. */
export async function completeMilestone(milestoneId: string): Promise<Milestone> {
  const user = await requireCompleter();
  const initiativeId = await requireMilestoneInitiativeId(milestoneId);
  await assertVisibleInitiativeAccess(initiativeId, user);

  const milestone = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  revalidatePath(`/items/${initiativeId}`);
  return milestone;
}

export async function deleteMilestone(milestoneId: string): Promise<void> {
  const user = await requireEditor();
  const initiativeId = await requireMilestoneInitiativeId(milestoneId);
  await assertVisibleInitiativeAccess(initiativeId, user);

  await prisma.milestone.delete({ where: { id: milestoneId } });

  revalidatePath(`/items/${initiativeId}`);
}
