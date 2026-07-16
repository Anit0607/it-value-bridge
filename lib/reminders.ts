import type { EnrichedItem } from '@/lib/queries/enrich';
import { daysFromNow } from '@/lib/rag';
import { STAGES } from '@/lib/types';
import type { Stage } from '@/lib/types';
import type { Milestone } from '@prisma/client';

/**
 * System-generated reminder categories — each a standing rule evaluated
 * against an already-enriched item, independent of the RAG traffic light.
 * RAG answers "how healthy is this item overall"; reminders answer "which
 * specific things need someone's attention right now," so more than one can
 * fire for the same item (e.g. Stale Update + Business Delay together).
 */
export type ReminderType =
  | 'STALE_UPDATE'
  | 'STAGE_OVERDUE'
  | 'GO_LIVE_RISK'
  | 'BUSINESS_VALIDATION_PENDING'
  | 'REGULATORY_DEADLINE_RISK'
  | 'BUSINESS_DELAY'
  | 'VENDOR_DELAY'
  | 'MILESTONE_OVERDUE'
  | 'MILESTONE_BLOCKED';

export type ReminderSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ReminderOwnerRole = 'PMO' | 'VERTICAL_HEAD' | 'PROGRAM_MANAGER' | 'BUSINESS' | 'VENDOR';

/** Display label per type — single source of truth for any UI listing reminders. */
export const REMINDER_TYPE_LABEL: Record<ReminderType, string> = {
  STALE_UPDATE: 'Stale Update',
  STAGE_OVERDUE: 'Stage Overdue',
  GO_LIVE_RISK: 'Go-Live Risk',
  BUSINESS_VALIDATION_PENDING: 'Business Validation Pending',
  REGULATORY_DEADLINE_RISK: 'Regulatory Deadline Risk',
  BUSINESS_DELAY: 'Business Delay',
  VENDOR_DELAY: 'Vendor Delay',
  MILESTONE_OVERDUE: 'Milestone Overdue',
  MILESTONE_BLOCKED: 'Milestone Blocked',
};

/** Display label per owner role. */
export const REMINDER_OWNER_ROLE_LABEL: Record<ReminderOwnerRole, string> = {
  PMO: 'PMO',
  VERTICAL_HEAD: 'Vertical Head',
  PROGRAM_MANAGER: 'Program Manager',
  BUSINESS: 'Business',
  VENDOR: 'Vendor',
};

/**
 * Reminders are ephemeral for 6A — generated fresh from live data on every
 * request, never written to the database. There is deliberately no
 * status/snoozedUntil/assignee/readAt field, and no mark-as-read, snooze,
 * assign, history, or email/WhatsApp delivery in this phase; all of that is
 * out of scope until a later pass.
 *
 * `id` is nonetheless fully deterministic (`${initiativeId}-${type}` for
 * item-level reminders, `${milestoneId}-${type}` for the milestone-derived
 * ones — see remindersForItem() below) precisely so a future persistence
 * layer can key a separate status table off this same id — e.g. `ReminderStatus { id,
 * readAt, snoozedUntil, assignedTo }` joined against whatever
 * generateReminders() returns — without generateReminders() itself ever
 * needing to change. It stays a pure, stateless function; persistence would
 * be a merge step layered on top, not a rewrite of this file.
 */
export interface Reminder {
  id: string;
  initiativeId: string;
  title: string;
  message: string;
  type: ReminderType;
  severity: ReminderSeverity;
  owner: string;
  ownerRole: ReminderOwnerRole;
  dueDate?: string;
  daysOverdue?: number;
  actionHref: string;
}

// "Close" windows — kept in one place so every reminder that reasons about
// an approaching date uses the same threshold as the rest of the app
// (regulatory: same 14-day window PmoDashboardClient's insight banner uses).
const GO_LIVE_RISK_WINDOW_DAYS = 30;
const REGULATORY_RISK_WINDOW_DAYS = 14;

// Stages at/after which an item is considered "near closure" — Go-Live Risk
// only fires before this point, since being here already means the item is
// on its way out regardless of how close the go-live date is.
const NEAR_CLOSURE_STAGES: Stage[] = ['Go Live', 'Business Validation', 'Closed'];

const UAT_INDEX = STAGES.indexOf('UAT');

/**
 * Severity rules — simple, deterministic, fixed thresholds per type (6A).
 * No graduated/ML scoring: each type maps directly to one of the bands
 * below, exactly as specified, with no other inputs.
 *
 *   CRITICAL: regulatory overdue · stage overdue > 7d · go-live within 7d
 *             AND stage before UAT · business validation pending > 7d ·
 *             milestone overdue > 7d (unless business-owned, see below)
 *   HIGH:     stage overdue 1-7d · regulatory within 14d · vendor delay ·
 *             business delay · milestone overdue 1-7d · milestone blocked ·
 *             business-owned milestone overdue (capped here regardless of
 *             days overdue — mirrors business/vendor delay never
 *             escalating to CRITICAL either)
 *   MEDIUM:   stale update > 7d · go-live within 30d (and not yet in
 *             Go Live/Business Validation/Closed) · business validation
 *             pending <= 7d (no explicit band given; MEDIUM is the safe
 *             "still needs attention" default)
 *   LOW:      stale update 5-7d
 */

// Milestone.ownerRole ('PMO'/'IT'/'BUSINESS'/'VENDOR') doesn't map 1:1 onto
// ReminderOwnerRole — IT lands on PROGRAM_MANAGER, the same role
// STAGE_OVERDUE/STALE_UPDATE already route "IT delivery" reminders to.
const MILESTONE_OWNER_ROLE_MAP: Record<string, ReminderOwnerRole> = {
  PMO: 'PMO',
  IT: 'PROGRAM_MANAGER',
  BUSINESS: 'BUSINESS',
  VENDOR: 'VENDOR',
};

function itemHref(itemId: string, suffix = ''): string {
  return `/items/${itemId}${suffix}`;
}

/**
 * Evaluate every standing reminder rule against one already-visible,
 * already-enriched item, plus that item's own open (non-Completed)
 * milestones (already filtered/scoped by the caller — see
 * generateReminders() below).
 */
function remindersForItem(item: EnrichedItem, milestones: Milestone[]): Reminder[] {
  if (item.currentStage === 'Closed') return [];

  const reminders: Reminder[] = [];
  const href = itemHref(item.id);

  // Stale Update — triggers from 5 days; LOW 5-7d, MEDIUM > 7d.
  if (item.staleDays >= 5) {
    reminders.push({
      id: `${item.id}-STALE_UPDATE`,
      initiativeId: item.id,
      title: item.title,
      message: `Not updated in ${item.staleDays} days`,
      type: 'STALE_UPDATE',
      severity: item.staleDays > 7 ? 'MEDIUM' : 'LOW',
      owner: item.programManagerName || item.verticalHead,
      ownerRole: 'PROGRAM_MANAGER',
      daysOverdue: item.staleDays,
      actionHref: href,
    });
  }

  // Stage Overdue — HIGH 1-7d, CRITICAL > 7d.
  if (item.etaDays < 0) {
    const daysOverdue = Math.abs(item.etaDays);
    reminders.push({
      id: `${item.id}-STAGE_OVERDUE`,
      initiativeId: item.id,
      title: item.title,
      message: `${item.currentStage} is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} past its expected date`,
      type: 'STAGE_OVERDUE',
      severity: daysOverdue > 7 ? 'CRITICAL' : 'HIGH',
      owner: item.programManagerName || item.verticalHead,
      ownerRole: 'PROGRAM_MANAGER',
      dueDate: item.stageExpectedDate,
      daysOverdue,
      actionHref: href,
    });
  }

  // Go-Live Risk — CRITICAL when within 7 days AND stage is still before
  // UAT (barely any runway left before a QA/business-facing stage even
  // starts); MEDIUM for the rest of the 30-day window.
  if (!NEAR_CLOSURE_STAGES.includes(item.currentStage)) {
    const daysToGoLive = daysFromNow(item.goLiveDate);
    if (daysToGoLive <= GO_LIVE_RISK_WINDOW_DAYS) {
      const overdue = daysToGoLive < 0;
      const beforeUAT = STAGES.indexOf(item.currentStage) < UAT_INDEX;
      reminders.push({
        id: `${item.id}-GO_LIVE_RISK`,
        initiativeId: item.id,
        title: item.title,
        message: overdue
          ? `Go-live was ${Math.abs(daysToGoLive)} days ago but the item is still in ${item.currentStage}`
          : `Go-live is in ${daysToGoLive} days but the item is still in ${item.currentStage}`,
        type: 'GO_LIVE_RISK',
        severity: daysToGoLive <= 7 && beforeUAT ? 'CRITICAL' : 'MEDIUM',
        owner: item.verticalHead,
        ownerRole: 'VERTICAL_HEAD',
        dueDate: item.goLiveDate,
        daysOverdue: overdue ? Math.abs(daysToGoLive) : undefined,
        actionHref: href,
      });
    }
  }

  // Business Validation Pending — CRITICAL once pending > 7 days; MEDIUM
  // otherwise (no explicit band given for the early days, so this is the
  // simple "still needs attention but not yet critical" default).
  if (item.currentStage === 'Business Validation' && !item.validation) {
    reminders.push({
      id: `${item.id}-BUSINESS_VALIDATION_PENDING`,
      initiativeId: item.id,
      title: item.title,
      message: 'Awaiting business validation of outcomes',
      type: 'BUSINESS_VALIDATION_PENDING',
      severity: item.daysInStage > 7 ? 'CRITICAL' : 'MEDIUM',
      owner: item.businessSpoc,
      ownerRole: 'BUSINESS',
      actionHref: itemHref(item.id, '/validate'),
    });
  }

  // Regulatory Deadline Risk — CRITICAL once overdue; HIGH within 14 days.
  if (item.isRegulatory && item.regulatoryDueDate) {
    const daysToReg = daysFromNow(item.regulatoryDueDate);
    if (daysToReg <= REGULATORY_RISK_WINDOW_DAYS) {
      const overdue = daysToReg < 0;
      reminders.push({
        id: `${item.id}-REGULATORY_DEADLINE_RISK`,
        initiativeId: item.id,
        title: item.title,
        message: overdue
          ? `Regulatory deadline missed by ${Math.abs(daysToReg)} days`
          : `Regulatory deadline in ${daysToReg} days`,
        type: 'REGULATORY_DEADLINE_RISK',
        severity: overdue ? 'CRITICAL' : 'HIGH',
        owner: item.programHeadName || 'PMO',
        ownerRole: 'PMO',
        dueDate: item.regulatoryDueDate,
        daysOverdue: overdue ? Math.abs(daysToReg) : undefined,
        actionHref: href,
      });
    }
  }

  // Business Delay — always HIGH while active, regardless of how overdue.
  if (item.delaySource === 'Business') {
    const daysOverdue = item.etaDays < 0 ? Math.abs(item.etaDays) : undefined;
    reminders.push({
      id: `${item.id}-BUSINESS_DELAY`,
      initiativeId: item.id,
      title: item.title,
      message: item.delayReason || 'Delayed on the business side',
      type: 'BUSINESS_DELAY',
      severity: 'HIGH',
      owner: item.businessSpoc,
      ownerRole: 'BUSINESS',
      dueDate: item.stageExpectedDate,
      daysOverdue,
      actionHref: href,
    });
  }

  // Vendor Delay — always HIGH while active, regardless of how overdue.
  if (item.delaySource === 'Vendor') {
    const daysOverdue = item.etaDays < 0 ? Math.abs(item.etaDays) : undefined;
    reminders.push({
      id: `${item.id}-VENDOR_DELAY`,
      initiativeId: item.id,
      title: item.title,
      message: item.delayReason || 'Delayed by vendor',
      type: 'VENDOR_DELAY',
      // No vendor-contact field exists on Item yet — owner is a placeholder
      // label, not a real name, until the data model carries one.
      severity: 'HIGH',
      owner: 'Vendor',
      ownerRole: 'VENDOR',
      dueDate: item.stageExpectedDate,
      daysOverdue,
      actionHref: href,
    });
  }

  // Milestone Overdue — CRITICAL > 7d, HIGH 1-7d; business-owned milestones
  // are capped at HIGH regardless of how overdue, mirroring how
  // Business/Vendor Delay above never escalate to CRITICAL either.
  // Milestone Blocked — always HIGH, independent of due date; a milestone
  // that's both blocked and overdue fires both reminders (same "more than
  // one can fire" model as everything else in this file).
  for (const m of milestones) {
    if (m.status === 'COMPLETED') continue;
    const ownerRole = MILESTONE_OWNER_ROLE_MAP[m.ownerRole ?? ''] ?? 'PMO';
    const dueDateIso = m.dueDate.toISOString().slice(0, 10);
    const daysToDue = daysFromNow(dueDateIso);
    const overdue = daysToDue < 0;

    if (overdue) {
      const daysOverdue = Math.abs(daysToDue);
      reminders.push({
        id: `${m.id}-MILESTONE_OVERDUE`,
        initiativeId: item.id,
        title: item.title,
        message: `Milestone "${m.title}" is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
        type: 'MILESTONE_OVERDUE',
        severity: m.ownerRole === 'BUSINESS' ? 'HIGH' : (daysOverdue > 7 ? 'CRITICAL' : 'HIGH'),
        owner: m.owner,
        ownerRole,
        dueDate: dueDateIso,
        daysOverdue,
        actionHref: href,
      });
    }

    if (m.status === 'BLOCKED') {
      reminders.push({
        id: `${m.id}-MILESTONE_BLOCKED`,
        initiativeId: item.id,
        title: item.title,
        message: `Milestone "${m.title}" is blocked`,
        type: 'MILESTONE_BLOCKED',
        severity: 'HIGH',
        owner: m.owner,
        ownerRole,
        dueDate: dueDateIso,
        actionHref: href,
      });
    }
  }

  return reminders;
}

/**
 * Generate every standing reminder across a portfolio.
 *
 * SECURITY (5B/5C): this must only ever be called on the result of
 * `enrichAll(await listVisibleInitiativesForUser(user))` — i.e. after
 * organization + role-hierarchy scoping has already happened via
 * buildInitiativeVisibilityWhere(). This function does no data access of
 * its own; it purely derives reminders from an in-memory array, exactly
 * like applyPortfolioFilters(). Never wire it up to a query that reads all
 * initiatives directly — that would bypass tenant and role-visibility rules.
 *
 * `milestones` should come from an already-scoped bulk fetch keyed to the
 * SAME initiative set (e.g. lib/actions/milestones.ts's
 * listOpenMilestonesForInitiatives(items)) — never a direct unscoped query.
 * Milestones are grouped by initiativeId internally and matched to their
 * parent item; a milestone whose initiativeId isn't in `items` (out of
 * scope, or the item is Closed) is silently ignored.
 *
 *   const items = enrichAll(await listVisibleInitiativesForUser(user));
 *   const milestones = await listOpenMilestonesForInitiatives(items);
 *   const reminders = generateReminders(items, milestones);
 */
export function generateReminders(items: EnrichedItem[], milestones: Milestone[] = []): Reminder[] {
  const milestonesByInitiative = new Map<string, Milestone[]>();
  for (const m of milestones) {
    const list = milestonesByInitiative.get(m.initiativeId);
    if (list) list.push(m);
    else milestonesByInitiative.set(m.initiativeId, [m]);
  }
  return items.flatMap(item => remindersForItem(item, milestonesByInitiative.get(item.id) ?? []));
}
