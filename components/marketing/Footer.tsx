import Link from 'next/link';
import { Layers } from 'lucide-react';

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'PMBOK + Agile', href: '#methodology' },
      { label: 'Portfolio health', href: '#health' },
      { label: 'Reporting', href: '#reporting' },
    ],
  },
  {
    heading: 'Roles',
    links: [
      { label: 'CIO', href: '/sign-in' },
      { label: 'PMO', href: '/sign-in' },
      { label: 'Vertical Head', href: '/sign-in' },
      { label: 'Business SPOC', href: '/sign-in' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Security', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Layers className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <span className="text-base font-semibold tracking-tight text-slate-900">
                IT Value Bridge
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              Portfolio management that translates banking IT delivery into measurable business
              value for leadership.
            </p>
          </div>

          {COLUMNS.map(col => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 sm:flex-row">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} IT Value Bridge. Prototype build.
          </p>
          <p className="text-xs text-slate-400">Built for banking IT portfolio management.</p>
        </div>
      </div>
    </footer>
  );
}
