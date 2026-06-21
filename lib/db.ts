import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Resolve the Postgres connection string for this app.
 *
 * A valid `DATABASE_URL` in the host environment wins (this is how the app is
 * configured in production / Docker). But if the host has no value — or a stray
 * global one that isn't Postgres (e.g. a leftover `sqlite://...` on a dev
 * machine) — fall back to the project's own `.env` so it stays authoritative
 * and a polluted shell can't break the app.
 */
function resolveDatabaseUrl(): string | undefined {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv && fromEnv.startsWith('postgres')) return fromEnv;

  try {
    const raw = readFileSync(join(process.cwd(), '.env'), 'utf8');
    const line = raw.split(/\r?\n/).find(l => l.trim().startsWith('DATABASE_URL='));
    if (line) {
      let val = line.slice(line.indexOf('=') + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      return val;
    }
  } catch {
    // .env not present (e.g. real production) — fall through to host value.
  }
  return fromEnv;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasources: { db: { url: resolveDatabaseUrl() } } });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
