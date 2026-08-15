/**
 * Observability (docs/ROADMAP.md M5, "before any pilot with real client data").
 *
 * Deliberately NO external APM — no Sentry, no Datadog, no hosted log drain.
 * "No external calls at runtime" is a genuine differentiator for an on-prem
 * bank deployment and one of the few claims this product can make that a SaaS
 * competitor cannot. Shipping an agent that phones home would quietly destroy
 * it, and the first security questionnaire would catch us.
 *
 * So: structured JSON to stdout. Every on-prem stack already collects container
 * stdout, and a bank's existing SIEM ingests JSON lines without being told
 * about us.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogFields {
  /** Correlates every line emitted while handling one request. */
  requestId?: string;
  /** Who was acting. Never the email — see redact() below. */
  userId?: string;
  role?: string;
  organizationId?: string;
  /** The server action or route that produced this. */
  op?: string;
  durationMs?: number;
  [key: string]: unknown;
}

/**
 * Field names whose values must never reach a log line.
 *
 * The product's whole proposition is that portfolio figures are handled
 * carefully; leaking them into logs that get shipped to a SIEM would be a poor
 * way to demonstrate that. Business values are deliberately included — a ₹ figure
 * in a log is still client-confidential financial data.
 */
const REDACTED_KEYS = new Set([
  'password', 'passwordHash', 'token', 'secret', 'authorization', 'cookie',
  'email', 'mfaSecret', 'recoveryCode', 'recoveryCodes',
  'estimatedAnnualValueInr', 'signedOffValueInr', 'buildCostInr', 'annualRunCostInr',
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(v => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACTED_KEYS.has(k) ? '[redacted]' : redact(v, depth + 1);
  }
  return out;
}

function emit(level: LogLevel, message: string, fields: LogFields = {}): void {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    env: process.env.APP_ENV ?? 'development',
    ...(redact(fields) as Record<string, unknown>),
  };
  // One JSON object per line. `console.error` for warn/error so container
  // runtimes and orchestrators route them to the right stream.
  const serialized = JSON.stringify(line);
  if (level === 'error' || level === 'warn') console.error(serialized);
  else console.log(serialized);
}

export const log = {
  debug: (msg: string, fields?: LogFields) => emit('debug', msg, fields),
  info: (msg: string, fields?: LogFields) => emit('info', msg, fields),
  warn: (msg: string, fields?: LogFields) => emit('warn', msg, fields),
  error: (msg: string, fields?: LogFields) => emit('error', msg, fields),
};

/**
 * Turns a thrown value into something loggable.
 *
 * Stack traces are included at `error` level because on-prem support has no
 * other way to diagnose a failure — there is no error-tracking dashboard to
 * open, by design.
 */
export function describeError(e: unknown): { error: string; stack?: string } {
  if (e instanceof Error) return { error: e.message, stack: e.stack };
  return { error: String(e) };
}

/**
 * Wraps a server action so failures are recorded rather than vanishing into a
 * rejected promise the client renders as a generic message.
 *
 * The error is re-thrown unchanged: the caller's own message is what the user
 * should see, and swallowing it here would break every form's error handling.
 */
export async function withLogging<T>(
  op: string,
  fields: LogFields,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    log.info('op.ok', { op, ...fields, durationMs: Date.now() - started });
    return result;
  } catch (e) {
    log.error('op.failed', { op, ...fields, durationMs: Date.now() - started, ...describeError(e) });
    throw e;
  }
}
