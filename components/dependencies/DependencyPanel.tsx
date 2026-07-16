'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addDependency, removeDependency, type InitiativeDependencies, type DependencyLinkView } from '@/lib/actions/dependencies';
import { Link2, ArrowUp, ArrowDown, AlertTriangle, Plus, X } from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

function LinkRow({ link, canEdit, onRemove, pending }: { link: DependencyLinkView; canEdit: boolean; onRemove: (id: string) => void; pending: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/items/${link.initiativeId}`} className="truncate text-sm font-medium text-slate-800 hover:text-brand-700">
            {link.title}
          </Link>
          {link.atRisk && (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
              <AlertTriangle className="h-3 w-3" /> at risk
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span>{link.stage}</span>
          {link.systemLabel && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{link.systemLabel}</span>
          )}
          {link.note && <span className="truncate">· {link.note}</span>}
        </div>
      </div>
      {canEdit && (
        <button onClick={() => onRemove(link.dependencyId)} disabled={pending} title="Remove" className="flex-shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 disabled:opacity-60">
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

export function DependencyPanel({
  initiativeId,
  deps,
  options,
  canEdit,
}: {
  initiativeId: string;
  deps: InitiativeDependencies;
  options: { id: string; title: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [blockerId, setBlockerId] = useState('');
  const [systemLabel, setSystemLabel] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const linkedUpstreamIds = new Set(deps.upstream.map(u => u.initiativeId));
  const addOptions = options.filter(o => !linkedUpstreamIds.has(o.id));

  const remove = (dependencyId: string) => {
    startTransition(async () => {
      await removeDependency(dependencyId);
      router.refresh();
    });
  };

  const submit = () => {
    setError('');
    if (!blockerId) { setError('Choose an item this depends on.'); return; }
    startTransition(async () => {
      try {
        await addDependency({ dependentId: initiativeId, blockerId, systemLabel, note });
        setAdding(false); setBlockerId(''); setSystemLabel(''); setNote('');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not add dependency.');
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Link2 className="h-3.5 w-3.5" />
          Cross-System Dependencies
        </h2>
        {deps.upstreamRiskCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
            <AlertTriangle className="h-3.5 w-3.5" />
            {deps.upstreamRiskCount} upstream blocker{deps.upstreamRiskCount !== 1 ? 's' : ''} at risk
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Upstream */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <ArrowUp className="h-3.5 w-3.5 text-slate-400" /> Depends on
          </div>
          {deps.upstream.length === 0 ? (
            <p className="text-xs text-slate-400">
              No upstream dependencies. {canEdit ? 'Link an item this depends on below.' : 'PMO, CIO, or the Vertical Head can link a blocking item from here.'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {deps.upstream.map(l => <LinkRow key={l.dependencyId} link={l} canEdit={canEdit} onRemove={remove} pending={isPending} />)}
            </ul>
          )}
        </div>

        {/* Downstream */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <ArrowDown className="h-3.5 w-3.5 text-slate-400" /> Blocks
          </div>
          {deps.downstream.length === 0 ? (
            <p className="text-xs text-slate-400">
              Nothing depends on this yet. No other initiative has been linked as blocked by this one.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {deps.downstream.map(l => <LinkRow key={l.dependencyId} link={l} canEdit={false} onRemove={remove} pending={isPending} />)}
            </ul>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {adding ? (
            <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
              <p className="text-xs font-medium text-slate-600">This item depends on:</p>
              <select value={blockerId} onChange={e => setBlockerId(e.target.value)} className={inputCls}>
                <option value="">Select an item…</option>
                {addOptions.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input value={systemLabel} onChange={e => setSystemLabel(e.target.value)} className={inputCls} placeholder="System / interface (e.g. CBS API)" />
                <input value={note} onChange={e => setNote(e.target.value)} className={inputCls} placeholder="Note (optional)" />
              </div>
              {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
              <div className="flex gap-2">
                <button onClick={submit} disabled={isPending} className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
                  {isPending ? 'Adding…' : 'Add dependency'}
                </button>
                <button onClick={() => { setAdding(false); setError(''); }} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              <Plus className="h-3.5 w-3.5" /> Add dependency
            </button>
          )}
        </div>
      )}
    </div>
  );
}
