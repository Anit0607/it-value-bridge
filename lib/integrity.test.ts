import { describe, it, expect } from 'vitest';
import {
  isMaterial,
  costChangeMagnitude,
  normaliseMetric,
  findDoubleCountRisks,
  type ClaimForDoubleCount,
} from './integrity';

const CR = 10_000_000;

describe('isMaterial', () => {
  it('treats a null threshold as maker-checker being switched off', () => {
    expect(isMaterial(500 * CR, null)).toBe(false);
  });

  it('is not material when the amount is unknown', () => {
    expect(isMaterial(null, 10 * CR)).toBe(false);
  });

  it('is material at or above the threshold', () => {
    expect(isMaterial(10 * CR, 10 * CR)).toBe(true);
    expect(isMaterial(11 * CR, 10 * CR)).toBe(true);
  });

  it('is not material below the threshold', () => {
    expect(isMaterial(9.99 * CR, 10 * CR)).toBe(false);
  });

  it('judges a reduction by its size, not its sign', () => {
    expect(isMaterial(-20 * CR, 10 * CR)).toBe(true);
  });

  it('makes everything material when the threshold is zero', () => {
    // Distinct from null: 0 is a deliberate "review everything" setting.
    expect(isMaterial(1, 0)).toBe(true);
    expect(isMaterial(0, 0)).toBe(true);
  });
});

describe('costChangeMagnitude', () => {
  it('measures the size of the change, not the new total', () => {
    // ₹50 Cr → ₹51 Cr is a ₹1 Cr decision. Treating it as ₹51 Cr would route
    // every trivial correction on a large initiative through four-eyes.
    expect(costChangeMagnitude(50 * CR, 51 * CR)).toBe(1 * CR);
  });

  it('treats first-time capture as the full amount', () => {
    expect(costChangeMagnitude(null, 8 * CR)).toBe(8 * CR);
  });

  it('treats clearing a cost as the full amount', () => {
    expect(costChangeMagnitude(8 * CR, null)).toBe(8 * CR);
  });

  it('is zero when nothing changed', () => {
    expect(costChangeMagnitude(5 * CR, 5 * CR)).toBe(0);
    expect(costChangeMagnitude(null, null)).toBe(0);
  });
});

describe('normaliseMetric', () => {
  it('ignores case, punctuation and spacing', () => {
    expect(normaliseMetric('UPI Drop-Rate')).toBe(normaliseMetric('upi drop rate'));
    expect(normaliseMetric('  Call   Centre  Volume ')).toBe('call centre volume');
  });

  it('returns empty for a metric with no usable characters', () => {
    expect(normaliseMetric('---')).toBe('');
  });
});

describe('findDoubleCountRisks', () => {
  const claim = (
    initiativeId: string,
    initiativeTitle: string,
    metricName: string,
    valueCr: number,
    category: ClaimForDoubleCount['category'] = 'REVENUE',
  ): ClaimForDoubleCount => ({
    initiativeId, initiativeTitle, metricName, category,
    estimatedAnnualValueInr: valueCr * CR,
  });

  it('finds the same metric claimed by two initiatives', () => {
    const risks = findDoubleCountRisks([
      claim('a', 'UPI Enhancement', 'UPI transaction volume', 25),
      claim('b', 'Payments Revamp', 'UPI Transaction Volume', 15),
    ]);
    expect(risks).toHaveLength(1);
    expect(risks[0].initiatives.map(i => i.id).sort()).toEqual(['a', 'b']);
    expect(risks[0].combinedValueInr).toBe(40 * CR);
  });

  it('does not flag one initiative splitting a benefit across claims', () => {
    const risks = findDoubleCountRisks([
      claim('a', 'UPI Enhancement', 'UPI transaction volume', 10),
      claim('a', 'UPI Enhancement', 'UPI transaction volume', 15),
    ]);
    expect(risks).toHaveLength(0);
  });

  it('does not flag the same metric under different benefit categories', () => {
    const risks = findDoubleCountRisks([
      claim('a', 'A', 'processing time', 10, 'EFFICIENCY'),
      claim('b', 'B', 'processing time', 10, 'CUSTOMER_EXPERIENCE'),
    ]);
    expect(risks).toHaveLength(0);
  });

  it('does not flag genuinely different metrics', () => {
    const risks = findDoubleCountRisks([
      claim('a', 'A', 'UPI transaction volume', 10),
      claim('b', 'B', 'card spend volume', 10),
    ]);
    expect(risks).toHaveLength(0);
  });

  it('ignores claims with an unusable metric name rather than grouping them together', () => {
    // Two blank-named metrics are not evidence of the same benefit.
    const risks = findDoubleCountRisks([
      claim('a', 'A', '---', 10),
      claim('b', 'B', '   ', 10),
    ]);
    expect(risks).toHaveLength(0);
  });

  it('sums an initiative that claims the shared metric more than once', () => {
    const risks = findDoubleCountRisks([
      claim('a', 'A', 'UPI volume', 10),
      claim('a', 'A', 'UPI volume', 5),
      claim('b', 'B', 'UPI volume', 20),
    ]);
    expect(risks).toHaveLength(1);
    expect(risks[0].initiatives.find(i => i.id === 'a')!.valueInr).toBe(15 * CR);
    expect(risks[0].combinedValueInr).toBe(35 * CR);
  });

  it('ranks the largest combined exposure first', () => {
    const risks = findDoubleCountRisks([
      claim('a', 'A', 'small metric', 1),
      claim('b', 'B', 'small metric', 1),
      claim('c', 'C', 'big metric', 50),
      claim('d', 'D', 'big metric', 50),
    ]);
    expect(risks[0].metricLabel).toBe('big metric');
    expect(risks[0].combinedValueInr).toBe(100 * CR);
  });

  it('returns nothing for an empty portfolio', () => {
    expect(findDoubleCountRisks([])).toEqual([]);
  });
});
