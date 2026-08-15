import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { appEnv } from '@/lib/env';
import { log, describeError } from '@/lib/observability';

export const dynamic = 'force-dynamic';

/**
 * Readiness probe (docs/ROADMAP.md M5).
 *
 * Checks the database, because "the process is up" is not the same as "the app
 * can serve a request" — a container that boots with an unreachable database
 * will happily return 200 on a liveness-only check while every page 500s.
 *
 * Deliberately UNAUTHENTICATED but deliberately EMPTY of detail: an
 * orchestrator has to be able to call it before anyone can log in, so it cannot
 * require a session, which means it must not disclose anything. No version, no
 * hostname, no database name, no error text — those would be free
 * reconnaissance on an endpoint reachable from wherever the probe runs.
 * Diagnostics go to the logs, where they are already access-controlled.
 */
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: 'ok', env: appEnv() },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    log.error('health.database_unreachable', {
      op: 'GET /api/health',
      durationMs: Date.now() - started,
      ...describeError(e),
    });
    return NextResponse.json(
      { status: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
