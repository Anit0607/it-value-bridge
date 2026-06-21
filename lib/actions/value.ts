'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/auth';
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
  const session = await auth();
  if (!session?.user) throw new Error('Not authenticated');
  if (session.user.role !== 'PMO' && session.user.role !== 'CIO') {
    throw new Error('Only PMO/CIO can record realized value');
  }
  const parsed = MeasurementInput.parse(input);

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
      recordedByName: session.user.name,
    },
  });

  revalidatePath(`/items/${parsed.initiativeId}`);
  revalidatePath('/value');
}
