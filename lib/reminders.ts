import type { EnrichedItem } from '@/lib/queries/enrich';
import { daysFromNow } from '@/lib/rag';
import type { Stage } from '@/lib/types';

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
  | 'VENDOR_DELAY';

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
};

/** Display label per owner role. */
export const REMINDER_OWNER_ROLE_LABEL: Record<ReminderOwnerRole, string> = {
  PMO: 'PMO',
  VERTICAL_HEAD: 'Vertical Head',
  PROGRAM_MANAGER: 'Program Manager',
  BUSINESS: 'Business',
  VENDOR: 'Vendor',
};

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

/** Severity for a thing that is ALREADY overdue by N days — escalates with age. */
function severityForOverdueDays(days: number): ReminderSeverity {
  if (days > 21) return 'CRITICAL';
  if (days > 14) return 'HIGH';
  if (days > 7) return 'MEDIUM';
  return 'LOW';
}

/** Severity for a deadline that is APPROACHING (or just passed) N days from now. */
function severityForApproaching(daysRemaining: number): ReminderSeverity {
  if (daysRemaining < 0) return 'CRITICAL';
  if (daysRemaining <= 7) return 'HIGH';
  if (daysRemaining <= 14) return 'MEDIUM';
  return 'LOW';
}

function itemHref(itemId: string, suffix = ''): string {
  return `/items/${itemId}${suffix}`;
}

/** Evaluate every standing reminder rule against one already-visible, already-enriched item. */
function remindersForItem(item: EnrichedItem): Reminder[] {
  if (item.currentStage === 'Closed') return [];

  const reminders: Reminder[] = [];
  const href = itemHref(item.id);

  if (item.staleDays > 7) {
    reminders.push({
      id: `${item.id}-STALE_UPDATE`,
      initiativeId: item.id,
      title: item.title,
      message: `Not updated in ${item.staleDays} days`,
      type: 'STALE_UPDATE',
      severity: severityForOverdueDays(item.staleDays),
      owner: item.programManagerName || item.verticalHead,
      ownerRole: 'PROGRAM_MANAGER',
      daysOverdue: item.staleDays,
      actionHref: href,
    });
  }

  if (item.etaDays < 0) {
    const daysOverdue = Math.abs(item.etaDays);
    reminders.push({
      id: `${item.id}-STAGE_OVERDUE`,
      initiativeId: item.id,
      title: item.title,
      message: `${item.currentStage} is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} past its expected date`,
      type: 'STAGE_OVERDUE',
      severity: severityForOverdueDays(daysOverdue),
      owner: item.programManagerName || item.verticalHead,
      ownerRole: 'PROGRAM_MANAGER',
      dueDate: item.stageExpectedDate,
      daysOverdue,
      actionHref: href,
    });
  }

  if (!NEAR_CLOSURE_STAGES.includes(item.currentStage)) {
    const daysToGoLive = daysFromNow(item.goLiveDate);
    if (daysToGoLive <= GO_LIVE_RISK_WINDOW_DAYS) {
      const overdue = daysToGoLive < 0;
      reminders.push({
        id: `${item.id}-GO_LIVE_RISK`,
        initiativeId: item.id,
        title: item.title,
        message: overdue
          ? `Go-live was ${Math.abs(daysToGoLive)} days ago but the item is still in ${item.currentStage}`
          : `Go-live is in ${daysToGoLive} days but the item is still in ${item.currentStage}`,
        type: 'GO_LIVE_RISK',
        severity: severityForApproaching(daysToGoLive),
        owner: item.verticalHead,
        ownerRole: 'VERTICAL_HEAD',
        dueDate: item.goLiveDate,
        daysOverdue: overdue ? Math.abs(daysToGoLive) : undefined,
        actionHref: href,
      });
    }
  }

  if (item.currentStage === 'Business Validation' && !item.validation) {
    reminders.push({
      id: `${item.id}-BUSINESS_VALIDATION_PENDING`,
      initiativeId: item.id,
      title: item.title,
      message: 'Awaiting business validation of outcomes',
      type: 'BUSINESS_VALIDATION_PENDING',
      severity: item.daysInStage > 14 ? 'HIGH' : 'MEDIUM',
      owner: item.businessSpoc,
      ownerRole: 'BUSINESS',
      actionHref: itemHref(item.id, '/validate'),
    });
  }

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
        severity: severityForApproaching(daysToReg),
        owner: item.programHeadName || 'PMO',
        ownerRole: 'PMO',
        dueDate: item.regulatoryDueDate,
        daysOverdue: overdue ? Math.abs(daysToReg) : undefined,
        actionHref: href,
      });
    }
  }

  if (item.delaySource === 'Business') {
    const daysOverdue = item.etaDays < 0 ? Math.abs(item.etaDays) : undefined;
    reminders.push({
      id: `${item.id}-BUSINESS_DELAY`,
      initiativeId: item.id,
      title: item.title,
      message: item.delayReason || 'Delayed on the business side',
      type: 'BUSINESS_DELAY',
      severity: daysOverdue !== undefined ? severityForOverdueDays(daysOverdue) : 'MEDIUM',
      owner: item.businessSpoc,
      ownerRole: 'BUSINESS',
      dueDate: item.stageExpectedDate,
      daysOverdue,
      actionHref: href,
    });
  }

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
      severity: daysOverdue !== undefined ? severityForOverdueDays(daysOverdue) : 'MEDIUM',
      owner: 'Vendor',
      ownerRole: 'VENDOR',
      dueDate: item.stageExpectedDate,
      daysOverdue,
      actionHref: href,
    });
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
 *   const items = enrichAll(await listVisibleInitiativesForUser(user));
 *   const reminders = generateReminders(items);
 */
export function generateReminders(items: EnrichedItem[]): Reminder[] {
  return items.flatMap(remindersForItem);
}
