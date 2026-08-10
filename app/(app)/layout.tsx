import { auth } from '@/auth';
import { AppShell } from './AppShell';
import { WorkspaceProvider } from '@/components/WorkspaceProvider';
import { getWorkspaceConfig } from '@/lib/queries/workspace';
import { getLifecycle } from '@/lib/queries/lifecycle';

/**
 * Resolves the workspace's vocabulary, enabled modules and lifecycle once per
 * request and hands them to the client shell.
 *
 * This layout is a server component purely so that resolution happens here
 * rather than in every page — the interactive shell lives in AppShell.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;

  const [config, lifecycle] = await Promise.all([
    getWorkspaceConfig(organizationId),
    getLifecycle(organizationId),
  ]);

  return (
    <WorkspaceProvider
      value={{
        terms: config.terms,
        modules: config.modules,
        stages: lifecycle.map(s => ({ key: s.key, label: s.label })),
      }}
    >
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
