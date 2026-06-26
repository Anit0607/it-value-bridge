import type { ReactNode } from 'react';

export type BadgeTone =
  | 'success'   // emerald — on track, realized, confirmed
  | 'warning'   // amber   — at risk, stale, pending
  | 'danger'    // rose    — critical, overdue, delay
  | 'brand'     // indigo  — platform, action, revenue
  | 'violet'    // violet  — business, customer experience
  | 'sky'       // sky     — UAT, pre-live stages
  | 'slate';    // slate   — neutral, closed, informational

export type BadgeSize = 'sm' | 'md';
export type BadgeVariant = 'soft' | 'solid';

interface BadgeProps {
  tone?: BadgeTone;
  size?: BadgeSize;
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const SOFT: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger:  'bg-rose-50 text-rose-700 ring-rose-600/20',
  brand:   'bg-brand-50 text-brand-700 ring-brand-600/20',
  violet:  'bg-violet-50 text-violet-700 ring-violet-600/20',
  sky:     'bg-sky-50 text-sky-700 ring-sky-600/20',
  slate:   'bg-slate-50 text-slate-600 ring-slate-600/20',
};

const SOLID: Record<BadgeTone, string> = {
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-500 text-white',
  danger:  'bg-rose-600 text-white',
  brand:   'bg-brand-600 text-white',
  violet:  'bg-violet-600 text-white',
  sky:     'bg-sky-600 text-white',
  slate:   'bg-slate-600 text-white',
};

const SIZE: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-1.5 py-0.5 text-[11px]',
};

export function Badge({
  tone = 'slate',
  size = 'md',
  variant = 'soft',
  children,
  className = '',
}: BadgeProps) {
  const colorCls = variant === 'solid' ? SOLID[tone] : `${SOFT[tone]} ring-1 ring-inset`;
  return (
    <span
      className={`inline-flex items-center rounded-md font-medium ${SIZE[size]} ${colorCls} ${className}`}
    >
      {children}
    </span>
  );
}
