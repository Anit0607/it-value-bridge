import type { BenefitCategory, BenefitUnit, Confidence } from '@prisma/client';

// ---- ₹ formatting (Indian crore / lakh) ----

const CRORE = 10_000_000;
const LAKH = 100_000;

/** Format rupees as a compact Indian figure: ₹50 Cr, ₹2.5 L, ₹40,000. */
export function formatInr(rupees: number): string {
  if (!rupees) return '₹0';
  const abs = Math.abs(rupees);
  const sign = rupees < 0 ? '-' : '';
  if (abs >= CRORE) {
    const v = abs / CRORE;
    return `${sign}₹${trim(v)} Cr`;
  }
  if (abs >= LAKH) {
    const v = abs / LAKH;
    return `${sign}₹${trim(v)} L`;
  }
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

function trim(n: number): string {
  // up to 2 decimals, no trailing zeros
  return parseFloat(n.toFixed(2)).toString();
}

// ---- Labels ----

export const BENEFIT_CATEGORY_LABEL: Record<BenefitCategory, string> = {
  REVENUE: 'Revenue',
  COST_SAVING: 'Cost Saving',
  CUSTOMER_EXPERIENCE: 'Customer Experience',
  COMPLIANCE: 'Compliance',
  EFFICIENCY: 'Efficiency',
  RISK_REDUCTION: 'Risk Reduction',
};

export const BENEFIT_CATEGORIES: BenefitCategory[] = [
  'REVENUE', 'COST_SAVING', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'EFFICIENCY', 'RISK_REDUCTION',
];

export const BENEFIT_UNIT_LABEL: Record<BenefitUnit, string> = {
  INR: '₹',
  PERCENT: '%',
  DAYS: 'days',
  HOURS: 'hours',
  COUNT: 'count',
  RATIO: 'ratio',
};

export const BENEFIT_UNITS: BenefitUnit[] = ['INR', 'PERCENT', 'DAYS', 'HOURS', 'COUNT', 'RATIO'];

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

// Accent tone per benefit category (Tailwind classes; used for chips/bars).
export const CATEGORY_TONE: Record<BenefitCategory, string> = {
  REVENUE: 'bg-emerald-500',
  COST_SAVING: 'bg-sky-500',
  CUSTOMER_EXPERIENCE: 'bg-violet-500',
  COMPLIANCE: 'bg-amber-500',
  EFFICIENCY: 'bg-brand-500',
  RISK_REDUCTION: 'bg-rose-500',
};

// ---- Total cost of ownership, ROI, payback ----
//
// The governing rule for everything below: a missing cost is **not captured**,
// never zero. Every function returns `null` rather than a number it cannot
// justify, and callers must render that as "not captured" rather than "0".
// This exists because cost was previously synthesised as `value * 0.3`, which
// put a fabricated denominator under a board-facing ROI figure.

/** Default TCO window when a breakdown is given without an explicit horizon. */
export const DEFAULT_TCO_HORIZON_YEARS = 3;

export interface CostInputs {
  /** Simple mode: one total-cost-over-horizon figure. */
  estimatedCostInr?: number | null;
  /** Detailed mode: one-off delivery cost. */
  buildCostInr?: number | null;
  /** Detailed mode: recurring cost per year (infra, licences, support). */
  annualRunCostInr?: number | null;
  /** Detailed mode: years of run cost to include. Defaults to DEFAULT_TCO_HORIZON_YEARS. */
  tcoHorizonYears?: number | null;
  /** Real spend, once known. Overrides every estimate. */
  actualCostInr?: number | null;
}

/**
 * Total cost of ownership, resolved across the three capture modes in priority
 * order: actual spend > detailed breakdown > single estimate.
 *
 * Returns null when nothing has been captured — callers must not coerce that
 * to 0, or ROI silently becomes infinite/undefined against a zero denominator.
 */
export function computeTco(c: CostInputs): number | null {
  if (c.actualCostInr != null) return c.actualCostInr;

  const hasBreakdown = c.buildCostInr != null || c.annualRunCostInr != null;
  if (hasBreakdown) {
    const build = c.buildCostInr ?? 0;
    const run = c.annualRunCostInr ?? 0;
    const years = c.tcoHorizonYears ?? DEFAULT_TCO_HORIZON_YEARS;
    return build + run * years;
  }

  return c.estimatedCostInr ?? null;
}

/**
 * Return per rupee invested. Null when cost is unknown or zero — a zero
 * denominator is a data problem, not an infinite return.
 */
export function computeRoi(valueInr: number, tcoInr: number | null): number | null {
  if (tcoInr == null || tcoInr <= 0) return null;
  return valueInr / tcoInr;
}

/**
 * Months until cumulative annual value covers TCO. Null when cost is unknown
 * or the initiative generates no annual value (it never pays back, which is a
 * different statement from "pays back in 0 months").
 */
export function computePaybackMonths(annualValueInr: number, tcoInr: number | null): number | null {
  if (tcoInr == null || tcoInr <= 0) return null;
  if (annualValueInr <= 0) return null;
  return (tcoInr / annualValueInr) * 12;
}

/** "1 yr 6 mo" / "8 mo" / "—". Rounds to whole months. */
export function formatPayback(months: number | null): string {
  if (months == null) return '—';
  const total = Math.max(1, Math.round(months));
  if (total < 12) return `${total} mo`;
  const years = Math.floor(total / 12);
  const rem = total % 12;
  return rem === 0 ? `${years} yr` : `${years} yr ${rem} mo`;
}

// ---- Indian financial year (Apr–Mar) ----

export function fyBounds(ref: Date = new Date()): { start: Date; end: Date; label: string } {
  const y = ref.getMonth() >= 3 ? ref.getFullYear() : ref.getFullYear() - 1; // FY starts April (month index 3)
  const start = new Date(y, 3, 1);
  const end = new Date(y + 1, 2, 31, 23, 59, 59);
  const label = `FY${String(y % 100).padStart(2, '0')}-${String((y + 1) % 100).padStart(2, '0')}`;
  return { start, end, label };
}

// ---- Benefit-realization lifecycle ----

export type RealizationStatus = 'realized' | 'pending' | 'overdue' | 'na';

export const REALIZATION_LABEL: Record<RealizationStatus, string> = {
  realized: 'Realized',
  pending: 'Pending',
  overdue: 'Overdue',
  na: 'Not yet live',
};

/** Add whole months to an ISO date, returning an ISO date string. */
export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Realization status, computed at render. A benefit is "due" `horizonMonths`
 * after go-live; once that window passes without a confirmed reading it is
 * Overdue, otherwise Pending. Confirmed → Realized. Not live yet → na.
 */
export function realizationStatus(opts: {
  isLiveOrClosed: boolean;
  confirmed: boolean;
  dueIso: string | null;
  todayIso?: string;
}): RealizationStatus {
  if (!opts.isLiveOrClosed) return 'na';
  if (opts.confirmed) return 'realized';
  const today = opts.todayIso ?? new Date().toISOString().slice(0, 10);
  if (opts.dueIso && opts.dueIso < today) return 'overdue';
  return 'pending';
}
