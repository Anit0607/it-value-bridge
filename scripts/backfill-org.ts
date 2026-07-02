/**
 * Tenant backfill: assigns every organizationId-less record to the default
 * pilot workspace. Safe to re-run — only touches rows where organizationId
 * is currently null, and upserts the org by its stable slug (same one
 * prisma/seed.ts uses) so this never creates a duplicate workspace.
 *
 *   npm run db:backfill-org
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'it-value-bridge-pilot' },
    update: {},
    create: {
      name: 'IT Value Bridge Pilot Workspace',
      slug: 'it-value-bridge-pilot',
      industry: 'Banking',
      status: 'PILOT',
    },
  });
  console.log(`Target workspace: ${org.name} (${org.id})`);

  const [users, initiatives, demands, okrs, reports] = await Promise.all([
    prisma.user.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } }),
    prisma.initiative.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } }),
    prisma.demand.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } }),
    prisma.okr.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } }),
    prisma.monthlyReport.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } }),
  ]);

  console.log(`Backfilled users:       ${users.count}`);
  console.log(`Backfilled initiatives: ${initiatives.count}`);
  console.log(`Backfilled demands:     ${demands.count}`);
  console.log(`Backfilled OKRs:        ${okrs.count}`);
  console.log(`Backfilled reports:     ${reports.count}`);

  const [uLeft, iLeft, dLeft, oLeft, rLeft] = await Promise.all([
    prisma.user.count({ where: { organizationId: null } }),
    prisma.initiative.count({ where: { organizationId: null } }),
    prisma.demand.count({ where: { organizationId: null } }),
    prisma.okr.count({ where: { organizationId: null } }),
    prisma.monthlyReport.count({ where: { organizationId: null } }),
  ]);
  const remaining = uLeft + iLeft + dLeft + oLeft + rLeft;
  if (remaining > 0) {
    console.warn(`⚠ ${remaining} records still have a null organizationId after backfill.`);
    process.exitCode = 1;
  } else {
    console.log('✓ Every record now has an organizationId.');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
