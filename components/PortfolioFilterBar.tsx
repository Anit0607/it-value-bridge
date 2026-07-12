'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { STAGES, CLASSIFICATION_LABEL } from '@/lib/types';
import { RAG_VALUES, CLASSIFICATION_KEYS } from '@/lib/portfolioFilters';
import { Badge } from '@/components/ui/Badge';
import { Filter, RotateCcw } from 'lucide-react';

const selectCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

// The 10 filter dimensions this bar drives — kept in one place so
// active-count and reset both stay in sync with what's actually rendered.
const FILTER_KEYS = [
  'classification',
  'rag',
  'stage',
  'isRegulatory',
  'verticalHead',
  'programHead',
  'programManager',
  'businessHead',
  'businessUnit',
  'businessSpoc',
] as const;

export interface PortfolioFilterBarOptions {
  verticalHeads?: string[];
  programHeads?: string[];
  programManagers?: string[];
  businessHeads?: string[];
  businessUnits?: string[];
  businessSpocs?: string[];
}

interface Props {
  /**
   * Distinct values for the free-text hierarchy filters, e.g.
   *   verticalHeads: [...new Set(visibleItems.map(i => i.verticalHead))].sort()
   * Derive these from the SAME already-scoped item list the page fetched via
   * listVisibleInitiativesForUser() — never from a separate unscoped query,
   * or the dropdown itself would leak names outside the caller's visibility.
   * A dimension with no options renders disabled rather than being hidden,
   * so the bar's shape stays predictable regardless of caller wiring.
   */
  options?: PortfolioFilterBarOptions;
}

/**
 * Reusable, URL-driven portfolio filter bar (Classification, RAG, Stage,
 * Regulatory, IT Vertical Head, Program Head, Program Manager, Business
 * Head, Business Unit, Business SPOC).
 *
 * GET/search-param based by design: every change is a real navigation via
 * router.push(), so the address bar always reflects the current filter
 * state and is copy/paste-shareable, e.g.
 *   /cio?classification=STRATEGIC&rag=Red&businessHead=Rohit%20Malhotra
 *
 * This component has no data access of its own — it only reads/writes URL
 * search params. Pairs with lib/portfolioFilters.ts's parsePortfolioFilters()
 * / applyPortfolioFilters() on the page/server side.
 */
export function PortfolioFilterBar({ options = {} }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCount = FILTER_KEYS.filter(k => searchParams.get(k)).length;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const reset = () => {
    const next = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach(k => next.delete(k));
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Filter className="h-4 w-4 text-slate-400" />
        Filters
      </span>

      <select
        value={searchParams.get('classification') ?? ''}
        onChange={e => setParam('classification', e.target.value)}
        className={selectCls}
        aria-label="Classification"
      >
        <option value="">Classification: Any</option>
        {CLASSIFICATION_KEYS.map(k => (
          <option key={k} value={k}>{CLASSIFICATION_LABEL[k]}</option>
        ))}
      </select>

      <select
        value={searchParams.get('rag') ?? ''}
        onChange={e => setParam('rag', e.target.value)}
        className={selectCls}
        aria-label="RAG"
      >
        <option value="">RAG: Any</option>
        {RAG_VALUES.map(r => <option key={r} value={r}>{r}</option>)}
      </select>

      <select
        value={searchParams.get('stage') ?? ''}
        onChange={e => setParam('stage', e.target.value)}
        className={selectCls}
        aria-label="Stage"
      >
        <option value="">Stage: Any</option>
        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <select
        value={searchParams.get('isRegulatory') ?? ''}
        onChange={e => setParam('isRegulatory', e.target.value)}
        className={selectCls}
        aria-label="Regulatory"
      >
        <option value="">Regulatory: Any</option>
        <option value="true">Regulatory: Yes</option>
        <option value="false">Regulatory: No</option>
      </select>

      <HierarchySelect label="IT Vertical Head" paramKey="verticalHead" options={options.verticalHeads} searchParams={searchParams} onChange={setParam} />
      <HierarchySelect label="Program Head" paramKey="programHead" options={options.programHeads} searchParams={searchParams} onChange={setParam} />
      <HierarchySelect label="Program Manager" paramKey="programManager" options={options.programManagers} searchParams={searchParams} onChange={setParam} />
      <HierarchySelect label="Business Head" paramKey="businessHead" options={options.businessHeads} searchParams={searchParams} onChange={setParam} />
      <HierarchySelect label="Business Unit" paramKey="businessUnit" options={options.businessUnits} searchParams={searchParams} onChange={setParam} />
      <HierarchySelect label="Business SPOC" paramKey="businessSpoc" options={options.businessSpocs} searchParams={searchParams} onChange={setParam} />

      <div className="ml-auto flex items-center gap-2">
        <Badge tone={activeCount > 0 ? 'brand' : 'slate'} size="sm">
          {activeCount} active
        </Badge>
        <button
          type="button"
          onClick={reset}
          disabled={activeCount === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
}

function HierarchySelect({
  label,
  paramKey,
  options,
  searchParams,
  onChange,
}: {
  label: string;
  paramKey: string;
  options?: string[];
  searchParams: ReturnType<typeof useSearchParams>;
  onChange: (key: string, value: string) => void;
}) {
  const hasOptions = !!options && options.length > 0;
  return (
    <select
      value={searchParams.get(paramKey) ?? ''}
      onChange={e => onChange(paramKey, e.target.value)}
      className={selectCls}
      aria-label={label}
      disabled={!hasOptions}
    >
      <option value="">{label}: Any</option>
      {hasOptions && options!.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
