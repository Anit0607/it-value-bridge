import type { BenefitCategory, InvestmentCategory } from '@prisma/client';

/**
 * The learning loop (docs/ROADMAP.md M6).
 *
 * Compares what an initiative PROMISED against what it actually DELIVERED. No
 * project tracker can do this, because a tracker never captured the promise —
 * it captured tasks. This platform froze `signedOffValueInr` at sign-off from
 * M1 onward precisely so this comparison would be possible later.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * The governing rule of this file: IT MUST REFUSE TO DRAW CONCLUSIONS IT CANNOT
 * SUPPORT.
 *
 * "Sponsor Sharma's claims run 40% optimistic" is a judgement about a named
 * person's credibility. Computed from two initiatives it is not an insight, it
 * is a defamation with a progress bar. The same discipline this product applies
 * to portfolio figures — never claim correct, only claim traceable — has to
 * apply to the analytics about those figures, or M6 becomes the very thing the
 * rest of the product exists to prevent.
 *
 * So: every aggregate carries its sample size, patterns below a floor are
 * withheld with a stated reason, and a promise that was restated can never
 * flatter its own accuracy.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ---- Evidence thresholds ---------------------------------------------------

/**
 * Minimum completed initiatives before a per-dimension pattern is reported.
 *
 * A PRODUCT judgement, not a statistical guarantee — five observations still
 * prove very little. It is set where it is because below five the noise
 * dominates so completely that showing a number does active harm, and because
 * the honest alternative (a confidence interval on n=3) is not something a
 * board audience will read correctly either.
 *
 * The mitigation that actually matters is not this constant: it is that every
 * reported figure is shown WITH its sample size, so a reader can discount it.
 */
export const MIN_SAMPLE_FOR_PATTERN = 5;

/**
 * How far past the realization horizon an initiative must be before its absence
 * of realized value counts against it.
 *
 * Without this, an initiative that went live last week scores 0% accuracy and
 * drags its sponsor's average down for something that has not had time to
 * happen. Measuring too early is indistinguishable from failing.
 */
export const GRACE_PERIOD_MONTHS = 1;

// ---- Inputs ----------------------------------------------------------------

export interface LearningInitiative {
  id: string;
  title: string;
  sponsor: string;
  verticalHead: string;
  benefitCategory: BenefitCategory;
  investmentCategory: InvestmentCategory;

  /**
   * The frozen promise — `signedOffValueInr`. Null has TWO very different
   * meanings, separated by `valueSignedOff`: either the value was never signed
   * off (recoverable — signing off captures it), or it was signed off before
   * promise capture existed (permanent).
   */
  promisedValueInr: number | null;
  /** Whether the value has been signed off at all. */
  valueSignedOff: boolean;
  promisedTcoInr: number | null;

  /** Sum of realized readings. Null means nothing has been recorded yet. */
  realizedInr: number | null;
  /** True only if EVERY realized reading carries an evidence source. */
  allRealizedSourced: boolean;

  /** Months since the realization horizon elapsed. Negative = not yet due. */
  monthsPastDue: number | null;

  /**
   * The promise as first committed, when a restatement later moved it. Null
   * when the promise was never restated.
   */
  originalPromiseInr: number | null;
  restatementCount: number;

  isTerminal: boolean;
}

// ---- Per-initiative assessment ---------------------------------------------

export type AssessmentStatus =
  /**
   * Never signed off, so no promise exists yet. RECOVERABLE: signing the value
   * off freezes it and the initiative becomes assessable in future. Kept
   * strictly separate from `promise_not_frozen`, because telling someone a
   * fixable gap is permanent is its own kind of false claim.
   */
  | 'not_signed_off'
  /**
   * Signed off, but before promise capture existed. PERMANENTLY unassessable —
   * and not a score of zero.
   */
  | 'promise_not_frozen'
  /** Promised, but the realization horizon has not elapsed yet. */
  | 'not_yet_due'
  /** Due, but nobody has recorded a realized figure. */
  | 'awaiting_measurement'
  /** Realized figures exist but at least one has no evidence source. */
  | 'unsourced'
  /** Both halves present and sourced. This is the only status that counts. */
  | 'assessable';

export interface ClaimAssessment {
  id: string;
  title: string;
  status: AssessmentStatus;
  /** Human-readable reason, for statuses that are not `assessable`. */
  reason?: string;

  promisedValueInr: number | null;
  realizedInr: number | null;

  /**
   * realized ÷ promised. 1.0 = delivered exactly what was promised, 0.6 = 60%
   * of it, 1.3 = overdelivered. Null unless `assessable`.
   */
  accuracyRatio: number | null;
  varianceInr: number | null;

  /**
   * True when the promise was restated, meaning `promisedValueInr` is NOT what
   * was originally committed. The ratio is computed against the ORIGINAL, and
   * this flag exists so the UI can say so.
   */
  promiseWasRestated: boolean;
  originalPromiseInr: number | null;
}

/**
 * Assess one initiative.
 *
 * The order of the checks is the substance. The missing-promise case is tested
 * first because an initiative with no frozen promise must never fall through to
 * being scored — silently treating a missing promise as ₹0 promised would make
 * every un-snapshotted initiative look like a spectacular overdelivery.
 */
export function assessClaim(i: LearningInitiative): ClaimAssessment {
  const base = {
    id: i.id,
    title: i.title,
    promisedValueInr: i.promisedValueInr,
    realizedInr: i.realizedInr,
    accuracyRatio: null,
    varianceInr: null,
    promiseWasRestated: i.restatementCount > 0,
    originalPromiseInr: i.originalPromiseInr,
  };

  if (i.promisedValueInr == null) {
    return i.valueSignedOff
      ? {
          ...base,
          status: 'promise_not_frozen',
          reason:
            'Signed off before the promised value was captured, so there is nothing to compare against. ' +
            'This cannot be recovered retrospectively.',
        }
      : {
          ...base,
          status: 'not_signed_off',
          reason: 'The value has not been signed off, so no promise has been committed to yet.',
        };
  }

  if (i.monthsPastDue == null || i.monthsPastDue < GRACE_PERIOD_MONTHS) {
    return {
      ...base,
      status: 'not_yet_due',
      reason: 'The realization horizon has not elapsed. Measuring now would score it for something that has not had time to happen.',
    };
  }

  if (i.realizedInr == null) {
    return {
      ...base,
      status: 'awaiting_measurement',
      reason: 'Due for measurement, but no realized figure has been recorded.',
    };
  }

  if (!i.allRealizedSourced) {
    return {
      ...base,
      status: 'unsourced',
      reason: 'At least one realized figure has no evidence source, so it cannot support a conclusion.',
    };
  }

  // The promise to measure against is the ORIGINAL one where a restatement
  // moved it. Scoring against a promise that was quietly revised downward to
  // meet the outcome would turn the restatement feature into a way of
  // manufacturing a perfect record.
  const denominator = i.originalPromiseInr ?? i.promisedValueInr;

  return {
    ...base,
    status: 'assessable',
    // A promise of zero cannot be divided into. Treated as unassessable rather
    // than infinite accuracy.
    accuracyRatio: denominator > 0 ? i.realizedInr / denominator : null,
    varianceInr: i.realizedInr - denominator,
  };
}

// ---- Aggregation -----------------------------------------------------------

export type LearningDimension = 'sponsor' | 'verticalHead' | 'benefitCategory' | 'investmentCategory';

export interface DimensionGroup {
  key: string;
  /** How many assessable initiatives sit behind this row. Always displayed. */
  sampleSize: number;
  /** Withheld when sampleSize < MIN_SAMPLE_FOR_PATTERN. */
  reportable: boolean;
  withheldReason?: string;
  /** Null when not reportable. */
  medianAccuracy: number | null;
  totalPromisedInr: number;
  totalRealizedInr: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Group assessable initiatives by a dimension.
 *
 * Uses the MEDIAN, not the mean: one ₹200 Cr programme that overdelivered would
 * drag a sponsor's mean above 1.0 while every other claim they made fell short.
 * The median describes the typical claim, which is the question being asked.
 *
 * Groups below the sample floor are still RETURNED — with `reportable: false`
 * and their sample size — rather than dropped. Silently omitting them would
 * hide that the data is thin, which is the opposite of the point.
 */
export function aggregateBy(
  assessments: ClaimAssessment[],
  initiatives: LearningInitiative[],
  dimension: LearningDimension,
  minSample: number = MIN_SAMPLE_FOR_PATTERN,
): DimensionGroup[] {
  const byId = new Map(initiatives.map(i => [i.id, i]));
  const groups = new Map<string, { ratios: number[]; promised: number; realized: number }>();

  for (const a of assessments) {
    if (a.status !== 'assessable' || a.accuracyRatio == null) continue;
    const source = byId.get(a.id);
    if (!source) continue;

    const key = String(source[dimension] ?? '—').trim() || '—';
    const g = groups.get(key) ?? { ratios: [], promised: 0, realized: 0 };
    g.ratios.push(a.accuracyRatio);
    g.promised += a.originalPromiseInr ?? a.promisedValueInr ?? 0;
    g.realized += a.realizedInr ?? 0;
    groups.set(key, g);
  }

  return [...groups.entries()]
    .map(([key, g]) => {
      const reportable = g.ratios.length >= minSample;
      return {
        key,
        sampleSize: g.ratios.length,
        reportable,
        withheldReason: reportable
          ? undefined
          : `${g.ratios.length} of ${minSample} completed initiatives needed before a pattern is shown.`,
        medianAccuracy: reportable ? median(g.ratios) : null,
        totalPromisedInr: g.promised,
        totalRealizedInr: g.realized,
      };
    })
    .sort((a, b) => b.sampleSize - a.sampleSize || a.key.localeCompare(b.key));
}

// ---- Exception outcomes ----------------------------------------------------

export interface ExceptionOutcomeInput {
  initiativeId: string;
  title: string;
  roiAtApproval: number;
  thresholdAtApproval: number;
  approvedBy: string;
  approvedAt: string;
}

export interface ExceptionOutcome extends ExceptionOutcomeInput {
  status: AssessmentStatus;
  accuracyRatio: number | null;
}

export interface ExceptionSummary {
  outcomes: ExceptionOutcome[];
  assessedCount: number;
  /** Withheld below the sample floor, for the same reason as everything else. */
  reportable: boolean;
  withheldReason?: string;
  /** Median accuracy of exception-approved work, when reportable. */
  medianAccuracy: number | null;
}

/**
 * How work that was funded BELOW the ROI threshold actually performed.
 *
 * This is the sharpest question the platform can eventually answer, because it
 * grades the override rather than the rule: if exception-approved initiatives
 * routinely deliver, the threshold is set too high; if they routinely miss, the
 * exception process is a rubber stamp. Neither conclusion is available until
 * there is enough history, which is why it is gated like everything else.
 */
export function summariseExceptions(
  exceptions: ExceptionOutcomeInput[],
  assessments: ClaimAssessment[],
  minSample: number = MIN_SAMPLE_FOR_PATTERN,
): ExceptionSummary {
  const byId = new Map(assessments.map(a => [a.id, a]));

  const outcomes: ExceptionOutcome[] = exceptions.map(e => {
    const a = byId.get(e.initiativeId);
    return {
      ...e,
      status: a?.status ?? 'not_signed_off',
      accuracyRatio: a?.status === 'assessable' ? a.accuracyRatio : null,
    };
  });

  const ratios = outcomes.map(o => o.accuracyRatio).filter((r): r is number => r != null);
  const reportable = ratios.length >= minSample;

  return {
    outcomes,
    assessedCount: ratios.length,
    reportable,
    withheldReason: reportable
      ? undefined
      : `${ratios.length} of ${minSample} exception-approved initiatives have completed and been measured.`,
    medianAccuracy: reportable ? median(ratios) : null,
  };
}

// ---- Readiness -------------------------------------------------------------

export interface LearningReadiness {
  total: number;
  assessable: number;
  notYetDue: number;
  awaitingMeasurement: number;
  unsourced: number;
  /** No promise committed yet. Recoverable by signing the value off. */
  notSignedOff: number;
  /** Permanently unassessable — signed off before the promise was ever frozen. */
  promiseNotFrozen: number;
  /** True when at least one dimension can report a pattern. */
  anyPatternReportable: boolean;
  /** Plain statements of what is blocking, ordered by what to fix first. */
  blockers: string[];
}

/**
 * What the learning loop can and cannot yet say, in plain language.
 *
 * This exists because an empty analytics page is indistinguishable from a
 * broken one. Telling a user "you need four more completed initiatives" is a
 * roadmap; showing them a blank chart is a bug report waiting to be filed.
 */
export function assessReadiness(
  assessments: ClaimAssessment[],
  minSample: number = MIN_SAMPLE_FOR_PATTERN,
): LearningReadiness {
  const count = (s: AssessmentStatus) => assessments.filter(a => a.status === s).length;
  const assessable = count('assessable');
  const notSignedOff = count('not_signed_off');
  const promiseNotFrozen = count('promise_not_frozen');
  const awaitingMeasurement = count('awaiting_measurement');
  const unsourced = count('unsourced');
  const notYetDue = count('not_yet_due');

  const blockers: string[] = [];

  if (assessable < minSample) {
    blockers.push(
      `${assessable} of ${minSample} initiatives have a frozen promise, an elapsed horizon and a sourced realized figure. ` +
      'Until then, accuracy patterns are withheld rather than estimated from too little.',
    );
  }
  if (awaitingMeasurement > 0) {
    blockers.push(
      `${awaitingMeasurement} ${awaitingMeasurement === 1 ? 'initiative is' : 'initiatives are'} past the realization horizon with no realized figure recorded. ` +
      'These are the fastest to unlock — the promise is already captured.',
    );
  }
  if (unsourced > 0) {
    blockers.push(
      `${unsourced} ${unsourced === 1 ? 'initiative has' : 'initiatives have'} a realized figure with no evidence source. ` +
      'An unsourced number cannot support a conclusion about anyone.',
    );
  }
  if (notSignedOff > 0) {
    blockers.push(
      `${notSignedOff} ${notSignedOff === 1 ? 'initiative has' : 'initiatives have'} no signed-off value yet, ` +
      'so no promise has been committed to. Signing the value off captures it and makes them assessable later.',
    );
  }
  if (promiseNotFrozen > 0) {
    blockers.push(
      `${promiseNotFrozen} ${promiseNotFrozen === 1 ? 'initiative was' : 'initiatives were'} signed off before the promised value was captured, ` +
      'so they can never be assessed. This cannot be recovered retrospectively — every sign-off from now on captures it automatically.',
    );
  }

  return {
    total: assessments.length,
    assessable,
    notYetDue,
    awaitingMeasurement,
    unsourced,
    notSignedOff,
    promiseNotFrozen,
    anyPatternReportable: assessable >= minSample,
    blockers,
  };
}

// ---- Presentation helpers --------------------------------------------------

/** "delivered 60% of the promise" — phrasing, not a verdict on a person. */
export function describeAccuracy(ratio: number | null): string {
  if (ratio == null) return 'not assessable';
  const pct = Math.round(ratio * 100);
  if (ratio >= 1.1) return `delivered ${pct}% of the promise`;
  if (ratio >= 0.9) return `delivered ${pct}% — close to the promise`;
  return `delivered ${pct}% of the promise`;
}

export function accuracyTone(ratio: number | null): 'emerald' | 'amber' | 'rose' | 'slate' {
  if (ratio == null) return 'slate';
  if (ratio >= 0.9) return 'emerald';
  if (ratio >= 0.6) return 'amber';
  return 'rose';
}

export const ASSESSMENT_LABEL: Record<AssessmentStatus, string> = {
  not_signed_off: 'Not signed off',
  promise_not_frozen: 'Promise not captured',
  not_yet_due: 'Not yet due',
  awaiting_measurement: 'Awaiting measurement',
  unsourced: 'Unsourced',
  assessable: 'Assessed',
};
