import { describe, it, expect } from 'vitest';
import {
  computeTco,
  computeRoi,
  computePaybackMonths,
  formatPayback,
  DEFAULT_TCO_HORIZON_YEARS,
} from './value';

const CR = 10_000_000;

describe('computeTco', () => {
  it('returns null when nothing is captured — never 0', () => {
    expect(computeTco({})).toBeNull();
    expect(computeTco({ estimatedCostInr: null, buildCostInr: null, annualRunCostInr: null })).toBeNull();
  });

  it('uses the simple estimate when no breakdown is given', () => {
    expect(computeTco({ estimatedCostInr: 5 * CR })).toBe(5 * CR);
  });

  it('sums build + run over the default horizon when no horizon is given', () => {
    expect(computeTco({ buildCostInr: 10 * CR, annualRunCostInr: 2 * CR }))
      .toBe(10 * CR + 2 * CR * DEFAULT_TCO_HORIZON_YEARS);
  });

  it('honours an explicit horizon', () => {
    expect(computeTco({ buildCostInr: 10 * CR, annualRunCostInr: 2 * CR, tcoHorizonYears: 5 }))
      .toBe(20 * CR);
  });

  it('treats a partial breakdown as captured, filling the missing side with 0', () => {
    expect(computeTco({ buildCostInr: 8 * CR })).toBe(8 * CR);
    expect(computeTco({ annualRunCostInr: 1 * CR, tcoHorizonYears: 4 })).toBe(4 * CR);
  });

  it('prefers the breakdown over the simple estimate', () => {
    expect(computeTco({ estimatedCostInr: 99 * CR, buildCostInr: 3 * CR, tcoHorizonYears: 2 }))
      .toBe(3 * CR);
  });

  it('lets actual spend override every estimate', () => {
    expect(computeTco({
      actualCostInr: 7 * CR,
      estimatedCostInr: 99 * CR,
      buildCostInr: 50 * CR,
      annualRunCostInr: 10 * CR,
    })).toBe(7 * CR);
  });

  it('treats a genuine zero as captured, not missing', () => {
    expect(computeTco({ estimatedCostInr: 0 })).toBe(0);
    expect(computeTco({ actualCostInr: 0 })).toBe(0);
  });
});

describe('computeRoi', () => {
  it('returns null when cost is unknown', () => {
    expect(computeRoi(100 * CR, null)).toBeNull();
  });

  it('returns null for a zero or negative denominator rather than Infinity', () => {
    expect(computeRoi(100 * CR, 0)).toBeNull();
    expect(computeRoi(100 * CR, -5)).toBeNull();
    expect(Number.isFinite(computeRoi(100 * CR, 0) ?? 0)).toBe(true);
  });

  it('computes value per rupee invested', () => {
    expect(computeRoi(100 * CR, 25 * CR)).toBe(4);
    expect(computeRoi(50 * CR, 100 * CR)).toBe(0.5);
  });

  it('reports zero value as 0x, distinct from "unknown"', () => {
    expect(computeRoi(0, 10 * CR)).toBe(0);
  });
});

describe('computePaybackMonths', () => {
  it('returns null when cost is unknown', () => {
    expect(computePaybackMonths(12 * CR, null)).toBeNull();
  });

  it('returns null when there is no annual value — it never pays back', () => {
    expect(computePaybackMonths(0, 10 * CR)).toBeNull();
    expect(computePaybackMonths(-1, 10 * CR)).toBeNull();
  });

  it('computes months to recover cost', () => {
    expect(computePaybackMonths(12 * CR, 12 * CR)).toBe(12);
    expect(computePaybackMonths(24 * CR, 12 * CR)).toBe(6);
    expect(computePaybackMonths(12 * CR, 24 * CR)).toBe(24);
  });
});

describe('formatPayback', () => {
  it('renders an em dash for unknown', () => {
    expect(formatPayback(null)).toBe('—');
  });

  it('renders months under a year', () => {
    expect(formatPayback(8)).toBe('8 mo');
  });

  it('never rounds a real payback down to zero months', () => {
    expect(formatPayback(0.2)).toBe('1 mo');
  });

  it('renders whole years without a stray month', () => {
    expect(formatPayback(24)).toBe('2 yr');
  });

  it('renders years and months together', () => {
    expect(formatPayback(18)).toBe('1 yr 6 mo');
  });
});
