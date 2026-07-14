import type { EnrichedItem } from '@/lib/queries/enrich';
import { daysFromNow } from '@/lib/rag';
import type { Stage } from '@/lib/types';
import type { BadgeTone } from '@/components/ui/Badge';

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

export interface ReminderDefinition {
  type: ReminderType;
  label: string;
  /** The trigger rule, in plain words — shown as a tooltip/description. */
  trigger: string;
  tone: BadgeTone;
}

export const REMINDER_TYPES: ReminderType[] = [
  'STALE_UPDATE',
  'STAGE_OVERDUE',
  'GO_LIVE_RISK',
  'BUSINESS_VALIDATION_PENDING',
  'REGULATORY_DEADLINE_RISK',
  'BUSINESS_DELAY',
  'VENDOR_DELAY',
];

export const REMINDER_DEFINITIONS: Record<ReminderType, ReminderDefinition> = {
  STALE_UPDATE: {
    type: 'STALE_UPDATE',
    label: 'Stale Update',
    trigger: 'Initiative not updated for more than 7 days',
    tone: 'warning',
  },
  STAGE_OVERDUE: {
    type: 'STAGE_OVERDUE',
    label: 'Stage Overdue',
    trigger: 'Current stage expected date is past',
    tone: 'danger',
  },
  GO_LIVE_RISK: {
    type: 'GO_LIVE_RISK',
    label: 'Go-Live Risk',
    trigger: 'Go-live date is close but item is not near closure',
    tone: 'danger',
  },
  BUSINESS_VALIDATION_PENDING: {
    type: 'BUSINESS_VALIDATION_PENDING',
    label: 'Business Validation Pending',
    trigger: 'Item is in Business Validation but not confirmed',
    tone: 'brand',
  },
  REGULATORY_DEADLINE_RISK: {
    type: 'REGULATORY_DEADLINE_RISK',
    label: 'Regulatory Deadline Risk',
    trigger: 'Regulatory due date is close or overdue',
    tone: 'danger',
  },
  BUSINESS_DELAY: {
    type: 'BUSINESS_DELAY',
    label: 'Business Delay',
    trigger: 'Delay source is Business',
    tone: 'violet',
  },
  VENDOR_DELAY: {
    type: 'VENDOR_DELAY',
    label: 'Vendor Delay',
    trigger: 'Delay source is Vendor',
    tone: 'slate',
  },
};

export interface Reminder {
  type: ReminderType;
  itemId: string;
  itemTitle: string;
  /** Specific, human-readable context for this occurrence, e.g. "9d overdue". */
  detail: string;
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

/** All reminders currently triggered for a single item. */
export function computeReminders(item: EnrichedItem): Reminder[] {
  if (item.currentStage === 'Closed') return [];

  const reminders: Reminder[] = [];
  const base = { itemId: item.id, itemTitle: item.title };

  if (item.staleDays > 7) {
    reminders.push({ ...base, type: 'STALE_UPDATE', detail: `${item.staleDays}d since last update` });
  }

  if (item.etaDays < 0) {
    reminders.push({ ...base, type: 'STAGE_OVERDUE', detail: `${Math.abs(item.etaDays)}d overdue in ${item.currentStage}` });
  }

  if (!NEAR_CLOSURE_STAGES.includes(item.currentStage)) {
    const daysToGoLive = daysFromNow(item.goLiveDate);
    if (daysToGoLive <= GO_LIVE_RISK_WINDOW_DAYS) {
      const detail = daysToGoLive < 0
        ? `go-live ${Math.abs(daysToGoLive)}d overdue, still in ${item.currentStage}`
        : `go-live in ${daysToGoLive}d, still in ${item.currentStage}`;
      reminders.push({ ...base, type: 'GO_LIVE_RISK', detail });
    }
  }

  if (item.currentStage === 'Business Validation' && !item.validation) {
    reminders.push({ ...base, type: 'BUSINESS_VALIDATION_PENDING', detail: 'Awaiting business validation' });
  }

  if (item.isRegulatory && item.regulatoryDueDate) {
    const daysToReg = daysFromNow(item.regulatoryDueDate);
    if (daysToReg <= REGULATORY_RISK_WINDOW_DAYS) {
      const detail = daysToReg < 0
        ? `regulatory deadline ${Math.abs(daysToReg)}d overdue`
        : `regulatory deadline in ${daysToReg}d`;
      reminders.push({ ...base, type: 'REGULATORY_DEADLINE_RISK', detail });
    }
  }

  if (item.delaySource === 'Business') {
    reminders.push({ ...base, type: 'BUSINESS_DELAY', detail: item.delayReason || 'Delayed on the business side' });
  }

  if (item.delaySource === 'Vendor') {
    reminders.push({ ...base, type: 'VENDOR_DELAY', detail: item.delayReason || 'Delayed by vendor' });
  }

  return reminders;
}

/** All reminders across a portfolio, flattened — item order is preserved. */
export function computeAllReminders(items: EnrichedItem[]): Reminder[] {
  return items.flatMap(computeReminders);
}

/** Reminders across a portfolio, grouped by type in REMINDER_TYPES order. */
export function remindersByType(items: EnrichedItem[]): Record<ReminderType, Reminder[]> {
  const all = computeAllReminders(items);
  return Object.fromEntries(
    REMINDER_TYPES.map(type => [type, all.filter(r => r.type === type)]),
  ) as Record<ReminderType, Reminder[]>;
}
