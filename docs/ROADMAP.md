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
| ~~No automated tests~~ | **Started in M1.** `npm test` (vitest) covers TCO/ROI/payback math, RBAC visibility scoping, the investment gate and the integrity helpers — 69 tests. Server actions, forms, and E2E remain uncovered; the maker-checker and claim-lock rules are verified live in the browser, not by test. |
| No background jobs | Reminders compute on page load. **`MonthlyReport` is now written (M3)** — but only when a human publishes a period from the Value Board. Nothing is scheduled, and there are still no notifications. |
| No Finance role | Deliberately deferred. Business signs off value; nobody independently certifies cost. |
| ~~Lifecycle and roles hardcoded~~ | **Fixed in M4.** `Stage` is now a per-organization table; roles are capability + visibility scope. `Role` remains a Postgres enum, but nothing keys off its name any more, so per-organization role definitions are an additive change rather than another rewrite. |
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

### M1 — Make ROI real ✅ COMPLETE (2026-08-09)
**Actual: 1 session.**

- [x] Add `buildCostInr`, `annualRunCostInr`, `tcoHorizonYears` to `Initiative`; TCO = build + (run × years)
- [x] Capture cost in the creation wizard, edit form, **demand intake**, and the initiative CSV template
- [x] Compute and display ROI + payback period, per initiative and at portfolio level
- [x] **Currency decision** — *deferred, deliberately.* See below.
- [x] **Value snapshot** — record projected value and TCO at sign-off, immutably
- [x] Introduce the test suite: start with ROI/value math and RBAC scoping

**Exit met.** Verified end to end in the browser: entered ₹8 Cr build + ₹1.5 Cr/yr run × 4 yrs
on an uncosted initiative → TCO resolved to ₹14 Cr in the live form preview → saved → item
detail showed **₹14 Cr / 2.1x / 6 mo** → the Value Board's coverage moved 22 → 23 of 24 and
recomputed → sign-off froze `signedOffValueInr` ₹30 Cr and `signedOffTcoInr` ₹14 Cr in the
database. **35 tests passing.**

**Design: three capture modes, one resolver.** `computeTco()` in `lib/value.ts` is the single
source of truth, resolving in priority order — actual spend > detailed breakdown > simple
estimate. Nothing sums these fields inline, so a single initiative and the portfolio rollup
can never disagree. The governing rule throughout: **a missing cost returns `null`, never 0**,
and every surface renders that as "not captured".

**A second fabricated cost was found and removed.** M0 removed `totalValue × 0.3` from
`createInitiative`, but the identical heuristic survived in `lib/actions/demands.ts` on the
demand→initiative approval path (`primary.estimatedAnnualValueInr * 0.3`). Any initiative
created by approving a demand was still getting a fabricated denominator. It now carries the
demand's real captured cost through, and null stays null.

**Currency decision — deferred, with reasoning.** New fields keep the `Inr` suffix, matching
the existing `estimatedAnnualValueInr` / `estimatedCostInr` convention. Abstracting currency
now would be speculative work for the SME/global market, which is still an unvalidated
hypothesis (see the checkpoint before M4). A consistent all-`Inr` schema is also a cleaner
single rename later than a half-abstracted one. **Revisit when — not if — the SME checkpoint
passes;** the work is `currency` + number-system on `Organization` plus a locale-aware
replacement for `formatInr`, and it grows with every new money field added meanwhile.

**Also added:** cost changes are individually audited on the initiative timeline (a shifting
denominator silently moves every ROI it feeds, so it must be traceable) — verified reading
*"Build cost changed from not captured to ₹8 Cr; Annual run cost changed from not captured to
₹1.5 Cr; TCO horizon changed from — to 4 years"*.

---

### M2 — Investment governance ✅ COMPLETE (2026-08-09)
**Actual: 1 session.**

- [x] `InvestmentCategory` enum, kept **separate** from the existing `isRegulatory` flag (a project can be both)
- [x] Backfill decision for existing initiatives
- [x] Org-configurable ROI threshold — never hardcoded, no universal default
- [x] Soft gate: below-threshold value-generating initiatives flagged as exceptions, not blocked
- [x] Exception requires written justification + approval one tier up
- [x] Exception log: who approved, when, why, ROI at the time
- [x] Segmented portfolio view by investment category

**Exit met.** `/value` now leads with **Capital Allocation by Investment Basis**:

| Basis | Initiatives | Projected Value | Cost | ROI |
|---|---|---|---|---|
| Value-generating | 17 | ₹153.5 Cr | ₹43.67 Cr (16/17) | 3.5x |
| Regulatory / mandatory *(not ROI-gated)* | 7 | ₹107.5 Cr | ₹35.75 Cr | 3.0x |

That split is the thing no tracker produces — a single blended ROI hides that regulatory work was
never meant to clear the bar.

**The gate is soft, and that is enforced in code.** `GateStatus` has five values —
`not_applicable`, `insufficient_data`, `pass`, `exception_required`, `exception_approved`. There is
no "blocked", and a test asserts none of the five can be a rejection. Below-threshold work
escalates; it is never prevented.

**Separation of duties verified live, not assumed.** With the threshold at 5.0x, an initiative at
3.3x showed *"Exception required"*. As **PMO**: no approve button, and an explicit *"Only the CIO
can approve an exception — one tier above the roles that fund initiatives day to day."* As **CIO**:
approved with justification → status flipped to *"Exception approved"*, the log recorded *"Approved
at 3.3x against a 5.0x minimum · ₹8 Cr value vs ₹2.4 Cr cost"*, the audit trail captured it, and
board counts moved from *16 below threshold* to *15 below threshold, 1 funded as an approved
exception*. The UI restriction is backed by `requireRole('CIO','ADMIN')` in the server action, not
just hidden buttons.

**The test suite caught a real bug.** `computeRoi(0, cost)` correctly returns `0` as pure
arithmetic — but the gate read that as "0x, gate failed" for any initiative with no benefit claims
recorded, flagging unassessed work as a *funding failure* rather than missing data. The gate now
assesses value and cost directly; zero recorded value is `insufficient_data`. **49 tests passing.**

**Backfill was an inference, and is labelled as one.** The migration sets `REGULATORY_MANDATORY`
where `isRegulatory = true` (7 initiatives) — otherwise every RBI/NPCI item would sit under a gate
it can never pass. That assumes regulatory work is funded on its mandate: right as a default, but
**PMO should review categories once**, since an initiative can be regulatory *and* primarily
justified by return.

**Exceptions are append-only by convention.** Re-approving after the numbers move writes a new row
rather than updating, so *"approved at 0.8x in March and again at 1.1x in July"* survives as
governance history.

**Demo data note:** threshold left at **2.0x** (5.0x was used only to exercise the exception path).
The approved exception remains on record.

---

### M3 — Integrity controls ✅ **DONE**
**Size: 2–3 weeks.**

- [x] Maker-checker on sign-off and cost changes, gated by materiality thresholds
- [x] Lock benefit claims at sign-off; changes require a visible, formal re-baseline
- [x] Evidence/provenance fields — source for every baseline, target, and realized figure
- [x] Activate period snapshots using the existing unused `MonthlyReport` model; board figures freeze at publication
- [x] Restatement flow — corrections recorded, never silent
- [x] Double-count detection across initiatives claiming the same benefit pool

**Exit met.** Every published figure now carries a traceable custody chain. The claim is deliberately
**not** "our numbers are correct" — no system can guarantee a forecast was right. It is: *you can
always see whose number it is, what it rested on, who approved it, whether anyone changed it, and
what it became.*

**Materiality is what makes four-eyes survivable.** `isMaterial()` returns false for a null
threshold — maker-checker off — which is a distinct state from `0`, meaning "review everything".
Four-eyes on every ₹20 lakh BAU change gets routed around within a month, and a routed-around
control is worse than none because it manufactures false assurance. A cost change is measured by
**the size of the movement, not the new total**: ₹50 Cr → ₹51 Cr is a ₹1 Cr decision. A TCO-horizon
change is measured by what it does to TCO, since changing 3 years to 5 on a large run cost is a ₹
decision entered as a number of years.

**The four-eyes check lives on the server.** `approvePendingChange` refuses when
`approval.proposedBy === user.name`; the "You proposed this" message is a courtesy on top of the
rule, not the rule itself.

**Verified live, role by role.** Threshold set to ₹10 Cr. A ₹40 Cr initiative showed *"Propose
sign-off"* instead of *"Sign off value"*. As **PMO (Anita Desai)**: proposed → initiative stayed
unsigned, panel showed *"You proposed this — it has to be decided by someone else."* As **CIO
(Mahesh Iyer)**: Approve/Reject appeared → approved with a note → signed off, and the record read
*"proposed by Anita Desai, decided by Mahesh Iyer."* A ₹25 Cr build-cost edit by the CIO was
deferred the same way — `buildCostInr` confirmed still `null` in the database while the rest of the
edit applied, because deferring the title because the cost moved teaches people to route around the
control.

**Restatement clears the sign-off.** Financial reporting does not quietly edit a published figure.
A restatement records before, after and why (≥20 characters), then clears the sign-off so the
revised number is committed to again on its own merits rather than inheriting the old approval.
Verified: after restating, the button returned to *"Propose sign-off"* and the restatement stayed on
the record.

**Claims lock at sign-off.** Importing a claim onto an already-signed-off initiative is refused:
*"Value is already signed off on 1 initiative(s): UPI Enhancement v2.0. Restate the value on those
initiatives before adding claims — a signed-off figure cannot be topped up silently."*

**Provenance is required exactly where it matters.** `baseline_source` and `target_source` are
optional CSV columns — an honest blank beats a forced answer. But a **realized ₹ figure** cannot be
saved without an evidence source, checked in the client *and* the Zod schema, because that is the
number that reaches the board. Measurements without one render *"source not recorded"* in amber
rather than silently looking fine.

**Double-count detection is a prompt, not a verdict.** Grouping is by benefit category plus a
normalised metric name, so *"UPI Drop-Rate"* matches *"upi drop rate"*. Claims within one initiative
are never flagged — an initiative legitimately splits one benefit across rows. Verified live: two
initiatives claiming the same metric surfaced as *"₹46 Cr across 1 shared metric"* with both named.
Framed as "review these", since two business units improving the same metric is a legitimate
pattern only a human can tell from a duplicate.

**Snapshots freeze what the board was told.** `MonthlyReport` (previously modelled but unused) now
stores the published payload, round-tripped through JSON so a 2028 reader does not need 2026
TypeScript types to make sense of it. Its unique key moved from `[year, month]` to
`[organizationId, year, month]` — the old key would have let one tenant's publication collide with
another's. Verified: *"Aug 2026 · ₹200.5 Cr signed off · by Mahesh Iyer · 2026-08-09 15:41"*.

**69 tests passing** (20 new integrity tests covering materiality, cost-change magnitude, metric
normalisation and double-count grouping). Migration:
`20260809090000_add_integrity_controls`, applied via `migrate diff` + `migrate deploy` because the
`MonthlyReport` key change is destructive to `migrate dev` in non-interactive mode (the table had 0
rows; verified before applying).

**Configuration note:** materiality threshold left at **₹10 Cr** in the pilot workspace. Records
created during live verification were removed afterwards.

---

### M4 — Configurability and the SME path ✅ **DONE**
**Size: 4–6 weeks. Time-sensitive — see risk R1.**

- [x] Terminology dictionary per organization (cheap, high perceived impact)
- [x] Module flags — regulatory / dependencies / milestones on-off
- [x] **Replace the `Stage` enum with a lifecycle table**, each stage tagged with its semantic role: go-live gate, validation gate, terminal, pre/in/post-delivery. The engine must key off meaning, not the string `UAT`.
- [x] Split `Role` into capability + visibility scope
- [x] Three templates: Regulated BFSI (11 stages), Mid-market IT (~6), Lean (~4)
- [x] Guided setup form

**Exit met.** `/admin/setup` provisions a workspace end to end — lifecycle, vocabulary, modules — with
no code and no deploy. **R1 is closed.**

**The enum is gone, and no data went with it.** `prisma migrate diff` generates `DROP COLUMN` +
`ADD COLUMN` for an enum→text conversion, which would have destroyed every initiative's stage and
the entire audit trail. The migration is hand-written to convert in place with
`ALTER COLUMN … TYPE TEXT USING`, and the backfill inserts exactly the eleven stages the enum
already contained, in the order the application already enforced — so no initiative changed stage
and no history was reinterpreted. Verified after applying: **24 initiatives kept their stage, 125
history rows intact.**

**The engine now asks what a stage MEANS.** Every stage carries a `DeliveryPhase`
(`PRE_DELIVERY` / `IN_DELIVERY` / `POST_DELIVERY`) plus `isGoLiveGate`, `isValidationGate` and
`isTerminal`. The 115 hardcoded references across 23 files are gone:

| Was | Is |
|---|---|
| `currentStage === 'Closed'` | `stageIsTerminal` |
| `['Go Live','Business Validation','Closed'].includes(…)` | `stageIsPostDelivery` |
| `currentStage === 'Business Validation'` | `stageIsValidationGate` |
| `STAGES.indexOf(stage) < STAGES.indexOf('UAT')` | `stageIsPreDelivery` |
| `history.find(h => h.stage === 'Go Live')` | the lifecycle's go-live key |
| Bottleneck = `{UAT, AppSec, CAB Approval}` | the in-delivery stages, whatever they are called |
| Fixed "AppSec pending" / "UAT pending" chips | one chip per in-delivery stage that has work in it |

Semantics are resolved **once**, in the `Item` adapter, and stamped onto the item — so the engine
stays pure and testable, and no lifecycle has to be threaded through every component.

**Tested against lifecycles the product has never shipped.** The suite builds all three templates and
asserts the semantics hold in each — including the lean shape, where **one stage is both the
confirmation gate and the final stage**, and where no stage anywhere is called "Go Live". A retired
stage still renders its key rather than losing history, and `validateLifecycle()` catches the
configurations that would break the engine (no go-live, two finals, a post-delivery stage sitting
before go-live) — returning every problem at once rather than one per save.

**Every template keeps an outcome-confirmation stage.** Delivery ceremony is negotiable; confirming
the value is not. A lifecycle without it makes this a tracker, so the lean four-stage shape still
has one — it is just merged with completion.

**Roles are now capability + scope, and the shipped eight are derived from that table.** Nothing
about their behaviour changed — that is the point. `PMO_EQUIVALENT_ROLES` is computed from
`MANAGE_PORTFOLIO` instead of hand-listed, so a role granted that capability is picked up by
middleware and `requireRole()` automatically. `buildInitiativeVisibilityWhere()` keys off
`VisibilityScope`, so two roles sharing a scope filter identically by construction — the shape of
the bug that over-shared the value board in M0.

**One deliberate behaviour change, caught by a failing test.** The old visibility switch defaulted an
unrecognised role to *full organization visibility*; adding a `Role` to the enum and forgetting its
case silently exposed the whole portfolio. It now falls back to the **narrowest** scope. The test
asserting the old behaviour was updated, with the reasoning recorded in it: the failure mode of a
half-finished role should be "sees too little", never "sees everything".

**Switching a module off removes it, and the removal is real.** Nav entry, panel, route and server
action all go: `/dependencies` returns 404, and `addDependency`, `createMilestone` and
`setRegulatory` each call `assertModuleEnabled()`. Hiding a nav link while the action still works is
a cosmetic control, and a stale tab is exactly where those fail.

**Terminology is a bounded set, on purpose.** Thirteen keys with shipped defaults, not a free-form
dictionary — the product's own help text, error messages and CSV templates refer to these nouns, and
every new key is another place they can drift. Storing a term identical to the default is skipped, so
a later improvement to the shipped wording still reaches organizations that merely confirmed it.

**Switching template refuses to strand live work.** If any initiative sits at a stage the new
template lacks, the switch is rejected and names the stages and counts. Silently relocating live work
would rewrite what the portfolio says about itself and show a transition nobody made. Removing a
single stage is blocked the same way, and also if it would leave the lifecycle without a go-live or
final stage.

**Renaming a stage does not rewrite history.** The stable `key` is what initiatives and history
reference; only the `label` moves. Renaming "UAT" to "Business Testing" re-labels the past as well as
the present without touching a record — which is what an auditor wants, because nothing actually
happened differently.

**Live verification found four bugs the type checker could not.** A second workspace was provisioned
on the four-stage Lean lifecycle — different stage names, two modules off, renamed vocabulary — and
driven end to end:

1. **The UI rendered stage keys, not labels.** `UAT`, `COMMERCIAL`, `DEVELOPMENT` appeared raw on the
   item page, the tables and the audit trail. Both are strings, so nothing failed to compile; the
   rename simply did not show. Fixed across eight files.
2. **`isLiveOrClosed` was silently always false.** The item page still asked
   `['Go Live','Business Validation','Closed'].includes(currentStage)`, which after the conversion
   compares labels against keys — so value realization never started for anything. Now
   `stageIsPostDelivery`.
3. **A lean workspace could never confirm an outcome.** `canValidate` required
   `stageIsValidationGate && !closed`. In the Lean shape those are the *same stage*, so the condition
   was unsatisfiable and the confirmation step — the whole point of the product — was unreachable.
   The `!closed` was redundant belt-and-braces in the BFSI lifecycle and hid the bug there.
4. **A terminal stage got a "pending" work queue.** Queue chips were generated for every stage
   rather than the in-delivery ones, so "Value Confirmed Pending" appeared for finished work.

Each was then re-verified in the browser: rename propagates to current stage and history while the
key and all 10 history rows stay untouched; the lean workspace shows *"Advance Stage: In Progress →
Live"*, no regulatory or dependency surface anywhere, `New Project` in the nav from the terminology
override, and a full confirmation saved against a merged confirm-and-close stage.

**101 tests passing** (32 new: lifecycle semantics, template validity, capabilities, visibility
scope). Migration: `20260809140000_configurable_lifecycle`.

**One capability was deliberately dropped, not replaced.** The PMO dashboard's two fixed
stage-specific insight cards and the item page's "Awaiting security clearance" / "Awaiting CAB
approval" hints were hardcoded to BFSI stage names. The cards are now generated per in-delivery
stage, but the two prose hints are gone: there is no semantic role for "security review", and
inventing one to preserve two sentences would re-import the assumption M4 exists to remove.

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

**Start now (calendar-bound, low engineering time):** — **NOT ENGINEERING WORK.**
These are commercial and legal actions. None of them can be closed by writing code,
and none are done.
- [ ] Get VAPT quotes from CERT-In empanelled auditors — understand cost and lead time
- [ ] Resolve data residency for any client-facing deployment
- [ ] Legal entity, cyber liability insurance, SLA and support model

**Before any pilot with real client data:** ✅ **ALL DONE (2026-08-15).**
- [x] Error tracking and basic observability
- [x] Tested backup and restore procedure
- [x] Staging environment separate from production
- [x] Security questionnaire and DPA prepared

**Before a bank customer:**
- [x] ~~SSO/SAML and~~ **MFA** — TOTP done and verified against RFC 6238 vectors. **SSO/SAML is NOT built** and is not claimed; it needs a real identity provider to be anything but a stub.
- [ ] VAPT complete, including remediation and retest — *blocked on the quotes above*
- [ ] Source code escrow, audit rights — *legal*
- [x] Approved/hardened base image, clean image scan (Trivy or equivalent)

**Deferred until a customer forces it:** DR planning and RTO/RPO, Helm/OpenShift
manifests, load testing, caching and pagination, full multi-tenancy proving, i18n,
append-only audit logs, full-text search.

---

### What was built (2026-08-15)

**Observability without phoning home.** No Sentry, no Datadog, no hosted log
drain. "No outbound network calls at runtime" is one of the few claims this
product can make that a SaaS competitor cannot, and shipping an agent that calls
home would quietly destroy it — the first security questionnaire would catch it.
So: structured JSON on stdout (`lib/observability.ts`), which every on-prem stack
already collects and every bank SIEM already ingests. A redaction list strips
credentials, email addresses **and ₹ business values** before a line is written —
a benefit figure in a log is still client-confidential financial data.

**A readiness probe, not a liveness one.** `GET /api/health` runs `SELECT 1`,
because a container that boots against an unreachable database returns 200 on a
process check while every page 500s. It is unauthenticated by necessity — an
orchestrator must reach it before anyone can log in — and therefore returns no
version, hostname or error text. Verified both ways in a running container:
`200 {"status":"ok"}` against a live database, `503 {"status":"unavailable"}`
against a dead one, with `health.database_unreachable` in the logs and Docker
reporting the container `healthy`.

**Environment separation that is enforced, not conventional.** `APP_ENV` drives a
visible non-production banner and hard guards. `npm run db:seed` — which deletes
portfolio data and inserts records with a known shared password — now refuses
outright under `APP_ENV=production`; verified by running it and getting the
refusal. The check is deliberately on `APP_ENV` and not `NODE_ENV`, because
`NODE_ENV` is `production` on a staging build too, and that conflation is exactly
how a seed script ends up running for real. It defaults to `development`, so an
unconfigured box shows a banner rather than silently accepting a destructive
operation.

**Backup and restore, actually tested.** Scripts plus
`docs/RUNBOOK-BACKUP-RESTORE.md`. The dump verifies its own archive integrity at
backup time, so corruption fails then rather than during an incident; the restore
runs in a single transaction, because a half-restored portfolio is worse than a
failed restore since it looks like it worked. The round trip was executed against
the populated database — dumped, restored into a **scratch** database, and
compared. Initiative 26/26, HistoryLog 132/132, BenefitClaim 34/34, User 16/16,
LifecycleStage 11/11. Restoring into a scratch database rather than over the
source is deliberate: a restore drill that can destroy the data it protects is
not a drill.

**MFA with no new dependency.** TOTP (RFC 6238) implemented directly on Node's
`crypto` rather than pulling in otplib. "How many third-party packages touch
authentication?" is a standard questionnaire question and the best answer is
"none beyond the framework" — and the algorithm is fixed by RFC and verifiable
against the specification's own published vectors, which `lib/totp.test.ts` does
for all six. Single-use recovery codes stored bcrypt-hashed; disabling MFA
requires password re-authentication, or anyone at an unlocked screen could strip
the second factor off the account.

The sign-in form shows the code field **always**, rather than prompting for it
after the password is accepted. A second-step prompt would confirm that an
account exists AND has MFA enabled before authentication completes, which is free
account enumeration. Every failure — wrong password, wrong code, missing code,
unknown account — returns one identical message for the same reason.

**CI that gates rather than reports.** `.github/workflows/ci.yml` runs typecheck,
lint, 122 tests and a production build against a real PostgreSQL service, then
builds the image and runs Trivy with `exit-code: 1` on fixable HIGH/CRITICAL.
Unfixed findings are advisory-only — a vulnerability with no available patch
cannot be actioned, and blocking on it only trains people to bypass the gate. CI
also asserts the image does not run as root. The image build was verified
locally: builds clean, runs as `nextjs`, boots, migrates and serves.

**A security pack that states its own gaps.** `docs/SECURITY-QUESTIONNAIRE.md`
answers 40+ standard questions with ✅ / ⚠️ / ❌ and closes with a consolidated
gap table — SSO/SAML, org-wide MFA enforcement, account lockout, append-only
audit storage, VAPT, RTO/RPO, load testing. `docs/DPA-TEMPLATE.md` is a draft
marked clearly as needing legal review. A questionnaire that overstates controls
fails at the first evidence request and takes the credible answers down with it,
which is R4 applied to sales rather than to the product.

**Known gap introduced and closed:** the M4 verification cleanup deleted a test
Organization but left 2 initiatives and 2 users orphaned, because those relations
are `SetNull` rather than `Cascade`. They were invisible in the app (every query
is org-scoped) and were only found because the backup drill compared raw table
counts. Removed. Worth noting that the org-scoping which hid the rows is the same
control that makes them harmless.

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

**R1 — ~~The enum migration window closes.~~ CLOSED in M4.** The conversion happened while the only
data was seed data, exactly as this risk asked. `Stage` is now a per-organization table, the
migration preserved all 24 initiatives and 125 history rows, and no customer ever held live history
under the enum.

**R2 — Test debt compounds.** *Partly mitigated in M1* — a suite now exists and covers the
money math and visibility scoping, the two places a silent bug does most damage. Server
actions, forms, and end-to-end flows are still untested, so the risk is reduced, not closed.

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
| 2026-08-09 | **M2 complete.** Investment categorisation, org-configurable ROI threshold, soft gate with CIO-tier exception approval and an append-only exception log, and the board-grade Capital Allocation view. Separation of duties verified live (PMO blocked, CIO approved). Tests caught a gate bug where zero recorded value read as a failed gate. |
| 2026-08-09 | **M1 complete.** Real TCO capture across all four surfaces, ROI + payback per initiative and portfolio, sign-off snapshot, and the first test suite (35 tests). A second fabricated `× 0.3` cost was found on the demand-approval path and removed. Currency abstraction deliberately deferred with reasoning recorded. |
| 2026-08-11 | **M4 complete.** The `Stage` enum is gone — lifecycle is a per-organization table with semantic role tags, and the engine keys off meaning rather than the string `UAT`. Per-organization terminology, module switches that remove surfaces rather than empty them, roles expressed as capability + visibility scope, three shipped templates and a guided setup form at `/admin/setup`. Verified by provisioning a second workspace on the four-stage Lean lifecycle and driving it end to end, which found four bugs the type checker could not see — including one that made outcome confirmation unreachable in any lifecycle where confirm and close are the same stage. **R1 is closed.** |
| 2026-08-09 | **M3 complete.** Maker-checker on value sign-off and cost changes gated by an org materiality threshold, claims locked at sign-off, formal restatement flow, evidence/provenance fields (mandatory for realized ₹ figures), portfolio double-count review, and period snapshots that freeze board figures at publication. The whole chain — proposed by, approved by, restated by, sourced from — is verified live across PMO and CIO. `MonthlyReport`'s unique key moved to `[organizationId, year, month]`, closing a cross-tenant collision that had never been exercised because the model was unused. |
| 2026-08-15 | **M5 (pilot tier) complete.** Observability with no outbound calls, readiness probe verified both ways in a container, enforced staging/production separation, a backup/restore round trip actually executed, TOTP MFA verified against RFC 6238 vectors, CI gating on Trivy, and a security questionnaire + DPA that state their own gaps. The three "start now" items and VAPT/escrow remain — they are commercial and legal actions, not engineering. SSO/SAML is explicitly NOT built. A backup drill caught 4 orphaned rows left by the M4 cleanup; removed. |
