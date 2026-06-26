'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Item, STAGES } from '@/lib/types';
import { computeRAG, daysInStage, daysFromNow, daysSinceUpdate } from '@/lib/rag';
import { RagDot } from './RagBadge';
import { StateCard } from './StateCard';
import { Badge, type BadgeTone } from './ui/Badge';
import type { RAG } from '@/lib/types';
import { ChevronUp, ChevronDown, ChevronsUpDown, CheckSquare2, Download, RefreshCw, UserCheck, ClipboardList } from 'lucide-react';

interface Props {
  items: Item[];
  showVerticalHead?: boolean;
  emptyHint?: string;
  emptySubhint?: string;
}

type SortKey = 'title' | 'type' | 'outcome' | 'verticalHead' | 'stage' | 'rag' | 'eta' | 'days';
type SortDir = 'asc' | 'desc';

const RAG_ORDER = { Red: 0, Amber: 1, Green: 2 };

const OUTCOME_TONE: Record<string, BadgeTone> = {
  'Revenue':             'success',
  'Cost Saving':         'brand',
  'Customer Experience': 'violet',
  'Compliance':          'danger',
  'Efficiency':          'sky',
  'Risk Reduction':      'warning',
};

const DELAY_TONE: Record<string, BadgeTone> = {
  IT:       'brand',
  Business: 'violet',
  Vendor:   'warning',
  External: 'slate',
};

function getNextAction(item: Item, rag: RAG): string {
  if (item.currentStage === 'Closed') return '—';
  if (item.currentStage === 'Business Validation') return 'Awaiting business sign-off';
  if (item.currentStage === 'CAB Approval') return 'Awaiting CAB approval';
  if (item.currentStage === 'AppSec') return 'Awaiting security clearance';
  if (rag === 'Red' && item.delayed && item.delaySource) return `Escalate: ${item.delaySource} delay`;
  if (rag === 'Red') return 'Advance or escalate';
  if (daysSinceUpdate(item.lastUpdated) > 7) return 'Update required';
  if (rag === 'Amber') return 'Monitor — at risk';
  return 'On track';
}

export function ItemTable({ items, showVerticalHead = true, emptyHint, emptySubhint }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('rag');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelected(s => s.size === items.length ? new Set() : new Set(items.map(i => i.id)));

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case 'title':
          av = a.title.toLowerCase();
          bv = b.title.toLowerCase();
          break;
        case 'type':
          av = a.type;
          bv = b.type;
          break;
        case 'outcome':
          av = (a.outcomeCategory ?? '').toLowerCase();
          bv = (b.outcomeCategory ?? '').toLowerCase();
          break;
        case 'verticalHead':
          av = a.verticalHead.toLowerCase();
          bv = b.verticalHead.toLowerCase();
          break;
        case 'stage':
          av = STAGES.indexOf(a.currentStage);
          bv = STAGES.indexOf(b.currentStage);
          break;
        case 'rag':
          av = RAG_ORDER[computeRAG(a)];
          bv = RAG_ORDER[computeRAG(b)];
          break;
        case 'eta':
          av = daysFromNow(a.stageExpectedDate);
          bv = daysFromNow(b.stageExpectedDate);
          break;
        case 'days':
          av = daysInStage(a.stageStartDate);
          bv = daysInStage(b.stageStartDate);
          break;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [items, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (items.length === 0) {
    return <StateCard variant="empty" message={emptyHint} sub={emptySubhint} />;
  }

  const SortHeader = ({
    label,
    sk,
    align = 'left',
  }: {
    label: string;
    sk: SortKey;
    align?: 'left' | 'center' | 'right';
  }) => {
    const activeSort = sortKey === sk;
    return (
      <th
        aria-sort={activeSort ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 text-${align} text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur`}
      >
        <button
          onClick={() => toggleSort(sk)}
          className={`inline-flex items-center gap-1 transition-colors hover:text-slate-800 ${
            align === 'center' ? 'mx-auto' : ''
          } ${activeSort ? 'text-slate-800' : ''}`}
        >
          {label}
          {activeSort ? (
            sortDir === 'asc' ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />
          )}
        </button>
      </th>
    );
  };

  const BULK_ACTIONS = [
    { icon: CheckSquare2, label: 'Mark reviewed' },
    { icon: Download,     label: 'Export list' },
    { icon: RefreshCw,    label: 'Request update' },
    { icon: UserCheck,    label: 'Assign follow-up' },
    { icon: ClipboardList, label: 'Add to report' },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      {/* Bulk governance toolbar — visible when rows are selected */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-brand-100 bg-brand-50/60 px-4 py-2.5">
          <span className="text-xs font-semibold text-brand-700">
            {selected.size} item{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="h-4 w-px bg-brand-200" />
          {BULK_ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                type="button"
                disabled
                title="Coming soon"
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-400 opacity-60"
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {a.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[11px] font-medium text-brand-600 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="max-h-[640px] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {/* Select-all checkbox */}
              <th className="sticky top-0 z-10 w-8 bg-slate-50/95 px-3 py-2.5 backdrop-blur">
                <input
                  type="checkbox"
                  checked={selected.size === items.length && items.length > 0}
                  ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < items.length; }}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </th>
              <SortHeader label="Item" sk="title" />
              <SortHeader label="Type" sk="type" />
              <SortHeader label="Business Outcome" sk="outcome" />
              {showVerticalHead && <SortHeader label="Vertical Head" sk="verticalHead" />}
              <SortHeader label="Stage" sk="stage" />
              <SortHeader label="Confidence" sk="rag" />
              <SortHeader label="ETA" sk="eta" />
              <SortHeader label="In Stage" sk="days" align="right" />
              <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur">Delay Source</th>
              <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => {
              const rag = computeRAG(item);
              const days = daysInStage(item.stageStartDate);
              const daysToEta = daysFromNow(item.stageExpectedDate);
              const closed = item.currentStage === 'Closed';
              const stale = daysSinceUpdate(item.lastUpdated);
              const staleLabel = stale === 0 ? 'today' : stale === 1 ? 'yesterday' : `${stale}d ago`;
              const staleCls = stale >= 7 ? 'text-rose-500 font-medium' : stale >= 4 ? 'text-amber-500' : 'text-slate-400';
              const rowBg =
                rag === 'Red' ? 'bg-rose-50/40' :
                rag === 'Amber' ? (i % 2 === 1 ? 'bg-amber-50/20' : 'bg-white') :
                (i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white');
              const accentBorder =
                rag === 'Red' ? 'border-l-[3px] border-l-rose-400' :
                rag === 'Amber' ? 'border-l-[3px] border-l-amber-400' :
                'border-l-[3px] border-l-transparent';
              return (
                <tr
                  key={item.id}
                  className={`group border-t border-slate-100 transition-colors hover:bg-brand-50/40 ${rowBg}`}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleRow(item.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                  <td className={`py-2 pl-3 pr-4 ${accentBorder}`}>
                    <Link
                      href={`/items/${item.id}`}
                      className="font-semibold text-slate-800 transition-colors hover:text-brand-700 group-hover:text-brand-700"
                    >
                      {item.title}
                    </Link>
                    {!closed && (
                      <div className={`mt-0.5 text-[11px] ${staleCls}`}>
                        Updated {staleLabel}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={item.type === 'Project' ? 'violet' : 'sky'}>
                      {item.type === 'Project' ? 'Project' : 'CR'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    {item.outcomeCategory ? (
                      <Badge tone={OUTCOME_TONE[item.outcomeCategory] ?? 'slate'}>
                        {item.outcomeCategory}
                      </Badge>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  {showVerticalHead && (
                    <td className="px-4 py-2.5 text-slate-600">{item.verticalHead}</td>
                  )}
                  <td className="px-4 py-2.5 text-slate-600">{item.currentStage}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <RagDot rag={rag} />
                      {rag}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular text-slate-600">
                    {closed ? (
                      <span className="text-slate-300">—</span>
                    ) : daysToEta < 0 ? (
                      <span className="font-medium text-rose-600">{Math.abs(daysToEta)}d overdue</span>
                    ) : (
                      item.stageExpectedDate.slice(5)
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular text-slate-500">
                    {closed ? <span className="text-slate-300">—</span> : `${days}d`}
                  </td>
                  <td className="px-4 py-2.5">
                    {item.delaySource ? (
                      <Badge tone={DELAY_TONE[item.delaySource] ?? 'slate'}>
                        {item.delaySource}
                      </Badge>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    {getNextAction(item, rag)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
