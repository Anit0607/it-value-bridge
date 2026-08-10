import { prisma } from '@/lib/db';
import { resolveTerms, type Terminology } from '@/lib/terminology';

/**
 * Which optional parts of the product an organization has switched on.
 *
 * A lean SME does not carry a regulator, does not model cross-system
 * dependencies, and does not want a milestone tab it never fills in. Turning a
 * module off removes the surface rather than showing an empty one — that is the
 * difference between configurable and cluttered.
 */
export interface WorkspaceModules {
  regulatory: boolean;
  dependencies: boolean;
  milestones: boolean;
}

export interface WorkspaceConfig {
  terms: Terminology;
  modules: WorkspaceModules;
  lifecycleTemplate: string | null;
}

/** Defaults for an unlinked account: everything on, shipped vocabulary. */
const FALLBACK: WorkspaceConfig = {
  terms: resolveTerms(null),
  modules: { regulatory: true, dependencies: true, milestones: true },
  lifecycleTemplate: null,
};

export async function getWorkspaceConfig(
  organizationId: string | null | undefined,
): Promise<WorkspaceConfig> {
  if (!organizationId) return FALLBACK;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      terminology: true,
      moduleRegulatory: true,
      moduleDependencies: true,
      moduleMilestones: true,
      lifecycleTemplate: true,
    },
  });
  if (!org) return FALLBACK;
  return {
    terms: resolveTerms(org.terminology),
    modules: {
      regulatory: org.moduleRegulatory,
      dependencies: org.moduleDependencies,
      milestones: org.moduleMilestones,
    },
    lifecycleTemplate: org.lifecycleTemplate,
  };
}

/**
 * Throws unless a module is enabled for the organization.
 *
 * Called by the mutations behind a module, not just the pages that render it:
 * a server action reachable from a stale tab is exactly where a cosmetic-only
 * control fails.
 */
export async function assertModuleEnabled(
  organizationId: string | null | undefined,
  module: keyof WorkspaceModules,
  label: string,
): Promise<void> {
  const config = await getWorkspaceConfig(organizationId);
  if (!config.modules[module]) {
    throw new Error(`${label} are switched off for this workspace.`);
  }
}
