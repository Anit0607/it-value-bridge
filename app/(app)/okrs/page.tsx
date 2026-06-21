export const dynamic = 'force-dynamic';

import { listOkrsWithRollup } from '@/lib/actions/okr';
import { OkrAdminClient } from './OkrAdminClient';

export default async function OkrsPage() {
  const okrs = await listOkrsWithRollup();
  return <OkrAdminClient okrs={okrs} />;
}
