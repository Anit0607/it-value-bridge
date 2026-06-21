'use client';

import { useEffect, useState } from 'react';
import {
  BENEFIT_CATEGORIES,
  BENEFIT_CATEGORY_LABEL,
  CATEGORY_TONE,
  BENEFIT_UNITS,
  BENEFIT_UNIT_LABEL,
  formatInr,
} from '@/lib/value';
import type { BenefitCategory, BenefitUnit } from '@prisma/client';

export interface BenefitDraft {
  category: BenefitCategory;
  metricName: string;
  unit: BenefitUnit;
  estimatedAnnualValueInr: number;
  baselineValue: number | null;
  targetValue: number | null;
  narrative: string;
}

type Row = {
  checked: boolean;
  metricName: string;
  narrative: string;
  amount: string;
  scale: number;
  unit: BenefitUnit;
  baseline: string;
  target: string;
};

const SCALES = [
  { label: '₹ Cr', mult: 10_000_000 },
  { label: '₹ Lakh', mult: 100_000 },
  { label: '₹', mult: 1 },
];

const emptyRow = (): Row => ({
  checked: false,
  metricName: '',
  narrative: '',
  amount: '',
  scale: 10_000_000,
  unit: 'INR',
  baseline: '',
  target: '',
});

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

/**
 * Reusable multi-benefit value capture: a checkbox per benefit category that
 * reveals quantified fields (₹ value, unit, optional baseline→target).
 * Emits the checked rows as BenefitDraft[] via onChange; the parent validates
 * completeness at submit.
 */
export function BenefitPicker({ onChange }: { onChange: (benefits: BenefitDraft[]) => void }) {
  const [rows, setRows] = useState<Record<BenefitCategory, Row>>(
    () => Object.fromEntries(BENEFIT_CATEGORIES.map(c => [c, emptyRow()])) as Record<BenefitCategory, Row>,
  );

  const update = (cat: BenefitCategory, patch: Partial<Row>) =>
    setRows(prev => ({ ...prev, [cat]: { ...prev[cat], ...patch } }));

  useEffect(() => {
    const drafts: BenefitDraft[] = BENEFIT_CATEGORIES.filter(c => rows[c].checked).map(c => {
      const r = rows[c];
      const amt = parseFloat(r.amount);
      return {
        category: c,
        metricName: r.metricName.trim(),
        unit: r.unit,
        estimatedAnnualValueInr: isNaN(amt) ? 0 : amt * r.scale,
        baselineValue: r.baseline ? parseFloat(r.baseline) : null,
        targetValue: r.target ? parseFloat(r.target) : null,
        narrative: r.narrative.trim(),
      };
    });
    onChange(drafts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const total = BENEFIT_CATEGORIES.filter(c => rows[c].checked).reduce((s, c) => {
    const n = parseFloat(rows[c].amount);
    return s + (isNaN(n) ? 0 : n * rows[c].scale);
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Tick every benefit this delivers, and quantify it.</p>
        {total > 0 && (
          <span className="text-xs font-medium text-slate-500">
            Total: <span className="tabular font-semibold text-brand-700">{formatInr(total)}</span>
          </span>
        )}
      </div>
      <div className="space-y-2">
        {BENEFIT_CATEGORIES.map(cat => {
          const r = rows[cat];
          return (
            <div key={cat} className={`rounded-lg border ${r.checked ? 'border-brand-300 bg-brand-50/30' : 'border-slate-200'} p-3 transition-colors`}>
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={r.checked}
                  onChange={e => update(cat, { checked: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_TONE[cat]}`} />
                <span className="text-sm font-medium text-slate-800">{BENEFIT_CATEGORY_LABEL[cat]}</span>
              </label>

              {r.checked && (
                <div className="mt-3 grid grid-cols-1 gap-3 pl-7 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">Metric / what improves <span className="text-rose-500">*</span></label>
                    <input value={r.metricName} onChange={e => update(cat, { metricName: e.target.value })} className={inputCls} placeholder="e.g. Reduce transaction failure rate" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">How is it achieved? (optional)</label>
                    <input value={r.narrative} onChange={e => update(cat, { narrative: e.target.value })} className={inputCls} placeholder="Short description of the benefit" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Estimated annual value <span className="text-rose-500">*</span></label>
                    <div className="flex gap-2">
                      <input type="number" min="0" step="any" value={r.amount} onChange={e => update(cat, { amount: e.target.value })} className={inputCls} placeholder="0" />
                      <select value={r.scale} onChange={e => update(cat, { scale: Number(e.target.value) })} className="rounded-lg border border-slate-300 px-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none">
                        {SCALES.map(s => <option key={s.label} value={s.mult}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Metric unit</label>
                    <select value={r.unit} onChange={e => update(cat, { unit: e.target.value as BenefitUnit })} className={inputCls}>
                      {BENEFIT_UNITS.map(u => <option key={u} value={u}>{BENEFIT_UNIT_LABEL[u]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Baseline (today, optional)</label>
                    <input type="number" step="any" value={r.baseline} onChange={e => update(cat, { baseline: e.target.value })} className={inputCls} placeholder="e.g. 100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Target (optional)</label>
                    <input type="number" step="any" value={r.target} onChange={e => update(cat, { target: e.target.value })} className={inputCls} placeholder="e.g. 70" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
