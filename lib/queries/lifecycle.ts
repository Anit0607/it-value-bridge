import { prisma } from '@/lib/db';
import { sortLifecycle, type Lifecycle } from '@/lib/lifecycle';

/**
 * Loads an organization's delivery lifecycle.
 *
 * Every page that renders a stage, and every action that moves one, reads
 * through here. An organization with no stages configured returns an empty
 * lifecycle rather than a fabricated default — the setup form is the place to
 * fix that, and silently substituting an eleven-stage bank lifecycle would be
 * exactly the kind of invented data M0 removed.
 */
export async function getLifecycle(organizationId: string | null | undefined): Promise<Lifecycle> {
  if (!organizationId) return [];
  const rows = await prisma.lifecycleStage.findMany({
    where: { organizationId },
    orderBy: { order: 'asc' },
    select: {
      key: true, label: true, order: true,
      processGroup: true, deliveryPhase: true,
      isGoLiveGate: true, isValidationGate: true, isTerminal: true,
    },
  });
  return sortLifecycle(rows);
}
