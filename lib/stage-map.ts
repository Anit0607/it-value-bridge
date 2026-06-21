import type { Stage as PrismaStage, ProcessGroup } from '@prisma/client';

export const STAGE_LABEL: Record<PrismaStage, string> = {
  BRD: 'BRD',
  FSD: 'FSD',
  COMMERCIAL: 'Commercial',
  DEVELOPMENT: 'Development',
  SIT: 'SIT',
  UAT: 'UAT',
  APPSEC: 'AppSec',
  CAB_APPROVAL: 'CAB Approval',
  GO_LIVE: 'Go Live',
  BUSINESS_VALIDATION: 'Business Validation',
  CLOSED: 'Closed',
};

export const LABEL_TO_STAGE: Record<string, PrismaStage> = Object.fromEntries(
  Object.entries(STAGE_LABEL).map(([k, v]) => [v, k as PrismaStage]),
) as Record<string, PrismaStage>;

export const STAGE_TO_PROCESS_GROUP: Record<PrismaStage, ProcessGroup> = {
  BRD: 'PLANNING',
  FSD: 'PLANNING',
  COMMERCIAL: 'PLANNING',
  DEVELOPMENT: 'EXECUTING',
  SIT: 'EXECUTING',
  UAT: 'EXECUTING',
  APPSEC: 'EXECUTING',
  CAB_APPROVAL: 'EXECUTING',
  GO_LIVE: 'EXECUTING',
  BUSINESS_VALIDATION: 'MONITORING_CONTROLLING',
  CLOSED: 'CLOSING',
};

export const STAGE_ORDER: PrismaStage[] = [
  'BRD',
  'FSD',
  'COMMERCIAL',
  'DEVELOPMENT',
  'SIT',
  'UAT',
  'APPSEC',
  'CAB_APPROVAL',
  'GO_LIVE',
  'BUSINESS_VALIDATION',
  'CLOSED',
];

export function nextStage(current: PrismaStage): PrismaStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}
