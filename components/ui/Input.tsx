import { forwardRef, type InputHTMLAttributes } from 'react';

const BASE =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm ' +
  'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...rest }, ref) => (
    <input ref={ref} className={`${BASE} ${className}`} {...rest} />
  ),
);

Input.displayName = 'Input';
