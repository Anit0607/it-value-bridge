import { forwardRef, type TextareaHTMLAttributes } from 'react';

const BASE =
  'w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm ' +
  'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...rest }, ref) => (
    <textarea ref={ref} className={`${BASE} ${className}`} {...rest} />
  ),
);

Textarea.displayName = 'Textarea';
