# Vendor Security Questionnaire — IT Value Bridge

**Version:** 2026-08-15 · **Applies to:** on-prem Docker deployment (the supported
form for bank customers).

> **How to read this document.** Every answer is either *implemented* — meaning
> it exists in the codebase today and can be demonstrated — or *not implemented*,
> stated as such. Nothing here is aspirational. A questionnaire that overstates
> controls fails at the first evidence request and takes the credible answers
> down with it.

| Legend | Meaning |
|---|---|
| ✅ | Implemented and demonstrable today |
| ⚠️ | Partially implemented — scope stated |
| ❌ | Not implemented |
| N/A | Does not apply to this architecture |

---

## 1. Architecture and data flow

**1.1 Describe the deployment model.**
Single Docker image (Next.js standalone) plus a PostgreSQL database, both running
inside the customer's own network. See `Dockerfile` and `docker-compose.yml`.

**1.2 Does the application make outbound network calls at runtime?** ✅ **No.**
This is a deliberate design property, not a configuration. There is no
telemetry, no analytics, no CDN, no hosted error-tracking agent, and no LLM API
call. The AI narrative feature is disabled by `ENABLE_AI_NARRATIVE=false` and is
off by default. Observability is structured JSON on stdout (`lib/observability.ts`),
collected by the customer's existing stack — nothing is shipped to us.

**1.3 Where is customer data stored?**
Exclusively in the customer's PostgreSQL instance. The vendor holds no copy and
has no access path to a customer deployment.

**1.4 Is there a multi-tenant SaaS option?**
A hosted evaluation instance exists for demonstrations and contains fabricated
data only. It is not offered for customer data.

**1.5 What third-party components are in the runtime?**
Next.js, React, Prisma, Auth.js, bcryptjs, Zod, Tailwind, lucide-react,
framer-motion. Full inventory in `package.json` / `package-lock.json`; an SBOM
can be produced on request. Authentication cryptography (TOTP) is implemented on
Node's own `crypto` rather than a third-party package specifically to keep the
authentication supply chain minimal — see `lib/totp.ts`.

---

## 2. Authentication and access control

**2.1 How do users authenticate?** ✅
Email and password via Auth.js Credentials, with bcrypt password hashing (cost
12). Sessions are JWT-based.

**2.2 Is multi-factor authentication available?** ✅
TOTP (RFC 6238), available to every role, self-enrolled at `/account/security`.
Implementation verified against the RFC's published test vectors
(`lib/totp.test.ts`). Single-use recovery codes are issued at enrolment and
stored bcrypt-hashed. Disabling MFA requires password re-authentication.

**2.3 Is MFA enforced organisation-wide?** ⚠️ **Not yet.**
MFA is currently opt-in per user. Mandatory enforcement by policy or role is not
implemented. This is a known gap.

**2.4 Is SSO/SAML supported?** ❌ **Not implemented.**
Planned; not built. We will not claim it before it exists and has been tested
against a real identity provider.

**2.5 Describe the authorisation model.** ✅
Role-based, with eight roles. Every initiative read is scoped through a single
function (`buildInitiativeVisibilityWhere` in `lib/rbac.ts`) that combines the
organisation boundary with role visibility, so scoping cannot be forgotten at an
individual call site. Route-level rules are additionally enforced in
`middleware.ts`. Privileged server actions call `requireRole()` server-side —
UI restrictions are never the only control.

**2.6 Is there separation of duties for sensitive actions?** ✅
Yes, and it is enforced server-side. Above a configurable materiality threshold,
value sign-offs and cost changes become proposals that a **different** person
must approve; `approvePendingChange` refuses when the approver is the proposer.
ROI-gate exceptions require CIO-tier approval, one tier above the roles that
fund initiatives day to day.

**2.7 Password policy.** ⚠️
Hashing and storage are sound. Configurable complexity rules, rotation, lockout
after failed attempts, and password history are **not implemented**.

**2.8 Is there account lockout / brute-force protection?** ❌ **Not implemented.**
Failed authentication attempts are logged (`auth.signin_failed` with a reason)
but not rate-limited in the application. Customers deploying on-prem typically
front the app with a WAF or reverse proxy that provides this; we do not claim it
as a product control.

---

## 3. Data protection

**3.1 Encryption in transit.** ⚠️ **Customer-provided.**
The container serves HTTP on port 3000 and is expected to sit behind the
customer's TLS-terminating reverse proxy or ingress. The application does not
terminate TLS itself.

**3.2 Encryption at rest.** ⚠️ **Customer-provided.**
Provided by the customer's PostgreSQL and storage configuration. The application
does not implement its own at-rest encryption. Note that database backups
contain password hashes and TOTP secrets and must be protected accordingly —
stated explicitly in `docs/RUNBOOK-BACKUP-RESTORE.md`.

**3.3 Are TOTP secrets encrypted at the application layer?** ❌ **No.**
They are stored as base32 in the `User` table, protected by database-level
controls only. Application-layer encryption of the secret would require key
management the product does not currently have; stating this plainly is more
useful than implying a control that is not there.

**3.4 What is logged, and does it contain sensitive data?** ✅
Structured JSON to stdout. A redaction list (`lib/observability.ts`) strips
passwords, hashes, tokens, secrets, cookies, email addresses, recovery codes and
**₹ business values** before a line is written — a benefit figure in a log is
still client-confidential financial data.

**3.5 Is personal data processed?**
Names, work email addresses, and role assignments of the customer's own staff.
No customer-of-the-customer data, no financial account data, no payment data.

**3.6 Data retention and deletion.** ⚠️
The customer controls their own database entirely. The application provides no
automated retention or purge routines.

---

## 4. Auditability

**4.1 Is there an audit trail?** ✅
Yes, and it is a core product feature rather than an add-on. Stage transitions,
metadata edits, cost changes, value sign-offs, approvals, rejections and
restatements all write to `HistoryLog` with actor and timestamp.

**4.2 Are audit logs immutable / append-only?** ❌ **Not enforced at the database level.**
Records are written and not updated by application code, but there is no
append-only constraint or write-once storage. A database administrator can alter
history. This is on the roadmap and is explicitly deferred (`docs/ROADMAP.md` §5).

**4.3 Can a published figure be traced end to end?** ✅
Yes. For any board figure: who proposed it, who approved it (a different
person), what evidence source it rests on, whether it was ever restated and why,
and which published period snapshot froze it. A realized ₹ figure cannot be
recorded at all without a stated evidence source.

**4.4 Are corrections to published figures possible without trace?** ✅ **No.**
Benefit claims lock at sign-off. Changing a signed-off figure requires a formal
restatement that records the previous value, the new value and a written reason,
and clears the sign-off so the revised figure must be approved again.

---

## 5. Secure development

**5.1 Is there CI with automated checks?** ✅
`.github/workflows/ci.yml` runs typecheck, lint, the test suite and a production
build against a real PostgreSQL service on every push and pull request.

**5.2 Is the container image scanned?** ✅
Trivy runs in CI against the built image and **fails the build** on HIGH or
CRITICAL findings that have a fix available. Unfixed findings are reported
advisory-only, because a vulnerability with no available patch cannot be
actioned and blocking on it only trains people to bypass the gate.

**5.3 Does the container run as root?** ✅ **No.**
Runs as `nextjs` (uid 1001). CI asserts this and fails if the image user is
empty or root.

**5.4 Is the base image maintained?** ✅
`node:20-alpine`, with `apk upgrade` applied at build time to pick up security
fixes published after the base tag was cut.

**5.5 Test coverage.** ⚠️
122 tests covering the value/ROI/TCO math, RBAC visibility scoping, the
investment gate, the integrity helpers, the configurable lifecycle, and TOTP
against RFC vectors. Server actions, forms and end-to-end flows are **not**
covered by automated tests; those paths are verified manually in a browser.
Stated as a known gap (`docs/ROADMAP.md` R2).

**5.6 Has a penetration test been performed?** ❌ **Not yet.**
No VAPT has been carried out. Engaging a CERT-In empanelled auditor is a
prerequisite before any bank deployment and is tracked in `docs/ROADMAP.md` §5.

**5.7 Is there a documented SDLC / change management process?** ⚠️
Work is planned and recorded in `docs/ROADMAP.md` with decisions and rationale,
and every change goes through CI. There is no formal, separately-documented SDLC
policy.

---

## 6. Operations

**6.1 Is there a health/readiness endpoint?** ✅
`GET /api/health` verifies database reachability and returns 503 if it fails. It
is unauthenticated by necessity (an orchestrator must reach it before login) and
therefore returns no version, hostname or error detail — diagnostics go to the
logs instead.

**6.2 Backup and restore.** ✅ **Documented and tested.**
`scripts/backup.sh` / `scripts/restore.sh` plus `docs/RUNBOOK-BACKUP-RESTORE.md`.
A full round trip was executed against a populated database on 2026-08-11 with
all table counts matching. Backups verify their own archive integrity at backup
time. Restores run in a single transaction.

**6.3 Are staging and production separated?** ✅
`APP_ENV` drives a visible non-production banner and hard guards that refuse
destructive operations (database seeding) when `APP_ENV=production`. The check
deliberately uses `APP_ENV` rather than `NODE_ENV`, because `NODE_ENV` is
`production` on a staging build too.

**6.4 Disaster recovery: RTO / RPO.** ❌ **Not defined.**
Single database instance, no tested failover, no off-host replication built in.
Recovery point is whatever the customer's backup schedule provides. Deferred
until a customer requires it (`docs/ROADMAP.md` §5).

**6.5 High availability.** ❌ **Not implemented.** Single instance.

**6.6 Load and capacity testing.** ❌ **Not performed.**

---

## 7. Vendor and commercial

The following are **not engineering matters and are not yet in place.** They are
being handled separately and should be confirmed with the vendor directly before
contract:

- Legal entity, cyber liability insurance, SLA and support model
- Source code escrow and audit rights
- Data Processing Agreement (draft: `docs/DPA-TEMPLATE.md`)
- Data residency commitments
- Sub-processor list (**currently none** for on-prem deployments — there is no
  runtime dependency on any third-party service)

---

## 8. Summary of known gaps

Consolidated so a reviewer does not have to assemble it themselves:

| Gap | Status |
|---|---|
| SSO/SAML | Not implemented |
| Organisation-wide MFA enforcement | Not implemented (MFA itself is available) |
| Account lockout / rate limiting | Not implemented; expected from the customer's proxy |
| Append-only audit storage | Not enforced at database level |
| Application-layer encryption of TOTP secrets | Not implemented |
| VAPT | Not yet performed |
| Automated tests for server actions and E2E | Not covered |
| Defined RTO/RPO, HA, failover | Not defined |
| Load testing | Not performed |
| Password complexity / rotation / history | Not implemented |
