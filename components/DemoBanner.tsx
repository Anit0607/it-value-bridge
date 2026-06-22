import { FlaskConical } from 'lucide-react';

/**
 * Subtle "this is a demo" marker, shown only when NEXT_PUBLIC_DEMO_MODE=true
 * (i.e. on the hosted evaluation instance, never on a real on-prem deployment).
 * Fixed bottom-left pill so it never disturbs page layout.
 */
export function DemoBanner() {
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[60]">
      <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/95 px-3 py-1.5 text-[11px] font-medium text-amber-800 shadow-sm backdrop-blur">
        <FlaskConical className="h-3.5 w-3.5" strokeWidth={2} />
        Demo environment — sample data only · don&apos;t enter real information
      </div>
    </div>
  );
}
