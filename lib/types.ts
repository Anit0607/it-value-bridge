export type ItemType = 'Change Request' | 'Project';

// Leadership importance — independent of ItemType (delivery kind) and
// isRegulatory (compliance criticality); a regulatory initiative can carry
// any classification.
export type ItemClassification = 'Strategic' | 'Major Project' | 'Tactical' | 'BAU';

export const CLASSIFICATIONS: ItemClassification[] = ['Strategic', 'Major Project', 'Tactical', 'BAU'];

// Keyed by the raw Prisma InitiativeClassification enum values so any
// caller reading Initiative rows directly (not just via the Item adapter)
// can render a label without importing @prisma/client.
export const CLASSIFICATION_LABEL: Record<'STRATEGIC' | 'MAJOR_PROJECT' | 'TACTICAL' | 'BAU', ItemClassification> = {
  STRATEGIC: 'Strategic',
  MAJOR_PROJECT: 'Major Project',
  TACTICAL: 'Tactical',
  BAU: 'BAU',
};

// The fixed STAGES list was removed in M4. The lifecycle is per-organization
// (see prisma LifecycleStage), so a stage is now referenced by its stable key
// and rendered through its organization's label.
//
// `Stage` stays as a named alias rather than bare `string` so call sites keep
// saying what they mean.
export type Stage = string;

/** A stage as offered in a dropdown: stable value, organization-facing text.
 *  The optional semantics let callers that need them (e.g. "queues sit between
 *  build and go-live") filter without a second round trip; dropdowns ignore them. */
export interface StageOption {
  key: string;
  label: string;
  deliveryPhase?: 'PRE_DELIVERY' | 'IN_DELIVERY' | 'POST_DELIVERY';
  isTerminal?: boolean;
}

export type RAG = 'Green' | 'Amber' | 'Red';

export type OutcomeCategory =
  | 'Revenue'
  | 'Cost Saving'
  | 'Customer Experience'
  | 'Compliance'
  | 'Efficiency'
  | 'Risk Reduction';

export type DelaySource = 'IT' | 'Business' | 'Vendor' | 'External';

export interface HistoryEntry {
  // null for metadata-only edits (title, classification, ownership, etc.)
  // that aren't tied to a stage transition — see updateInitiative().
  stage: Stage | null;
  /** Resolved at read time; falls back to the key if the stage was retired. */
  stageLabel: string | null;
  date: string;
  user: string;
  note?: string;
}

export interface BusinessValidation {
  outcomeAchieved: 'Yes' | 'Partially' | 'No';
  actualResult: string;
  actualMetric: string;
}

export interface Item {
  id: string;
  title: string;
  type: ItemType;
  classification: ItemClassification;
  verticalHead: string;
  businessSpoc: string;
  businessSponsor: string;

  // Enterprise role model — manager-level assignment (nullable; may be unset)
  programHeadName?: string | null;
  programManagerName?: string | null;
  businessHeadName?: string | null;
  businessUnit?: string | null;
  subBusinessUnit?: string | null;

  requirement: string;
  outcomeCategory: OutcomeCategory;
  outcomeDescription: string;
  targetMetric: string;
  goLiveDate: string;

  // The LifecycleStage key. Never render this — render currentStageLabel.
  currentStage: Stage;
  /** What this organization calls the current stage. */
  currentStageLabel: string;
  /** Position in the lifecycle, or -1 if the stage is no longer configured. */
  stageOrder: number;
  // Semantics resolved from the organization's lifecycle, stamped here so the
  // engine (RAG, reminders, realization) can ask what a stage MEANS without
  // needing the lifecycle passed alongside every Item — and without ever
  // comparing against the string "UAT".
  stageIsTerminal: boolean;
  stageIsValidationGate: boolean;
  stageIsPostDelivery: boolean;
  stageIsPreDelivery: boolean;
  stageStartDate: string;
  stageExpectedDate: string;
  lastUpdated: string;
  notes: string;
  delayed: boolean;
  delaySource?: DelaySource;
  delayReason?: string | null;

  validation?: BusinessValidation;
  committedMonth?: string;

  // What justifies funding this — drives the ROI gate. Separate from
  // isRegulatory, which drives deadline tracking; an item can be both.
  investmentCategory?: 'VALUE_GENERATING' | 'REGULATORY_MANDATORY' | 'FOUNDATIONAL' | 'STRATEGIC';

  // regulatory / compliance criticality
  isRegulatory: boolean;
  regulatoryBody?: string | null;
  regulatoryDueDate?: string | null; // ISO date

  // Cost (₹). All nullable — null means "not captured", never zero. Resolve to
  // a single TCO figure with computeTco() in lib/value.ts rather than summing
  // these by hand, so every surface agrees on the same number.
  estimatedCostInr?: number | null;
  actualCostInr?: number | null;
  buildCostInr?: number | null;
  annualRunCostInr?: number | null;
  tcoHorizonYears?: number | null;
  // Frozen at sign-off — what was actually promised, for later comparison.
  signedOffValueInr?: number | null;
  signedOffTcoInr?: number | null;

  history: HistoryEntry[];
  createdAt: string;
}

// Role type matching Prisma enum (was lowercase in prototype)
export type Role =
  | 'ADMIN'
  | 'CIO'
  | 'PMO'
  | 'VERTICAL_HEAD'
  | 'BUSINESS'
  | 'PROGRAM_HEAD'
  | 'PROGRAM_MANAGER'
  | 'BUSINESS_HEAD';

export interface AuthUser {
  id?: string;
  email: string;
  role: Role;
  name: string;
  verticalHead?: string | null;
}

export const VERTICAL_HEADS = [
  'Rajesh Kumar',
  'Priya Sharma',
  'Amit Patel',
  'Sunita Verma',
  'Vikram Singh',
  'Neha Gupta',
  'Arun Mishra',
  'Deepa Nair',
  'Sanjay Reddy',
  'Kavita Mehta',
] as const;

export const OUTCOME_CATEGORIES: OutcomeCategory[] = [
  'Revenue',
  'Cost Saving',
  'Customer Experience',
  'Compliance',
  'Efficiency',
  'Risk Reduction',
];
