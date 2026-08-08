# IT Value Bridge — Product & Readiness Roadmap

> **What this document is.** The forward plan for turning a working application into a
> sellable, deployable product. It covers three tracks that must advance together:
> deepening the value thesis (TCO → ROI → governance), enterprise/deployment readiness,
> and commercial groundwork.
>
> **How it relates to the existing plans.** `docs/PLAN.md` and `docs/PHASE-PLAN.md`
> covered *building* the application (Phase 0–5, largely complete). This document starts
> where those end. Where they conflict, this one wins.
>
> **Status:** active. Last reviewed 2026-07-26.

---

## 1. Where we actually are

**What's real and working.** Full-stack Next.js 14 app with role-scoped access across 8
roles, an 11-stage governance lifecycle, a genuine value chain (benefit claim → business
sign-off → realization clock → measurement → validation), a board-ready value dashboard,
a leadership report, a reminder engine, milestones, dependencies, demands, and a 6-type
client data import. Organization- and role-scoped data access enforced through a single
`buildInitiativeVisibilityWhere()` in `lib/rbac.ts`.

**What's honestly not there yet.**

| Gap | Detail |
|---|---|
| ~~ROI denominator is fabricated~~ | **Fixed in M0.** Cost is no longer synthesised; ROI is suppressed when cost is unknown and partial coverage is disclosed. Real TCO capture lands in M1. |
| ~~Docker bundle never built~~ | **Fixed in M0.** Image builds, full stack runs, migrations apply at container start. |
| ~~Migrations run at image build~~ | **Fixed in M0.** Moved to `docker-entrypoint.sh`; Vercel keeps migrating via `vercel.json`. |
| No automated tests | `package.json` has no test script. All verification to date has been typecheck + lint + build + manual browser checks. |
| No background jobs | Reminders compute on page load. `MonthlyReport` model exists but nothing generates it. No scheduled snapshots, no notifications. |
| No Finance role | Deliberately deferred. Business signs off value; nobody independently certifies cost. |
| Lifecycle and roles hardcoded | `Stage` and `Role` are Postgres enums. Blocks SME configuration. |
| Currency hardcoded | `formatInr` assumes ₹ with lakh/crore grouping. Blocks global SME. |
| No external API | Server Actions only. Blocks Jira/ServiceNow integration and BI extraction. |

**Two deployment targets — do not conflate them.**

- **Vercel + Neon (AWS ap-southeast-1, Singapore)** — public demo only, seed data only.
  Not a client deployment path.
- **Docker on-prem** — the actual bank deployment path, per the data-residency requirement
  locked in `PHASE-PLAN.md`. Currently incomplete (see M0).

---

## 2. Strategic position

**What the product is:** a governance and value-intelligence layer that holds the promise
made at funding and proves whether it was kept. It carries a deliberately lightweight
delivery spine — 11 governance checkpoints, not 500 tasks; no WBS, Gantt, sprints, or
timesheets.

**Why the delivery spine exists** (this was challenged and the answer matters): the value
layer has a hard dependency on delivery data it cannot generate itself. No go-live date,
no realization clock. Customers without a tracker must be able to run standalone rather
than being told to buy Jira first.

**Two deployment modes, one value engine:**

- **Connected** — client keeps Jira/Clarity/ServiceNow; we ingest status and add the value
  layer. *Not built yet — roadmap only.*
- **Standalone** — client has no tracker; our spine is their tracker. *This is what ships today.*

**Positioning line:** *Trackers track work. We track promises.*

**Segment strategy:** BFSI is the beachhead — the pain (CIO cannot prove value to the
board) is already recognised and budgeted. SME is expansion, and possibly the faster path
to revenue because the compliance bar is far lower. The value/cost engine is globally
portable; the delivery spine and org model are not.

---

## 3. Decisions made, and why

Recorded so the reasoning survives.

| Decision | Rationale |
|---|---|
| **Soft ROI gate, not hard** | Hard thresholds get gamed — sponsors inflate benefits until they clear the bar, manufacturing exactly the dishonesty the product exists to eliminate. Also blocks regulatory and foundational work that legitimately has no ROI. |
| **Four investment categories** | Value-generating / regulatory-mandatory / foundational / strategic. Only the first is ROI-gated; the rest require different justification. Produces a far better board conversation than a single blended ROI. |
| **Finance/CFO role deferred** | Costs nothing in rework — TCO is fields; certification is later a `costCertifiedBy` pair on the same fields. Accepted gap: cost is entered by people who benefit from the project looking good. Document it. |
| **Maker-checker with materiality thresholds** | Four-eyes on every ₹20 lakh change gets bypassed, and a bypassed control is worse than none — it creates false assurance. |
| **Claim "auditable", never "correct"** | No system can guarantee a forecast was right. Promising correctness makes every missed projection *our* failure. Traceable + attributed + auditable is defensible and is the actual moat. |
| **Templates before AI assistant** | A config wizard can only configure what is configurable. Three opinionated profiles get ~80% of onboarding value at a fraction of the cost. |
| **Config-time AI only** | Runtime AI touching portfolio data destroys the "no external calls at runtime" security claim, which is a genuine differentiator for banks. Config-time AI touches only metadata. |

---

## 4. Milestones

### M0 — Stop the bleeding ✅ COMPLETE (2026-08-09)
**Actual: 1 session.**

- [x] Remove `estimatedCostInr = totalValue × 0.3` from `createInitiative`
- [x] Hide the ROI tile on `/value` when cost is null; show "cost not captured"
- [x] Add `output: 'standalone'` to `next.config.mjs`
- [x] Move `prisma migrate deploy` out of the build script into a container entrypoint
- [x] Add the `app` service to `docker-compose.yml`
- [x] Actually run `docker build` and `docker compose up` end to end and record that it worked

**Exit met.** ROI now renders `—  cost not captured` when no cost exists, and discloses
`partial — N of M costed` when coverage is incomplete. Both states verified in the browser
against the running container. Image builds and the full stack boots: migrations apply at
container start, app serves HTTP 200.

**What the build actually taught us** — five real defects, none visible by reading the files:

1. `postinstall: prisma generate` runs during `npm ci`, so `prisma/` must be copied into the
   deps stage *before* install, or install fails with "schema.prisma: file not found".
2. Next collects page data at build time, which instantiates Auth.js and Prisma — both refuse
   to initialise without `AUTH_SECRET` / `DATABASE_URL`. Build-stage placeholders are required
   (scoped to the `RUN` command so they never persist in image metadata).
3. There is no `public/` directory in this project; the original `COPY` of it failed the build.
4. Prisma on Alpine needs `openssl` + `libc6-compat` installed, **and** an explicit
   `linux-musl-openssl-3.0.x` binary target in `schema.prisma` — otherwise it tries to download
   an engine at container start and fails on a non-root filesystem.
5. Runtime files must be `--chown=nextjs:nodejs`; Prisma writes to its engine directory on boot.

**Supporting changes made:** added `.dockerignore` (host `node_modules` would otherwise carry
Windows binaries into a Linux image), and `vercel.json` pinning
`buildCommand: prisma migrate deploy && next build` so the hosted demo keeps migrating after
`npm run build` was reduced to plain `next build`.

---

### M1 — Make ROI real
**Size: 2–3 weeks.**

- [ ] Add `buildCostInr`, `annualRunCostInr`, `tcoHorizonYears` to `Initiative`; TCO = build + (run × years)
- [ ] Capture cost in the creation wizard, edit form, **demand intake**, and the initiative CSV template
- [ ] Compute and display ROI + payback period, per initiative and at portfolio level
- [ ] **Currency decision** — either abstract to `currency` + number-system on `Organization`, or defer in writing. TCO forces this; do not drift into it.
- [ ] **Value snapshot** — record projected value and TCO at sign-off, immutably. *Cannot be backfilled later.*
- [ ] Introduce the test suite: start with ROI/value math and RBAC scoping

**Exit:** every ROI figure on screen traces to a number a human entered, and value calculations have test coverage.

---

### M2 — Investment governance
**Size: 3–4 weeks.**

- [ ] `InvestmentCategory` enum, kept **separate** from the existing `isRegulatory` flag (a project can be both)
- [ ] Backfill decision for existing initiatives
- [ ] Org-configurable ROI threshold — never hardcoded, no universal default
- [ ] Soft gate: below-threshold value-generating initiatives flagged as exceptions, not blocked
- [ ] Exception requires written justification + approval one tier up
- [ ] Exception log: who approved, when, why, ROI at the time
- [ ] Segmented portfolio view by investment category

**Exit:** a board-grade capital allocation view exists that no project tracker can produce.

---

### M3 — Integrity controls
**Size: 2–3 weeks.**

- [ ] Maker-checker on sign-off and cost changes, gated by materiality thresholds
- [ ] Lock benefit claims at sign-off; changes require a visible, formal re-baseline
- [ ] Evidence/provenance fields — source for every baseline, target, and realized figure
- [ ] Activate period snapshots using the existing unused `MonthlyReport` model; board figures freeze at publication
- [ ] Restatement flow — corrections recorded, never silent
- [ ] Double-count detection across initiatives claiming the same benefit pool

**Exit:** the full chain of custody for any published number can be shown without saying "trust us."

---

### M4 — Configurability and the SME path
**Size: 4–6 weeks. Time-sensitive — see risk R1.**

- [ ] Terminology dictionary per organization (cheap, high perceived impact)
- [ ] Module flags — regulatory / dependencies / milestones on-off
- [ ] **Replace the `Stage` enum with a lifecycle table**, each stage tagged with its semantic role: go-live gate, validation gate, terminal, pre/in/post-delivery. The engine must key off meaning, not the string `UAT`.
- [ ] Split `Role` into capability + visibility scope
- [ ] Three templates: Regulated BFSI (11 stages), Mid-market IT (~6), Lean (~4)
- [ ] Guided setup form

**Exit:** an SME can be onboarded without writing code.

---

### M5 — Enterprise readiness
**Runs in parallel from M1 onward. Trigger-based, not phase-based — see §5.**

---

### M6 — The learning loop
**Unlocks at 12+ months. Design early, build late.**

- [ ] Projected vs realized ROI per initiative
- [ ] Claim accuracy by sponsor, vertical, category, over time
- [ ] How exception-approved projects actually performed

**Note:** effort-light but **time-gated**. Depends entirely on snapshots captured from M1
onward. Build the capture now; build the analytics when there is history worth analysing.
This is the feature no tracker can copy, because a tracker never captured the promise.

---

## 5. Parallel track — enterprise readiness

Attach each item to the event that forces it, not to a phase.

**Start now (calendar-bound, low engineering time):**
- [ ] Get VAPT quotes from CERT-In empanelled auditors — understand cost and lead time
- [ ] Resolve data residency for any client-facing deployment
- [ ] Legal entity, cyber liability insurance, SLA and support model

**Before any pilot with real client data:**
- [ ] Error tracking and basic observability
- [ ] Tested backup and restore procedure
- [ ] Staging environment separate from production
- [ ] Security questionnaire and DPA prepared

**Before a bank customer:**
- [ ] SSO/SAML and MFA
- [ ] VAPT complete, including remediation and retest
- [ ] Source code escrow, audit rights
- [ ] Approved/hardened base image, clean image scan (Trivy or equivalent)

**Deferred until a customer forces it:** DR planning and RTO/RPO, Helm/OpenShift
manifests, load testing, caching and pagination, full multi-tenancy proving, i18n,
append-only audit logs, full-text search.

---

## 6. Validation checkpoints — treat as blocking

The largest risk in this plan is building all of it before anyone outside the team uses it.

- [ ] **After M1** — put it in front of one real IT leader. Not to sell; to watch. Does the TCO/ROI framing land? Do they fill the cost fields, or stall?
- [ ] **After M2** — one organization running one real initiative through claim → sign-off → gate. Even a small one. First proof the core loop works outside our own head.
- [ ] **Before M4** — confirm SME demand is real before spending six weeks building for it. The incubator raised SME; that is a hypothesis, not evidence.

If a checkpoint fails, the plan changes. That is what they are for.

---

## 7. Open questions

- [ ] Where does client data live for a hosted deployment? (Current demo is outside India.)
- [ ] Is the first customer a bank (high value, high compliance bar) or an SME (low value, low bar, faster revenue)?
- [ ] Simple TCO (3 fields) or detailed breakdown for material initiatives — and what is the materiality threshold?
- [ ] Does `isRegulatory` collapse into `InvestmentCategory`, or stay separate? *(Current view: stay separate.)*
- [ ] Currency: abstract in M1, or accept a larger unwind later?

---

## 8. Risks

**R1 — The enum migration window closes.** Converting `Stage` from a Postgres enum to a
per-organization table is trivial with seed data and painful once clients hold live
history. If M4 is going to happen at all, it must happen before the first signed customer.

**R2 — Test debt compounds.** Every week of untested code is more surface to retrofit,
and retrofitting is several times harder than writing alongside. The curve bends badly
right around the time money calculations enter the codebase (M1).

**R3 — Building everything before meeting the market.** Four to five months of work, zero
users today. Mitigated only by §6 checkpoints being treated as genuinely blocking.

**R4 — Claims running ahead of reality.** The Docker gap is the worked example: a
well-formed Dockerfile that has never built, described verbally as on-prem readiness.
Untested infrastructure code looks identical to working infrastructure code. Rule: nothing
is claimed until it has demonstrably run once.

**R5 — Single-developer bus factor.** A documented procurement blocker for banks,
unsolvable by writing more code.

**R6 — Drift back toward tracker features.** The test for any proposed work: *does this
make the rupee number more credible?* Milestones and dependencies would not have passed it.

---

## 9. Change log

| Date | Change |
|---|---|
| 2026-07-26 | Document created. Supersedes `PLAN.md` / `PHASE-PLAN.md` for forward work. |
| 2026-08-09 | **M0 complete.** Fabricated ROI removed; on-prem container build fixed and verified running end to end. Five latent Docker defects found and fixed — see M0 notes. R4 (claims ahead of reality) now has a worked resolution rather than an open example. |
