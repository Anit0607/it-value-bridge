import { AlertTriangle, Lock, Inbox, ServerCrash, RefreshCw } from 'lucide-react';

type Variant = 'empty' | 'no-data' | 'error' | 'no-access';

interface Props {
  variant: Variant;
  message?: string;
  onRetry?: () => void;
}

const DEFAULTS: Record<Variant, { icon: React.ElementType; title: string; sub: string; iconCls: string; wrapCls: string }> = {
  empty: {
    icon: Inbox,
    title: 'No initiatives match the current filters.',
    sub: 'Try clearing a filter or adjusting your selection.',
    iconCls: 'text-slate-400',
    wrapCls: 'border-dashed border-slate-200 bg-white',
  },
  'no-data': {
    icon: Inbox,
    title: 'No initiatives have been registered for this period.',
    sub: 'Ask your PMO to register initiatives or change the date range.',
    iconCls: 'text-slate-400',
    wrapCls: 'border-dashed border-slate-200 bg-white',
  },
  error: {
    icon: ServerCrash,
    title: 'Could not load portfolio data.',
    sub: 'Please retry. If the issue persists, contact your administrator.',
    iconCls: 'text-rose-400',
    wrapCls: 'border-rose-100 bg-rose-50/40',
  },
  'no-access': {
    icon: Lock,
    title: 'This role does not have access to this leadership view.',
    sub: 'Sign in with a different role to view this section.',
    iconCls: 'text-amber-400',
    wrapCls: 'border-amber-100 bg-amber-50/40',
  },
};

export function StateCard({ variant, message, onRetry }: Props) {
  const d = DEFAULTS[variant];
  const Icon = d.icon;
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border px-6 py-16 text-center ${d.wrapCls}`}>
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100`}>
        <Icon className={`h-5 w-5 ${d.iconCls}`} strokeWidth={1.75} />
      </div>
      <p className="text-sm font-semibold text-slate-800">{message ?? d.title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{d.sub}</p>
      {variant === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
