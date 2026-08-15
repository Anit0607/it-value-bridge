-- M5 — TOTP multi-factor authentication.
--
-- All three columns are nullable / defaulted, so existing users are unaffected
-- and MFA is opt-in per user. `mfaSecret` present with `mfaEnabledAt` null is a
-- started-but-unconfirmed enrolment and must not enforce a second factor.
ALTER TABLE "User" ADD COLUMN "mfaSecret" TEXT,
ADD COLUMN "mfaEnabledAt" TIMESTAMP(3),
ADD COLUMN "mfaRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
