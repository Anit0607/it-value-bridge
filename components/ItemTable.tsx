'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Item, STAGES } from '@/lib/types';
import { computeRAG, daysInStage, daysFromNow } from '@/lib/rag';
import { RagDot } from './RagBadge';
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from 'lucide-react';

interface Props {
  items: Item[];
  showVerticalHead?: boolean;
  emptyHint?: string;
}

type SortKey = 'title' | 'type' | 'verticalHead' | 'stage' | 'rag' | 'eta' | 'days';
type SortDir = 'asc' | 'desc';

const RAG_ORDER = { Red: 0, Amber: 1, Green: 2 };

export function ItemTable({ items, showVerticalHead = true, emptyHint }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('rag');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

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
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Inbox className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-slate-700">No items found</p>
        <p className="mt-1 text-xs text-slate-400">{emptyHint ?? 'Try adjusting your filters.'}</p>
      </div>
    );
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

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="max-h-[640px] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <SortHeader label="Item" sk="title" />
              <SortHeader label="Type" sk="type" />
              {showVerticalHead && <SortHeader label="Vertical Head" sk="verticalHead" />}
              <SortHeader label="Stage" sk="stage" />
              <SortHeader label="Confidence" sk="rag" />
              <SortHeader label="ETA" sk="eta" />
              <SortHeader label="In Stage" sk="days" align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => {
              const rag = computeRAG(item);
              const days = daysInStage(item.stageStartDate);
              const daysToEta = daysFromNow(item.stageExpectedDate);
              const closed = item.currentStage === 'Closed';
              return (
                <tr
                  key={item.id}
                  className={`group border-t border-slate-100 transition-colors hover:bg-brand-50/40 ${
                    i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/items/${item.id}`}
                      className="font-medium text-slate-800 transition-colors hover:text-brand-700 group-hover:text-brand-700"
                    >
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                        item.type === 'Project'
                          ? 'bg-violet-50 text-violet-700 ring-violet-600/20'
                          : 'bg-sky-50 text-sky-700 ring-sky-600/20'
                      }`}
                    >
                      {item.type === 'Project' ? 'Project' : 'CR'}
                    </span>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
