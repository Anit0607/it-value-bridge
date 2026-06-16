'use client';

import { Menu, Layers } from 'lucide-react';
import { UserMenu } from './UserMenu';

/**
 * Mobile-only top bar for the authenticated app. On lg+ the fixed sidebar
 * (with its pinned profile + sign-out) takes over, so this stays hidden to
 * preserve vertical density on desktop.
 */
export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white">
            <Layers className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="text-sm font-semibold text-slate-900">IT Value Bridge</span>
        </div>
      </div>
      <UserMenu />
    </header>
  );
}
