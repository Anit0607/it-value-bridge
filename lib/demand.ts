import type { DemandStatus, DemandPriority } from '@prisma/client';

export const DEMAND_STATUS_LABEL: Record<DemandStatus, string> = {
  RAISED: 'Raised',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ON_HOLD: 'On Hold',
};

// Tailwind chip classes (bg + text + ring) per status.
export const DEMAND_STATUS_TONE: Record<DemandStatus, string> = {
  RAISED: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  ON_HOLD: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export const DEMAND_STATUSES: DemandStatus[] = [
  'RAISED', 'UNDER_REVIEW', 'APPROVED', 'ON_HOLD', 'REJECTED',
];

export const DEMAND_PRIORITY_LABEL: Record<DemandPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const DEMAND_PRIORITY_TONE: Record<DemandPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  MEDIUM: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  HIGH: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  CRITICAL: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

export const DEMAND_PRIORITIES: DemandPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
