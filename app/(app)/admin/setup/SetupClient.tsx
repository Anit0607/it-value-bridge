'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  applyLifecycleTemplate, renameLifecycleStage, removeLifecycleStage,
  saveTerminology, saveModules,
} from '@/lib/actions/workspace';
import { TERM_KEYS, TERM_HINTS, DEFAULT_TERMS, type TermKey } from '@/lib/terminology';
import type { WorkspaceModules } from '@/lib/queries/workspace';
import { SectionCard } from '@/components/ui/SectionCard';
import {
  Workflow, Type, ToggleLeft, Check, Trash2, Flag, CheckCircle2, Square, ShieldCheck, Link2, ListChecks,
} from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

export interface TemplateView {
  id: string;
  name: string;
  summary: string;
  bestFor: string;
  stageCount: number;
  stageLabels: string[];
}

export interface StageView {
  key: string;
  label: string;
  order: number;
  deliveryPhase: string;
  isGoLiveGate: boolean;
  isValidationGate: boolean;
  isTerminal: boolean;
  /** How many initiatives are sitting here right now. */
  occupants: number;
}

const PHASE_LABEL: Record<string, string> = {
  PRE_DELIVERY: 'Before build',
  IN_DELIVERY: 'In delivery',
  POST_DELIVERY: 'Live',
};

const MODULE_COPY: { key: keyof WorkspaceModules; label: string; desc: string; icon: typeof ShieldCheck }[] = [
  {
    key: 'regulatory',
    label: 'Regulatory commitments',
    desc: 'Track a regulator, a mandated due date and a Regulatory Watch list. Switch off if no external body sets your deadlines.',
    icon: ShieldCheck,
  },
  {
    key: 'dependencies',
    label: 'Cross-system dependencies',
    desc: 'Record which delivery blocks which, and surface upstream risk. Switch off if work does not routinely depend on other work.',
    icon: Link2,
  },
  {
    key: 'milestones',
    label: 'Milestone checkpoints',
    desc: 'Named checkpoints inside an initiative, with owners and dates. Switch off if the stage list is enough detail.',
    icon: ListChecks,
  },
];

export function SetupClient({
  templates,
  currentTemplate,
  stages,
  terms,
  modules,
}: {
  templates: TemplateView[];
  currentTemplate: string | null;
  stages: StageView[];
  terms: Record<TermKey, string>;
  modules: WorkspaceModules;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const [labels, setLabels] = useState<Record<string, string>>(
    Object.fromEntries(stages.map(s => [s.key, s.label])),
  );
  const [termDraft, setTermDraft] = useState<Record<string, string>>(terms);
  const [moduleDraft, setModuleDraft] = useState<WorkspaceModules>(modules);

  const run = (fn: () => Promise<void>, okMessage: string) => {
    setError('');
    setSaved('');
    startTransition(async () => {
      try {
        await fn();
        setSaved(okMessage);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {saved}
        </p>
      )}

      {/* ── 1. Lifecycle ─────────────────────────────────────────────── */}
      <SectionCard title="1 · Delivery Lifecycle" icon={Workflow}>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          The stages work moves through. Pick the shape closest to how this organization actually delivers — you can
          rename or remove stages afterwards. Every lifecycle needs one go-live stage and one final stage, because the
          product reads both to know when value starts and when work is done.
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          {templates.map(t => {
            const active = currentTemplate === t.id;
            return (
              <div
                key={t.id}
                className={`rounded-xl border p-4 transition-colors ${
                  active ? 'border-brand-400 bg-brand-50/40' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">{t.name}</h3>
                  {active && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700">
                      <Check className="h-3 w-3" /> In use
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{t.summary}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{t.bestFor}</p>
                <p className="mt-2 text-[11px] text-slate-500">{t.stageLabels.join(' → ')}</p>
                {!active && (
                  <button
                    onClick={() => run(() => applyLifecycleTemplate({ templateId: t.id }), `Lifecycle switched to ${t.name}.`)}
                    disabled={isPending}
                    className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    Use this lifecycle
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {stages.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Current stages — rename to match your own vocabulary
            </h3>
            <div className="space-y-2">
              {stages.map(s => (
                <div key={s.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
                  <span className="w-6 shrink-0 text-center tabular text-xs text-slate-400">{s.order}</span>
                  <input
                    value={labels[s.key] ?? ''}
                    onChange={e => setLabels(l => ({ ...l, [s.key]: e.target.value }))}
                    className={`${inputCls} max-w-[16rem] flex-1`}
                  />
                  <span className="text-[11px] text-slate-400">{PHASE_LABEL[s.deliveryPhase] ?? s.deliveryPhase}</span>
                  {s.isGoLiveGate && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      <Flag className="h-3 w-3" /> go-live
                    </span>
                  )}
                  {s.isValidationGate && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      <CheckCircle2 className="h-3 w-3" /> confirms value
                    </span>
                  )}
                  {s.isTerminal && (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      <Square className="h-3 w-3" /> final
                    </span>
                  )}
                  <span className="tabular text-[11px] text-slate-400">
                    {s.occupants} {s.occupants === 1 ? 'initiative' : 'initiatives'}
                  </span>
                  <div className="ml-auto flex gap-1.5">
                    {labels[s.key] !== s.label && (
                      <button
                        onClick={() => run(() => renameLifecycleStage({ key: s.key, label: labels[s.key] }), 'Stage renamed.')}
                        disabled={isPending}
                        className="rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                      >
                        Save
                      </button>
                    )}
                    <button
                      onClick={() => run(() => removeLifecycleStage(s.key), 'Stage removed.')}
                      disabled={isPending || s.occupants > 0}
                      title={s.occupants > 0 ? 'Initiatives are currently at this stage' : 'Remove this stage'}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Renaming changes what a stage is called everywhere, including in past history — the underlying record is
              unchanged, so nothing in the audit trail is rewritten.
            </p>
          </div>
        )}
      </SectionCard>

      {/* ── 2. Terminology ───────────────────────────────────────────── */}
      <SectionCard title="2 · What things are called" icon={Type}>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          The product ships with the vocabulary of a regulated bank. Change any of these to what this organization
          actually says. Leave a field blank to keep the shipped word.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TERM_KEYS.map(key => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                {DEFAULT_TERMS[key]}
                <span className="ml-1.5 font-normal text-slate-400">{TERM_HINTS[key]}</span>
              </label>
              <input
                value={termDraft[key] ?? ''}
                onChange={e => setTermDraft(t => ({ ...t, [key]: e.target.value }))}
                placeholder={DEFAULT_TERMS[key]}
                className={inputCls}
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => run(() => saveTerminology(termDraft), 'Vocabulary saved.')}
          disabled={isPending}
          className="mt-4 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save vocabulary'}
        </button>
      </SectionCard>

      {/* ── 3. Modules ───────────────────────────────────────────────── */}
      <SectionCard title="3 · What this workspace uses" icon={ToggleLeft}>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          Switching a module off removes it — the navigation entry, the panel and the ability to record against it.
          An unused feature showing an empty panel is worse than one that is simply not there.
        </p>
        <div className="space-y-2">
          {MODULE_COPY.map(m => {
            const Icon = m.icon;
            const on = moduleDraft[m.key];
            return (
              <button
                key={m.key}
                onClick={() => setModuleDraft(d => ({ ...d, [m.key]: !d[m.key] }))}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  on ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200 bg-white'
                }`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${on ? 'text-brand-600' : 'text-slate-300'}`} />
                <span className="flex-1">
                  <span className={`block text-sm font-medium ${on ? 'text-slate-800' : 'text-slate-500'}`}>
                    {m.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{m.desc}</span>
                </span>
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    on ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {on ? 'On' : 'Off'}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => run(() => saveModules(moduleDraft), 'Modules updated.')}
          disabled={isPending}
          className="mt-4 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save modules'}
        </button>
      </SectionCard>
    </div>
  );
}
