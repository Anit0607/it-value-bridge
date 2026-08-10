'use server';

import { prisma } from '@/lib/db';
import { requireRoleWithOrg } from '@/lib/authz';
import { findTemplate, LIFECYCLE_TEMPLATES } from '@/lib/lifecycle-templates';
import { validateLifecycle, type Lifecycle } from '@/lib/lifecycle';
import { normaliseTerms, TERM_KEYS } from '@/lib/terminology';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/**
 * Workspace configuration (docs/ROADMAP.md M4).
 *
 * The exit criterion for M4 is that an SME can be onboarded without writing
 * code. Everything an onboarding needs — which lifecycle, what things are
 * called, which modules are on — is set through these actions.
 */

// ---- Lifecycle provisioning ------------------------------------------------

const ApplyTemplateInput = z.object({
  templateId: z.string().min(1),
});

/**
 * Replace the workspace's lifecycle with a shipped template.
 *
 * Refuses if any initiative is sitting at a stage the new template does not
 * contain. Silently moving live work to a different stage would rewrite what
 * the portfolio says about itself, and the audit trail would show a transition
 * that nobody made. The error names the stages and how many initiatives are
 * affected, so an administrator can decide what to do about them.
 */
export async function applyLifecycleTemplate(input: z.infer<typeof ApplyTemplateInput>) {
  const user = await requireRoleWithOrg('ADMIN', 'CIO');
  const { templateId } = ApplyTemplateInput.parse(input);

  const template = findTemplate(templateId);
  if (!template) {
    throw new Error(`Unknown lifecycle template "${templateId}".`);
  }

  const newKeys = new Set(template.stages.map(s => s.key));
  const inUse = await prisma.initiative.groupBy({
    by: ['currentStage'],
    where: { organizationId: user.organizationId },
    _count: true,
  });
  const stranded = inUse.filter(row => !newKeys.has(row.currentStage));
  if (stranded.length > 0) {
    const detail = stranded
      .map(s => `${s.currentStage} (${s._count} initiative${s._count === 1 ? '' : 's'})`)
      .join(', ');
    throw new Error(
      `Cannot switch to "${template.name}": it has no stage matching ${detail}. ` +
      'Move those initiatives to a stage the new lifecycle contains first.',
    );
  }

  await prisma.$transaction([
    prisma.lifecycleStage.deleteMany({ where: { organizationId: user.organizationId } }),
    prisma.lifecycleStage.createMany({
      data: template.stages.map((s, i) => ({
        organizationId: user.organizationId,
        key: s.key,
        label: s.label,
        order: i + 1,
        processGroup: s.processGroup,
        deliveryPhase: s.deliveryPhase,
        isGoLiveGate: s.isGoLiveGate ?? false,
        isValidationGate: s.isValidationGate ?? false,
        isTerminal: s.isTerminal ?? false,
      })),
    }),
    prisma.organization.update({
      where: { id: user.organizationId },
      data: { lifecycleTemplate: template.id },
    }),
  ]);

  revalidatePath('/admin/setup');
  revalidatePath('/pmo');
  revalidatePath('/cio');
}

const RenameStageInput = z.object({
  key: z.string().min(1),
  label: z.string().min(1, 'A stage needs a name').max(40, 'Stage names must be 40 characters or fewer'),
});

/**
 * Rename a stage.
 *
 * Only the label moves. The key is what initiatives and history reference, so
 * renaming "UAT" to "Business Testing" re-labels the past as well as the
 * present without rewriting a single record — which is the behaviour an
 * auditor wants, since nothing actually happened differently.
 */
export async function renameLifecycleStage(input: z.infer<typeof RenameStageInput>) {
  const user = await requireRoleWithOrg('ADMIN', 'CIO');
  const parsed = RenameStageInput.parse(input);

  const stage = await prisma.lifecycleStage.findUnique({
    where: { organizationId_key: { organizationId: user.organizationId, key: parsed.key } },
  });
  if (!stage) throw new Error('That stage is not part of this workspace.');

  await prisma.lifecycleStage.update({
    where: { id: stage.id },
    data: { label: parsed.label.trim() },
  });

  revalidatePath('/admin/setup');
  revalidatePath('/pmo');
  revalidatePath('/cio');
}

/**
 * Remove a stage from the lifecycle.
 *
 * Blocked while initiatives are sitting in it — see the LifecycleStage model
 * comment for why this is a server-action check rather than a foreign key.
 * Also blocked if it would leave the lifecycle without a go-live or final
 * stage, since the engine reads both.
 */
export async function removeLifecycleStage(key: string) {
  const user = await requireRoleWithOrg('ADMIN', 'CIO');

  const stages = await prisma.lifecycleStage.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { order: 'asc' },
  });
  const target = stages.find(s => s.key === key);
  if (!target) throw new Error('That stage is not part of this workspace.');

  const occupants = await prisma.initiative.count({
    where: { organizationId: user.organizationId, currentStage: key },
  });
  if (occupants > 0) {
    throw new Error(
      `${occupants} initiative${occupants === 1 ? ' is' : 's are'} currently at "${target.label}". ` +
      'Move them to another stage before removing it.',
    );
  }

  const remaining: Lifecycle = stages.filter(s => s.key !== key);
  const problems = validateLifecycle(remaining);
  if (problems.length > 0) {
    throw new Error(`Removing "${target.label}" would leave an unusable lifecycle: ${problems.join(' ')}`);
  }

  await prisma.lifecycleStage.delete({ where: { id: target.id } });
  revalidatePath('/admin/setup');
}

// ---- Terminology -----------------------------------------------------------

const TerminologyInput = z.record(z.string(), z.string());

/** Save the workspace's vocabulary. Blank fields fall back to the shipped word. */
export async function saveTerminology(input: Record<string, string>) {
  const user = await requireRoleWithOrg('ADMIN', 'CIO');
  const parsed = TerminologyInput.parse(input);

  for (const key of Object.keys(parsed)) {
    if (!(TERM_KEYS as readonly string[]).includes(key)) {
      throw new Error(`"${key}" is not a term this product uses.`);
    }
  }

  const terminology = normaliseTerms(parsed) as Prisma.InputJsonValue;
  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { terminology },
  });

  revalidatePath('/', 'layout');
}

// ---- Modules ---------------------------------------------------------------

const ModulesInput = z.object({
  regulatory: z.boolean(),
  dependencies: z.boolean(),
  milestones: z.boolean(),
});

/** Switch optional parts of the product on or off for this workspace. */
export async function saveModules(input: z.infer<typeof ModulesInput>) {
  const user = await requireRoleWithOrg('ADMIN', 'CIO');
  const parsed = ModulesInput.parse(input);

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      moduleRegulatory: parsed.regulatory,
      moduleDependencies: parsed.dependencies,
      moduleMilestones: parsed.milestones,
    },
  });

  revalidatePath('/', 'layout');
}

/** Template metadata for the setup form. */
export async function listLifecycleTemplates() {
  await requireRoleWithOrg('ADMIN', 'CIO');
  return LIFECYCLE_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    summary: t.summary,
    bestFor: t.bestFor,
    stageCount: t.stages.length,
    stageLabels: t.stages.map(s => s.label),
  }));
}
