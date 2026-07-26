'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { parseCsv } from '@/lib/csv';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download } from 'lucide-react';

export function norm(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_]+/g, '');
}

export interface PreviewRow<T> {
  row: T | null;
  raw: string[];
  error?: string;
}

interface CsvImportPanelProps<T> {
  /** Human-readable required/optional column names shown as a hint above the dropzone. */
  columnsHint: ReactNode;
  /** CSV template file content, downloaded verbatim. */
  template: string;
  templateFilename: string;
  /** Column names that must be present in the header row (case/space/underscore-insensitive). */
  requiredHeaders: string[];
  /** Parse one data row into T, or return an error. `col(name)` resolves a normalized header name to its column index. */
  parseRow: (cells: string[], col: (name: string) => number) => { row: T | null; error?: string };
  /** Submit only the successfully-parsed rows. */
  onSubmit: (rows: T[]) => Promise<{ created: number }>;
  entityLabel: string; // singular, e.g. "initiative"
  entityLabelPlural: string; // e.g. "initiatives"
  previewHead: string[];
  renderPreviewRow: (row: T) => ReactNode[];
  /** Optional note rendered below the dropzone, e.g. a dependency on another tab. */
  note?: ReactNode;
  /** Revalidate additional client-visible pages after a successful import (router.refresh() always runs). */
  disabled?: boolean;
  disabledReason?: ReactNode;
}

export function CsvImportPanel<T>({
  columnsHint,
  template,
  templateFilename,
  requiredHeaders,
  parseRow,
  onSubmit,
  entityLabel,
  entityLabelPlural,
  previewHead,
  renderPreviewRow,
  note,
  disabled,
  disabledReason,
}: CsvImportPanelProps<T>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<PreviewRow<T>[]>([]);
  const [parseError, setParseError] = useState('');
  const [done, setDone] = useState<number | null>(null);

  const valid = preview.filter(p => p.row);
  const invalid = preview.filter(p => !p.row);

  const handleFile = async (file: File) => {
    setParseError('');
    setDone(null);
    setPreview([]);
    setFileName(file.name);
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setParseError('File has no data rows.');
      return;
    }

    const header = rows[0].map(norm);
    const col = (name: string) => header.indexOf(norm(name));
    const missing = requiredHeaders.filter(h => col(h) < 0);
    if (missing.length > 0) {
      setParseError(`Missing required columns: ${missing.join(', ')}.`);
      return;
    }

    const parsed: PreviewRow<T>[] = rows.slice(1).map(cells => {
      const { row, error } = parseRow(cells, col);
      return { raw: cells, row, error };
    });
    setPreview(parsed);
  };

  const runImport = () => {
    startTransition(async () => {
      try {
        const res = await onSubmit(valid.map(p => p.row!));
        setDone(res.created);
        setPreview([]);
        router.refresh();
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Import failed. Please try again.');
      }
    });
  };

  const downloadTemplate = () => {
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="text-xs leading-relaxed text-slate-500">{columnsHint}</div>
          <button
            onClick={downloadTemplate}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Template
          </button>
        </div>

        {disabled ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
            <Upload className="h-6 w-6 text-slate-300" />
            <span className="text-sm font-medium text-slate-400">Import disabled</span>
            {disabledReason && <span className="max-w-sm text-xs text-slate-400">{disabledReason}</span>}
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/30">
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{fileName || 'Choose a CSV file'}</span>
            <span className="text-xs text-slate-400">.csv exported from Excel or your source system</span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        )}

        {note && <div className="mt-3 text-xs text-slate-400">{note}</div>}

        {parseError && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            <AlertTriangle className="h-4 w-4" /> {parseError}
          </p>
        )}
        {done != null && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Imported {done} {done !== 1 ? entityLabelPlural : entityLabel} successfully.
          </p>
        )}
      </div>

      {preview.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FileSpreadsheet className="h-4 w-4 text-slate-400" />
              Preview · {valid.length} valid{invalid.length > 0 ? `, ${invalid.length} skipped` : ''}
            </h2>
            <button
              onClick={runImport}
              disabled={isPending || valid.length === 0}
              className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {isPending ? 'Importing…' : `Import ${valid.length} ${valid.length !== 1 ? entityLabelPlural : entityLabel}`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {previewHead.map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 first:pl-5">{h}</th>
                  ))}
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, idx) => (
                  <tr key={idx} className={`border-t border-slate-100 ${!p.row ? 'bg-rose-50/40' : idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    {p.row ? (
                      renderPreviewRow(p.row).map((cell, ci) => (
                        <td key={ci} className="px-4 py-2 text-slate-600 first:pl-5">{cell}</td>
                      ))
                    ) : (
                      <td className="px-5 py-2 text-slate-400" colSpan={previewHead.length}>{p.raw[0] || '—'}</td>
                    )}
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
