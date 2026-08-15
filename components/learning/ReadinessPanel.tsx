import type { LearningReadiness } from '@/lib/learning';
import { MIN_SAMPLE_FOR_PATTERN } from '@/lib/learning';
import { Hourglass, CheckCircle2, AlertCircle, Ban, FileQuestion } from 'lucide-react';

/**
 * What the learning loop can and cannot yet say.
 *
 * Deliberately the FIRST thing on the page rather than a footnote. An empty
 * analytics view is indistinguishable from a broken one, and "you need four
 * more completed initiatives" is a roadmap where a blank chart is a support
 * ticket.
 */
export function ReadinessPanel({ readiness }: { readiness: LearningReadiness }) {
  const cells = [
    { label: 'Assessed', value: readiness.assessable, icon: CheckCircle2, tone: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Not yet due', value: readiness.notYetDue, icon: Hourglass, tone: 'text-slate-500', bg: 'bg-slate-50' },
    { label: 'Awaiting measurement', value: readiness.awaitingMeasurement, icon: AlertCircle, tone: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Unsourced', value: readiness.unsourced, icon: FileQuestion, tone: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Not signed off', value: readiness.notSignedOff, icon: FileQuestion, tone: 'text-slate-500', bg: 'bg-slate-50' },
    { label: 'Promise not captured', value: readiness.promiseNotFrozen, icon: Ban, tone: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Evidence Available</h2>
        <span className="text-xs text-slate-500">
          {readiness.anyPatternReportable
            ? 'Enough history to report patterns'
            : `Patterns unlock at ${MIN_SAMPLE_FOR_PATTERN} assessed initiatives`}
        </span>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-slate-500">
        An initiative can only be assessed when three things are true: the promised value was frozen at
        sign-off, its realization horizon has elapsed, and a realized figure has been recorded with an
        evidence source. Anything short of that is reported as missing rather than scored as a failure.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {cells.map(c => (
          <div key={c.label} className={`rounded-lg ${c.bg} px-3 py-2.5 text-center`}>
            <div className={`tabular text-xl font-semibold ${c.tone}`}>{c.value}</div>
            <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] font-medium leading-tight text-slate-600">
              <c.icon className="h-3 w-3 shrink-0" />
              {c.label}
            </div>
          </div>
        ))}
      </div>

      {readiness.blockers.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          {readiness.blockers.map(b => (
            <li key={b} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
