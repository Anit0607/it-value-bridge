import type { ProcessGroup, DeliveryPhase } from '@prisma/client';

/**
 * The delivery lifecycle, keyed off meaning rather than names (docs/ROADMAP.md M4).
 *
 * Before M4 the engine asked questions like `currentStage === 'UAT'` and
 * `['Go Live','Business Validation','Closed'].includes(stage)`. Both are
 * assertions that every customer runs an eleven-stage regulated-bank
 * lifecycle. They are replaced here by questions about *what a stage means*:
 * has the thing shipped, is this where the business confirms the outcome, is
 * anything expected to follow.
 *
 * Everything in this file is pure. A Lifecycle is loaded once per request (see
 * lib/queries/lifecycle.ts) and passed in, which keeps the rules testable
 * against lifecycles the product has never shipped.
 */

export interface LifecycleStageView {
  key: string;
  label: string;
  order: number;
  processGroup: ProcessGroup;
  deliveryPhase: DeliveryPhase;
  isGoLiveGate: boolean;
  isValidationGate: boolean;
  isTerminal: boolean;
}

/** An organization's ordered stage list. Always sorted by `order`. */
export type Lifecycle = LifecycleStageView[];

export function sortLifecycle(stages: Lifecycle): Lifecycle {
  return [...stages].sort((a, b) => a.order - b.order);
}

export function findStage(lifecycle: Lifecycle, key: string | null | undefined): LifecycleStageView | null {
  if (!key) return null;
  return lifecycle.find(s => s.key === key) ?? null;
}

/**
 * Display name for a stage key.
 *
 * Falls back to the raw key rather than throwing or rendering "Unknown": a
 * stage retired after an initiative closed still has to render its history, and
 * showing `CAB_APPROVAL` is more useful to a reader than an empty cell.
 */
export function stageLabel(lifecycle: Lifecycle, key: string | null | undefined): string {
  if (!key) return '—';
  return findStage(lifecycle, key)?.label ?? key;
}

/** Position in the lifecycle, or -1 when the stage is not part of it. */
export function stageIndex(lifecycle: Lifecycle, key: string | null | undefined): number {
  if (!key) return -1;
  return sortLifecycle(lifecycle).findIndex(s => s.key === key);
}

/** The next stage, or null at the end of the lifecycle or for an unknown key. */
export function nextStage(lifecycle: Lifecycle, key: string): LifecycleStageView | null {
  const ordered = sortLifecycle(lifecycle);
  const idx = ordered.findIndex(s => s.key === key);
  if (idx === -1 || idx >= ordered.length - 1) return null;
  return ordered[idx + 1];
}

/** Where work starts. Used at creation, since there is no universal "BRD". */
export function firstStage(lifecycle: Lifecycle): LifecycleStageView | null {
  return sortLifecycle(lifecycle)[0] ?? null;
}

// ---- Semantic questions ----------------------------------------------------

/** Nothing follows. RAG goes quiet, reminders stop. */
export function isTerminal(lifecycle: Lifecycle, key: string | null | undefined): boolean {
  return findStage(lifecycle, key)?.isTerminal ?? false;
}

/** This is where the business confirms the outcome actually happened. */
export function isValidationGate(lifecycle: Lifecycle, key: string | null | undefined): boolean {
  return findStage(lifecycle, key)?.isValidationGate ?? false;
}

/**
 * Has it shipped?
 *
 * Reads the stage's own delivery phase rather than comparing its position to
 * the go-live gate, so a lifecycle with several post-delivery stages — or one
 * where go-live and confirmation are the same stage — behaves correctly.
 */
export function isAtOrAfterGoLive(lifecycle: Lifecycle, key: string | null | undefined): boolean {
  return findStage(lifecycle, key)?.deliveryPhase === 'POST_DELIVERY';
}

/** Nothing has been built yet. Drives the sharper go-live-risk warnings. */
export function isPreDelivery(lifecycle: Lifecycle, key: string | null | undefined): boolean {
  return findStage(lifecycle, key)?.deliveryPhase === 'PRE_DELIVERY';
}

/** The stage at which an initiative goes live, if the lifecycle names one. */
export function goLiveStage(lifecycle: Lifecycle): LifecycleStageView | null {
  return lifecycle.find(s => s.isGoLiveGate) ?? null;
}

/** The confirmation stage, if this lifecycle has one. Lean shapes may not. */
export function validationStage(lifecycle: Lifecycle): LifecycleStageView | null {
  return lifecycle.find(s => s.isValidationGate) ?? null;
}

export function terminalStage(lifecycle: Lifecycle): LifecycleStageView | null {
  return lifecycle.find(s => s.isTerminal) ?? null;
}

// ---- Validation ------------------------------------------------------------

/**
 * Problems that would make a lifecycle unusable, in language an administrator
 * can act on.
 *
 * Deliberately returns a list rather than throwing: the setup form shows all
 * the problems at once instead of making someone fix them one save at a time.
 */
export function validateLifecycle(stages: Lifecycle): string[] {
  const problems: string[] = [];
  if (stages.length === 0) return ['A lifecycle needs at least one stage.'];

  const goLive = stages.filter(s => s.isGoLiveGate);
  if (goLive.length === 0) {
    problems.push('No stage is marked as go-live. Value realization cannot start without one.');
  } else if (goLive.length > 1) {
    problems.push(`${goLive.length} stages are marked as go-live. Exactly one is allowed.`);
  }

  const terminal = stages.filter(s => s.isTerminal);
  if (terminal.length === 0) {
    problems.push('No stage is marked as final, so nothing can ever be completed.');
  } else if (terminal.length > 1) {
    problems.push(`${terminal.length} stages are marked as final. Exactly one is allowed.`);
  }

  if (stages.filter(s => s.isValidationGate).length > 1) {
    problems.push('More than one stage is marked as outcome confirmation. Exactly one is allowed.');
  }

  const keys = stages.map(s => s.key);
  const dupes = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
  if (dupes.length > 0) problems.push(`Duplicate stage keys: ${dupes.join(', ')}.`);

  const orders = stages.map(s => s.order);
  if (new Set(orders).size !== orders.length) {
    problems.push('Two or more stages share the same position.');
  }

  // The go-live gate must be the point where delivery ends, or the phases and
  // the gate disagree and "has it shipped" gets two different answers.
  const ordered = sortLifecycle(stages);
  const gate = ordered.find(s => s.isGoLiveGate);
  if (gate && gate.deliveryPhase !== 'POST_DELIVERY') {
    problems.push(`"${gate.label}" is the go-live stage but is not marked post-delivery.`);
  }
  const firstPost = ordered.findIndex(s => s.deliveryPhase === 'POST_DELIVERY');
  if (gate && firstPost !== -1 && ordered[firstPost].key !== gate.key) {
    problems.push(
      `"${ordered[firstPost].label}" is post-delivery but comes before the go-live stage "${gate.label}".`,
    );
  }

  return problems;
}
