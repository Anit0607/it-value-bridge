import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';

const BASE =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm ' +
  'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', children, ...rest }, ref) => (
    <select ref={ref} className={`${BASE} ${className}`} {...rest}>
      {children}
    </select>
  ),
);

Select.displayName = 'Select';
