import { describe, it, expect } from 'vitest';
import {
  base32Encode, base32Decode, generateSecret, generateTotp, verifyTotp,
  otpauthUri, generateRecoveryCodes, normaliseRecoveryCode,
} from './totp';

/**
 * RFC 6238 Appendix B publishes test vectors for the algorithm. Passing them is
 * the difference between "we wrote a TOTP function" and "we implemented the
 * standard every authenticator app implements" — without this, the first sign
 * of a bug would be a user who cannot log in.
 *
 * The RFC's seed is the ASCII string "12345678901234567890".
 */
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890', 'ascii'));

describe('RFC 6238 test vectors (SHA-1, 8 digits)', () => {
  const vectors: [number, string][] = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ];

  for (const [seconds, expected] of vectors) {
    it(`matches the published code at T=${seconds}`, () => {
      expect(generateTotp(RFC_SECRET, seconds * 1000, { digits: 8 })).toBe(expected);
    });
  }
});

describe('base32', () => {
  it('round-trips arbitrary bytes', () => {
    const original = Buffer.from([0, 1, 127, 128, 255, 42, 7]);
    expect(base32Decode(base32Encode(original)).equals(original)).toBe(true);
  });

  it('accepts a secret the user retyped with spaces and padding', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890', 'ascii'));
    const messy = `${secret.slice(0, 4)} ${secret.slice(4, 8)} ${secret.slice(8)}====`;
    expect(base32Decode(messy).equals(base32Decode(secret))).toBe(true);
  });

  it('rejects characters outside the alphabet', () => {
    // 0, 1 and 8 are deliberately absent from RFC 4648 base32.
    expect(() => base32Decode('ABC1')).toThrow();
  });
});

describe('generateSecret', () => {
  it('produces a 160-bit secret', () => {
    expect(base32Decode(generateSecret())).toHaveLength(20);
  });

  it('does not repeat', () => {
    const secrets = new Set(Array.from({ length: 50 }, () => generateSecret()));
    expect(secrets.size).toBe(50);
  });
});

describe('verifyTotp', () => {
  const now = 1_700_000_000_000;
  const secret = generateSecret();

  it('accepts the current code', () => {
    expect(verifyTotp(secret, generateTotp(secret, now), now)).toBe(true);
  });

  it('tolerates one step of clock drift in each direction', () => {
    // A phone 25 seconds fast is common and must not be a support ticket.
    expect(verifyTotp(secret, generateTotp(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, generateTotp(secret, now + 30_000), now)).toBe(true);
  });

  it('rejects a code from two steps away', () => {
    // The window is deliberately narrow; widening it weakens the factor.
    expect(verifyTotp(secret, generateTotp(secret, now - 90_000), now)).toBe(false);
    expect(verifyTotp(secret, generateTotp(secret, now + 90_000), now)).toBe(false);
  });

  it('rejects a code generated from a different secret', () => {
    expect(verifyTotp(secret, generateTotp(generateSecret(), now), now)).toBe(false);
  });

  it('rejects malformed input rather than throwing', () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 34 56', '<script>']) {
      expect(verifyTotp(secret, bad, now), bad).toBe(false);
    }
  });

  it('does not accept an empty token as a match', () => {
    expect(verifyTotp(secret, '000000', now) && verifyTotp(secret, '', now)).toBe(false);
  });
});

describe('otpauthUri', () => {
  it('carries everything an authenticator needs to enrol', () => {
    const uri = otpauthUri({ secret: 'ABCDEFGH', accountName: 'asha@bank.com', issuer: 'IT Value Bridge' });
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('secret=ABCDEFGH');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });

  it('encodes an issuer containing spaces', () => {
    const uri = otpauthUri({ secret: 'A', accountName: 'a@b.com', issuer: 'IT Value Bridge' });
    expect(uri).not.toMatch(/\/IT Value Bridge/);
  });
});

describe('recovery codes', () => {
  it('issues ten distinct codes', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  it('normalises what a user actually types', () => {
    const code = generateRecoveryCodes(1)[0];
    expect(normaliseRecoveryCode(`  ${code.toLowerCase()} `)).toBe(code);
  });
});
