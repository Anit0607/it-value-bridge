'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { parseCsv } from '@/lib/csv';
import { importDemands, type ImportRow } from '@/lib/actions/import';
import { BENEFIT_CATEGORY_LABEL, BENEFIT_CATEGORIES, formatInr } from '@/lib/value';
import { PageHeader } from '@/components/PageHeader';
import type { BenefitCategory, DemandPriority } from '@prisma/client';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download } from 'lucide-react';

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_]+/g, '');

const CATEGORY_LOOKUP: Record<string, BenefitCategory> = Object.fromEntries([
  ...BENEFIT_CATEGORIES.map(c => [norm(c), c]),
  ...BENEFIT_CATEGORIES.map(c => [norm(BENEFIT_CATEGORY_LABEL[c]), c]),
]);

const PRIORITY_LOOKUP: Record<string, DemandPriority> = {
  low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL',
};

const TEMPLATE =
  'title,requirement,priority,category,metric,value_cr\n' +
  'WhatsApp banking,Balance & statement over WhatsApp,High,Customer Experience,Reduce call-centre volume,3\n' +
  'Pre-approved loans,Show pre-approved offers on net banking,High,Revenue,Incremental disbursal,25\n';

type PreviewRow = { row: ImportRow | null; raw: string[]; error?: string };

export default function ImportPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [done, setDone] = useState<number | null>(null);

  const valid = preview.filter(p => p.row);
  const invalid = preview.filter(p => !p.row);

  const handleFile = async (file: File) => {
    setParseError(''); setDone(null); setPreview([]);
    setFileName(file.name);
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) { setParseError('File has no data rows.'); return; }

    const header = rows[0].map(norm);
    const col = (name: string) => header.indexOf(norm(name));
    const ci = {
      title: col('title'), requirement: col('requirement'), priority: col('priority'),
      category: col('category'), metric: col('metric'), valueCr: col('value_cr'),
    };
    if (ci.title < 0 || ci.requirement < 0 || ci.category < 0 || ci.metric < 0 || ci.valueCr < 0) {
      setParseError('Missing required columns. Expected: title, requirement, category, metric, value_cr (priority optional).');
      return;
    }

    const parsed: PreviewRow[] = rows.slice(1).map(cells => {
      const get = (idx: number) => (idx >= 0 ? (cells[idx] ?? '').trim() : '');
      const title = get(ci.title);
      const requirement = get(ci.requirement);
      const category = CATEGORY_LOOKUP[norm(get(ci.category))];
      const metricName = get(ci.metric);
      const valueCr = parseFloat(get(ci.valueCr));
      const priority = PRIORITY_LOOKUP[get(ci.priority).toLowerCase()] ?? 'MEDIUM';

      if (!title || !requirement || !metricName) return { raw: cells, row: null, error: 'Missing title / requirement / metric' };
      if (!category) return { raw: cells, row: null, error: `Unknown category "${get(ci.category)}"` };
      if (isNaN(valueCr) || valueCr < 0) return { raw: cells, row: null, error: 'Invalid value_cr' };

      return {
        raw: cells,
        row: { title, requirement, priority, category, metricName, estimatedAnnualValueInr: valueCr * 10_000_000 },
      };
    });
    setPreview(parsed);
  };

  const runImport = () => {
    startTransition(async () => {
      try {
        const res = await importDemands(valid.map(p => p.row!));
        setDone(res.created);
        setPreview([]);
        router.refresh();
      } catch {
        setParseError('Import failed. Please try again.');
      }
    });
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'demand-import-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Import Demands" subtitle="Bulk-load demands from a Jira / Excel export (CSV) — fully on-prem, no external calls">
        <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
          <Download className="h-4 w-4" />
          Template
        </button>
      </PageHeader>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-3 text-xs text-slate-500">
          Required columns: <code className="rounded bg-slate-100 px-1 py-0.5">title</code>,{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5">requirement</code>,{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5">category</code>,{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5">metric</code>,{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5">value_cr</code>. Optional:{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5">priority</code>.
        </div>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/30">
          <Upload className="h-6 w-6 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">{fileName || 'Choose a CSV file'}</span>
          <span className="text-xs text-slate-400">.csv exported from Jira or Excel</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
        {parseError && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            <AlertTriangle className="h-4 w-4" /> {parseError}
          </p>
        )}
        {done != null && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Imported {done} demand{done !== 1 ? 's' : ''} into the funnel.
          </p>
        )}
      </div>

      {preview.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FileSpreadsheet className="h-4 w-4 text-slate-400" />
              Preview · {valid.length} valid{invalid.length > 0 ? `, ${invalid.length} skipped` : ''}
            </h2>
            <button onClick={runImport} disabled={isPending || valid.length === 0} className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
              {isPending ? 'Importing…' : `Import ${valid.length} demand${valid.length !== 1 ? 's' : ''}`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Title</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Category</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Metric</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Value</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, idx) => (
                  <tr key={idx} className={`border-t border-slate-100 ${!p.row ? 'bg-rose-50/40' : idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-5 py-2 text-slate-700">{p.row?.title ?? p.raw[0]}</td>
                    <td className="px-4 py-2 text-slate-600">{p.row ? BENEFIT_CATEGORY_LABEL[p.row.category] : '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{p.row?.metricName ?? '—'}</td>
                    <td className="px-4 py-2 text-right tabular text-slate-700">{p.row ? formatInr(p.row.estimatedAnnualValueInr) : '—'}</td>
                    <td className="px-4 py-2">
                      {p.row ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Valid</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600"><AlertTriangle className="h-3.5 w-3.5" /> {p.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
