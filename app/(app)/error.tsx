'use client';

import { useEffect } from 'react';
import { ServerCrash, RefreshCw } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-100">
        <ServerCrash className="h-6 w-6 text-rose-400" strokeWidth={1.75} />
      </div>
      <h1 className="text-lg font-semibold text-slate-800">Could not load portfolio data.</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        An unexpected error occurred while preparing your leadership view. Please retry — if the
        issue persists, contact your administrator.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-slate-400">ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}
