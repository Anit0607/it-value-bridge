'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { requireRole } from '@/lib/authz';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { STAGE_LABEL } from '@/lib/stage-map';
import type { Stage } from '@prisma/client';

const MS_DAY = 86_400_000;
function todayMid(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

interface RiskFields {
  currentStage: Stage;
  stageExpectedDate: Date;
  lastUpdated: Date;
  delayed: boolean;
}

/** Frozen RAG "Red" intent, server-side: overdue, stale ≥7d, or flagged delayed
 *  (and not closed). Used to decide whether a blocker endangers its dependents. */
function atRisk(i: RiskFields): boolean {
  if (i.currentStage === 'CLOSED') return false;
  const t = todayMid();
  const overdue = i.stageExpectedDate.getTime() < t;
  const stale = (t - i.lastUpdated.getTime()) / MS_DAY >= 7;
  return overdue || stale || i.delayed;
}

export interface DependencyLinkView {
  dependencyId: string;
  initiativeId: string;
  title: string;
  stage: string;
  atRisk: boolean;
  delayed: boolean;
  systemLabel: string | null;
  note: string;
}

export interface InitiativeDependencies {
  upstream: DependencyLinkView[];   // this initiative depends on these (blockers)
  downstream: DependencyLinkView[]; // these depend on this initiative
  upstreamRiskCount: number;
}

export async function getInitiativeDependencies(
  id: string,
  organizationId: string | null | undefined,
): Promise<InitiativeDependencies> {
  if (!organizationId) return { upstream: [], downstream: [], upstreamRiskCount: 0 };
  const i = await prisma.initiative.findFirst({
    where: { id, organizationId },
    include: {
      dependsOn: { include: { blocker: true } },
      blocking: { include: { dependent: true } },
    },
  });
  if (!i) return { upstream: [], downstream: [], upstreamRiskCount: 0 };

  const view = (other: RiskFields & { id: string; title: string }, dep: { id: string; systemLabel: string | null; note: string }): DependencyLinkView => ({
    dependencyId: dep.id,
    initiativeId: other.id,
    title: other.title,
    stage: STAGE_LABEL[other.currentStage],
    atRisk: atRisk(other),
    delayed: other.delayed,
    systemLabel: dep.systemLabel,
    note: dep.note,
  });

  const upstream = i.dependsOn.map(d => view(d.blocker, d));
  const downstream = i.blocking.map(d => view(d.dependent, d));
  return { upstream, downstream, upstreamRiskCount: upstream.filter(u => u.atRisk).length };
}

export async function listLinkableInitiatives(
  id: string,
  organizationId: string | null | undefined,
): Promise<{ id: string; title: string }[]> {
  if (!organizationId) return [];
  const rows = await prisma.initiative.findMany({
    where: { id: { not: id }, organizationId },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });
  return rows;
}

/** Does `startId` depend (transitively) on `targetId`? Used for cycle guard. */
async function dependsOnTransitively(startId: string, targetId: string): Promise<boolean> {
  const visited = new Set<string>();
  let frontier = [startId];
  while (frontier.length) {
    const links = await prisma.dependency.findMany({
      where: { dependentId: { in: frontier } },
      select: { blockerId: true },
    });
    const next: string[] = [];
    for (const l of links) {
      if (l.blockerId === targetId) return true;
      if (!visited.has(l.blockerId)) { visited.add(l.blockerId); next.push(l.blockerId); }
    }
    frontier = next;
  }
  return false;
}

const AddInput = z.object({
  dependentId: z.string().min(1),
  blockerId: z.string().min(1),
  systemLabel: z.string().optional(),
  note: z.string().default(''),
});

export type AddDependencyInput = z.infer<typeof AddInput>;

async function requireEditor() {
  return requireRole('PMO', 'CIO', 'VERTICAL_HEAD');
}

async function assertDependencyOrgAccess(id: string, organizationId: string | null | undefined) {
  if (!organizationId) {
    throw new Error('Missing organization context');
  }
  const exists = await prisma.initiative.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!exists) throw new Error('Initiative not found in your organization');
}

export async function addDependency(input: AddDependencyInput) {
  const user = await requireEditor();
  const parsed = AddInput.parse(input);
  if (parsed.dependentId === parsed.blockerId) throw new Error('An item cannot depend on itself');
  await assertDependencyOrgAccess(parsed.dependentId, user.organizationId);
  await assertDependencyOrgAccess(parsed.blockerId, user.organizationId);

  const existing = await prisma.dependency.findUnique({
    where: { dependentId_blockerId: { dependentId: parsed.dependentId, blockerId: parsed.blockerId } },
  });
  if (existing) throw new Error('This dependency already exists');

  // Cycle guard: adding "dependent depends on blocker" is illegal if the
  // blocker already depends (transitively) on the dependent.
  if (await dependsOnTransitively(parsed.blockerId, parsed.dependentId)) {
    throw new Error('That would create a circular dependency');
  }

  await prisma.dependency.create({
    data: {
      dependentId: parsed.dependentId,
      blockerId: parsed.blockerId,
      systemLabel: parsed.systemLabel?.trim() || null,
      note: parsed.note.trim(),
    },
  });

  revalidatePath(`/items/${parsed.dependentId}`);
  revalidatePath(`/items/${parsed.blockerId}`);
  revalidatePath('/dependencies');
  revalidatePath('/cio');
}

export async function removeDependency(dependencyId: string) {
  const user = await requireEditor();
  const dep = await prisma.dependency.findUnique({ where: { id: dependencyId }, select: { dependentId: true, blockerId: true } });
  if (dep) {
    await assertDependencyOrgAccess(dep.dependentId, user.organizationId);
  }
  await prisma.dependency.delete({ where: { id: dependencyId } });
  if (dep) {
    revalidatePath(`/items/${dep.dependentId}`);
    revalidatePath(`/items/${dep.blockerId}`);
  }
  revalidatePath('/dependencies');
  revalidatePath('/cio');
}

export interface DependencyOverview {
  atRiskFromUpstream: {
    id: string;
    title: string;
    stage: string;
    blockers: { title: string; system: string | null; stage: string }[];
  }[];
  topBlockers: { id: string; title: string; stage: string; atRisk: boolean; blocksCount: number }[];
  totalLinks: number;
}

export async function getDependencyOverview(): Promise<DependencyOverview> {
  const all = await prisma.dependency.findMany({
    include: { dependent: true, blocker: true },
  });

  const byDependent = new Map<string, DependencyOverview['atRiskFromUpstream'][number]>();
  const byBlocker = new Map<string, DependencyOverview['topBlockers'][number]>();

  for (const d of all) {
    // downstream-risk rollup
    if (atRisk(d.blocker) && d.dependent.currentStage !== 'CLOSED') {
      const e = byDependent.get(d.dependent.id) ?? {
        id: d.dependent.id,
        title: d.dependent.title,
        stage: STAGE_LABEL[d.dependent.currentStage],
        blockers: [],
      };
      e.blockers.push({ title: d.blocker.title, system: d.systemLabel, stage: STAGE_LABEL[d.blocker.currentStage] });
      byDependent.set(d.dependent.id, e);
    }
    // blocker fan-out
    const b = byBlocker.get(d.blocker.id) ?? {
      id: d.blocker.id,
      title: d.blocker.title,
      stage: STAGE_LABEL[d.blocker.currentStage],
      atRisk: atRisk(d.blocker),
      blocksCount: 0,
    };
    b.blocksCount += 1;
    byBlocker.set(d.blocker.id, b);
  }

  return {
    atRiskFromUpstream: [...byDependent.values()].sort((a, b) => b.blockers.length - a.blockers.length),
    topBlockers: [...byBlocker.values()].sort((a, b) => b.blocksCount - a.blocksCount),
    totalLinks: all.length,
  };
}
