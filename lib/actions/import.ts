'use server';

import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/authz';
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
  const user = await requireRole('PMO', 'CIO');
  const parsed = ImportInput.parse(rows);

  await prisma.$transaction(
    parsed.map(r =>
      prisma.demand.create({
        data: {
          title: r.title,
          requirement: r.requirement,
          priority: r.priority,
          raisedByName: user.name,
          raisedById: user.id,
          status: 'RAISED',
          reviewNote: 'Imported from file',
          organizationId: user.organizationId ?? null,
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
