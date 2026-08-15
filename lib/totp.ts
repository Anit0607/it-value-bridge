import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Time-based one-time passwords, RFC 6238 (docs/ROADMAP.md M5).
 *
 * Implemented directly on Node's crypto rather than pulling in otplib or
 * speakeasy. Two reasons, both of which a bank will ask about:
 *
 *  1. Supply chain. "How many third-party packages touch authentication?" is a
 *     standard security-questionnaire question, and the honest answer is better
 *     when it is "none beyond the framework".
 *  2. The algorithm is small, fixed by RFC, and verifiable against the
 *     specification's own published test vectors — which lib/totp.test.ts does.
 *     This is not a case where rolling it yourself means inventing crypto; the
 *     primitive (HMAC) still comes from the platform.
 */

// RFC 4648 base32, the alphabet every authenticator app expects.
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  // Padding and spacing are stripped: users retyping a secret by hand insert
  // spaces, and some authenticators display it in groups of four.
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('Invalid character in base32 secret');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A fresh 160-bit secret — the size RFC 4226 recommends for HMAC-SHA1. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

export interface TotpOptions {
  digits?: number;
  periodSeconds?: number;
  algorithm?: 'sha1' | 'sha256' | 'sha512';
}

/**
 * The code for a given moment.
 *
 * Defaults are SHA-1 / 6 digits / 30 seconds, not because they are the
 * strongest options but because they are what Google Authenticator, Microsoft
 * Authenticator and 1Password actually implement. A stronger configuration that
 * no authenticator app can enrol is not stronger in practice.
 */
export function generateTotp(secret: string, atMs: number, options: TotpOptions = {}): string {
  const { digits = 6, periodSeconds = 30, algorithm = 'sha1' } = options;
  const counter = Math.floor(atMs / 1000 / periodSeconds);

  const counterBuffer = Buffer.alloc(8);
  // 64-bit big-endian counter, written as two 32-bit halves because
  // writeBigUInt64BE would force BigInt on every call for no benefit.
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x1_0000_0000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const hmac = createHmac(algorithm, base32Decode(secret)).update(counterBuffer).digest();
  // Dynamic truncation, RFC 4226 §5.3.
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
}

/**
 * Whether a submitted code is valid.
 *
 * `window` accepts codes from adjacent time steps. One step either side (the
 * default) tolerates roughly ±30s of clock drift between the server and the
 * user's phone, which is the difference between a control that works and a
 * support queue. A wider window measurably weakens the factor, so it stays at 1.
 *
 * Comparison is constant-time. The timing signal from comparing six digits is
 * small but free to eliminate.
 */
export function verifyTotp(
  secret: string,
  token: string,
  atMs: number,
  options: TotpOptions & { window?: number } = {},
): boolean {
  const { window = 1, periodSeconds = 30, digits = 6 } = options;
  const candidate = token.replace(/\s+/g, '');
  if (!/^\d+$/.test(candidate) || candidate.length !== digits) return false;

  for (let drift = -window; drift <= window; drift++) {
    const expected = generateTotp(secret, atMs + drift * periodSeconds * 1000, options);
    const a = Buffer.from(expected);
    const b = Buffer.from(candidate);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

/**
 * The otpauth:// URI an authenticator app scans.
 *
 * The issuer appears twice — once as a label prefix and once as a parameter —
 * which looks redundant but is what the de-facto spec requires for apps to
 * group entries correctly.
 */
export function otpauthUri(params: { secret: string; accountName: string; issuer: string }): string {
  const label = encodeURIComponent(`${params.issuer}:${params.accountName}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

// ---- Recovery codes --------------------------------------------------------

/**
 * Single-use codes for the "lost my phone" case.
 *
 * Without these, enabling MFA turns every lost device into an administrator
 * ticket, which is how organizations end up disabling MFA. Stored hashed, like
 * passwords — a database dump must not yield a working second factor.
 */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex').toUpperCase(); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function normaliseRecoveryCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}
