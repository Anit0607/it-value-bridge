'use client';

import type { InvestmentCategory } from '@prisma/client';
import {
  INVESTMENT_CATEGORIES,
  INVESTMENT_CATEGORY_LABEL,
  INVESTMENT_CATEGORY_BASIS,
  INVESTMENT_CATEGORY_TONE,
} from '@/lib/investment';

/**
 * Radio-style picker for what justifies funding an initiative.
 *
 * Deliberately shows the *basis* for each category rather than just the name —
 * the whole point of categorising is that different work is justified
 * differently, and someone choosing "Foundational" should see that they'll be
 * expected to name what it unblocks rather than a return.
 */
export function InvestmentCategoryPicker({
  value,
  onChange,
  className = '',
}: {
  value: InvestmentCategory;
  onChange: (v: InvestmentCategory) => void;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {INVESTMENT_CATEGORIES.map(c => {
        const selected = value === c;
        return (
          <label
            key={c}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
              selected ? 'border-brand-400 bg-brand-50/50' : 'border-slate-200 bg-white hover:border-brand-300'
            }`}
          >
            <input
              type="radio"
              name="investmentCategory"
              checked={selected}
              onChange={() => onChange(c)}
              className="mt-0.5 h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className={`h-2 w-2 shrink-0 rounded-full ${INVESTMENT_CATEGORY_TONE[c]}`} />
                {INVESTMENT_CATEGORY_LABEL[c]}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{INVESTMENT_CATEGORY_BASIS[c]}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
