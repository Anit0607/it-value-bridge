# IT Value Bridge — Phased Build Plan (Phase 0 → 5)

> **For agentic workers:** REQUIRED SUB-SKILL — use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use `ui-ux-pro-max` for **every** UI task. This document is **planning only** — no application code is written here beyond schema/interface contracts that downstream tasks must honor.

> **TERMINOLOGY (hard rule):** "PMBOK" is internal shorthand for the author's understanding only. It MUST NOT appear in any user-facing UI text, headings, labels, route segments, file/folder names, or comments. Use plain business terms instead: "PMBOK knowledge areas" → **governance areas**; "PMBOK process groups" → **delivery phases**; "knowledge-area matrix" → **governance matrix**. Route segment `pmbok` → **`governance`** (e.g. `app/(app)/items/[id]/governance/...`, `lib/governance.ts`, `components/governance/*`). Keep the underlying concepts; drop the acronym.

> **DEPLOYMENT & COMPLIANCE (LOCKED 2026-06-18) — OVERRIDES any Supabase/cloud references below.**
> Two beta users are from a bank with Indian data-residency requirements: **all data must stay on
> infrastructure they control, and the app makes NO external network calls at runtime.**
> - **Database:** self-hosted **PostgreSQL in a Docker container** — NOT Supabase or any cloud DB.
>   A single `DATABASE_URL` pointing at the local service (e.g. `postgresql://itvb:itvb@db:5432/itvb`).
>   Drop Supabase pooling / `DIRECT_URL`.
> - **Packaging:** ship `Dockerfile` (Next.js `output: 'standalone'`) + `docker-compose.yml`
>   (app + postgres + named volume) + `.env.example`, with one-command start (`docker compose up`).
>   Must run on Linux, Windows, or a laptop.
> - **Air-gapped:** no external CDNs/analytics/fonts at runtime (`next/font` self-hosts at build = OK).
>   **AI narrative is OFF by default** — render a manual/placeholder narrative behind a disabled
>   feature flag; no external AI API call.
> - **Pilot data:** seed dummy/non-sensitive data only. Real data follows the bank's security review
>   (hardening, SSO/AD, audit, encryption-at-rest) — out of scope for the beta.
> - **Auth:** self-hosted email/password (Auth.js Credentials). No Google/external IdP.

**Goal:** Turn the existing localStorage prototype into a real, DB-backed, auth-protected enterprise SaaS app that tracks banking IT Change Requests & Projects across dual methodologies (Waterfall + Agile) and PMBOK knowledge areas, and translates IT delivery into business value for leadership.

**Architecture:** Next.js (App Router) + TypeScript. Auth.js (NextAuth v5) email/password with RBAC over four roles. Self-hosted PostgreSQL (Docker container, no cloud) via Prisma ORM. Data access through Server Actions / Route Handlers — the localStorage store is removed in Phase 1. UI is a single design system (Tailwind + shadcn/ui + lucide-react + Framer Motion) sourced from `_design-ref` + the `ui-ux-pro-max` skill. RAG and "days in stage" stay computed at render time, never stored.

**Tech Stack:** Next.js 14.2.5, React 18, TypeScript 5, Tailwind 3.4, shadcn/ui, lucide-react, framer-motion, Auth.js v5, Prisma, PostgreSQL (self-hosted via Docker), bcrypt, zod, Docker + docker-compose.

**USP that must survive every phase:** *translating IT delivery into business value for leadership.*

---

## Conventions (apply to every task)

- [ ] **Branch:** work on `redesign` (create once: `git checkout -b redesign`). Never commit phase work directly on a detached snapshot.
- [ ] **Commit cadence:** commit after each task with a conventional message (`feat:`, `chore:`, `refactor:`, `style:`, `db:`). End every commit message with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- [ ] **Never break the build:** `npm run build` must pass at the end of every phase. `npm run dev` must stay runnable between phases.
- [ ] **One phase per prompt:** after each phase, run the dev server, screenshot-review the touched screens (reuse `scripts/shoot.mjs`), then commit.
- [ ] **Design source of truth:** before any UI task, read the relevant token file(s) under `_design-ref/design-md/` (Linear, Stripe, Vercel, Supabase) and run the `ui-ux-pro-max` design-system script. **User instruction overrides script:** font = **Inter** via `next/font`; palette = deep indigo/navy primary, slate neutrals, RAG = emerald/amber/rose **as accents only**.
- [ ] **RAG rule is frozen** (see Appendix B). Never store RAG; always compute at render. Any task that appears to store RAG is wrong.
- [ ] **Stage order is frozen** (see Appendix B). BRD → FSD → Commercial → Development → SIT → UAT → AppSec → CAB Approval → Go Live → Business Validation → Closed.
- [ ] **Verification before "done":** use `superpowers:verification-before-completion` at the end of each phase — actually load the screen, don't just typecheck.

---

## File Structure Map

New / changed top-level areas across the build (created in the phase noted):

| Path | Responsibility | Phase |
|---|---|---|
| `app/(marketing)/page.tsx` | Public landing page (hero/features/CTA) | 0 |
| `app/(marketing)/layout.tsx` | Marketing shell (no sidebar) | 0 |
| `components/ui/*` | shadcn primitives (button, card, input, badge, table, dialog, dropdown, select, tabs, sheet) | 0 |
| `components/marketing/*` | Hero, FeatureGrid, Footer, CTASection | 0 |
| `lib/design/tokens.ts` | Central design tokens (re-exported from Tailwind config) | 0 |
| `prisma/schema.prisma` | Full domain schema (Appendix A) | 1 |
| `prisma/seed.ts` | Seed: 4 demo users + 20 initiatives + history | 1 |
| `lib/db.ts` | Prisma client singleton | 1 |
| `lib/auth.ts` | Auth.js v5 config (replaces current demo `lib/auth.ts`) | 1 |
| `lib/rbac.ts` | Role → allowed routes/actions matrix | 1 |
| `middleware.ts` | Route protection | 1 |
| `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx` | Real auth screens | 1 |
| `lib/actions/initiatives.ts` | Server actions: list/get/create/update/advanceStage/saveValidation | 1–2 |
| `lib/queries/*.ts` | Read queries + RAG enrichment for dashboards | 2 |
| `app/(app)/**` | The 4 dashboards + detail + create + report, DB-backed | 2 |
| `lib/actions/pmbok.ts` | Knowledge-area, risk, stakeholder, value-realization actions | 3 |
| `app/(app)/items/[id]/pmbok/*` | KA matrix, risk register, stakeholder register | 3 |
| `lib/actions/agile.ts` | Epic/sprint/story/velocity actions | 4 |
| `app/(app)/items/[id]/agile/*` | Backlog, board, sprint, burndown | 4 |
| `lib/reports/*` | Monthly report aggregation + AI narrative hook | 5 |
| `app/(app)/report/*` | Monthly report (real data) + Export PDF | 5 |

**Files removed in Phase 1:** `lib/store.ts`, `lib/mockData.ts` (content migrated into `prisma/seed.ts`), `components/RoleProvider.tsx` (replaced by Auth.js session). `lib/types.ts` is **retained and extended** — it stays the canonical TS type source, kept in sync with Prisma (Prisma generates DB types; `lib/types.ts` holds derived UI types + frozen enums like `STAGES`).

---

## Phase 0 — Design system + Landing page (no DB)

**Outcome:** A professional public marketing landing page + the authenticated app shell, both on one consistent design system. Fastest visible win. App still runs on the existing localStorage store (untouched this phase).

### Task 0.1: Install UI dependencies

- [ ] **Step 1:** Install runtime deps.
  Run: `npm i framer-motion class-variance-authority clsx tailwind-merge tailwindcss-animate`
- [ ] **Step 2:** Init shadcn/ui (writes `components.json`, `lib/utils.ts`).
  Run: `npx shadcn@latest init` — choose: style **New York**, base color **Slate**, CSS variables **yes**, path alias `@/components`.
- [ ] **Step 3:** Add the primitives this build uses.
  Run: `npx shadcn@latest add button card input label badge table dialog dropdown-menu select tabs sheet separator avatar tooltip`
- [ ] **Step 4:** Verify build still compiles.
  Run: `npm run build` — Expected: PASS (10 routes unchanged).
- [ ] **Step 5:** Commit. `chore: install shadcn/ui, framer-motion, design deps`

### Task 0.2: Lock the design tokens

- [ ] **Step 1:** Read `_design-ref/design-md/linear.app/DESIGN.md`, `stripe/DESIGN.md`, `vercel/DESIGN.md` for palette/spacing/radius/typography conventions. Run the `ui-ux-pro-max` design-system script for the recommendation.
- [ ] **Step 2:** Reconcile `tailwind.config.ts` to the **frozen** token decisions (Appendix C): keep `brand` (indigo 50–950), `navy` (dark surfaces), RAG = emerald/amber/rose, `shadow-card`/`shadow-card-hover`, Inter via `--font-inter`. Wire shadcn CSS variables to these tokens (don't run two parallel color systems).
- [ ] **Step 3:** Confirm `app/globals.css` keeps `.tabular` util, focus-visible ring, reduced-motion + print blocks, and now also defines the shadcn `:root` HSL variables mapped to brand/slate.
- [ ] **Step 4:** Visual check — load `/` and one dashboard; confirm no token regressions.
  Run: dev server + `scripts/shoot.mjs`.
- [ ] **Step 5:** Commit. `style: lock design tokens (indigo/slate/RAG, Inter) + shadcn var mapping`

### Task 0.3: Marketing landing page

**Files:** Create `app/(marketing)/layout.tsx`, `app/(marketing)/page.tsx`, `components/marketing/Hero.tsx`, `FeatureGrid.tsx`, `SocialProof.tsx`, `CTASection.tsx`, `Footer.tsx`, `MarketingNav.tsx`.

- [ ] **Step 1:** Build `MarketingNav` — logo (Layers icon + "IT Value Bridge"), anchor links (Product, PMBOK + Agile, Reporting), "Sign in" ghost + "Get started" primary → `/sign-up`.
- [ ] **Step 2:** Build `Hero` — eyebrow, H1 leading on the USP ("Translate IT delivery into business value leadership can read"), subcopy, primary CTA → `/sign-up`, secondary "See a demo" → `/sign-in`. Framer Motion fade/slide-in on mount; respect reduced-motion.
- [ ] **Step 3:** Build `FeatureGrid` — 3–6 cards with lucide icons: Dual methodology (PMBOK + Agile), RAG portfolio health, Executive monthly reporting, Business-value realization, Risk & stakeholder registers, Role-based dashboards.
- [ ] **Step 4:** Build `SocialProof` (logo-row placeholder), `CTASection` (repeat primary CTA), `Footer` (product/links/legal placeholders).
- [ ] **Step 5:** Decide route ownership for `/`: marketing page becomes the public root; existing login UI moves under `(auth)` in Phase 1. For Phase 0, keep current `app/page.tsx` login reachable at `/sign-in` via a temporary redirect or move; landing lives at `/`.
- [ ] **Step 6:** Responsive pass (mobile nav → `sheet`), then screenshot-review hero + features at 1440 and 390 widths.
- [ ] **Step 7:** Commit. `feat: marketing landing page on new design system`

### Task 0.4: Authenticated app shell polish

**Files:** Modify `components/Sidebar.tsx`, `app/(app)/layout.tsx`; add `components/app/TopBar.tsx`, `components/app/UserMenu.tsx`.

- [ ] **Step 1:** Confirm sidebar (navy-900, lucide icons, active = brand-600, profile pinned bottom, mobile off-canvas) is intact; extract the top bar into `TopBar` with a `UserMenu` dropdown (avatar, role label, sign-out) using shadcn `dropdown-menu`.
- [ ] **Step 2:** Ensure `max-w-[1400px]` content container + 4/8px spacing scale are consistent across dashboards.
- [ ] **Step 3:** Screenshot-review CIO dashboard + PMO list to confirm shell consistency with the landing page.
- [ ] **Step 4:** `npm run build` — Expected: PASS.
- [ ] **Step 5:** Commit. `feat: app shell top bar + user menu`

**Phase 0 done when:** landing page + app shell share one design system; build passes; both screenshot-reviewed; committed.

---

## Phase 1 — Auth + Database

**Outcome:** Real Postgres persistence via Prisma, real Auth.js email/password with RBAC, seeded demo data, and the localStorage store fully replaced by server actions. App behaves identically to the prototype but is now backed by a database.

> **No external setup needed.** The database is a local Postgres Docker container defined in `docker-compose.yml` (Task 1.0). Create `.env` from `.env.example` with `DATABASE_URL=postgresql://itvb:itvb@localhost:5432/itvb` (or `@db:5432` inside compose). Email/password auth only — no Google/OAuth. Add a **Task 1.0**: write `docker-compose.yml` (postgres + named volume) and bring it up before `prisma migrate`.

### Task 1.1: Add Prisma + define schema

**Files:** Create `prisma/schema.prisma` (Appendix A), `lib/db.ts`; add `.env` (gitignored via `.env*`).

- [ ] **Step 1:** Install. Run: `npm i -D prisma` and `npm i @prisma/client`
- [ ] **Step 2:** Run: `npx prisma init` — sets `prisma/schema.prisma` + `.env`.
- [ ] **Step 3:** Replace schema with the **draft in Appendix A** (User, Initiative, WaterfallStage, Epic/Sprint/Story, KnowledgeArea, Risk, Stakeholder, BusinessValueRealization, HistoryLog, MonthlyReport + enums). Keep the frozen Stage order and RBAC roles.
- [ ] **Step 4:** Create `lib/db.ts` Prisma singleton (guard against hot-reload duplicate clients).
- [ ] **Step 5:** Validate. Run: `npx prisma validate` — Expected: "The schema is valid."
- [ ] **Step 6:** Commit. `db: add prisma schema + client singleton`

### Task 1.2: First migration + seed

**Files:** Create `prisma/seed.ts`; modify `package.json` (`prisma.seed` + `db:seed` script).

- [ ] **Step 1:** Run: `npx prisma migrate dev --name init` — Expected: migration applied, `@prisma/client` generated.
- [ ] **Step 2:** Write `prisma/seed.ts`: upsert 4 demo users (cio/pmo/vh/business@bank.com, bcrypt-hashed shared demo password, roles + verticalHead link for vh). Port the 20 items from current `lib/mockData.ts` into `Initiative` rows + their `HistoryLog` + `WaterfallStage` rows; mark several Closed-with-validation and several overdue (Red).
- [ ] **Step 2a:** Set `methodology = WATERFALL` for all seeded initiatives (Agile comes in Phase 4); leave Agile tables empty.
- [ ] **Step 3:** Add `"db:seed": "tsx prisma/seed.ts"` and `"prisma": { "seed": "tsx prisma/seed.ts" }`; install `tsx` + `bcryptjs` (`npm i -D tsx` / `npm i bcryptjs @types/bcryptjs`).
- [ ] **Step 4:** Run: `npm run db:seed` — Expected: "Seeded 4 users, 20 initiatives".
- [ ] **Step 5:** Verify. Run: `npx prisma studio` (manual spot-check) or a count query.
- [ ] **Step 6:** Commit. `db: initial migration + seed (4 users, 20 initiatives)`

### Task 1.3: Auth.js v5 + RBAC

**Files:** Create `auth.ts` (root), `lib/rbac.ts`, `middleware.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`, `lib/actions/auth.ts`. Remove `components/RoleProvider.tsx` and the demo `lib/auth.ts` `DEMO_ACCOUNTS`.

- [ ] **Step 1:** Install. Run: `npm i next-auth@beta @auth/prisma-adapter`
- [ ] **Step 2:** Configure Auth.js: Credentials provider (email + password, bcrypt compare), Prisma adapter, JWT/session callback that puts `role` + `verticalHead` on the session. (+ Google provider only if the user opted in.)
- [ ] **Step 3:** Build sign-in + sign-up screens on the new design system; sign-up creates a `User` (default role choose-on-signup or PMO-assigned — confirm with user; default new self-signups to `business`).
- [ ] **Step 4:** `lib/rbac.ts` — map role → allowed routes (cio→`/cio`, pmo→`/pmo`+`/pmo/new`, vh→`/vertical-head`, business→`/business`; detail/report shared). `middleware.ts` redirects unauthenticated → `/sign-in` and wrong-role → that role's home.
- [ ] **Step 5:** Replace the "Demo Login" buttons with real sign-in; keep four demo accounts documented on the sign-in page (prefill on click) for demo speed.
- [ ] **Step 6:** Verify: sign in as each of the 4 roles → lands on correct dashboard; sign out works; protected route while logged-out redirects.
- [ ] **Step 7:** `npm run build` — Expected: PASS.
- [ ] **Step 8:** Commit. `feat: Auth.js v5 email/password + RBAC + protected routes`

### Task 1.4: Replace localStorage store with server actions

**Files:** Create `lib/actions/initiatives.ts`; modify every `app/(app)/**` page that imported `useStore`. Remove `lib/store.ts`.

- [ ] **Step 1:** Implement server actions mirroring the old store surface: `listInitiatives(filter)`, `getInitiative(id)`, `createInitiative(input)`, `updateInitiative(id, patch)`, `advanceStage(id, note, userId)`, `saveValidation(id, validation)`. Each writes `HistoryLog`. `advanceStage` replicates current logic (next stage, new stageStart = today, expected = +14d, clear delay) — see `lib/store.ts:58-84` for the exact behavior to port.
- [ ] **Step 2:** Validate inputs with zod at the action boundary.
- [ ] **Step 3:** Convert pages to read via server components / call actions; replace `useStore()` reads with awaited queries; replace mutations with action calls + `revalidatePath`.
- [ ] **Step 4:** Delete `lib/store.ts` and `lib/mockData.ts`; remove `StoreProvider` from `app/(app)/layout.tsx`.
- [ ] **Step 5:** Verify each role's flows still work against the DB (create, advance stage, validate, refresh-survives).
- [ ] **Step 6:** `npm run build` — Expected: PASS.
- [ ] **Step 7:** Commit. `refactor: replace localStorage store with DB-backed server actions`

**Phase 1 done when:** all data reads/writes hit Postgres; auth+RBAC enforced; seed reproducible; localStorage removed; build passes.

---

## Phase 2 — Core tracker redesign (DB-backed)

**Outcome:** All 4 dashboards + item detail + create form + report rebuilt on the new design system, reading/writing the DB, with the specific UX fixes from the brief.

### Task 2.1: Dashboard read queries with RAG enrichment

**Files:** Create `lib/queries/dashboard.ts`, `lib/queries/enrich.ts`.

- [ ] **Step 1:** `enrich.ts` — given a DB `Initiative` (+ current `WaterfallStage`), compute `rag`, `daysInStage`, `etaDays` using the frozen functions (Appendix B). This is the single enrichment point all dashboards use.
- [ ] **Step 2:** `dashboard.ts` — `getCioSummary()` (active/onTrack/atRisk/delayed counts + pct, stage funnel counts, per-VH RAG breakdown, this-month committed/delivered/missed), `getPmoList(filter)`, `getVhItems(verticalHead)`, `getBusinessValidations()`.
- [ ] **Step 3:** Commit. `feat: dashboard queries + RAG enrichment layer`

### Task 2.2: CIO dashboard

- [ ] **Step 1:** PageHeader (no overlap — `flex justify-between`, breathing room) + "Generate Monthly Report" action.
- [ ] **Step 2:** 4 KPI cards (icon + label + tabular number + sub-stat like "of 19" / % + thin RAG accent bar), responsive 4-across.
- [ ] **Step 3:** Replace stage tiles with the horizontal **funnel/bar** viz (color-graded, width ∝ volume) — reuse/upgrade `components/StageFunnel.tsx`.
- [ ] **Step 4:** "This Month" card + per-VH summary table (RAG dot counts, sorted by risk).
- [ ] **Step 5:** Screenshot-review. Commit. `feat: CIO dashboard (DB-backed, funnel + KPI cards)`

### Task 2.3: PMO dashboard

- [ ] **Step 1:** PageHeader + "New Item". 4 KPI cards. "Needs Attention" card (overdue/stale).
- [ ] **Step 2:** FilterBar (Stage/RAG/Vertical/Type + search) wired to `getPmoList` query params.
- [ ] **Step 3:** Dense `ItemTable` — sticky header, zebra, sortable, RAG dot+label, hover, empty state.
- [ ] **Step 4:** Screenshot-review. Commit. `feat: PMO dashboard (filters + dense table, DB-backed)`

### Task 2.4: Vertical Head + Business dashboards

- [ ] **Step 1:** VH: PageHeader + 4 KPI cards + `ItemTable` scoped to `session.verticalHead` (hide VH column).
- [ ] **Step 2:** Business: "Action Required" pending-validations card + dense outcome table.
- [ ] **Step 3:** Screenshot-review both. Commit. `feat: vertical-head + business dashboards (DB-backed)`

### Task 2.5: Item detail + create form + validation

- [ ] **Step 1:** Detail: breadcrumb, header (title + type badge + RAG badge), `StageProgress`, two-col (details/business-value vs current-stage card with advance + delay + notes), history timeline. Wire to `advanceStage`/`updateInitiative`.
- [ ] **Step 2:** Create form (PMO): all brief fields; on submit `createInitiative` (currentStage BRD, expected +21d) → redirect to detail.
- [ ] **Step 3:** Validation screen: Yes/Partially/No + actual result/metric → `saveValidation`; wrong-stage guard.
- [ ] **Step 4:** Screenshot-review. `npm run build` PASS. Commit. `feat: item detail + create + validation (DB-backed)`

**Phase 2 done when:** all 7 screens are DB-backed on the new design system; brief's UX fixes present; build passes; screenshots reviewed.

---

## Phase 3 — PMBOK layer

**Outcome:** Process-group tracking, knowledge-area matrix, risk register, stakeholder register, and business-value realization surfaced on initiatives + dashboards.

### Task 3.1: Process groups + KA matrix

**Files:** Create `lib/actions/pmbok.ts`, `lib/pmbok.ts` (stage→process-group map), `app/(app)/items/[id]/pmbok/page.tsx`, `components/pmbok/KnowledgeAreaMatrix.tsx`.

- [ ] **Step 1:** `lib/pmbok.ts` — map each Stage to a PMBOK process group (Initiating/Planning/Executing/Monitoring&Controlling/Closing) per PLAN.md §2; derive `currentProcessGroup` from `currentStage`.
- [ ] **Step 2:** KA matrix: 10 knowledge areas (Integration, Scope, Schedule, Cost, Quality, Resource, Communications, Risk, Procurement, Stakeholder) each with status/RAG + notes; `upsertKnowledgeArea` action.
- [ ] **Step 3:** Show current process group on item detail + CIO dashboard rollup.
- [ ] **Step 4:** Screenshot-review. Commit. `feat: PMBOK process groups + knowledge-area matrix`

### Task 3.2: Risk + Stakeholder registers

**Files:** `app/(app)/items/[id]/pmbok/risks/page.tsx`, `.../stakeholders/page.tsx`, `components/pmbok/RiskTable.tsx`, `StakeholderTable.tsx`.

- [ ] **Step 1:** Risk register CRUD (risk, probability, impact, response, owner) → feeds Risk KA RAG.
- [ ] **Step 2:** Stakeholder register CRUD (stakeholder, role, influence, interest).
- [ ] **Step 3:** Screenshot-review. Commit. `feat: risk register + stakeholder register`

### Task 3.3: Business-value realization

- [ ] **Step 1:** Promote the validation screen into full Business-Value Realization (outcomeAchieved Yes/Partial/No, actualResult, actualMetric vs target, realized date) persisted to `BusinessValueRealization`.
- [ ] **Step 2:** Surface realized value on CIO dashboard (value-delivered rollup).
- [ ] **Step 3:** `npm run build` PASS. Screenshot-review. Commit. `feat: business-value realization + exec rollup`

**Phase 3 done when:** every initiative has process group + KA matrix + risk/stakeholder registers + value realization; build passes.

---

## Phase 4 — Agile layer

**Outcome:** Per-initiative methodology switch; full Agile tracking (epics, sprints, backlog, points, velocity, burndown, kanban) that dashboards adapt to.

### Task 4.1: Methodology switch + Agile actions

**Files:** `lib/actions/agile.ts`; modify detail page to branch on `methodology`.

- [ ] **Step 1:** Methodology toggle (WATERFALL ↔ AGILE) on initiative; AGILE hides waterfall stages, shows Agile views (and vice-versa). RAG still computed (for Agile, base on sprint commitment/expected date — define rule, keep "stale ≥7d → Red").
- [ ] **Step 2:** Actions: epics CRUD, sprints CRUD (number, dates, capacity), stories CRUD (points, status, sprint, epic).
- [ ] **Step 3:** Commit. `feat: per-initiative methodology switch + agile actions`

### Task 4.2: Backlog + Kanban board

- [ ] **Step 1:** Backlog list (stories by priority, points, status, sprint assignment).
- [ ] **Step 2:** Kanban board (To Do / In Progress / Review / Done) — drag-or-select to change status.
- [ ] **Step 3:** Screenshot-review. Commit. `feat: agile backlog + kanban board`

### Task 4.3: Sprint, velocity, burndown

- [ ] **Step 1:** Sprint view (capacity vs committed vs completed points).
- [ ] **Step 2:** Velocity (last N sprints) + burndown chart (use a light chart lib or hand-rolled SVG; respect reduced-motion).
- [ ] **Step 3:** Dashboards adapt per methodology (Agile initiatives show sprint/velocity tiles instead of stage funnel slice).
- [ ] **Step 4:** `npm run build` PASS. Screenshot-review. Commit. `feat: sprint + velocity + burndown`

**Phase 4 done when:** an initiative can run fully Agile or Waterfall; charts render; dashboards adapt; build passes.

---

## Phase 5 — Reports, animation & polish

**Outcome:** Real monthly report with export + AI-narrative hook, Framer Motion micro-interactions, full responsive + a11y, empty/loading states, final visual pass.

### Task 5.1: Monthly report (real data)

**Files:** `lib/reports/monthly.ts`, `app/(app)/report/page.tsx`; persist snapshots to `MonthlyReport`.

- [ ] **Step 1:** Aggregate from DB: month/year, completed-this-month with business outcomes, delayed with source breakdown, missed (committed-but-not-delivered).
- [ ] **Step 2:** "Generate Monthly Report" writes a `MonthlyReport` snapshot (so reports are historical, not recomputed).
- [ ] **Step 3:** Export-as-PDF via `window.print()` + print stylesheet (`no-print` on chrome). Commit. `feat: monthly report from real data + PDF export`

### Task 5.2: AI narrative hook

- [ ] **Step 1:** `lib/reports/narrative.ts` — server action that builds a prompt from the report aggregates and calls the **Claude API** (read the `claude-api` skill for current model id + SDK before wiring; default to the latest Sonnet). Behind a feature flag / graceful placeholder when `ANTHROPIC_API_KEY` is unset.
- [ ] **Step 2:** Render narrative in the report (Sparkles, brand gradient). Commit. `feat: AI narrative hook (Claude API) with graceful fallback`

### Task 5.3: Motion, a11y, states, final pass

- [ ] **Step 1:** Framer Motion micro-interactions (card mount, number count-up, sidebar active slide) — all gated by `prefers-reduced-motion`.
- [ ] **Step 2:** Loading skeletons + empty states for every list/dashboard; error boundaries on data fetches.
- [ ] **Step 3:** A11y sweep: focus rings, `aria-sort` on sortable `th`, labelled controls, color-contrast on RAG, keyboard nav for board/menus.
- [ ] **Step 4:** Full responsive pass (390 / 768 / 1440); screenshot-review every screen.
- [ ] **Step 5:** `npm run build` PASS. Final commit. `polish: motion, a11y, loading/empty states, responsive final pass`

**Phase 5 done when:** report is real + exportable + AI-hooked; motion/a11y/responsive complete; build passes; full screenshot review done.

---

## Appendix A — Draft Prisma schema

> Draft for Phase 1. Refine field-by-field during Task 1.1. Postgres provider. RAG is **never** a column. `createdAt/updatedAt` on every model. IDs are `cuid()`.

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ---------- Enums ----------
enum Role {
  CIO
  PMO
  VERTICAL_HEAD
  BUSINESS
}

enum InitiativeType {
  CHANGE_REQUEST
  PROJECT
}

enum Methodology {
  WATERFALL
  AGILE
}

enum Stage {
  BRD
  FSD
  COMMERCIAL
  DEVELOPMENT
  SIT
  UAT
  APPSEC
  CAB_APPROVAL
  GO_LIVE
  BUSINESS_VALIDATION
  CLOSED
}

enum ProcessGroup {
  INITIATING
  PLANNING
  EXECUTING
  MONITORING_CONTROLLING
  CLOSING
}

enum BenefitCategory {
  REVENUE
  COST_SAVING
  CUSTOMER_EXPERIENCE
  COMPLIANCE
  EFFICIENCY
  RISK_REDUCTION
}

enum DelaySource {
  IT
  BUSINESS
  VENDOR
  EXTERNAL
}

enum KnowledgeAreaName {
  INTEGRATION
  SCOPE
  SCHEDULE
  COST
  QUALITY
  RESOURCE
  COMMUNICATIONS
  RISK
  PROCUREMENT
  STAKEHOLDER
}

enum KAStatus {
  GREEN
  AMBER
  RED
}

enum OutcomeAchieved {
  YES
  PARTIALLY
  NO
}

enum StoryStatus {
  TODO
  IN_PROGRESS
  REVIEW
  DONE
}

// ---------- Auth / Users ----------
model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role
  // when role = VERTICAL_HEAD this is their own name key used to scope initiatives
  verticalHead String?
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  ownedInitiatives Initiative[] @relation("VerticalHeadInitiatives")
  historyEntries   HistoryLog[]
}

// ---------- Core ----------
model Initiative {
  id          String         @id @default(cuid())
  title       String
  type        InitiativeType
  methodology Methodology    @default(WATERFALL)

  verticalHeadName String
  verticalHead     User?   @relation("VerticalHeadInitiatives", fields: [verticalHeadId], references: [id])
  verticalHeadId   String?
  businessSpoc     String
  businessSponsor  String
  description      String

  // business value (intent)
  benefitCategory     BenefitCategory
  outcomeDescription  String
  targetMetric        String
  expectedGoLiveDate  DateTime

  // waterfall current-state (only meaningful when methodology = WATERFALL)
  currentStage        Stage         @default(BRD)
  currentProcessGroup ProcessGroup  @default(INITIATING)
  stageStartDate      DateTime
  stageExpectedDate   DateTime
  lastUpdated         DateTime
  notes               String        @default("")
  delayed             Boolean       @default(false)
  delaySource         DelaySource?

  committedMonth String? // "YYYY-MM" for monthly-commitment tracking

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  stages          WaterfallStage[]
  knowledgeAreas  KnowledgeArea[]
  risks           Risk[]
  stakeholders    Stakeholder[]
  valueRealization BusinessValueRealization?
  history         HistoryLog[]
  epics           Epic[]
  sprints         Sprint[]
  stories         Story[]

  @@index([verticalHeadName])
  @@index([currentStage])
  @@index([type])
}

model WaterfallStage {
  id           String      @id @default(cuid())
  initiative   Initiative  @relation(fields: [initiativeId], references: [id], onDelete: Cascade)
  initiativeId String
  stage        Stage
  processGroup ProcessGroup
  expectedDate DateTime
  startedDate  DateTime?
  completedDate DateTime?
  daysInStage  Int?        // snapshot only; live value computed at render
  delayFlag    Boolean     @default(false)
  delaySource  DelaySource?

  @@unique([initiativeId, stage])
  @@index([initiativeId])
}

// ---------- PMBOK ----------
model KnowledgeArea {
  id           String            @id @default(cuid())
  initiative   Initiative        @relation(fields: [initiativeId], references: [id], onDelete: Cascade)
  initiativeId String
  name         KnowledgeAreaName
  status       KAStatus          @default(GREEN)
  notes        String            @default("")
  updatedAt    DateTime          @updatedAt

  @@unique([initiativeId, name])
}

model Risk {
  id           String     @id @default(cuid())
  initiative   Initiative @relation(fields: [initiativeId], references: [id], onDelete: Cascade)
  initiativeId String
  description  String
  probability  Int        // 1..5
  impact       Int        // 1..5
  response     String
  owner        String
  createdAt    DateTime   @default(now())

  @@index([initiativeId])
}

model Stakeholder {
  id           String     @id @default(cuid())
  initiative   Initiative @relation(fields: [initiativeId], references: [id], onDelete: Cascade)
  initiativeId String
  name         String
  role         String
  influence    Int        // 1..5
  interest     Int        // 1..5

  @@index([initiativeId])
}

model BusinessValueRealization {
  id              String          @id @default(cuid())
  initiative      Initiative      @relation(fields: [initiativeId], references: [id], onDelete: Cascade)
  initiativeId    String          @unique
  outcomeAchieved OutcomeAchieved
  actualResult    String
  actualMetric    String
  realizedDate    DateTime?
  updatedAt       DateTime        @updatedAt
}

// ---------- Agile ----------
model Epic {
  id           String     @id @default(cuid())
  initiative   Initiative @relation(fields: [initiativeId], references: [id], onDelete: Cascade)
  initiativeId String
  title        String
  description  String     @default("")
  stories      Story[]

  @@index([initiativeId])
}

model Sprint {
  id           String     @id @default(cuid())
  initiative   Initiative @relation(fields: [initiativeId], references: [id], onDelete: Cascade)
  initiativeId String
  number       Int
  startDate    DateTime
  endDate      DateTime
  capacity     Int        // story points
  stories      Story[]

  @@unique([initiativeId, number])
  @@index([initiativeId])
}

model Story {
  id           String      @id @default(cuid())
  initiative   Initiative  @relation(fields: [initiativeId], references: [id], onDelete: Cascade)
  initiativeId String
  epic         Epic?       @relation(fields: [epicId], references: [id])
  epicId       String?
  sprint       Sprint?     @relation(fields: [sprintId], references: [id])
  sprintId     String?
  title        String
  points       Int         @default(0)
  status       StoryStatus @default(TODO)
  createdAt    DateTime    @default(now())

  @@index([initiativeId])
  @@index([sprintId])
}

// ---------- Cross-cutting ----------
model HistoryLog {
  id           String     @id @default(cuid())
  initiative   Initiative @relation(fields: [initiativeId], references: [id], onDelete: Cascade)
  initiativeId String
  stage        Stage?
  note         String
  user         User?      @relation(fields: [userId], references: [id])
  userId       String?
  userName     String     // denormalized for display stability
  createdAt    DateTime   @default(now())

  @@index([initiativeId])
}

model MonthlyReport {
  id          String   @id @default(cuid())
  month       Int      // 1..12
  year        Int
  payload     Json     // aggregated snapshot (completed/delayed/missed)
  narrative   String?  // AI-generated narrative (nullable until generated)
  generatedAt DateTime @default(now())

  @@unique([year, month])
}
```

**Schema notes for the implementer:**
- The Prisma `Stage` enum uses SCREAMING_SNAKE values; `lib/types.ts` keeps the human-readable `STAGES` array. Maintain a single bidirectional map (`lib/stage-map.ts`) so UI labels ("CAB Approval") ↔ enum (`CAB_APPROVAL`) never drift.
- `WaterfallStage.daysInStage` is a denormalized snapshot only; the live value is always recomputed (Appendix B).
- `Initiative.verticalHeadName` is the authoritative scoping field for VH dashboards (string match), with optional `verticalHeadId` FK for when VHs get real user accounts.
- Agile tables stay empty until Phase 4; they're declared now so no second migration is needed to introduce relations.

---

## Appendix B — Frozen rules (do not change)

**Stage order (exactly):**
`BRD → FSD → Commercial → Development → SIT → UAT → AppSec → CAB Approval → Go Live → Business Validation → Closed`

**RAG rule (computed at render, never stored)** — ported from `lib/rag.ts`:
- `Closed` → Green.
- Red if `stageExpectedDate` has passed (`daysFromNow < 0`) **OR** no update in ≥7 days (`daysSinceUpdate >= 7`).
- Else Amber if `stageExpectedDate` within 14 days (`daysFromNow <= 14`).
- Else Green.

**Derived values (compute, don't store):** `daysFromNow(iso)`, `daysInStage(stageStartDate)`, `daysSinceUpdate(lastUpdated)` — keep the exact implementations from `lib/rag.ts:11-21`.

**Create-form defaults (port from current `app/(app)/pmo/new/page.tsx`):** new initiative starts at `BRD`, `stageExpectedDate = today + 21 days`. **advanceStage defaults (port from `lib/store.ts:58-84`):** on complete, next stage, `stageStartDate = today`, `stageExpectedDate = today + 14 days`, clear `delayed`/`delaySource`, append `HistoryLog`.

---

## Appendix C — Design tokens (frozen decisions)

- **Font:** Inter via `next/font/google`, exposed as `--font-inter`; `fontFamily.sans` first entry. `.tabular` (`font-variant-numeric: tabular-nums`) on all numbers.
- **Primary:** `brand` indigo scale 50–950 (600 = `#4f46e5` interactive, 700 = `#4338ca` active). `navy` for dark surfaces (sidebar 900 `#0b1120`).
- **Neutrals:** slate (surfaces `slate-50` body, borders `slate-200`, text `slate-900/600`).
- **RAG (accents only):** Green `emerald-500`, Amber `amber-500`, Red `rose-500` — dots, thin bars, small badges. **Never** full pastel card backgrounds.
- **Cards:** white, 1px slate border, `shadow-card`, `rounded-xl`, tight padding.
- **shadcn integration:** map shadcn CSS variables (`--primary`, `--background`, `--border`, `--ring`) onto these tokens so there is **one** color system, not two.
- **Reference brands to study (in `_design-ref/design-md/`):** `linear.app`, `stripe`, `vercel`, `supabase` — for spacing rhythm, hairline borders, dense typography. Note Linear is dark-canvas; we use **light** enterprise surfaces with indigo accent (user-specified), so borrow structure/rhythm, not its near-black palette.

---

## Self-Review (run against PLAN.md + PROJECT_BRIEF.md)

**Spec coverage:**
- ✅ Landing page, app shell → Phase 0. ✅ Auth + RBAC + DB + seed → Phase 1. ✅ 4 dashboards + detail + create + validation + report → Phase 2 (+ report real data Phase 5). ✅ PMBOK process groups, KA matrix, risk/stakeholder, value realization → Phase 3. ✅ Agile (epics/sprints/stories/velocity/burndown/board) + methodology switch → Phase 4. ✅ Monthly report + PDF + AI narrative + motion/a11y/responsive → Phase 5.
- ✅ Dual methodology, PMBOK knowledge areas, business-value realization (the USP) — explicit tasks.
- ✅ Frozen RAG + stage order carried verbatim from existing code into Appendix B.

**Gaps — RESOLVED by user (2026-06-17):**
1. **Supabase `DATABASE_URL`/`DIRECT_URL`** — user will provide before Phase 1; do **not** block planning/Phase 0 on it.
2. **Google login** — **No** for now; email/password only. Structure Auth.js so a Google provider can be added later without rework (Task 1.3: keep providers array + adapter generic).
3. **Self-signup default role** — **`BUSINESS_SPOC`** (lowest privilege). PMO/admin can elevate. (Maps to `Role.BUSINESS` in Appendix A enum.)
4. **Agile RAG rule** (Phase 4, computed at render — waterfall RAG stays frozen):
   - **Green:** on or ahead of burndown AND no blockers.
   - **Amber:** behind burndown **OR** sprint ends in ≤3 days with open points **OR** any blocked story.
   - **Red:** sprint end date passed with open points **OR** no update in ≥7 days **OR** a critical blocker.
5. **Chart library** — **Recharts** (use for burndown + velocity in Phase 4).

**Type consistency:** Prisma `Stage` enum (SCREAMING_SNAKE) vs UI `STAGES` (human labels) reconciled via mandated `lib/stage-map.ts`. Server-action names in Phase 1 Task 1.4 (`listInitiatives/getInitiative/createInitiative/updateInitiative/advanceStage/saveValidation`) are reused verbatim by Phase 2 query/task references. `enrich()` is the single RAG/days computation point referenced by all dashboards.
