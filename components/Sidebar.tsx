'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from './RoleProvider';
import type { Role } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Briefcase,
  CheckSquare,
  FileBarChart,
  TrendingUp,
  Lightbulb,
  LogOut,
  Layers,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/cio', label: 'Dashboard', icon: LayoutDashboard, roles: ['CIO'] },
  { href: '/pmo', label: 'Portfolio', icon: ClipboardList, roles: ['PMO'] },
  { href: '/pmo/new', label: 'New Item', icon: PlusCircle, roles: ['PMO'] },
  { href: '/vertical-head', label: 'My Portfolio', icon: Briefcase, roles: ['VERTICAL_HEAD'] },
  { href: '/business', label: 'My Items', icon: CheckSquare, roles: ['BUSINESS'] },
  { href: '/demands', label: 'Demands', icon: Lightbulb, roles: ['CIO', 'PMO', 'VERTICAL_HEAD', 'BUSINESS'] },
  { href: '/value', label: 'Value Board', icon: TrendingUp, roles: ['CIO', 'PMO'] },
  { href: '/report', label: 'Monthly Report', icon: FileBarChart, roles: ['CIO', 'PMO'] },
];

const ROLE_LABEL: Record<Role, string> = {
  CIO: 'Chief Information Officer',
  PMO: 'PMO Manager',
  VERTICAL_HEAD: 'Vertical Head',
  BUSINESS: 'Business SPOC',
};

export function Sidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const { user, logout } = useRole();
  const pathname = usePathname();

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter(n => n.roles.includes(user.role));

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('');

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 text-slate-300 transition-transform duration-200 lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
          <Layers className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">IT Value Bridge</div>
          <div className="text-[11px] text-slate-400">Portfolio Management</div>
        </div>
      </div>

      <div className="mx-5 border-t border-white/5" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Menu
        </p>
        <div className="space-y-0.5">
          {visibleItems.map(item => {
            const active =
              pathname === item.href ||
              (item.href !== '/pmo/new' && pathname.startsWith(item.href + '/'));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] flex-shrink-0 ${
                    active ? 'text-white' : 'text-slate-500 group-hover:text-slate-200'
                  }`}
                  strokeWidth={2}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User profile */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium text-white">{user.name}</div>
            <div className="truncate text-[11px] text-slate-400">{ROLE_LABEL[user.role]}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
