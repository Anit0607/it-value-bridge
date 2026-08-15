export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { getMfaStatus } from '@/lib/actions/mfa';
import { SecurityClient } from './SecurityClient';

/**
 * Account security (docs/ROADMAP.md M5).
 *
 * Open to every signed-in role by design. MFA that only administrators can
 * enable protects the wrong accounts — the CIO signing off ₹40 Cr is exactly
 * who needs a second factor.
 */
export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const status = await getMfaStatus();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Account Security"
        subtitle={`Signed in as ${session.user.name}`}
      />
      <SecurityClient
        enabled={status.enabled}
        enabledAt={status.enabledAt}
        recoveryCodesLeft={status.recoveryCodesLeft}
      />
    </div>
  );
}
