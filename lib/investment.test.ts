import { describe, it, expect } from 'vitest';
import { evaluateInvestmentGate, INVESTMENT_CATEGORIES, INVESTMENT_CATEGORY_LABEL } from './investment';

const CR = 10_000_000;

/** A value-generating initiative that clears a 1.5x bar: 30 Cr value / 10 Cr cost = 3x. */
const passing = {
  category: 'VALUE_GENERATING' as const,
  valueInr: 30 * CR,
  tcoInr: 10 * CR,
  threshold: 1.5,
};

describe('evaluateInvestmentGate — which categories are gated', () => {
  it('does not gate regulatory, foundational or strategic work', () => {
    for (const category of ['REGULATORY_MANDATORY', 'FOUNDATIONAL', 'STRATEGIC'] as const) {
      const r = evaluateInvestmentGate({ ...passing, category, valueInr: 0, tcoInr: 50 * CR });
      expect(r.status, category).toBe('not_applicable');
      expect(r.reason).toContain(INVESTMENT_CATEGORY_LABEL[category]);
    }
  });

  it('gates value-generating work', () => {
    expect(evaluateInvestmentGate(passing).status).toBe('pass');
  });

  it('never blocks — no status means "rejected"', () => {
    const statuses = INVESTMENT_CATEGORIES.map(category =>
      evaluateInvestmentGate({ ...passing, category, valueInr: 1, tcoInr: 100 * CR }).status,
    );
    expect(statuses).not.toContain('blocked');
    expect(statuses.every(s =>
      ['not_applicable', 'insufficient_data', 'pass', 'exception_required', 'exception_approved'].includes(s),
    )).toBe(true);
  });
});

describe('evaluateInvestmentGate — threshold configuration', () => {
  it('is inactive when the organization has set no threshold', () => {
    const r = evaluateInvestmentGate({ ...passing, threshold: null, valueInr: 1, tcoInr: 100 * CR });
    expect(r.status).toBe('not_applicable');
    expect(r.reason).toContain('No ROI threshold is configured');
  });

  it('still reports the computed ROI even when not gated', () => {
    const r = evaluateInvestmentGate({ ...passing, threshold: null });
    expect(r.roi).toBe(3);
  });
});

describe('evaluateInvestmentGate — missing data', () => {
  it('cannot assess without a cost, and says so specifically', () => {
    const r = evaluateInvestmentGate({ ...passing, tcoInr: null });
    expect(r.status).toBe('insufficient_data');
    expect(r.reason).toContain('cost is not captured');
    expect(r.roi).toBeNull();
  });

  it('cannot assess without projected value, and says so specifically', () => {
    const r = evaluateInvestmentGate({ ...passing, valueInr: 0 });
    expect(r.status).toBe('insufficient_data');
    expect(r.reason).toContain('No projected value');
  });

  it('never treats missing data as a pass', () => {
    expect(evaluateInvestmentGate({ ...passing, tcoInr: null }).status).not.toBe('pass');
    expect(evaluateInvestmentGate({ ...passing, valueInr: 0 }).status).not.toBe('pass');
  });
});

describe('evaluateInvestmentGate — the threshold boundary', () => {
  it('passes exactly at the threshold', () => {
    const r = evaluateInvestmentGate({ ...passing, valueInr: 15 * CR, tcoInr: 10 * CR, threshold: 1.5 });
    expect(r.roi).toBe(1.5);
    expect(r.status).toBe('pass');
  });

  it('requires an exception just below the threshold', () => {
    const r = evaluateInvestmentGate({ ...passing, valueInr: 14 * CR, tcoInr: 10 * CR, threshold: 1.5 });
    expect(r.status).toBe('exception_required');
  });
});

describe('evaluateInvestmentGate — exceptions', () => {
  const below = { ...passing, valueInr: 8 * CR, tcoInr: 10 * CR };

  it('requires an exception when below threshold with none on record', () => {
    const r = evaluateInvestmentGate(below);
    expect(r.status).toBe('exception_required');
    expect(r.reason).toContain('approval one tier up');
  });

  it('reports an approved exception rather than a failure', () => {
    const r = evaluateInvestmentGate({ ...below, hasApprovedException: true });
    expect(r.status).toBe('exception_approved');
    expect(r.reason).toContain('documented exception');
  });

  it('ignores an exception when the initiative already passes', () => {
    const r = evaluateInvestmentGate({ ...passing, hasApprovedException: true });
    expect(r.status).toBe('pass');
  });

  it('ignores an exception on a non-gated category', () => {
    const r = evaluateInvestmentGate({ ...below, category: 'FOUNDATIONAL', hasApprovedException: true });
    expect(r.status).toBe('not_applicable');
  });
});
