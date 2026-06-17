# IT Value Bridge — Master Plan

> Scope decision (2026-06-18): this is now a **real application**, not a throwaway
> prototype. Real auth + database, full dual-methodology (Waterfall + Agile),
> PMBOK knowledge areas, business-value realization, a professional marketing
> landing page, and a clean enterprise-SaaS redesign. Build it in **phases** —
> each phase is independently demoable and committed to git.

USP that must survive every phase: **translating IT delivery into business value
for leadership.**

---

## 1. Target architecture

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | already in place |
| UI system | Tailwind + **shadcn/ui** + **lucide-react** + **Framer Motion** | clean enterprise SaaS look + subtle animation |
| Design source | **ui-ux-pro-max** skill + cloned **VoltAgent/awesome-design-md** | design tokens, palettes, patterns |
| Auth | **Auth.js (NextAuth v5)** — email/password (+ Google optional) | real sign in / sign up |
| DB | **Self-hosted PostgreSQL (Docker)** + **Prisma ORM** | real persistence, on the bank's own infra — no cloud (compliance) |
| Packaging | **Docker + docker-compose** (app + postgres) | one-command, runs on their infra; air-gapped |
| Data access | Server Actions / Route Handlers (remove localStorage mock) | real backend |
| Auth model | RBAC: CIO / PMO / Vertical Head / Business SPOC | matches existing roles |

Visual direction: **Clean light enterprise SaaS** (Linear / Stripe / Vercel feel)
— white surfaces, indigo accent, dense crisp typography, RAG used as accents
(dots/bars/badges), subtle motion. Fully responsive.

---

## 2. Domain model (PMBOK + Agile + Business Value)

Core entities (Prisma schema to be refined in Phase 1):

- **User** — name, email, passwordHash, role, (verticalHead link), avatar.
- **Initiative** (the "item": Change Request or Project)
  - type: CHANGE_REQUEST | PROJECT
  - **methodology: WATERFALL | AGILE** (drives which tracking UI shows)
  - verticalHead, businessSpoc, businessSponsor, description
  - **businessValue**: benefitCategory (Revenue/CostSaving/CX/Compliance/Efficiency/RiskReduction),
    outcomeDescription, targetMetric, expectedGoLiveDate
  - currentProcessGroup, ragStatus (computed), timestamps
- **WaterfallStage** (when methodology=WATERFALL) — the existing pipeline,
  each stage mapped to a PMBOK process group:
  BRD → FSD → Commercial → Development → SIT → UAT → AppSec → CAB Approval →
  Go Live → Business Validation → Closed. Track currentStage, expectedDate,
  daysInStage, delayFlag + delaySource (IT/Business/Vendor/External).
- **Agile artifacts** (when methodology=AGILE) — Epic, Sprint (number, dates,
  capacity), Story/Backlog item (points, status, sprint), velocity + burndown.
- **PMBOK process groups**: Initiating, Planning, Executing,
  Monitoring & Controlling, Closing. Suggested mapping of waterfall stages:
  Initiating(intake/charter) → Planning(BRD, FSD, Commercial) →
  Executing(Development, SIT, UAT, AppSec, CAB, Go Live) →
  Monitoring & Controlling(Business Validation) → Closing(Closed).
- **PMBOK knowledge areas** per initiative (status/RAG + notes each):
  Integration, Scope, Schedule, Cost, Quality, Resource, Communications, Risk,
  Procurement, Stakeholder.
- **RiskRegister** (risk, probability, impact, response, owner) → Risk KA.
- **StakeholderRegister** (stakeholder, role, influence/interest).
- **BusinessValueRealization** (the Business Validation screen): outcomeAchieved
  (Yes/Partial/No), actualResult, actualMetric vs target.
- **HistoryLog** — every change with date + user.
- **MonthlyReport** — generated snapshot (completed/delayed/missed + AI narrative).

RAG rule (unchanged, computed at render, never stored): Red if stage expected date
passed OR no update in 7+ days; else Amber if expected date within 14 days; else Green.

---

## 3. Phased roadmap (each phase = demoable + a git commit)

- **Phase 0 — Design system + Landing page** (no DB) ⟶ fastest visible win
  - Install shadcn/ui, lucide-react, framer-motion. Define tokens (Inter font,
    indigo/slate palette, spacing scale, RAG accents).
  - Build a **professional marketing landing page**: hero (USP = business value),
    feature sections (PMBOK + Agile, RAG health, exec reporting), social-proof
    placeholder, footer, CTA → Sign in / Sign up.
  - Build the **app shell**: sidebar with icons + active state, top bar, user menu.
- **Phase 1 — Auth + Database**
  - Add Prisma + self-hosted Postgres (Docker container). Auth.js: sign up, sign in, sign out,
    sessions, protected routes, RBAC. Seed DB with demo users + 20 initiatives.
  - Replace the localStorage store with DB-backed server actions.
- **Phase 2 — Core tracker redesign (DB-backed)**
  - Rebuild all 4 dashboards + item detail + create form in the new design system,
    reading/writing the DB. Fix the header/button overlap, KPI cards (icon + number
    + sub-stat + RAG accent), pipeline funnel viz, dense data tables with RAG dots.
- **Phase 3 — PMBOK layer**
  - Process-group tracking, knowledge-area matrix (scope/schedule/cost/quality/
    risk/stakeholder/…), risk register, stakeholder register, business-value
    realization screen. PMBOK views on dashboards.
- **Phase 4 — Agile layer**
  - Methodology switch per initiative; epics, sprints, backlog, story points,
    velocity, burndown chart, kanban board. Dashboards adapt per methodology.
- **Phase 5 — Reports, animation & polish**
  - Monthly report (real data) + Export PDF + AI narrative hook (Claude API later),
    Framer Motion micro-interactions, full responsive, accessibility, empty/loading
    states, final visual pass.

---

## 4. How to execute this in Claude Code

1. **Make it a git repo first** (safety net for phases): `git init`, commit current state.
2. **Clone the design reference** so Claude can read it:
   `git clone https://github.com/VoltAgent/awesome-design-md _design-ref`
   (add `_design-ref/` to .gitignore).
3. **Generate the detailed build plan on Opus** (better at architecture), then
   switch back to Sonnet to execute:
   - `/model opus` → "Use the superpowers:writing-plans skill. Read docs/PLAN.md,
     PROJECT_BRIEF.md, and _design-ref. Produce docs/PHASE-PLAN.md with a detailed,
     checkbox task list for Phase 0 through Phase 5, plus the Prisma schema draft."
4. **Execute ONE phase per prompt**, using **ui-ux-pro-max** for every UI phase.
   After each phase: run the dev server, screenshot-review, then `git commit`.
5. Keep `npm run dev` runnable at all times; never break the build between phases.

Model guidance: **Opus** for the master plan + Phase 1 schema + Phase 3/4 domain
logic; **Sonnet** for the rest (UI assembly, wiring).

---

## 5. What you need to provide
- **Nothing external.** DB is a local Postgres Docker container (no Supabase/cloud).
  Requires **Docker Desktop** installed on the dev machine and on the bank's host.
  Data stays entirely on their infrastructure (Indian banking compliance).
- **Google login?** decide yes/no for Auth.js (email/password works either way).
- **Branding**: product name confirmed "IT Value Bridge"; logo/colors optional.
