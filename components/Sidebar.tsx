'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from './RoleProvider';
import { PMO_EQUIVALENT_ROLES, BUSINESS_EQUIVALENT_ROLES } from '@/lib/rbac';
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
  Target,
  Upload,
  Link2,
  LogOut,
  Layers,
  Settings,
  Users,
  AlertTriangle,
  Building2,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Command',
    items: [
      { href: '/cio', label: 'Executive View', icon: LayoutDashboard, roles: ['CIO'] },
      { href: '/pmo', label: 'Program / Governance View', icon: ClipboardList, roles: PMO_EQUIVALENT_ROLES },
    ],
  },
  {
    label: 'Governance',
    items: [
      { href: '/pmo/new', label: 'New Initiative', icon: PlusCircle, roles: PMO_EQUIVALENT_ROLES },
      { href: '/demands', label: 'Demands', icon: Lightbulb, roles: ['CIO', ...PMO_EQUIVALENT_ROLES, 'VERTICAL_HEAD', ...BUSINESS_EQUIVALENT_ROLES] },
      { href: '/dependencies', label: 'Dependencies', icon: Link2, roles: ['CIO', ...PMO_EQUIVALENT_ROLES, 'VERTICAL_HEAD'] },
    ],
  },
  {
    label: 'Value Intelligence',
    items: [
      { href: '/value', label: 'Value Board', icon: TrendingUp, roles: ['CIO', ...PMO_EQUIVALENT_ROLES] },
      { href: '/okrs', label: 'Strategic OKRs', icon: Target, roles: ['CIO', ...PMO_EQUIVALENT_ROLES] },
      { href: '/report', label: 'Value Report', icon: FileBarChart, roles: ['CIO', ...PMO_EQUIVALENT_ROLES] },
    ],
  },
  {
    label: 'Validation',
    items: [
      { href: '/vertical-head', label: 'Delivery Ownership View', icon: Briefcase, roles: ['VERTICAL_HEAD'] },
      { href: '/business', label: 'Business View', icon: CheckSquare, roles: BUSINESS_EQUIVALENT_ROLES },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/import', label: 'Import', icon: Upload, roles: PMO_EQUIVALENT_ROLES },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/admin', label: 'Workspace Settings', icon: Settings, roles: ['ADMIN'] },
      { href: '/admin/workspace', label: 'Workspace', icon: Building2, roles: ['ADMIN'] },
      { href: '/admin/users', label: 'User Management', icon: Users, roles: ['ADMIN'] },
      { href: '/admin/pilot-readiness', label: 'Pilot Readiness', icon: CheckSquare, roles: ['ADMIN'] },
      { href: '/admin/known-limitations', label: 'Known Limitations', icon: AlertTriangle, roles: ['ADMIN'] },
      { href: '/cio', label: 'CIO Dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
      { href: '/pmo', label: 'PMO Dashboard', icon: ClipboardList, roles: ['ADMIN'] },
    ],
  },
];

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  CIO: 'CIO',
  PMO: 'PMO',
  VERTICAL_HEAD: 'Vertical Head',
  BUSINESS: 'Business SPOC',
  PROGRAM_HEAD: 'Program Head',
  PROGRAM_MANAGER: 'Program Manager',
  BUSINESS_HEAD: 'Business Head',
};

const ROLE_ACCESS: Record<Role, string> = {
  ADMIN: 'Admin',
  CIO: 'Executive View',
  PMO: 'Program / Governance View',
  VERTICAL_HEAD: 'Delivery Ownership View',
  BUSINESS: 'Business View',
  PROGRAM_HEAD: 'Program / Governance View',
  PROGRAM_MANAGER: 'Program / Governance View',
  BUSINESS_HEAD: 'Business View',
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

  const visibleGroups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => i.roles.includes(user.role)) }))
    .filter(g => g.items.length > 0);

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('');

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/5 bg-navy-900 text-slate-300 transition-transform duration-200 lg:translate-x-0 ${
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
          <div className="text-[11px] text-slate-400">
            {process.env.NEXT_PUBLIC_WORKSPACE_NAME ?? 'Value Intelligence'}
          </div>
        </div>
      </div>

      <div className="mx-5 border-t border-white/5" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {visibleGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-6' : ''}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
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
                        ? 'bg-brand-600/95 text-white shadow-sm'
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
          </div>
        ))}
      </nav>

      {/* User profile */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium text-white">{user.name}</div>
            <div className="text-[11px] text-slate-400">
              <span className="text-slate-500">Role:</span> {ROLE_LABEL[user.role]}
            </div>
            <div className="truncate text-[10px] text-slate-500">{ROLE_ACCESS[user.role]}</div>
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
