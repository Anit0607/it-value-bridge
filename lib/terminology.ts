/**
 * Per-organization vocabulary (docs/ROADMAP.md M4).
 *
 * The product was written in the language of a regulated Indian bank:
 * "initiative", "IT Vertical Head", "Business SPOC". A mid-market manufacturer
 * calls those a project, a delivery lead and a business owner, and being shown
 * someone else's vocabulary is the fastest way to feel that software was not
 * built for you.
 *
 * Deliberately a BOUNDED set of keys rather than a free-form dictionary. An
 * unbounded one cannot be maintained: the product's own help text, error
 * messages and CSV templates refer to these nouns, and every new key is a new
 * place they can drift out of sync. Adding a term is a code change, on purpose.
 */

export const TERM_KEYS = [
  'initiative',
  'initiativePlural',
  'demand',
  'demandPlural',
  'verticalHead',
  'businessSpoc',
  'businessSponsor',
  'programHead',
  'programManager',
  'businessHead',
  'businessUnit',
  'okr',
  'okrPlural',
] as const;

export type TermKey = (typeof TERM_KEYS)[number];

/** What the product says when an organization has not overridden anything. */
export const DEFAULT_TERMS: Record<TermKey, string> = {
  initiative: 'Initiative',
  initiativePlural: 'Initiatives',
  demand: 'Demand',
  demandPlural: 'Demands',
  verticalHead: 'IT Vertical Head',
  businessSpoc: 'Business SPOC',
  businessSponsor: 'Business Sponsor',
  programHead: 'Program Head',
  programManager: 'Program Manager',
  businessHead: 'Business Head',
  businessUnit: 'Business Unit',
  okr: 'OKR',
  okrPlural: 'OKRs',
};

/** Short guidance shown next to each field in the setup form. */
export const TERM_HINTS: Record<TermKey, string> = {
  initiative: 'A single piece of funded work.',
  initiativePlural: 'Plural of the above.',
  demand: 'An idea or request before it is approved as work.',
  demandPlural: 'Plural of the above.',
  verticalHead: 'The person accountable for delivery in a technology area.',
  businessSpoc: 'The day-to-day business contact for a piece of work.',
  businessSponsor: 'The person whose budget funds it.',
  programHead: 'Senior owner of a group of related work.',
  programManager: 'The person running delivery day to day.',
  businessHead: 'Senior business owner above the day-to-day contact.',
  businessUnit: 'The part of the business the work belongs to.',
  okr: 'A measurable organizational objective.',
  okrPlural: 'Plural of the above.',
};

export type Terminology = Record<TermKey, string>;

/**
 * Merges an organization's stored overrides over the defaults.
 *
 * Unknown keys are ignored and blank values fall back, so a partially filled
 * or stale `terminology` blob can never leave a label empty on screen. That
 * matters more than honouring every stored value: a missing noun reads as a
 * bug, while an un-renamed one merely reads as un-renamed.
 */
export function resolveTerms(stored: unknown): Terminology {
  const terms = { ...DEFAULT_TERMS };
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    for (const key of TERM_KEYS) {
      const value = (stored as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) {
        terms[key] = value.trim();
      }
    }
  }
  return terms;
}

/** Keeps only recognised, non-empty, non-default terms for storage. */
export function normaliseTerms(input: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of TERM_KEYS) {
    const value = input[key]?.trim();
    // Storing a term identical to the default would silently pin it: a later
    // change to the shipped wording would not reach organizations that had
    // merely "confirmed" it.
    if (value && value !== DEFAULT_TERMS[key]) out[key] = value;
  }
  return out;
}

/** Lowercased form for mid-sentence use, e.g. "no initiatives match". */
export function lower(term: string): string {
  return term.charAt(0).toLowerCase() + term.slice(1);
}
