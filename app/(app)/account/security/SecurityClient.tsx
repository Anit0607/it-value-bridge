'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { beginMfaEnrolment, confirmMfaEnrolment, disableMfa } from '@/lib/actions/mfa';
import { SectionCard } from '@/components/ui/SectionCard';
import { ShieldCheck, ShieldOff, KeyRound, Copy, Check, AlertTriangle } from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

export function SecurityClient({
  enabled,
  enabledAt,
  recoveryCodesLeft,
}: {
  enabled: boolean;
  enabledAt: string | null;
  recoveryCodesLeft: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const [disabling, setDisabling] = useState(false);
  const [password, setPassword] = useState('');

  const run = (fn: () => Promise<void>) => {
    setError('');
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  };

  const start = () =>
    run(async () => {
      const enrolment = await beginMfaEnrolment();
      setSecret(enrolment.secret);
      setUri(enrolment.otpauthUri);
      setCodes(null);
    });

  const confirm = () =>
    run(async () => {
      const issued = await confirmMfaEnrolment({ token });
      setCodes(issued);
      setSecret(null);
      setUri(null);
      setToken('');
    });

  const turnOff = () =>
    run(async () => {
      await disableMfa({ password });
      setDisabling(false);
      setPassword('');
      setCodes(null);
    });

  const copyCodes = () => {
    if (!codes) return;
    navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SectionCard title="Two-Factor Authentication" icon={enabled ? ShieldCheck : ShieldOff}>
      {error && <p className="mb-3 text-sm font-medium text-rose-600">{error}</p>}

      {/* Recovery codes — shown once, immediately after enabling */}
      {codes && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <KeyRound className="h-4 w-4" />
            Save these recovery codes now
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            Each one signs you in once if you lose your authenticator. They are stored hashed, so this
            is the only time they can be displayed — there is no way to show them again.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-lg bg-white/70 p-3 font-mono text-xs text-slate-700 sm:grid-cols-3">
            {codes.map(c => <span key={c}>{c}</span>)}
          </div>
          <button
            onClick={copyCodes}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy all'}
          </button>
        </div>
      )}

      {enabled ? (
        <>
          <p className="text-sm text-slate-700">
            Two-factor authentication is <span className="font-semibold text-emerald-700">on</span>
            {enabledAt ? ` since ${enabledAt}` : ''}.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {recoveryCodesLeft} recovery {recoveryCodesLeft === 1 ? 'code' : 'codes'} remaining.
            {recoveryCodesLeft === 0 && ' Turn it off and on again to issue a new set.'}
          </p>

          {disabling ? (
            <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <p className="flex items-start gap-1.5 text-xs text-slate-600">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                Confirm your password. This exists so that someone at an unlocked screen cannot strip
                the second factor off your account.
              </p>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                className={inputCls}
              />
              <div className="flex gap-2">
                <button
                  onClick={turnOff}
                  disabled={isPending || !password}
                  className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                >
                  {isPending ? 'Turning off…' : 'Turn off'}
                </button>
                <button
                  onClick={() => { setDisabling(false); setPassword(''); setError(''); }}
                  className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setDisabling(true); setError(''); }}
              className="mt-4 text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              Turn off two-factor authentication
            </button>
          )}
        </>
      ) : secret && uri ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">Add this account to your authenticator app.</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Setup key — enter manually
            </p>
            <p className="mt-1 break-all font-mono text-sm text-slate-800">{secret}</p>
            <p className="mt-2 text-[11px] text-slate-500">
              Or paste this into an app that accepts a setup URI:
            </p>
            <p className="mt-0.5 break-all font-mono text-[10px] text-slate-500">{uri}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Enter the 6-digit code to confirm
            </label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="123456"
              className={`${inputCls} max-w-[10rem] tabular tracking-widest`}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Confirming with a working code proves the secret reached your app — nothing is enforced
              until it does.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirm}
              disabled={isPending || token.trim().length < 6}
              className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {isPending ? 'Confirming…' : 'Confirm and enable'}
            </button>
            <button
              onClick={() => { setSecret(null); setUri(null); setToken(''); setError(''); }}
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-700">
            Two-factor authentication is <span className="font-semibold text-slate-500">off</span>.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Adds a code from your phone to sign-in. Works with any standard authenticator app —
            Google Authenticator, Microsoft Authenticator, 1Password — and needs no internet
            connection to generate codes.
          </p>
          <button
            onClick={start}
            disabled={isPending}
            className="mt-4 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {isPending ? 'Preparing…' : 'Set up two-factor authentication'}
          </button>
        </>
      )}
    </SectionCard>
  );
}
