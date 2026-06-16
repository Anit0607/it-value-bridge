export type ItemType = 'Change Request' | 'Project';

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
  verticalHead: string;
  businessSpoc: string;
  businessSponsor: string;
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

  validation?: BusinessValidation;
  committedMonth?: string;
  history: HistoryEntry[];
  createdAt: string;
}

export type Role = 'cio' | 'pmo' | 'vh' | 'business';

export interface AuthUser {
  email: string;
  role: Role;
  name: string;
  verticalHead?: string;
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
