/**
 * Demo history seeder — makes the Claim Accuracy page (M6) demonstrable.
 *
 *   npx tsx scripts/seed-demo-history.ts            # add
 *   npx tsx scripts/seed-demo-history.ts --remove   # take it all back out
 *   npx tsx scripts/seed-demo-history.ts --status   # report what is there, change nothing
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 *
 * M6 compares a promise frozen at sign-off against what was later measured. A
 * fresh workspace has neither, so the page correctly reports that it can say
 * nothing — which is right, and useless for a demonstration. This adds a year
 * of *delivered* history so the analytics have something to analyse.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not make every dimension report. The mix below is chosen so the page
 * shows a reported pattern NEXT TO several withheld ones, because the withholding
 * is the distinctive part — any competitor can draw a bar chart; refusing to
 * draw one from four data points is the thing worth showing.
 *
 * SAFETY
 *
 * Refuses to run with APP_ENV=production. Every record it creates is tagged
 * (see DEMO_TAG) so --remove is exact and cannot touch anything else.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'fs';
import path from 'path';
import type { PrismaClient, BenefitCategory, InvestmentCategory } from '@prisma/client';
import { assertNotProduction } from '../lib/env';

/**
 * Load .env, then apply an explicit override if one was given.
 *
 * PRECEDENCE IS DELIBERATE AND IS THE OPPOSITE OF dotenv's DEFAULT.
 *
 * .env WINS over whatever happens to be in the ambient shell, because a stale
 * global DATABASE_URL is common (this was found the hard way: a developer shell
 * had DATABASE_URL=sqlite:///./dev.db exported globally, and "ambient wins"
 * would have pointed a seed at whatever that resolved to). An accidental
 * environment variable must never silently redirect a script that writes data.
 *
 * To target a DIFFERENT database — the hosted demo, say — set SEED_DATABASE_URL.
 * The distinct name makes the intent explicit and cannot be confused with
 * something a shell profile set months ago:
 *
 *   SEED_DATABASE_URL="postgresql://…" npx tsx scripts/seed-demo-history.ts
 */
function loadEnvFile(): void {
  // Resolved from the working directory, not __dirname: tsx reports __dirname
  // as the project root rather than scripts/, so "../.env" would climb one
  // level too far and silently find nothing.
  const file = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"]*)"?\s*$/);
      if (m) process.env[m[1]] = m[2];
    }
  }
  if (process.env.SEED_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.SEED_DATABASE_URL;
  }
}

/** Connection target with the password stripped — this gets printed. */
function describeTarget(): string {
  const url = process.env.DATABASE_URL ?? '';
  return url.replace(/(:\/\/[^:]*):[^@]*@/, '$1:****@') || '(not set)';
}

loadEnvFile();

/**
 * Constructed in main(), AFTER loadEnvFile().
 *
 * The generated Prisma client reads DATABASE_URL when its module is first
 * evaluated, and ES imports are hoisted above ordinary module code — so a
 * static `import { PrismaClient }` here would capture the environment before
 * .env had been read, and every query would fail with "the URL must start with
 * postgresql://". Hence the type-only import above and the dynamic one below.
 */
let prisma: PrismaClient;

const CR = 10_000_000;

/** Stamped on every seeded record's narrative so removal is exact. */
const DEMO_TAG = '[demo-history]';

interface Spec {
  title: string;
  sponsor: string;
  verticalHead: string;
  spoc: string;
  category: BenefitCategory;
  investment: InvestmentCategory;
  metric: string;
  /** ₹ Cr promised at sign-off. */
  promisedCr: number;
  buildCr: number;
  /** ₹ Cr actually realized, or null for "due but never measured". */
  realizedCr: number | null;
  /** Months before today the initiative went live. */
  wentLiveMonthsAgo: number;
  /** Omitting the evidence source demonstrates the `unsourced` state. */
  evidence?: string;
  /** Set to demonstrate a restatement: the promise as ORIGINALLY committed. */
  originalPromisedCr?: number;
  restatementReason?: string;
}

/**
 * The shape this produces, by design:
 *
 *   Sponsor        Geeta Krishnan  n=6  → REPORTED
 *                  Arvind Nair     n=3  → withheld
 *                  Deepak Mehta    n=1  → withheld
 *   Vertical Head  Rajesh Kumar    n=7  → REPORTED
 *                  Priya Sharma    n=3  → withheld
 *   Benefit Cat.   spread over 4         → all withheld
 *   Investment     Value-generating n=7 → REPORTED
 *                  Regulatory       n=3 → withheld
 *
 * Plus one restated promise, one unsourced reading, and one measured but not
 * yet due — so the readiness panel shows every state it can reach.
 */
const SPECS: Spec[] = [
  // ---- Geeta Krishnan: six assessable, deliberately varied ----
  { title: 'UPI Autopay Mandate Rollout', sponsor: 'Geeta Krishnan', verticalHead: 'Rajesh Kumar', spoc: 'Anil Kumar',
    category: 'REVENUE', investment: 'VALUE_GENERATING', metric: 'UPI autopay mandate volume',
    promisedCr: 18, buildCr: 5.5, realizedCr: 15.3, wentLiveMonthsAgo: 20,
    evidence: 'Switch MIS, quarterly mandate report Q3 FY26' },

  { title: 'Merchant QR Onboarding Revamp', sponsor: 'Geeta Krishnan', verticalHead: 'Rajesh Kumar', spoc: 'Meena Gupta',
    category: 'REVENUE', investment: 'VALUE_GENERATING', metric: 'active merchant QR count',
    promisedCr: 12, buildCr: 3.2, realizedCr: 13.8, wentLiveMonthsAgo: 18,
    evidence: 'Merchant acquiring dashboard, FY26 close' },

  { title: 'Savings Account Digital Journey', sponsor: 'Geeta Krishnan', verticalHead: 'Rajesh Kumar', spoc: 'Priti Sharma',
    category: 'CUSTOMER_EXPERIENCE', investment: 'VALUE_GENERATING', metric: 'account opening completion rate',
    promisedCr: 9, buildCr: 2.8, realizedCr: 5.4, wentLiveMonthsAgo: 22,
    evidence: 'Onboarding funnel report, Finance-validated Mar 2026' },

  { title: 'Branch Cash Forecasting Engine', sponsor: 'Geeta Krishnan', verticalHead: 'Rajesh Kumar', spoc: 'Rakesh Joshi',
    category: 'COST_SAVING', investment: 'VALUE_GENERATING', metric: 'idle cash holding cost',
    promisedCr: 7, buildCr: 2.1, realizedCr: 6.6, wentLiveMonthsAgo: 16,
    evidence: 'Treasury cost extract, H2 FY26' },

  // The restated one — promised ₹22 Cr, revised to ₹12 Cr, delivered ₹11 Cr.
  // Against the ORIGINAL that is 50%, which is the honest reading and the whole
  // point of measuring against the promise as first committed.
  { title: 'Cross-Sell Recommendation Engine', sponsor: 'Geeta Krishnan', verticalHead: 'Rajesh Kumar', spoc: 'Suman Bose',
    category: 'REVENUE', investment: 'VALUE_GENERATING', metric: 'cross-sell conversion uplift',
    promisedCr: 12, originalPromisedCr: 22, buildCr: 6.4, realizedCr: 11, wentLiveMonthsAgo: 19,
    evidence: 'Campaign attribution report, reviewed by Finance',
    restatementReason: 'Original claim assumed full rollout across all segments; scope reduced to retail only after the Q1 portfolio review. Re-baselined with Business Head sign-off.' },

  { title: 'Cheque Clearing Automation', sponsor: 'Geeta Krishnan', verticalHead: 'Rajesh Kumar', spoc: 'Anil Kumar',
    category: 'EFFICIENCY', investment: 'VALUE_GENERATING', metric: 'manual clearing effort hours',
    promisedCr: 5, buildCr: 1.6, realizedCr: 3.1, wentLiveMonthsAgo: 15,
    evidence: 'Operations capacity report, Q2 FY26' },

  // ---- Arvind Nair: three assessable → withheld ----
  { title: 'RBI Cyber Resilience Reporting', sponsor: 'Arvind Nair', verticalHead: 'Priya Sharma', spoc: 'Meena Gupta',
    category: 'COMPLIANCE', investment: 'REGULATORY_MANDATORY', metric: 'regulatory report turnaround',
    promisedCr: 4, buildCr: 3.4, realizedCr: 3.8, wentLiveMonthsAgo: 17,
    evidence: 'Compliance submission log FY26' },

  { title: 'CKYC Registry Sync', sponsor: 'Arvind Nair', verticalHead: 'Priya Sharma', spoc: 'Rakesh Joshi',
    category: 'COMPLIANCE', investment: 'REGULATORY_MANDATORY', metric: 'KYC record sync latency',
    promisedCr: 3, buildCr: 2.2, realizedCr: 2.4, wentLiveMonthsAgo: 21,
    evidence: 'CKYC reconciliation report, Feb 2026' },

  { title: 'Positive Pay Implementation', sponsor: 'Arvind Nair', verticalHead: 'Priya Sharma', spoc: 'Priti Sharma',
    category: 'RISK_REDUCTION', investment: 'REGULATORY_MANDATORY', metric: 'cheque fraud loss',
    promisedCr: 6, buildCr: 2.6, realizedCr: 7.2, wentLiveMonthsAgo: 14,
    evidence: 'Fraud loss ledger, FY26 annual' },

  // ---- Deepak Mehta: one assessable → withheld at n=1 ----
  { title: 'Vendor Payment Portal', sponsor: 'Deepak Mehta', verticalHead: 'Rajesh Kumar', spoc: 'Suman Bose',
    category: 'EFFICIENCY', investment: 'VALUE_GENERATING', metric: 'invoice processing cycle time',
    promisedCr: 4, buildCr: 1.4, realizedCr: 2.2, wentLiveMonthsAgo: 13,
    evidence: 'Accounts payable cycle report, Q3 FY26' },

  // ---- Non-assessable states, so the readiness panel is not all-or-nothing ----

  // Due, but nobody recorded a figure.
  { title: 'Locker Management Digitisation', sponsor: 'Ramesh Jain', verticalHead: 'Priya Sharma', spoc: 'Meena Gupta',
    category: 'EFFICIENCY', investment: 'VALUE_GENERATING', metric: 'locker allocation turnaround',
    promisedCr: 3, buildCr: 1.1, realizedCr: null, wentLiveMonthsAgo: 16 },

  // Measured, but with no evidence source — cannot support a conclusion.
  { title: 'NRI Remittance Tracking', sponsor: 'Sunil Agarwal', verticalHead: 'Rajesh Kumar', spoc: 'Rakesh Joshi',
    category: 'REVENUE', investment: 'VALUE_GENERATING', metric: 'remittance corridor volume',
    promisedCr: 8, buildCr: 2.4, realizedCr: 6.1, wentLiveMonthsAgo: 15 },

  // Live, but the horizon has not elapsed — not a failure, just early.
  { title: 'Video KYC Enhancement', sponsor: 'Ramesh Jain', verticalHead: 'Priya Sharma', spoc: 'Anil Kumar',
    category: 'CUSTOMER_EXPERIENCE', investment: 'VALUE_GENERATING', metric: 'video KYC completion rate',
    promisedCr: 6, buildCr: 2.0, realizedCr: null, wentLiveMonthsAgo: 2 },
];

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function remove() {
  const initiatives = await prisma.initiative.findMany({
    where: { notes: { contains: DEMO_TAG } },
    select: { id: true, benefitClaims: { select: { id: true } } },
  });
  if (initiatives.length === 0) {
    console.log('Nothing to remove.');
    return;
  }
  const claimIds = initiatives.flatMap(i => i.benefitClaims.map(c => c.id));
  await prisma.valueMeasurement.deleteMany({ where: { benefitClaimId: { in: claimIds } } });
  const { count } = await prisma.initiative.deleteMany({ where: { notes: { contains: DEMO_TAG } } });
  console.log(`Removed ${count} seeded initiatives and their claims, measurements and restatements.`);
}

async function seed() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!org) throw new Error('No organization found. Run the main seed first.');

  const lifecycle = await prisma.lifecycleStage.findMany({
    where: { organizationId: org.id },
    orderBy: { order: 'asc' },
  });
  if (lifecycle.length === 0) {
    throw new Error('This workspace has no lifecycle configured. Set one up in /admin/setup first.');
  }
  const terminal = lifecycle.find(s => s.isTerminal) ?? lifecycle[lifecycle.length - 1];
  const goLiveStage = lifecycle.find(s => s.isGoLiveGate) ?? terminal;

  const existing = await prisma.initiative.count({ where: { notes: { contains: DEMO_TAG } } });
  if (existing > 0) {
    console.log(`${existing} seeded initiatives already present — removing them first so this stays idempotent.`);
    await remove();
  }

  for (const s of SPECS) {
    const liveDate = monthsAgo(s.wentLiveMonthsAgo);
    // Sign-off happens before go-live: the promise is committed when funding is
    // approved, not when the thing ships.
    const signOffDate = monthsAgo(s.wentLiveMonthsAgo + 6);
    const promised = s.promisedCr * CR;
    const tco = s.buildCr * CR;

    // "Not yet due" items stay at the go-live stage; everything else is closed.
    const stage = s.wentLiveMonthsAgo < 12 && s.realizedCr === null ? goLiveStage : terminal;

    const initiative = await prisma.initiative.create({
      data: {
        organizationId: org.id,
        title: s.title,
        type: 'PROJECT',
        classification: 'MAJOR_PROJECT',
        methodology: 'WATERFALL',
        verticalHeadName: s.verticalHead,
        businessSpoc: s.spoc,
        businessSponsor: s.sponsor,
        businessUnit: 'Retail Banking',
        description: `Delivered initiative retained for portfolio history. ${s.metric}.`,
        benefitCategory: s.category,
        investmentCategory: s.investment,
        outcomeDescription: `Improve ${s.metric}`,
        targetMetric: s.metric,
        expectedGoLiveDate: liveDate,
        currentStage: stage.key,
        currentProcessGroup: stage.processGroup,
        stageStartDate: liveDate,
        stageExpectedDate: liveDate,
        lastUpdated: liveDate,
        // The tag lives here so --remove is exact.
        notes: DEMO_TAG,
        delayed: false,
        buildCostInr: tco,
        tcoHorizonYears: 3,
        valueSignedOff: true,
        valueSignOffBy: 'Mahesh Iyer',
        valueSignOffAt: signOffDate,
        signedOffValueInr: promised,
        signedOffTcoInr: tco,
        benefitClaims: {
          create: {
            category: s.category,
            metricName: s.metric,
            unit: 'INR',
            estimatedAnnualValueInr: promised,
            confidence: 'HIGH',
            realizationHorizonMonths: 12,
            baselineSource: 'Baseline extract at business case approval',
            targetSource: 'Business case approved by Business Head',
            narrative: DEMO_TAG,
          },
        },
        history: {
          create: {
            stage: stage.key,
            note: `Value signed off by Mahesh Iyer — projected ₹${s.promisedCr} Cr`,
            userName: 'Mahesh Iyer',
            createdAt: signOffDate,
          },
        },
      },
      select: { id: true, benefitClaims: { select: { id: true } } },
    });

    if (s.realizedCr !== null) {
      await prisma.valueMeasurement.create({
        data: {
          benefitClaimId: initiative.benefitClaims[0].id,
          horizonLabel: '+12m',
          realizedInr: s.realizedCr * CR,
          // Left undefined for the deliberately-unsourced example.
          evidenceSource: s.evidence,
          note: DEMO_TAG,
          recordedByName: 'Anita Desai',
          measuredAt: monthsAgo(Math.max(0, s.wentLiveMonthsAgo - 12)),
        },
      });
    }

    if (s.originalPromisedCr && s.restatementReason) {
      await prisma.valueRestatement.create({
        data: {
          initiativeId: initiative.id,
          previousValueInr: s.originalPromisedCr * CR,
          newValueInr: promised,
          previousTcoInr: tco,
          newTcoInr: tco,
          reason: s.restatementReason,
          restatedBy: 'Mahesh Iyer',
          restatedByRole: 'CIO',
          restatedAt: monthsAgo(s.wentLiveMonthsAgo + 2),
        },
      });
    }
  }

  console.log(`Seeded ${SPECS.length} historical initiatives.`);
  console.log('Expect on /learning: one reported sponsor (Geeta Krishnan, n=6), several withheld,');
  console.log('one restated promise measured against its original figure, one unsourced, one not yet due.');
}

/**
 * Report what is in the target database without changing anything.
 *
 * Exists because a seed that reports success while writing to the wrong
 * database is the worst possible outcome, and `--status` makes the question
 * answerable in one command against any connection string.
 */
async function status() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true, slug: true, createdAt: true } });
  const orgCount = await prisma.organization.count();
  const total = await prisma.initiative.count();
  const tagged = await prisma.initiative.count({ where: { notes: { contains: DEMO_TAG } } });
  const inOrg = org ? await prisma.initiative.count({ where: { organizationId: org.id } }) : 0;
  console.log(`organizations      : ${orgCount}`);
  console.log(`oldest org         : ${org ? org.name + " (" + org.slug + ", created " + org.createdAt.toISOString().slice(0,10) + ")" : "none"}`);
  console.log(`initiatives (total): ${total}`);
  console.log(`initiatives in org : ${inOrg}`);
  console.log(`seeded (tagged)    : ${tagged}`);
}
async function main() {
  // Never against a real deployment — this fabricates portfolio history.
  assertNotProduction('demo history seed');

  // Printed before anything is written, so it is obvious which database is
  // about to be modified.
  console.log(`[seed-demo-history] target: ${describeTarget()}`);

  const { PrismaClient } = await import('@prisma/client');
  prisma = new PrismaClient();

  if (process.argv.includes('--status')) await status();
  else if (process.argv.includes('--remove')) await remove();
  else await seed();
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma?.$disconnect());
