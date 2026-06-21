export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getDemand } from '@/lib/actions/demands';
import { DemandDetailClient } from './DemandDetailClient';

export default async function DemandDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const demand = await getDemand(params.id);
  if (!demand) notFound();

  const canTriage = session.user.role === 'PMO' || session.user.role === 'CIO';

  return (
    <DemandDetailClient
      demand={{
        id: demand.id,
        title: demand.title,
        requirement: demand.requirement,
        raisedByName: demand.raisedByName,
        status: demand.status,
        priority: demand.priority,
        reviewNote: demand.reviewNote,
        createdAt: demand.createdAt.toISOString().slice(0, 10),
        convertedInitiative: demand.convertedInitiative,
        benefitClaims: demand.benefitClaims.map(b => ({
          id: b.id,
          category: b.category,
          metricName: b.metricName,
          unit: b.unit,
          estimatedAnnualValueInr: b.estimatedAnnualValueInr,
          baselineValue: b.baselineValue,
          targetValue: b.targetValue,
          narrative: b.narrative,
        })),
      }}
      canTriage={canTriage}
    />
  );
}
