import type { Role } from '@prisma/client';

// Enterprise role model (sprint addition): PROGRAM_HEAD, PROGRAM_MANAGER, and
// BUSINESS_HEAD extend the role set without renaming/removing PMO,
// VERTICAL_HEAD, or BUSINESS. They currently reuse the PMO / Business
// dashboards as stand-ins rather than getting dedicated pages.
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/admin',
  CIO: '/cio',
  PMO: '/pmo',
  VERTICAL_HEAD: '/vertical-head',
  BUSINESS: '/business',
  PROGRAM_HEAD: '/pmo',
  PROGRAM_MANAGER: '/pmo',
  BUSINESS_HEAD: '/business',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Platform Administrator',
  CIO: 'Chief Information Officer',
  PMO: 'PMO Manager',
  VERTICAL_HEAD: 'Vertical Head',
  BUSINESS: 'Business SPOC',
  PROGRAM_HEAD: 'Program Head',
  PROGRAM_MANAGER: 'Program Manager',
  BUSINESS_HEAD: 'Business Head',
};

export function getRoleHome(role: Role): string {
  return ROLE_HOME[role] ?? '/sign-in';
}

// Roles with PMO-equivalent authority over initiatives, demands, OKRs, and
// dependencies (create/edit/approve). PROGRAM_HEAD and PROGRAM_MANAGER sit
// alongside PMO this sprint rather than getting a distinct permission tier.
export const PMO_EQUIVALENT_ROLES: Role[] = ['PMO', 'PROGRAM_HEAD', 'PROGRAM_MANAGER'];

// Roles with Business-equivalent value-validation authority. BUSINESS_HEAD
// additionally sees/validates across all SPOCs in the org (not just their
// own items) via the existing org-wide visibility branch in
// listVisibleInitiativesForUser().
export const BUSINESS_EQUIVALENT_ROLES: Role[] = ['BUSINESS', 'BUSINESS_HEAD'];

export function isPmoEquivalent(role: Role | string | undefined | null): boolean {
  return !!role && (PMO_EQUIVALENT_ROLES as string[]).includes(role);
}

export function isBusinessEquivalent(role: Role | string | undefined | null): boolean {
  return !!role && (BUSINESS_EQUIVALENT_ROLES as string[]).includes(role);
}
