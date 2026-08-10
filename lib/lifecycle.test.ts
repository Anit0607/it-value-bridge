import { describe, it, expect } from 'vitest';
import {
  stageLabel, stageIndex, nextStage, firstStage,
  isTerminal, isValidationGate, isAtOrAfterGoLive, isPreDelivery,
  goLiveStage, validationStage, terminalStage, validateLifecycle,
  type Lifecycle,
} from './lifecycle';
import { LIFECYCLE_TEMPLATES, findTemplate } from './lifecycle-templates';

function build(templateId: string): Lifecycle {
  const t = findTemplate(templateId)!;
  return t.stages.map((s, i) => ({
    key: s.key,
    label: s.label,
    order: i + 1,
    processGroup: s.processGroup,
    deliveryPhase: s.deliveryPhase,
    isGoLiveGate: s.isGoLiveGate ?? false,
    isValidationGate: s.isValidationGate ?? false,
    isTerminal: s.isTerminal ?? false,
  }));
}

const BFSI = build('REGULATED_BFSI');
const MID = build('MID_MARKET_IT');
const LEAN = build('LEAN');

describe('shipped templates', () => {
  it('are all valid lifecycles', () => {
    for (const t of LIFECYCLE_TEMPLATES) {
      expect(validateLifecycle(build(t.id)), t.name).toEqual([]);
    }
  });

  it('are the sizes the roadmap promises', () => {
    expect(BFSI).toHaveLength(11);
    expect(MID).toHaveLength(6);
    expect(LEAN).toHaveLength(4);
  });

  it('every template keeps an outcome-confirmation stage', () => {
    // Delivery ceremony is negotiable; confirming the value is not. Without it
    // the platform is a tracker.
    for (const t of LIFECYCLE_TEMPLATES) {
      expect(validationStage(build(t.id)), t.name).not.toBeNull();
    }
  });
});

describe('semantics do not depend on stage names', () => {
  it('answers "has it shipped" correctly in all three shapes', () => {
    expect(isAtOrAfterGoLive(BFSI, 'UAT')).toBe(false);
    expect(isAtOrAfterGoLive(BFSI, 'GO_LIVE')).toBe(true);
    expect(isAtOrAfterGoLive(BFSI, 'CLOSED')).toBe(true);

    expect(isAtOrAfterGoLive(MID, 'TEST')).toBe(false);
    expect(isAtOrAfterGoLive(MID, 'RELEASE')).toBe(true);

    // No stage anywhere in this lifecycle is called "Go Live".
    expect(isAtOrAfterGoLive(LEAN, 'IN_PROGRESS')).toBe(false);
    expect(isAtOrAfterGoLive(LEAN, 'LIVE')).toBe(true);
    expect(isAtOrAfterGoLive(LEAN, 'CONFIRMED')).toBe(true);
  });

  it('finds the terminal stage without looking for the word "Closed"', () => {
    expect(terminalStage(BFSI)!.key).toBe('CLOSED');
    expect(terminalStage(LEAN)!.key).toBe('CONFIRMED');
    expect(isTerminal(LEAN, 'CONFIRMED')).toBe(true);
    expect(isTerminal(LEAN, 'LIVE')).toBe(false);
  });

  it('handles a stage that is both confirmation and final', () => {
    // The lean shape collapses them. Nothing may assume they are distinct.
    const s = LEAN.find(x => x.key === 'CONFIRMED')!;
    expect(s.isValidationGate && s.isTerminal).toBe(true);
    expect(isValidationGate(LEAN, 'CONFIRMED')).toBe(true);
    expect(isTerminal(LEAN, 'CONFIRMED')).toBe(true);
  });

  it('identifies pre-delivery regardless of how many stages precede build', () => {
    expect(isPreDelivery(BFSI, 'COMMERCIAL')).toBe(true);
    expect(isPreDelivery(BFSI, 'DEVELOPMENT')).toBe(false);
    expect(isPreDelivery(LEAN, 'PLANNED')).toBe(true);
    expect(isPreDelivery(LEAN, 'IN_PROGRESS')).toBe(false);
  });
});

describe('navigation', () => {
  it('advances through the lifecycle in order', () => {
    expect(nextStage(BFSI, 'BRD')!.key).toBe('FSD');
    expect(nextStage(MID, 'BUILD')!.key).toBe('TEST');
    expect(nextStage(LEAN, 'PLANNED')!.key).toBe('IN_PROGRESS');
  });

  it('has nowhere to go from the last stage', () => {
    expect(nextStage(BFSI, 'CLOSED')).toBeNull();
    expect(nextStage(LEAN, 'CONFIRMED')).toBeNull();
  });

  it('returns null rather than guessing for an unknown stage', () => {
    expect(nextStage(BFSI, 'SPRINT_REVIEW')).toBeNull();
    expect(stageIndex(BFSI, 'SPRINT_REVIEW')).toBe(-1);
  });

  it('starts where the lifecycle starts, not at a hardcoded "BRD"', () => {
    expect(firstStage(BFSI)!.key).toBe('BRD');
    expect(firstStage(MID)!.key).toBe('SPEC');
    expect(firstStage(LEAN)!.key).toBe('PLANNED');
  });

  it('orders by position, not by array order', () => {
    const shuffled = [...LEAN].reverse();
    expect(nextStage(shuffled, 'PLANNED')!.key).toBe('IN_PROGRESS');
    expect(firstStage(shuffled)!.key).toBe('PLANNED');
  });
});

describe('labels', () => {
  it('renders the organization label, not the key', () => {
    expect(stageLabel(BFSI, 'CAB_APPROVAL')).toBe('CAB Approval');
    expect(stageLabel(MID, 'CONFIRM')).toBe('Outcome Confirmation');
  });

  it('falls back to the key for a retired stage rather than losing history', () => {
    // An initiative closed under a stage the organization has since removed
    // still has to render its audit trail.
    expect(stageLabel(LEAN, 'CAB_APPROVAL')).toBe('CAB_APPROVAL');
  });

  it('renders an em dash for a metadata-only history entry', () => {
    expect(stageLabel(BFSI, null)).toBe('—');
  });
});

describe('validateLifecycle', () => {
  const strip = (l: Lifecycle, key: string, patch: Partial<Lifecycle[number]>): Lifecycle =>
    l.map(s => (s.key === key ? { ...s, ...patch } : s));

  it('rejects an empty lifecycle', () => {
    expect(validateLifecycle([])).toEqual(['A lifecycle needs at least one stage.']);
  });

  it('requires a go-live stage', () => {
    const broken = strip(BFSI, 'GO_LIVE', { isGoLiveGate: false });
    expect(validateLifecycle(broken).join(' ')).toContain('No stage is marked as go-live');
  });

  it('requires a final stage', () => {
    const broken = strip(BFSI, 'CLOSED', { isTerminal: false });
    expect(validateLifecycle(broken).join(' ')).toContain('nothing can ever be completed');
  });

  it('rejects two go-live stages', () => {
    const broken = strip(BFSI, 'CAB_APPROVAL', { isGoLiveGate: true });
    expect(validateLifecycle(broken).join(' ')).toContain('2 stages are marked as go-live');
  });

  it('rejects duplicate keys', () => {
    const broken = [...LEAN, { ...LEAN[0], order: 9 }];
    expect(validateLifecycle(broken).join(' ')).toContain('Duplicate stage keys: PLANNED');
  });

  it('rejects two stages in the same position', () => {
    const broken = strip(LEAN, 'LIVE', { order: 1 });
    expect(validateLifecycle(broken).join(' ')).toContain('share the same position');
  });

  it('catches a go-live gate that is not post-delivery', () => {
    const broken = strip(LEAN, 'LIVE', { deliveryPhase: 'IN_DELIVERY' as const });
    expect(validateLifecycle(broken).join(' ')).toContain('not marked post-delivery');
  });

  it('catches a post-delivery stage sitting before go-live', () => {
    // Otherwise "has it shipped" is true before the shipping stage is reached.
    const broken = strip(BFSI, 'UAT', { deliveryPhase: 'POST_DELIVERY' as const });
    expect(validateLifecycle(broken).join(' ')).toContain('comes before the go-live stage');
  });

  it('reports every problem at once rather than the first', () => {
    let broken = strip(BFSI, 'GO_LIVE', { isGoLiveGate: false });
    broken = strip(broken, 'CLOSED', { isTerminal: false });
    expect(validateLifecycle(broken).length).toBeGreaterThanOrEqual(2);
  });
});
