import type { Role, Prisma } from '@prisma/client';

/**
 * Roles, expressed as capability + visibility scope (docs/ROADMAP.md M4).
 *
 * Before M4 every permission question was asked by NAME — `role === 'CIO'`,
 * `PMO_EQUIVALENT_ROLES.includes(role)`. That works exactly as long as every
 * customer has a CIO and a PMO. An SME has neither, and a bank may want two
 * tiers of program manager.
 *
 * The model here separates the two questions that were tangled together:
 *
 *   WHAT may this person do?    → Capability
 *   WHOSE work may they see?    → VisibilityScope
 *
 * The shipped roles are now DERIVED from that table rather than being the
 * definition. Nothing about the current eight roles changes — that is the
 * point: the same behaviour, expressed so that a ninth role, or a renamed one,
 * is data rather than a code change. Per-organization role definitions become
 * a schema addition on top of this, not another rewrite of every call site.
 */

// ---- Capabilities ----------------------------------------------------------

export const CAPABILITIES = [
  /** Create and edit initiatives, demands, OKRs, dependencies, milestones. */
  'MANAGE_PORTFOLIO',
  /** Advance an initiative through the lifecycle. */
  'ADVANCE_STAGE',
  /** Sign off, propose or approve a value figure. */
  'SIGN_OFF_VALUE',
  /** Approve a below-threshold investment — deliberately one tier above the
   *  roles that fund initiatives day to day. */
  'APPROVE_EXCEPTION',
  /** Confirm that a promised outcome actually happened. */
  'VALIDATE_OUTCOME',
  /** Bulk-import client data. */
  'IMPORT_DATA',
  /** Configure the workspace: lifecycle, terminology, modules, thresholds. */
  'CONFIGURE_WORKSPACE',
  /** Manage users and roles. */
  'MANAGE_USERS',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

// ---- Visibility scope ------------------------------------------------------

/**
 * Whose initiatives a role can see. Always applied on top of the organization
 * boundary — no scope crosses tenants.
 */
export type VisibilityScope =
  | 'ORGANIZATION' // everything in the workspace
  | 'PROGRAM_HEAD' // where they are the program head
  | 'PROGRAM_MANAGER' // where they are the program manager
  | 'VERTICAL' // their technology vertical
  | 'BUSINESS_HEAD' // where they are the business head
  | 'BUSINESS_SPOC'; // where they are the day-to-day business contact

export interface RoleDefinition {
  label: string;
  home: string;
  scope: VisibilityScope;
  capabilities: Capability[];
}

const PORTFOLIO_MANAGER: Capability[] = [
  'MANAGE_PORTFOLIO', 'ADVANCE_STAGE', 'SIGN_OFF_VALUE', 'VALIDATE_OUTCOME', 'IMPORT_DATA',
];

/**
 * The shipped roles.
 *
 * PROGRAM_HEAD and PROGRAM_MANAGER hold the same capabilities as PMO but a
 * narrower scope — that difference used to be invisible, buried in a shared
 * PMO_EQUIVALENT_ROLES list plus a separate switch statement, and it was the
 * source of a real over-sharing bug on the value board.
 */
export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  ADMIN: {
    label: 'Platform Administrator',
    home: '/admin',
    scope: 'ORGANIZATION',
    capabilities: ['CONFIGURE_WORKSPACE', 'MANAGE_USERS', 'SIGN_OFF_VALUE'],
  },
  CIO: {
    label: 'Chief Information Officer',
    home: '/cio',
    scope: 'ORGANIZATION',
    capabilities: [...PORTFOLIO_MANAGER, 'APPROVE_EXCEPTION', 'CONFIGURE_WORKSPACE'],
  },
  PMO: {
    label: 'PMO Manager',
    home: '/pmo',
    scope: 'ORGANIZATION',
    capabilities: PORTFOLIO_MANAGER,
  },
  PROGRAM_HEAD: {
    label: 'Program Head',
    home: '/pmo',
    scope: 'PROGRAM_HEAD',
    capabilities: PORTFOLIO_MANAGER,
  },
  PROGRAM_MANAGER: {
    label: 'Program Manager',
    home: '/pmo',
    scope: 'PROGRAM_MANAGER',
    capabilities: PORTFOLIO_MANAGER,
  },
  VERTICAL_HEAD: {
    label: 'Vertical Head',
    home: '/vertical-head',
    scope: 'VERTICAL',
    capabilities: ['ADVANCE_STAGE'],
  },
  BUSINESS_HEAD: {
    label: 'Business Head',
    home: '/business',
    scope: 'BUSINESS_HEAD',
    capabilities: ['VALIDATE_OUTCOME'],
  },
  BUSINESS: {
    label: 'Business SPOC',
    home: '/business',
    scope: 'BUSINESS_SPOC',
    capabilities: ['VALIDATE_OUTCOME'],
  },
};

export function roleDefinition(role: Role | string | undefined | null): RoleDefinition | null {
  if (!role) return null;
  return ROLE_DEFINITIONS[role as Role] ?? null;
}

/** The single permission question. Prefer this over comparing role names. */
export function can(role: Role | string | undefined | null, capability: Capability): boolean {
  return roleDefinition(role)?.capabilities.includes(capability) ?? false;
}

export function visibilityScope(role: Role | string | undefined | null): VisibilityScope {
  // An unrecognised role sees nothing beyond its own business items — the
  // narrowest scope, so a future role added without a definition fails closed.
  return roleDefinition(role)?.scope ?? 'BUSINESS_SPOC';
}

// ---- Derived views of the table --------------------------------------------

export const ROLE_HOME: Record<Role, string> = Object.fromEntries(
  Object.entries(ROLE_DEFINITIONS).map(([r, d]) => [r, d.home]),
) as Record<Role, string>;

export const ROLE_LABEL: Record<Role, string> = Object.fromEntries(
  Object.entries(ROLE_DEFINITIONS).map(([r, d]) => [r, d.label]),
) as Record<Role, string>;

export function getRoleHome(role: Role): string {
  return ROLE_HOME[role] ?? '/sign-in';
}

const rolesWith = (capability: Capability): Role[] =>
  (Object.keys(ROLE_DEFINITIONS) as Role[]).filter(r => ROLE_DEFINITIONS[r].capabilities.includes(capability));

/**
 * Roles with PMO-equivalent authority over initiatives, demands, OKRs and
 * dependencies. Now derived from MANAGE_PORTFOLIO rather than hand-listed, so
 * a new role granted that capability is included everywhere automatically.
 *
 * Kept as a named export because middleware and requireRole() take role lists.
 * New code should ask `can(role, 'MANAGE_PORTFOLIO')` instead.
 */
export const PMO_EQUIVALENT_ROLES: Role[] = rolesWith('MANAGE_PORTFOLIO').filter(r => r !== 'CIO');

/** Roles that confirm outcomes. Derived from VALIDATE_OUTCOME. */
export const BUSINESS_EQUIVALENT_ROLES: Role[] = rolesWith('VALIDATE_OUTCOME').filter(
  r => !ROLE_DEFINITIONS[r].capabilities.includes('MANAGE_PORTFOLIO'),
);

export function isPmoEquivalent(role: Role | string | undefined | null): boolean {
  return !!role && (PMO_EQUIVALENT_ROLES as string[]).includes(role);
}

export function isBusinessEquivalent(role: Role | string | undefined | null): boolean {
  return !!role && (BUSINESS_EQUIVALENT_ROLES as string[]).includes(role);
}

// ---- Visibility ------------------------------------------------------------

/**
 * The single source of truth for which initiatives a user is allowed to see.
 * Combines the organization boundary with the role's visibility scope — every
 * initiative read (list or single-item) must build its Prisma `where` through
 * this function rather than re-implementing the rules inline.
 *
 * Keyed off VisibilityScope, not the role name: two roles sharing a scope get
 * identical filtering by construction, and a role with no definition falls to
 * the narrowest scope rather than the widest.
 */
export function buildInitiativeVisibilityWhere(user: {
  role: string;
  name: string;
  verticalHead?: string | null;
  organizationId: string;
}): Prisma.InitiativeWhereInput {
  const base: Prisma.InitiativeWhereInput = { organizationId: user.organizationId };

  switch (visibilityScope(user.role)) {
    case 'ORGANIZATION':
      return base;
    case 'PROGRAM_HEAD':
      return { ...base, programHeadName: user.name };
    case 'PROGRAM_MANAGER':
      return { ...base, programManagerName: user.name };
    case 'VERTICAL': {
      const names = [...new Set([user.verticalHead, user.name].filter((v): v is string => !!v))];
      return { ...base, verticalHeadName: { in: names } };
    }
    case 'BUSINESS_HEAD':
      return { ...base, businessHeadName: user.name };
    case 'BUSINESS_SPOC':
      return { ...base, businessSpoc: user.name };
  }
}
