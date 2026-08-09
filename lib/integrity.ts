import type { BenefitCategory } from '@prisma/client';

// ---- Materiality ----
//
// The tiering that makes maker-checker survivable. Four-eyes applied to every
// ₹20 lakh BAU change gets routed around within a month, and a routed-around
// control is worse than no control because it manufactures false assurance.
// Apply it where the number is material; let small items move on one sign-off.

/**
 * Whether a ₹ amount triggers second-approver review.
 *
 * A null threshold means the organization has not configured maker-checker, so
 * nothing is material and every change applies immediately. That is a
 * deliberate "off" state, not a default of zero — a threshold of 0 would make
 * literally everything material.
 */
export function isMaterial(amountInr: number | null, thresholdInr: number | null): boolean {
  if (thresholdInr == null) return false;
  if (amountInr == null) return false;
  return Math.abs(amountInr) >= thresholdInr;
}

/**
 * The ₹ figure that decides whether a cost change needs review: the size of the
 * change itself, not the new total. Moving a cost from ₹50 Cr to ₹51 Cr is a
 * ₹1 Cr decision, and treating it as a ₹51 Cr one would send every trivial
 * correction on a large initiative through four-eyes.
 */
export function costChangeMagnitude(previousInr: number | null, nextInr: number | null): number {
  return Math.abs((nextInr ?? 0) - (previousInr ?? 0));
}

// ---- Double-count detection ----
//
// Nothing stops two initiatives claiming the same benefit pool, and at
// portfolio level that silently inflates the total. This is the first thing a
// sharp CFO tests.
//
// Deliberately a HEURISTIC, and surfaced as "review these" rather than
// "these are wrong": it matches on benefit category plus a normalised metric
// name. Two initiatives genuinely improving the same metric in different
// business units are a legitimate pattern, so a human decides.

/** Lowercase, collapse whitespace/punctuation — "UPI Drop-Rate" ≈ "upi drop rate". */
export function normaliseMetric(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface ClaimForDoubleCount {
  initiativeId: string;
  initiativeTitle: string;
  category: BenefitCategory;
  metricName: string;
  estimatedAnnualValueInr: number;
}

export interface DoubleCountRisk {
  category: BenefitCategory;
  /** The normalised metric the claims share. */
  metric: string;
  /** Display form, taken from the first claim seen. */
  metricLabel: string;
  initiatives: { id: string; title: string; valueInr: number }[];
  /** Combined ₹ currently counted across these initiatives. */
  combinedValueInr: number;
}

/**
 * Groups claims by (category, normalised metric) and returns any group spanning
 * more than one initiative — i.e. the same benefit potentially counted twice in
 * the portfolio total.
 *
 * Claims within a single initiative are never a double-count: an initiative
 * legitimately splits one benefit across several claim rows.
 */
export function findDoubleCountRisks(claims: ClaimForDoubleCount[]): DoubleCountRisk[] {
  const groups = new Map<string, { category: BenefitCategory; metric: string; metricLabel: string; byInitiative: Map<string, { id: string; title: string; valueInr: number }> }>();

  for (const c of claims) {
    const metric = normaliseMetric(c.metricName);
    if (!metric) continue; // an unnamed metric tells us nothing
    const key = `${c.category}::${metric}`;
    const group = groups.get(key) ?? {
      category: c.category,
      metric,
      metricLabel: c.metricName,
      byInitiative: new Map<string, { id: string; title: string; valueInr: number }>(),
    };
    const existing = group.byInitiative.get(c.initiativeId);
    if (existing) {
      existing.valueInr += c.estimatedAnnualValueInr;
    } else {
      group.byInitiative.set(c.initiativeId, {
        id: c.initiativeId,
        title: c.initiativeTitle,
        valueInr: c.estimatedAnnualValueInr,
      });
    }
    groups.set(key, group);
  }

  return [...groups.values()]
    .filter(g => g.byInitiative.size > 1)
    .map(g => {
      const initiatives = [...g.byInitiative.values()].sort((a, b) => b.valueInr - a.valueInr);
      return {
        category: g.category,
        metric: g.metric,
        metricLabel: g.metricLabel,
        initiatives,
        combinedValueInr: initiatives.reduce((s, i) => s + i.valueInr, 0),
      };
    })
    .sort((a, b) => b.combinedValueInr - a.combinedValueInr);
}
