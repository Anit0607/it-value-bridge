import type { ProcessGroup, DeliveryPhase } from '@prisma/client';

/**
 * Shipped lifecycle templates (docs/ROADMAP.md M4).
 *
 * A template is a starting point, not a constraint. Provisioning copies these
 * rows into the organization's own LifecycleStage table, after which the
 * organization is free to rename, reorder, add or remove stages without
 * affecting anyone else.
 *
 * Every template must define exactly one go-live gate and exactly one terminal
 * stage — the engine reads both. A validation gate is optional: a lean team
 * that never formally confirms outcomes simply does not have one, and the
 * product stops asking rather than showing a stage nobody uses.
 */

export interface LifecycleStageTemplate {
  key: string;
  label: string;
  processGroup: ProcessGroup;
  deliveryPhase: DeliveryPhase;
  isGoLiveGate?: boolean;
  isValidationGate?: boolean;
  isTerminal?: boolean;
}

export interface LifecycleTemplate {
  id: string;
  name: string;
  summary: string;
  /** Who this shape is for — shown in the setup form so the choice is informed. */
  bestFor: string;
  stages: LifecycleStageTemplate[];
}

/**
 * The lifecycle the product was built around: a regulated Indian bank running
 * waterfall delivery with a security gate and a change-advisory board.
 */
const REGULATED_BFSI: LifecycleTemplate = {
  id: 'REGULATED_BFSI',
  name: 'Regulated BFSI',
  summary: '11 stages — separate specification, commercial, security and change-approval gates.',
  bestFor: 'Banks, NBFCs and insurers under RBI/IRDAI supervision, running waterfall delivery with formal gates.',
  stages: [
    { key: 'BRD', label: 'BRD', processGroup: 'PLANNING', deliveryPhase: 'PRE_DELIVERY' },
    { key: 'FSD', label: 'FSD', processGroup: 'PLANNING', deliveryPhase: 'PRE_DELIVERY' },
    { key: 'COMMERCIAL', label: 'Commercial', processGroup: 'PLANNING', deliveryPhase: 'PRE_DELIVERY' },
    { key: 'DEVELOPMENT', label: 'Development', processGroup: 'EXECUTING', deliveryPhase: 'IN_DELIVERY' },
    { key: 'SIT', label: 'SIT', processGroup: 'EXECUTING', deliveryPhase: 'IN_DELIVERY' },
    { key: 'UAT', label: 'UAT', processGroup: 'EXECUTING', deliveryPhase: 'IN_DELIVERY' },
    { key: 'APPSEC', label: 'AppSec', processGroup: 'EXECUTING', deliveryPhase: 'IN_DELIVERY' },
    { key: 'CAB_APPROVAL', label: 'CAB Approval', processGroup: 'EXECUTING', deliveryPhase: 'IN_DELIVERY' },
    { key: 'GO_LIVE', label: 'Go Live', processGroup: 'EXECUTING', deliveryPhase: 'POST_DELIVERY', isGoLiveGate: true },
    { key: 'BUSINESS_VALIDATION', label: 'Business Validation', processGroup: 'MONITORING_CONTROLLING', deliveryPhase: 'POST_DELIVERY', isValidationGate: true },
    { key: 'CLOSED', label: 'Closed', processGroup: 'CLOSING', deliveryPhase: 'POST_DELIVERY', isTerminal: true },
  ],
};

/**
 * A mid-sized IT organization with real governance but no separate commercial
 * or change-advisory gate. Keeps the outcome-confirmation step, because that is
 * the whole point of the product.
 */
const MID_MARKET_IT: LifecycleTemplate = {
  id: 'MID_MARKET_IT',
  name: 'Mid-market IT',
  summary: '6 stages — specification, build, test, release, outcome confirmation, close.',
  bestFor: 'Mid-sized enterprises with a working PMO but no formal CAB or security-review gate.',
  stages: [
    { key: 'SPEC', label: 'Requirements', processGroup: 'PLANNING', deliveryPhase: 'PRE_DELIVERY' },
    { key: 'BUILD', label: 'Build', processGroup: 'EXECUTING', deliveryPhase: 'IN_DELIVERY' },
    { key: 'TEST', label: 'Testing', processGroup: 'EXECUTING', deliveryPhase: 'IN_DELIVERY' },
    { key: 'RELEASE', label: 'Release', processGroup: 'EXECUTING', deliveryPhase: 'POST_DELIVERY', isGoLiveGate: true },
    { key: 'CONFIRM', label: 'Outcome Confirmation', processGroup: 'MONITORING_CONTROLLING', deliveryPhase: 'POST_DELIVERY', isValidationGate: true },
    { key: 'CLOSED', label: 'Closed', processGroup: 'CLOSING', deliveryPhase: 'POST_DELIVERY', isTerminal: true },
  ],
};

/**
 * The smallest lifecycle that still answers the product's question.
 *
 * Four stages, and one of them is outcome confirmation. Delivery detail can be
 * collapsed to almost nothing, but if the confirmation step goes, the platform
 * is just a tracker — so it stays even in the lean shape.
 */
const LEAN: LifecycleTemplate = {
  id: 'LEAN',
  name: 'Lean',
  summary: '4 stages — planned, in progress, live, confirmed.',
  bestFor: 'Small teams and first deployments that want value tracking without delivery ceremony.',
  stages: [
    { key: 'PLANNED', label: 'Planned', processGroup: 'PLANNING', deliveryPhase: 'PRE_DELIVERY' },
    { key: 'IN_PROGRESS', label: 'In Progress', processGroup: 'EXECUTING', deliveryPhase: 'IN_DELIVERY' },
    { key: 'LIVE', label: 'Live', processGroup: 'EXECUTING', deliveryPhase: 'POST_DELIVERY', isGoLiveGate: true },
    { key: 'CONFIRMED', label: 'Value Confirmed', processGroup: 'CLOSING', deliveryPhase: 'POST_DELIVERY', isValidationGate: true, isTerminal: true },
  ],
};

export const LIFECYCLE_TEMPLATES: LifecycleTemplate[] = [REGULATED_BFSI, MID_MARKET_IT, LEAN];

export function findTemplate(id: string): LifecycleTemplate | undefined {
  return LIFECYCLE_TEMPLATES.find(t => t.id === id);
}
