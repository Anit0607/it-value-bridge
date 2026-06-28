/**
 * Targeted seed: creates the default Organization and admin@bank.com user.
 * Run after applying migrations:
 *
 *   DATABASE_URL="<your-neon-url>" npx tsx scripts/seed-admin.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Demo@1234!', 12);

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
  console.log('✓ Organization:', org.name);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bank.com' },
    update: { role: 'ADMIN' as any, organizationId: org.id },
    create: {
      name: 'Platform Admin',
      email: 'admin@bank.com',
      passwordHash: password,
      role: 'ADMIN' as any,
      organizationId: org.id,
    },
  });
  console.log('✓ Admin user:', admin.email, '—', admin.role);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
