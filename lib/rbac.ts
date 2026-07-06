import type { Role, Prisma } from '@prisma/client';

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
// additionally validates across every SPOC's items under their business
// (via buildInitiativeVisibilityWhere() below), not just their own.
export const BUSINESS_EQUIVALENT_ROLES: Role[] = ['BUSINESS', 'BUSINESS_HEAD'];

export function isPmoEquivalent(role: Role | string | undefined | null): boolean {
  return !!role && (PMO_EQUIVALENT_ROLES as string[]).includes(role);
}

export function isBusinessEquivalent(role: Role | string | undefined | null): boolean {
  return !!role && (BUSINESS_EQUIVALENT_ROLES as string[]).includes(role);
}

/**
 * The single source of truth for which initiatives a user is allowed to see.
 * Combines the organization boundary with role-based visibility — every
 * initiative read (list or single-item) must build its Prisma `where`
 * through this function rather than re-implementing the rules inline.
 *
 *  ADMIN / CIO / PMO → all initiatives in org
 *  PROGRAM_HEAD      → initiatives where programHeadName = user.name
 *  PROGRAM_MANAGER   → initiatives where programManagerName = user.name
 *  VERTICAL_HEAD     → initiatives where verticalHeadName = user.verticalHead or user.name
 *  BUSINESS_HEAD     → initiatives where businessHeadName = user.name
 *  BUSINESS          → initiatives where businessSpoc = user.name
 */
export function buildInitiativeVisibilityWhere(user: {
  role: string;
  name: string;
  verticalHead?: string | null;
  organizationId: string;
}): Prisma.InitiativeWhereInput {
  const base: Prisma.InitiativeWhereInput = { organizationId: user.organizationId };

  switch (user.role) {
    case 'PROGRAM_HEAD':
      return { ...base, programHeadName: user.name };
    case 'PROGRAM_MANAGER':
      return { ...base, programManagerName: user.name };
    case 'VERTICAL_HEAD': {
      const names = [...new Set([user.verticalHead, user.name].filter((v): v is string => !!v))];
      return { ...base, verticalHeadName: { in: names } };
    }
    case 'BUSINESS_HEAD':
      return { ...base, businessHeadName: user.name };
    case 'BUSINESS':
      return { ...base, businessSpoc: user.name };
    default:
      // ADMIN / CIO / PMO: all initiatives in org, no further filter.
      return base;
  }
}
