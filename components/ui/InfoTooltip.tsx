'use client';

import { useId, useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  /** Definition text shown on hover/focus. Keep short — this is a tooltip, not a modal. */
  text: string;
  className?: string;
}

/** Small inline "i" icon that reveals a definition on hover or keyboard focus. */
export function InfoTooltip({ text, className = '' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className={`relative inline-flex ${className}`}>
      <span
        role="button"
        tabIndex={0}
        aria-describedby={tooltipId}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full text-slate-400 outline-none transition-colors hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        <span className="sr-only">What does this mean?</span>
      </span>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-normal normal-case leading-snug text-white shadow-lg"
        >
          {text}
          <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-slate-700 bg-slate-900" aria-hidden />
        </span>
      )}
    </span>
  );
}
