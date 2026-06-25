// Date-range ("period") engine for leadership dashboards (Tier 1).
// All bounds are inclusive ISO dates (YYYY-MM-DD) in UTC, to match the way the
// app stores/serialises dates. `from`/`to` of null mean "open" (all time).

export type PeriodKey = 'this-month' | 'last-month' | 'this-fy' | 'last-fy' | 'all' | 'custom';

export interface Period {
  key: PeriodKey;
  from: string | null;
  to: string | null;
  label: string;
}

export const PERIOD_PRESETS: { key: PeriodKey; label: string }[] = [
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'this-fy', label: 'This FY' },
  { key: 'last-fy', label: 'Last FY' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom range' },
];

const isoUTC = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
const monthName = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 1)).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const fyLabel = (startYear: number) =>
  `FY${String(startYear % 100).padStart(2, '0')}-${String((startYear + 1) % 100).padStart(2, '0')}`;

/** Resolve a Period from URL search params. Defaults to the current financial year. */
export function resolvePeriod(
  params: { period?: string; from?: string; to?: string },
  today: Date = new Date(),
): Period {
  const { period, from, to } = params;

  // Explicit custom range wins.
  if ((from || to) && (!period || period === 'custom')) {
    return { key: 'custom', from: from || null, to: to || null, label: `${from ?? '…'} → ${to ?? '…'}` };
  }

  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const fyStart = m >= 3 ? y : y - 1; // Indian FY starts in April (month index 3)

  switch (period) {
    case 'this-month':
      return { key: 'this-month', from: isoUTC(y, m, 1), to: isoUTC(y, m + 1, 0), label: monthName(y, m) };
    case 'last-month': {
      const ly = m === 0 ? y - 1 : y;
      const lm = m === 0 ? 11 : m - 1;
      return { key: 'last-month', from: isoUTC(ly, lm, 1), to: isoUTC(ly, lm + 1, 0), label: monthName(ly, lm) };
    }
    case 'last-fy':
      return { key: 'last-fy', from: isoUTC(fyStart - 1, 3, 1), to: isoUTC(fyStart, 2, 31), label: fyLabel(fyStart - 1) };
    case 'all':
      return { key: 'all', from: null, to: null, label: 'All time' };
    case 'this-fy':
    default:
      return { key: 'this-fy', from: isoUTC(fyStart, 3, 1), to: isoUTC(fyStart + 1, 2, 31), label: fyLabel(fyStart) };
  }
}

/** Is an ISO date within the (inclusive) period? Null/empty dates are never in range. */
export function inPeriod(dateIso: string | null | undefined, p: Period): boolean {
  if (!dateIso) return false;
  const d = dateIso.slice(0, 10);
  if (p.from && d < p.from) return false;
  if (p.to && d > p.to) return false;
  return true;
}

/** Is an ISO date on or before the period end? (for "delivered/closed by end of window"). */
export function onOrBeforeEnd(dateIso: string | null | undefined, p: Period): boolean {
  if (!dateIso) return false;
  if (!p.to) return true;
  return dateIso.slice(0, 10) <= p.to;
}
