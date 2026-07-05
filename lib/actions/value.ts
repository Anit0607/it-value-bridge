'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { requireRole } from '@/lib/authz';
import { PMO_EQUIVALENT_ROLES } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const MeasurementInput = z.object({
  benefitClaimId: z.string().min(1),
  initiativeId: z.string().min(1),
  horizonLabel: z.enum(['+3m', '+6m', '+12m']),
  actualValue: z.number().nullable().optional(),
  realizedInr: z.number().min(0).nullable().optional(),
  note: z.string().default(''),
});

export type AddMeasurementInput = z.infer<typeof MeasurementInput>;

export async function addValueMeasurement(input: AddMeasurementInput) {
  const user = await requireRole(...PMO_EQUIVALENT_ROLES, 'CIO');
  const parsed = MeasurementInput.parse(input);
  // Org access check on the initiative
  if (!user.organizationId) {
    throw new Error('Missing organization context');
  }
  const exists = await prisma.initiative.findFirst({
    where: { id: parsed.initiativeId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!exists) throw new Error('Initiative not found in your organization');

  // Ensure the claim belongs to the named initiative.
  const claim = await prisma.benefitClaim.findUnique({
    where: { id: parsed.benefitClaimId },
    select: { initiativeId: true },
  });
  if (!claim || claim.initiativeId !== parsed.initiativeId) {
    throw new Error('Benefit claim not found on this initiative');
  }

  await prisma.valueMeasurement.create({
    data: {
      benefitClaimId: parsed.benefitClaimId,
      horizonLabel: parsed.horizonLabel,
      actualValue: parsed.actualValue ?? null,
      realizedInr: parsed.realizedInr ?? null,
      note: parsed.note,
      recordedByName: user.name,
    },
  });

  revalidatePath(`/items/${parsed.initiativeId}`);
  revalidatePath('/value');
}
