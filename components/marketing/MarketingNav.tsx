'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, Menu, X } from 'lucide-react';

const LINKS = [
  { href: '#platform', label: 'Platform' },
  { href: '#value-intelligence', label: 'Value Intelligence' },
  { href: '#roles', label: 'Role Views' },
  { href: '#reports', label: 'Leadership Reports' },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <Layers className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-900">
            IT Value Bridge
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/sign-in"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            View Demo
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
              <Link
                href="/sign-in"
                className="rounded-lg px-3 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Sign in
              </Link>
              <Link
                href="/sign-in"
                className="rounded-lg bg-brand-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
              >
                View Demo
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
