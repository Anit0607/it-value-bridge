/**
 * Deployment environment (docs/ROADMAP.md M5).
 *
 * A staging environment that is only "separate" by convention is not separate.
 * The value here is read once and used to (a) mark non-production instances
 * visibly, so nobody mistakes staging data for real client data, and (b) refuse
 * destructive operations in production.
 */

export type AppEnv = 'development' | 'staging' | 'production';

const VALID: AppEnv[] = ['development', 'staging', 'production'];

/**
 * Resolves APP_ENV.
 *
 * Defaults to `development`, NOT `production`. Getting this wrong in the safe
 * direction means a real deployment shows a banner until someone sets the
 * variable — noisy but harmless. Defaulting to production instead would let an
 * unconfigured staging box silently accept destructive operations, which is the
 * failure that actually costs something.
 */
export function appEnv(): AppEnv {
  const raw = (process.env.APP_ENV ?? '').trim().toLowerCase();
  return (VALID as string[]).includes(raw) ? (raw as AppEnv) : 'development';
}

export function isProduction(): boolean {
  return appEnv() === 'production';
}

/**
 * Blocks an operation that must never run against real client data.
 *
 * Used by seeding and reset paths. The check is on APP_ENV rather than
 * NODE_ENV, because NODE_ENV is `production` on a staging build too — that
 * conflation is exactly how a staging-only script ends up running for real.
 */
export function assertNotProduction(operation: string): void {
  if (isProduction()) {
    throw new Error(
      `Refusing to run "${operation}" with APP_ENV=production. ` +
      'This operation destroys or fabricates data and is only permitted in development or staging.',
    );
  }
}

/** Short label for the environment banner. Null in production — no banner. */
export function environmentBanner(env: AppEnv = appEnv()): string | null {
  switch (env) {
    case 'production':
      return null;
    case 'staging':
      return 'Staging environment — data here is not production data';
    case 'development':
      return 'Development environment — not for client data';
  }
}
