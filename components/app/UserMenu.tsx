'use client';

import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, LogOut } from 'lucide-react';
import { useRole } from '@/components/RoleProvider';
import type { Role } from '@/lib/types';

const ROLE_LABEL: Record<Role, string> = {
  cio: 'Chief Information Officer',
  pmo: 'PMO Manager',
  vh: 'Vertical Head',
  business: 'Business SPOC',
};

export function UserMenu() {
  const { user, logout } = useRole();
  const router = useRouter();

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('');

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate text-sm font-medium text-slate-900">{user.name}</span>
          <span className="block truncate text-[11px] text-slate-500">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-card-hover data-[state=open]:animate-fade-in"
        >
          <div className="px-2.5 py-2">
            <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
            <div className="mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
              {ROLE_LABEL[user.role]}
            </div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
          <DropdownMenu.Item
            onSelect={handleLogout}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 outline-none transition-colors data-[highlighted]:bg-slate-100"
          >
            <LogOut className="h-4 w-4 text-slate-500" strokeWidth={2} />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
