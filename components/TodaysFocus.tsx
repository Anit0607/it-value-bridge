import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface FocusItem {
  label: string;
  href: string;
}

interface Props {
  title: string;
  items: FocusItem[];
}

export function TodaysFocus({ title, items }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white shadow-card">
      <div className="border-b border-brand-100 px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-700">{title}</h2>
      </div>
      <ul className="divide-y divide-brand-50">
        {items.map((item, i) => (
          <li key={i}>
            <Link
              href={item.href}
              className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-brand-50/60"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 font-mono text-[10px] font-bold text-brand-600">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-slate-700 group-hover:text-brand-700">
                  {item.label}
                </span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 transition-colors group-hover:text-brand-500" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
