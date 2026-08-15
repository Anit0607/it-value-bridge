import { FlaskConical, ServerCog } from 'lucide-react';
import { appEnv, environmentBanner } from '@/lib/env';

/**
 * Marks non-production instances (docs/ROADMAP.md M5).
 *
 * The point of a separate staging environment is defeated the moment someone
 * cannot tell which one they are looking at — a screenshot of staging figures
 * presented in a board pack is a real and unglamorous failure mode.
 *
 * Deliberately server-rendered from APP_ENV rather than a NEXT_PUBLIC_ variable:
 * a public variable is baked in at build time, so one image could not then be
 * promoted from staging to production without rebuilding. This reads the
 * runtime environment, which is what actually differs between the two.
 *
 * Renders nothing in production.
 */
export function EnvironmentBanner() {
  const env = appEnv();
  const label = environmentBanner(env);
  if (!label) return null;

  const staging = env === 'staging';
  const Icon = staging ? ServerCog : FlaskConical;

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[60]">
      <div
        className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur ${
          staging
            ? 'border-violet-300 bg-violet-50/95 text-violet-800'
            : 'border-slate-300 bg-slate-50/95 text-slate-700'
        }`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {label}
      </div>
    </div>
  );
}
