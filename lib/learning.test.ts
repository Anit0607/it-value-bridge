import { describe, it, expect } from 'vitest';
import {
  assessClaim, aggregateBy, summariseExceptions, assessReadiness,
  describeAccuracy, accuracyTone,
  MIN_SAMPLE_FOR_PATTERN, GRACE_PERIOD_MONTHS,
  type LearningInitiative,
} from './learning';

const CR = 10_000_000;

function initiative(over: Partial<LearningInitiative> = {}): LearningInitiative {
  return {
    id: 'i1',
    title: 'UPI Enhancement',
    sponsor: 'Asha Nair',
    verticalHead: 'Rajesh Kumar',
    benefitCategory: 'REVENUE',
    investmentCategory: 'VALUE_GENERATING',
    promisedValueInr: 10 * CR,
    valueSignedOff: true,
    promisedTcoInr: 4 * CR,
    realizedInr: 8 * CR,
    allRealizedSourced: true,
    monthsPastDue: 3,
    originalPromiseInr: null,
    restatementCount: 0,
    isTerminal: true,
    ...over,
  };
}

describe('assessClaim — refusing to score what cannot be scored', () => {
  it('never treats a missing promise as a promise of zero', () => {
    // Scoring ₹8 Cr realized against a null promise as "infinite overdelivery"
    // would make every un-snapshotted initiative look like a triumph.
    const a = assessClaim(initiative({ promisedValueInr: null }));
    expect(a.accuracyRatio).toBeNull();
    expect(a.varianceInr).toBeNull();
  });

  it('distinguishes a recoverable gap from a permanent one', () => {
    // Caught in live verification: the page originally told users that 23
    // initiatives "can never be assessed", when most had simply not been
    // signed off yet. Telling someone a fixable gap is permanent is its own
    // false claim, on a page whose entire purpose is not making those.
    const notSigned = assessClaim(initiative({ promisedValueInr: null, valueSignedOff: false }));
    expect(notSigned.status).toBe('not_signed_off');
    expect(notSigned.reason).toContain('not been signed off');

    const signedButUnfrozen = assessClaim(initiative({ promisedValueInr: null, valueSignedOff: true }));
    expect(signedButUnfrozen.status).toBe('promise_not_frozen');
    expect(signedButUnfrozen.reason).toContain('cannot be recovered');
  });

  it('checks the missing promise before anything else', () => {
    // Even with every other problem present, the promise gap wins — nothing
    // downstream can be evaluated without it.
    const a = assessClaim(initiative({
      promisedValueInr: null, valueSignedOff: true,
      realizedInr: null, allRealizedSourced: false, monthsPastDue: -5,
    }));
    expect(a.status).toBe('promise_not_frozen');
  });

  it('does not penalise an initiative that has not had time to deliver', () => {
    const a = assessClaim(initiative({ monthsPastDue: -2 }));
    expect(a.status).toBe('not_yet_due');
    expect(a.accuracyRatio).toBeNull();
  });

  it('treats a never-scheduled horizon as not yet due, not as failure', () => {
    expect(assessClaim(initiative({ monthsPastDue: null })).status).toBe('not_yet_due');
  });

  it('holds off until the grace period has elapsed', () => {
    expect(assessClaim(initiative({ monthsPastDue: GRACE_PERIOD_MONTHS - 0.1 })).status).toBe('not_yet_due');
    expect(assessClaim(initiative({ monthsPastDue: GRACE_PERIOD_MONTHS })).status).toBe('assessable');
  });

  it('separates "nobody measured it" from "it delivered nothing"', () => {
    const a = assessClaim(initiative({ realizedInr: null }));
    expect(a.status).toBe('awaiting_measurement');
    expect(a.accuracyRatio).toBeNull();

    const delivered = assessClaim(initiative({ realizedInr: 0 }));
    expect(delivered.status).toBe('assessable');
    expect(delivered.accuracyRatio).toBe(0);
  });

  it('refuses to conclude from an unsourced realized figure', () => {
    const a = assessClaim(initiative({ allRealizedSourced: false }));
    expect(a.status).toBe('unsourced');
    expect(a.accuracyRatio).toBeNull();
  });

  it('scores a complete, sourced, due initiative', () => {
    const a = assessClaim(initiative());
    expect(a.status).toBe('assessable');
    expect(a.accuracyRatio).toBeCloseTo(0.8);
    expect(a.varianceInr).toBe(-2 * CR);
  });

  it('reports overdelivery above 1.0 rather than capping it', () => {
    const a = assessClaim(initiative({ realizedInr: 13 * CR }));
    expect(a.accuracyRatio).toBeCloseTo(1.3);
    expect(a.varianceInr).toBe(3 * CR);
  });

  it('cannot divide into a promise of zero', () => {
    const a = assessClaim(initiative({ promisedValueInr: 0, realizedInr: 5 * CR }));
    expect(a.accuracyRatio).toBeNull();
  });
});

describe('a restated promise cannot flatter its own accuracy', () => {
  it('scores against the ORIGINAL promise, not the revised one', () => {
    // Promised ₹40 Cr, quietly revised to ₹10 Cr, delivered ₹10 Cr. Reporting
    // 100% would turn the restatement feature into a way of manufacturing a
    // perfect record.
    const a = assessClaim(initiative({
      promisedValueInr: 10 * CR,
      originalPromiseInr: 40 * CR,
      restatementCount: 1,
      realizedInr: 10 * CR,
    }));
    expect(a.accuracyRatio).toBeCloseTo(0.25);
    expect(a.varianceInr).toBe(-30 * CR);
  });

  it('flags that the promise moved, so the UI can disclose it', () => {
    const a = assessClaim(initiative({ originalPromiseInr: 40 * CR, restatementCount: 2 }));
    expect(a.promiseWasRestated).toBe(true);
    expect(a.originalPromiseInr).toBe(40 * CR);
  });

  it('leaves an unrestated promise unflagged', () => {
    expect(assessClaim(initiative()).promiseWasRestated).toBe(false);
  });

  it('handles a restatement revised UPWARD without penalising unfairly', () => {
    // Promised ₹5 Cr, revised up to ₹20 Cr, delivered ₹10 Cr. Against the
    // original that is overdelivery, and that is the honest reading — the team
    // committed to ₹5 Cr.
    const a = assessClaim(initiative({
      promisedValueInr: 20 * CR, originalPromiseInr: 5 * CR, restatementCount: 1, realizedInr: 10 * CR,
    }));
    expect(a.accuracyRatio).toBeCloseTo(2);
  });
});

describe('aggregateBy — withholding patterns below the sample floor', () => {
  const makeSet = (n: number, over: Partial<LearningInitiative> = {}) =>
    Array.from({ length: n }, (_, k) => initiative({ id: `i${k}`, ...over }));

  it('withholds a verdict on a named person from a thin sample', () => {
    const items = makeSet(2, { sponsor: 'Asha Nair' });
    const groups = aggregateBy(items.map(assessClaim), items, 'sponsor');
    expect(groups[0].reportable).toBe(false);
    expect(groups[0].medianAccuracy).toBeNull();
    expect(groups[0].withheldReason).toContain(`2 of ${MIN_SAMPLE_FOR_PATTERN}`);
  });

  it('still returns the thin group so the reader sees the data is thin', () => {
    // Dropping it would hide the weakness instead of disclosing it.
    const items = makeSet(1);
    expect(aggregateBy(items.map(assessClaim), items, 'sponsor')).toHaveLength(1);
  });

  it('reports once the floor is reached', () => {
    const items = makeSet(MIN_SAMPLE_FOR_PATTERN, { sponsor: 'Asha Nair' });
    const groups = aggregateBy(items.map(assessClaim), items, 'sponsor');
    expect(groups[0].reportable).toBe(true);
    expect(groups[0].sampleSize).toBe(MIN_SAMPLE_FOR_PATTERN);
    expect(groups[0].medianAccuracy).toBeCloseTo(0.8);
  });

  it('always exposes the sample size, reportable or not', () => {
    const items = [...makeSet(6, { sponsor: 'A' }), ...makeSet(2, { sponsor: 'B' })]
      .map((it, k) => ({ ...it, id: `x${k}` }));
    const groups = aggregateBy(items.map(assessClaim), items, 'sponsor');
    for (const g of groups) expect(g.sampleSize).toBeGreaterThan(0);
  });

  it('uses the median so one huge win cannot mask consistent shortfalls', () => {
    const items = [
      ...Array.from({ length: 4 }, (_, k) => initiative({ id: `low${k}`, promisedValueInr: 10 * CR, realizedInr: 2 * CR })),
      initiative({ id: 'big', promisedValueInr: 10 * CR, realizedInr: 100 * CR }),
    ];
    const g = aggregateBy(items.map(assessClaim), items, 'sponsor')[0];
    // Mean would be ~2.16 — "this sponsor overdelivers". Median is 0.2.
    expect(g.medianAccuracy).toBeCloseTo(0.2);
  });

  it('excludes non-assessable initiatives from the sample entirely', () => {
    const items = [
      ...Array.from({ length: 4 }, (_, k) => initiative({ id: `ok${k}` })),
      initiative({ id: 'nopromise', promisedValueInr: null, valueSignedOff: true }),
      initiative({ id: 'unsourced', allRealizedSourced: false }),
    ];
    const g = aggregateBy(items.map(assessClaim), items, 'sponsor')[0];
    expect(g.sampleSize).toBe(4);
    expect(g.reportable).toBe(false);
  });

  it('groups by each supported dimension', () => {
    const items = [
      initiative({ id: 'a', sponsor: 'A', verticalHead: 'V1', benefitCategory: 'REVENUE', investmentCategory: 'VALUE_GENERATING' }),
      initiative({ id: 'b', sponsor: 'B', verticalHead: 'V2', benefitCategory: 'COST_SAVING', investmentCategory: 'FOUNDATIONAL' }),
    ];
    const a = items.map(assessClaim);
    expect(aggregateBy(a, items, 'sponsor')).toHaveLength(2);
    expect(aggregateBy(a, items, 'verticalHead')).toHaveLength(2);
    expect(aggregateBy(a, items, 'benefitCategory')).toHaveLength(2);
    expect(aggregateBy(a, items, 'investmentCategory')).toHaveLength(2);
  });

  it('sums against the original promise when one was restated', () => {
    const items = [initiative({ promisedValueInr: 10 * CR, originalPromiseInr: 40 * CR, restatementCount: 1 })];
    const g = aggregateBy(items.map(assessClaim), items, 'sponsor')[0];
    expect(g.totalPromisedInr).toBe(40 * CR);
  });

  it('returns nothing for an empty portfolio', () => {
    expect(aggregateBy([], [], 'sponsor')).toEqual([]);
  });
});

describe('summariseExceptions — grading the override, not the rule', () => {
  const exc = (id: string) => ({
    initiativeId: id, title: `Initiative ${id}`,
    roiAtApproval: 0.8, thresholdAtApproval: 2, approvedBy: 'Mahesh Iyer', approvedAt: '2026-01-01',
  });

  it('withholds a verdict until enough exceptions have completed', () => {
    const items = [initiative({ id: 'e1' })];
    const s = summariseExceptions([exc('e1')], items.map(assessClaim));
    expect(s.reportable).toBe(false);
    expect(s.medianAccuracy).toBeNull();
    expect(s.withheldReason).toContain(`1 of ${MIN_SAMPLE_FOR_PATTERN}`);
  });

  it('reports once enough have completed and been measured', () => {
    const items = Array.from({ length: MIN_SAMPLE_FOR_PATTERN }, (_, k) => initiative({ id: `e${k}` }));
    const s = summariseExceptions(items.map(i => exc(i.id)), items.map(assessClaim));
    expect(s.reportable).toBe(true);
    expect(s.medianAccuracy).toBeCloseTo(0.8);
    expect(s.assessedCount).toBe(MIN_SAMPLE_FOR_PATTERN);
  });

  it('surfaces an exception whose initiative can never be assessed', () => {
    const items = [initiative({ id: 'e1', promisedValueInr: null, valueSignedOff: true })];
    const s = summariseExceptions([exc('e1')], items.map(assessClaim));
    expect(s.outcomes[0].status).toBe('promise_not_frozen');
    expect(s.outcomes[0].accuracyRatio).toBeNull();
    expect(s.assessedCount).toBe(0);
  });

  it('does not invent a status for an exception with no matching assessment', () => {
    const s = summariseExceptions([exc('missing')], []);
    expect(s.outcomes[0].status).toBe('not_signed_off');
    expect(s.assessedCount).toBe(0);
  });

  it('keeps the approval terms on the record', () => {
    const s = summariseExceptions([exc('e1')], []);
    expect(s.outcomes[0].roiAtApproval).toBe(0.8);
    expect(s.outcomes[0].thresholdAtApproval).toBe(2);
    expect(s.outcomes[0].approvedBy).toBe('Mahesh Iyer');
  });
});

describe('assessReadiness — saying what is missing rather than showing a blank page', () => {
  it('reports nothing reportable on an empty portfolio', () => {
    const r = assessReadiness([]);
    expect(r.anyPatternReportable).toBe(false);
    expect(r.total).toBe(0);
  });

  it('counts each blocking status separately', () => {
    const items = [
      initiative({ id: 'a' }),
      initiative({ id: 'b', promisedValueInr: null, valueSignedOff: true }),
      initiative({ id: 'b2', promisedValueInr: null, valueSignedOff: false }),
      initiative({ id: 'c', monthsPastDue: -3 }),
      initiative({ id: 'd', realizedInr: null }),
      initiative({ id: 'e', allRealizedSourced: false }),
    ];
    const r = assessReadiness(items.map(assessClaim));
    expect(r.assessable).toBe(1);
    expect(r.promiseNotFrozen).toBe(1);
    expect(r.notSignedOff).toBe(1);
    expect(r.notYetDue).toBe(1);
    expect(r.awaitingMeasurement).toBe(1);
    expect(r.unsourced).toBe(1);
  });

  it('says how many more are needed', () => {
    const r = assessReadiness([assessClaim(initiative())]);
    expect(r.blockers.join(' ')).toContain(`1 of ${MIN_SAMPLE_FOR_PATTERN}`);
  });

  it('says a promise-not-frozen gap can never be recovered', () => {
    const r = assessReadiness([assessClaim(initiative({ promisedValueInr: null, valueSignedOff: true }))]);
    expect(r.blockers.join(' ')).toContain('never be assessed');
  });

  it('does NOT call an unsigned initiative permanently unassessable', () => {
    const r = assessReadiness([assessClaim(initiative({ promisedValueInr: null, valueSignedOff: false }))]);
    const text = r.blockers.join(' ');
    expect(text).not.toContain('never be assessed');
    expect(text).toContain('assessable later');
  });

  it('flags awaiting measurement as the fastest to unlock', () => {
    const r = assessReadiness([assessClaim(initiative({ realizedInr: null }))]);
    expect(r.blockers.join(' ')).toContain('fastest to unlock');
  });

  it('unlocks once the floor is met', () => {
    const items = Array.from({ length: MIN_SAMPLE_FOR_PATTERN }, (_, k) => initiative({ id: `i${k}` }));
    const r = assessReadiness(items.map(assessClaim));
    expect(r.anyPatternReportable).toBe(true);
    expect(r.blockers).toHaveLength(0);
  });
});

describe('presentation', () => {
  it('describes rather than judges', () => {
    expect(describeAccuracy(0.6)).toBe('delivered 60% of the promise');
    expect(describeAccuracy(null)).toBe('not assessable');
  });

  it('tones a missing figure neutrally rather than as a failure', () => {
    expect(accuracyTone(null)).toBe('slate');
    expect(accuracyTone(0.95)).toBe('emerald');
    expect(accuracyTone(0.7)).toBe('amber');
    expect(accuracyTone(0.2)).toBe('rose');
  });
});
