import type { RAG } from '@/lib/types';

interface Props {
  rag: RAG;
  size?: 'sm' | 'md' | 'lg';
}

const DOT: Record<RAG, string> = {
  Green: 'bg-emerald-500',
  Amber: 'bg-amber-500',
  Red: 'bg-rose-500',
};

const PILL: Record<RAG, string> = {
  Green: 'text-emerald-700 bg-emerald-50 ring-emerald-600/20',
  Amber: 'text-amber-700 bg-amber-50 ring-amber-600/20',
  Red: 'text-rose-700 bg-rose-50 ring-rose-600/20',
};

const DOT_SIZE: Record<string, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

export function RagDot({ rag, size = 'md' }: Props) {
  return (
    <span
      className={`inline-block flex-shrink-0 rounded-full ${DOT[rag]} ${DOT_SIZE[size]}`}
      title={rag}
      aria-label={rag}
    />
  );
}

export function RagBadge({ rag, size = 'sm' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PILL[rag]}`}
    >
      <span className={`inline-block rounded-full ${DOT[rag]} ${DOT_SIZE[size]}`} />
      {rag}
    </span>
  );
}
