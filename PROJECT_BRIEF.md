# IT Value Bridge — Project Brief

Build a web application called **"IT Value Bridge"** for banking IT departments to
track Change Requests and Projects and communicate business value to leadership.

**Tech stack:** Next.js, React, Tailwind CSS. Use realistic mock data
(no database needed yet — this is a prototype).

## User roles and demo accounts
- `cio@bank.com` → CIO Dashboard
- `pmo@bank.com` → PMO Dashboard
- `vh@bank.com` → Vertical Head Dashboard
- `business@bank.com` → Business SPOC view

## Screens to build

### 1. Login page
Clean professional login. Blue banking theme.
Four demo accounts listed above with a "Demo Login" button for each.

### 2. CIO Dashboard
- Summary cards: Total Active Items, On Track (Green), At Risk (Amber), Delayed (Red)
- Pipeline view: count of items in each stage
- Table: each Vertical Head's name, total items, Green/Amber/Red count, last updated date
- Current Month section: Committed this month vs Delivered vs Missed
- Button: "Generate Monthly Report"

### 3. PMO Dashboard
- Full list of all CRs and Projects
- Filter by Stage, RAG status, Vertical Head, Type
- Items flagged as needing attention (overdue or not updated in 7 days)

### 4. Vertical Head Dashboard
- Only items assigned to this vertical head
- Each item shows: Title, Type, Current Stage, RAG, ETA, Days in current stage

### 5. Create New Item form (PMO only)
Fields:
- Title
- Type: Change Request / Project
- IT Vertical Head (dropdown with 10 names)
- Business SPOC Name
- Business Sponsor Name
- Brief requirement description
- Expected Business Outcome Category: Revenue / Cost Saving / Customer Experience /
  Compliance / Efficiency / Risk Reduction
- Expected outcome description (what specifically will improve)
- Target metric (example: Reduce TAT by 30%)
- Expected Go Live Date

### 6. Item Detail page
Shows all fields and current stage.

**Stage progression in this exact order:**
BRD → FSD → Commercial → Development → SIT → UAT → AppSec → CAB Approval → Go Live →
Business Validation → Closed

For the current stage show:
- Expected completion date
- Days in this stage
- Notes field
- "Mark Stage Complete" button (moves to next stage)
- Delay flag: if delayed, source = IT / Business / Vendor / External

**Auto-calculated RAG** (calculate automatically, no manual setting):
- **Green:** stage expected date is more than 14 days away
- **Amber:** stage expected date is within 14 days
- **Red:** stage expected date has passed OR no update in 7+ days

Full history log at bottom: every stage change with date and user.

### 7. Business Validation screen
Appears when item reaches the Business Validation stage. Business SPOC fills:
- Outcome Achieved: Yes / Partially / No
- Actual result (free text)
- Actual metric achieved vs target

### 8. Monthly Report page
Shows:
- Month and year
- Items completed this month with business outcomes
- Items delayed with delay source breakdown
- Items missed (committed but not delivered)
- AI Narrative section (placeholder text for now, will connect Claude API later)
- "Export as PDF" button (placeholder)

## Design
- Professional blue and white banking theme
- Clean sidebar navigation
- Mobile responsive
- Show RAG as colored dots/badges (Red/Amber/Green)

## Demo data
Pre-populate with **20 realistic items**:
- Mix of Change Requests and Projects
- Spread across all stages
- 5 different Vertical Heads
- Various RAG statuses
- Some completed with business outcomes filled
- Some overdue showing Red status
- Realistic banking IT project names (Mobile Banking, UPI Enhancement, CBS Integration,
  KYC Automation, Payment Gateway, etc.)

---

## Build notes / recommended defaults (resolve these without asking)
- **Next.js App Router** (`app/` directory), TypeScript, Tailwind.
- **No real auth** — "Demo Login" just sets the active role in client state.
- Mock data in a typed `lib/mockData.ts`; **persist demo edits in `localStorage`** so
  actions like "Mark Stage Complete" survive a page refresh during demos.
- Compute RAG and "days in stage" from dates at render time (single source of truth).
- Keep it a clean prototype: no backend, no DB.
