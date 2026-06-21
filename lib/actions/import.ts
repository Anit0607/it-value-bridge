'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const RowInput = z.object({
  title: z.string().min(1),
  requirement: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  category: z.enum(['REVENUE', 'COST_SAVING', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'EFFICIENCY', 'RISK_REDUCTION']),
  metricName: z.string().min(1),
  estimatedAnnualValueInr: z.number().min(0),
});

const ImportInput = z.array(RowInput).min(1);

export type ImportRow = z.infer<typeof RowInput>;

/** Bulk-create demands from an uploaded (Jira/Excel) export. Air-gapped: the
 *  file is parsed in the browser; only validated rows are sent here. */
export async function importDemands(rows: ImportRow[]): Promise<{ created: number }> {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'PMO' && session.user.role !== 'CIO')) {
    throw new Error('Only PMO/CIO can import demands');
  }
  const parsed = ImportInput.parse(rows);

  await prisma.$transaction(
    parsed.map(r =>
      prisma.demand.create({
        data: {
          title: r.title,
          requirement: r.requirement,
          priority: r.priority,
          raisedByName: session.user.name,
          raisedById: session.user.id,
          status: 'RAISED',
          reviewNote: 'Imported from file',
          benefitClaims: {
            create: {
              category: r.category,
              metricName: r.metricName,
              unit: 'INR',
              estimatedAnnualValueInr: r.estimatedAnnualValueInr,
            },
          },
        },
      }),
    ),
  );

  revalidatePath('/demands');
  revalidatePath('/value');
  return { created: parsed.length };
}
