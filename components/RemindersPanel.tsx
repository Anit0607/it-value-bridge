import Link from 'next/link';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import type { Reminder, ReminderSeverity } from '@/lib/reminders';

export const SEVERITY_TONE: Record<ReminderSeverity, BadgeTone> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'brand',
  LOW: 'slate',
};

// Worst first — same convention as every other risk-ordered list in the app.
const SEVERITY_ORDER: Record<ReminderSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function sortBySeverity(reminders: Reminder[]): Reminder[] {
  return [...reminders].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

export function dueOrAge(r: Reminder): string {
  if (r.daysOverdue !== undefined) return `${r.daysOverdue}d overdue`;
  if (r.dueDate) return r.dueDate;
  return '—';
}

function ReminderRow({ r }: { r: Reminder }) {
  return (
    <Link
      href={r.actionHref}
      className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-brand-50/40"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge tone={SEVERITY_TONE[r.severity]} size="sm">{r.severity}</Badge>
          <span className="truncate text-sm font-medium text-slate-800">{r.title}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">{r.message}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="tabular text-xs font-semibold text-slate-600">{dueOrAge(r)}</div>
        <div className="text-[11px] text-slate-400">{r.owner}</div>
      </div>
    </Link>
  );
}

/** Flat, severity-ordered list of reminders — one row per reminder. */
export function RemindersList({
  reminders,
  emptyText = 'Nothing needs attention right now.',
}: {
  reminders: Reminder[];
  emptyText?: string;
}) {
  if (reminders.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-slate-400">{emptyText}</p>;
  }
  return (
    <div className="divide-y divide-slate-100">
      {reminders.map(r => <ReminderRow key={r.id} r={r} />)}
    </div>
  );
}

export interface ReminderGroup {
  label: string;
  reminders: Reminder[];
}

/** Reminders grouped under labeled subsections (e.g. by type), each severity-ordered. */
export function GroupedRemindersList({ groups }: { groups: ReminderGroup[] }) {
  const nonEmpty = groups.filter(g => g.reminders.length > 0);
  if (nonEmpty.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-slate-400">Nothing needs attention right now.</p>;
  }
  return (
    <div className="divide-y divide-slate-100">
      {nonEmpty.map(g => (
        <div key={g.label}>
          <div className="flex items-center justify-between bg-slate-50/60 px-5 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.label}</span>
            <span className="text-[11px] font-semibold text-slate-400">{g.reminders.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {g.reminders.map(r => <ReminderRow key={r.id} r={r} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
