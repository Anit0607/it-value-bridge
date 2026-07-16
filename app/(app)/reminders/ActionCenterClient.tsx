'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { chipCls } from '@/components/ui/Chip';
import { SectionCard } from '@/components/ui/SectionCard';
import { SEVERITY_TONE, dueOrAge } from '@/components/RemindersPanel';
import { REMINDER_TYPE_LABEL, REMINDER_OWNER_ROLE_LABEL, type Reminder } from '@/lib/reminders';
import { ListChecks, Inbox } from 'lucide-react';

interface Preset {
  id: string;
  label: string;
  predicate: (r: Reminder) => boolean;
  tone: BadgeTone;
}

// Mirrors 5F's saved-view presets (Business Pending = BUSINESS_DELAY, Vendor
// Delays = VENDOR_DELAY, etc. — same mapping the PMO saved views and this
// page's own KPI cards already use) but as LOCAL toggle state, not URL
// params: the Action Center doesn't need shareable/bookmarkable filter
// links in 6A, just a quick way to narrow the table in place.
const PRESETS: Preset[] = [
  { id: 'critical', label: 'Critical', predicate: r => r.severity === 'CRITICAL', tone: 'danger' },
  { id: 'regulatory', label: 'Regulatory', predicate: r => r.type === 'REGULATORY_DEADLINE_RISK', tone: 'danger' },
  { id: 'business-pending', label: 'Business Pending', predicate: r => r.type === 'BUSINESS_DELAY', tone: 'violet' },
  { id: 'vendor-delays', label: 'Vendor Delays', predicate: r => r.type === 'VENDOR_DELAY', tone: 'slate' },
  { id: 'stale-updates', label: 'Stale Updates', predicate: r => r.type === 'STALE_UPDATE', tone: 'warning' },
  { id: 'validation-pending', label: 'Validation Pending', predicate: r => r.type === 'BUSINESS_VALIDATION_PENDING', tone: 'brand' },
];

export function ActionCenterClient({ reminders }: { reminders: Reminder[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const counts = useMemo(
    () => Object.fromEntries(PRESETS.map(p => [p.id, reminders.filter(p.predicate).length])),
    [reminders],
  );

  const activePreset = PRESETS.find(p => p.id === activeId);
  const visible = activePreset ? reminders.filter(activePreset.predicate) : reminders;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
        <span className="text-xs font-medium text-slate-500">Quick Filters</span>
        <button type="button" onClick={() => setActiveId(null)} className={chipCls(!activePreset, 'slate')}>
          All ({reminders.length})
        </button>
        {PRESETS.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveId(cur => (cur === p.id ? null : p.id))}
            className={chipCls(activeId === p.id, p.tone)}
          >
            {p.label} ({counts[p.id]})
          </button>
        ))}
      </div>

      <SectionCard title="Open Actions" icon={ListChecks} count={visible.length} noPad>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {reminders.length === 0 ? 'No open actions' : 'No actions match this filter'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {reminders.length === 0 ? 'Everything in your visible portfolio is on track.' : 'Try a different quick filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Severity</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Action</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Initiative</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Owner</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Due / Age</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, idx) => (
                  <tr key={r.id} className={`border-t border-slate-100 transition-colors hover:bg-brand-50/40 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-5 py-2.5">
                      <Badge tone={SEVERITY_TONE[r.severity]} size="sm">{r.severity}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{r.message}</td>
                    <td className="px-4 py-2.5">
                      <Link href={r.actionHref} className="font-medium text-slate-800 hover:text-brand-700">
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-slate-700">{r.owner}</div>
                      <div className="text-[11px] text-slate-400">{REMINDER_OWNER_ROLE_LABEL[r.ownerRole]}</div>
                    </td>
                    <td className="px-4 py-2.5 tabular text-slate-600">{dueOrAge(r)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{REMINDER_TYPE_LABEL[r.type]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
