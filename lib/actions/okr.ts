'use server';

import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/authz';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { BenefitCategory } from '@prisma/client';

export interface OkrRollup {
  id: string;
  name: string;
  description: string;
  category: BenefitCategory | null;
  owner: string;
  targetStatement: string;
  active: boolean;
  count: number;
  projected: number;
}

export async function listOkrsWithRollup(): Promise<OkrRollup[]> {
  const okrs = await prisma.okr.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      links: {
        include: {
          initiative: { include: { benefitClaims: { select: { estimatedAnnualValueInr: true } } } },
        },
      },
    },
  });
  return okrs.map(o => ({
    id: o.id,
    name: o.name,
    description: o.description,
    category: o.category,
    owner: o.owner,
    targetStatement: o.targetStatement,
    active: o.active,
    count: o.links.length,
    projected: o.links.reduce(
      (s, l) => s + l.initiative.benefitClaims.reduce((x, b) => x + b.estimatedAnnualValueInr, 0),
      0,
    ),
  }));
}

const OkrInput = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  category: z.enum(['REVENUE', 'COST_SAVING', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'EFFICIENCY', 'RISK_REDUCTION']).nullable().optional(),
  owner: z.string().default(''),
  targetStatement: z.string().default(''),
});

export type OkrInput = z.infer<typeof OkrInput>;

async function requireLeadership() {
  return requireRole('PMO', 'CIO');
}

export async function createOkr(input: OkrInput) {
  const user = await requireLeadership();
  const parsed = OkrInput.parse(input);
  await prisma.okr.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      category: parsed.category ?? null,
      owner: parsed.owner,
      targetStatement: parsed.targetStatement,
      organizationId: user.organizationId ?? null,
    },
  });
  revalidatePath('/okrs');
  revalidatePath('/value');
}

export async function updateOkr(id: string, input: OkrInput) {
  await requireLeadership();
  const parsed = OkrInput.parse(input);
  await prisma.okr.update({
    where: { id },
    data: {
      name: parsed.name,
      description: parsed.description,
      category: parsed.category ?? null,
      owner: parsed.owner,
      targetStatement: parsed.targetStatement,
    },
  });
  revalidatePath('/okrs');
  revalidatePath('/value');
}

export async function setOkrActive(id: string, active: boolean) {
  await requireLeadership();
  await prisma.okr.update({ where: { id }, data: { active } });
  revalidatePath('/okrs');
  revalidatePath('/value');
}
