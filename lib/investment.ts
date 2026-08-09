import type { InvestmentCategory } from '@prisma/client';
import { computeRoi } from '@/lib/value';

// ---- Labels ----

export const INVESTMENT_CATEGORY_LABEL: Record<InvestmentCategory, string> = {
  VALUE_GENERATING: 'Value-generating',
  REGULATORY_MANDATORY: 'Regulatory / mandatory',
  FOUNDATIONAL: 'Foundational / enabling',
  STRATEGIC: 'Strategic / defensive',
};

/** What justifies funding each category — shown wherever the choice is made. */
export const INVESTMENT_CATEGORY_BASIS: Record<InvestmentCategory, string> = {
  VALUE_GENERATING: 'Justified by return. This is the only category the ROI threshold applies to.',
  REGULATORY_MANDATORY: 'Justified by an external mandate. Requires the regulator and deadline, not a return.',
  FOUNDATIONAL: 'Enables other initiatives. Name the initiatives it unblocks rather than a direct return.',
  STRATEGIC: 'Defensive or positioning. Requires a written rationale; the return is not directly measurable.',
};

export const INVESTMENT_CATEGORIES: InvestmentCategory[] = [
  'VALUE_GENERATING', 'REGULATORY_MANDATORY', 'FOUNDATIONAL', 'STRATEGIC',
];

export const INVESTMENT_CATEGORY_TONE: Record<InvestmentCategory, string> = {
  VALUE_GENERATING: 'bg-emerald-500',
  REGULATORY_MANDATORY: 'bg-rose-500',
  FOUNDATIONAL: 'bg-sky-500',
  STRATEGIC: 'bg-violet-500',
};

// ---- The gate ----
//
// SOFT BY DESIGN. Nothing here blocks anything. A below-threshold initiative is
// escalated for explicit justification and higher approval — it is never
// prevented. Hard ROI gates get gamed: if 1.5x unlocks funding, sponsors
// produce 1.51x by inflating benefits or understating cost, which manufactures
// exactly the dishonesty the rest of this product exists to eliminate.
//
// Only VALUE_GENERATING is assessed. Gating regulatory work would block the one
// category that is legally non-negotiable; gating foundational work starves the
// platform investments everything else depends on.

export type GateStatus =
  /** Not a value-generating initiative, or the organization has set no threshold. */
  | 'not_applicable'
  /** Value-generating, threshold set, but value or cost is missing — cannot judge. */
  | 'insufficient_data'
  /** Meets or beats the threshold. */
  | 'pass'
  /** Below threshold with no approved exception on record. */
  | 'exception_required'
  /** Below threshold, but explicitly approved with a justification. */
  | 'exception_approved';

export interface GateInputs {
  category: InvestmentCategory;
  /** Projected annual value in ₹. */
  valueInr: number;
  /** Total cost of ownership in ₹, or null when not captured. */
  tcoInr: number | null;
  /** Organization's minimum ROI, or null when none is configured. */
  threshold: number | null;
  /** Whether an approved exception exists for this initiative. */
  hasApprovedException?: boolean;
}

export interface GateResult {
  status: GateStatus;
  /** Computed ROI, or null when it could not be computed. */
  roi: number | null;
  threshold: number | null;
  /** One-line explanation suitable for direct display. */
  reason: string;
}

export function evaluateInvestmentGate(input: GateInputs): GateResult {
  const { category, valueInr, tcoInr, threshold, hasApprovedException } = input;
  const roi = computeRoi(valueInr, tcoInr);

  if (category !== 'VALUE_GENERATING') {
    return {
      status: 'not_applicable',
      roi,
      threshold,
      reason: `${INVESTMENT_CATEGORY_LABEL[category]} — funded on its own basis, not on ROI.`,
    };
  }

  if (threshold == null) {
    return {
      status: 'not_applicable',
      roi,
      threshold: null,
      reason: 'No ROI threshold is configured for this organization, so the gate is inactive.',
    };
  }

  // Assess the inputs directly rather than inferring from a null ROI.
  // computeRoi() is pure arithmetic and correctly returns 0 for "zero value,
  // known cost" — but here a zero total means no benefit claims have been
  // recorded, which is missing data, not an assessed return of nothing.
  // Reading it as 0x would flag every uncosted-value initiative as a failed
  // gate when nobody has actually judged it yet.
  if (tcoInr == null) {
    return {
      status: 'insufficient_data',
      roi: null,
      threshold,
      reason: 'Delivery cost is not captured, so ROI cannot be assessed against the threshold.',
    };
  }

  if (tcoInr <= 0) {
    return {
      status: 'insufficient_data',
      roi: null,
      threshold,
      reason: 'Recorded delivery cost is zero, which cannot support an ROI calculation — check the figure.',
    };
  }

  if (valueInr <= 0) {
    return {
      status: 'insufficient_data',
      roi: null,
      threshold,
      reason: 'No projected value is recorded, so ROI cannot be assessed against the threshold.',
    };
  }

  if (roi == null) {
    return {
      status: 'insufficient_data',
      roi: null,
      threshold,
      reason: 'ROI could not be computed from the recorded value and cost.',
    };
  }

  if (roi >= threshold) {
    return {
      status: 'pass',
      roi,
      threshold,
      reason: `${roi.toFixed(1)}x meets the ${threshold.toFixed(1)}x minimum return.`,
    };
  }

  return {
    status: hasApprovedException ? 'exception_approved' : 'exception_required',
    roi,
    threshold,
    reason: hasApprovedException
      ? `${roi.toFixed(1)}x is below the ${threshold.toFixed(1)}x minimum, approved as a documented exception.`
      : `${roi.toFixed(1)}x is below the ${threshold.toFixed(1)}x minimum — needs written justification and approval one tier up.`,
  };
}

export const GATE_STATUS_LABEL: Record<GateStatus, string> = {
  not_applicable: 'Not gated',
  insufficient_data: 'Cannot assess',
  pass: 'Meets threshold',
  exception_required: 'Exception required',
  exception_approved: 'Exception approved',
};

export const GATE_STATUS_TONE: Record<GateStatus, 'success' | 'warning' | 'danger' | 'slate' | 'violet'> = {
  not_applicable: 'slate',
  insufficient_data: 'warning',
  pass: 'success',
  exception_required: 'danger',
  exception_approved: 'violet',
};
