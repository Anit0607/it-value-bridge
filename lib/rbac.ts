import type { Role } from '@prisma/client';

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/admin',
  CIO: '/cio',
  PMO: '/pmo',
  VERTICAL_HEAD: '/vertical-head',
  BUSINESS: '/business',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Platform Administrator',
  CIO: 'Chief Information Officer',
  PMO: 'PMO Manager',
  VERTICAL_HEAD: 'Vertical Head',
  BUSINESS: 'Business SPOC',
};

export function getRoleHome(role: Role): string {
  return ROLE_HOME[role] ?? '/sign-in';
}
