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

export const STAGES = [
  'BRD',
  'FSD',
  'Commercial',
  'Development',
  'SIT',
  'UAT',
  'AppSec',
  'CAB Approval',
  'Go Live',
  'Business Validation',
  'Closed',
] as const;

export type Stage = (typeof STAGES)[number];

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
  stage: Stage;
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

  currentStage: Stage;
  stageStartDate: string;
  stageExpectedDate: string;
  lastUpdated: string;
  notes: string;
  delayed: boolean;
  delaySource?: DelaySource;
  delayReason?: string | null;

  validation?: BusinessValidation;
  committedMonth?: string;

  // regulatory / compliance criticality
  isRegulatory: boolean;
  regulatoryBody?: string | null;
  regulatoryDueDate?: string | null; // ISO date

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
