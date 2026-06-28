import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  children?: ReactNode;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:   'bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:opacity-60',
  secondary: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60',
  ghost:     'text-slate-600 hover:bg-slate-100 disabled:opacity-60',
  danger:    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 disabled:opacity-60',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs font-medium',
  md: 'h-9 gap-2 rounded-lg px-4 text-sm font-medium',
};

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
};

/** Class helper for styling <Link> or <a> elements with Button visuals */
export function buttonCls(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra = '') {
  return `inline-flex shrink-0 items-center justify-center transition-colors ${SIZE[size]} ${VARIANT[variant]} ${extra}`.trim();
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      icon: Icon,
      iconPosition = 'left',
      loading = false,
      disabled,
      children,
      className = '',
      ...rest
    },
    ref,
  ) => {
    const iconCls = ICON_SIZE[size];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex shrink-0 items-center justify-center transition-colors ${SIZE[size]} ${VARIANT[variant]} ${className}`}
        {...rest}
      >
        {loading ? (
          <Loader2 className={`animate-spin ${iconCls}`} />
        ) : Icon && iconPosition === 'left' ? (
          <Icon className={iconCls} strokeWidth={2} />
        ) : null}
        {children}
        {!loading && Icon && iconPosition === 'right' && (
          <Icon className={iconCls} strokeWidth={2} />
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
