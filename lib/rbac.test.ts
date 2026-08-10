import { describe, it, expect } from 'vitest';
import {
  buildInitiativeVisibilityWhere, isPmoEquivalent, isBusinessEquivalent,
  can, visibilityScope, ROLE_DEFINITIONS, CAPABILITIES,
} from './rbac';

const ORG = 'org-1';
const base = { name: 'Asha Rao', organizationId: ORG };

describe('buildInitiativeVisibilityWhere', () => {
  it('scopes every role to the organization', () => {
    const roles = ['ADMIN', 'CIO', 'PMO', 'PROGRAM_HEAD', 'PROGRAM_MANAGER', 'VERTICAL_HEAD', 'BUSINESS_HEAD', 'BUSINESS'];
    for (const role of roles) {
      const where = buildInitiativeVisibilityWhere({ ...base, role });
      expect(where.organizationId, `${role} must be org-scoped`).toBe(ORG);
    }
  });

  it('gives ADMIN, CIO and PMO the whole organization with no further filter', () => {
    for (const role of ['ADMIN', 'CIO', 'PMO']) {
      const where = buildInitiativeVisibilityWhere({ ...base, role });
      expect(Object.keys(where), `${role} should only filter on organizationId`).toEqual(['organizationId']);
    }
  });

  it('scopes PROGRAM_HEAD to their own program', () => {
    const where = buildInitiativeVisibilityWhere({ ...base, role: 'PROGRAM_HEAD' });
    expect(where.programHeadName).toBe('Asha Rao');
  });

  it('scopes PROGRAM_MANAGER to their own initiatives', () => {
    const where = buildInitiativeVisibilityWhere({ ...base, role: 'PROGRAM_MANAGER' });
    expect(where.programManagerName).toBe('Asha Rao');
  });

  it('scopes BUSINESS_HEAD to their own business portfolio', () => {
    const where = buildInitiativeVisibilityWhere({ ...base, role: 'BUSINESS_HEAD' });
    expect(where.businessHeadName).toBe('Asha Rao');
  });

  it('scopes BUSINESS to initiatives where they are the SPOC', () => {
    const where = buildInitiativeVisibilityWhere({ ...base, role: 'BUSINESS' });
    expect(where.businessSpoc).toBe('Asha Rao');
  });

  it('matches VERTICAL_HEAD on both their vertical key and their own name', () => {
    const where = buildInitiativeVisibilityWhere({
      ...base,
      role: 'VERTICAL_HEAD',
      verticalHead: 'Digital Banking',
    });
    expect(where.verticalHeadName).toEqual({ in: ['Digital Banking', 'Asha Rao'] });
  });

  it('does not produce a duplicate entry when a vertical head key equals their name', () => {
    const where = buildInitiativeVisibilityWhere({
      ...base,
      role: 'VERTICAL_HEAD',
      verticalHead: 'Asha Rao',
    });
    expect(where.verticalHeadName).toEqual({ in: ['Asha Rao'] });
  });

  it('falls back to name only when a vertical head has no vertical key set', () => {
    const where = buildInitiativeVisibilityWhere({ ...base, role: 'VERTICAL_HEAD', verticalHead: null });
    expect(where.verticalHeadName).toEqual({ in: ['Asha Rao'] });
  });

  it('never lets a scoped role fall through to org-wide access', () => {
    const scoped = ['PROGRAM_HEAD', 'PROGRAM_MANAGER', 'VERTICAL_HEAD', 'BUSINESS_HEAD', 'BUSINESS'];
    for (const role of scoped) {
      const where = buildInitiativeVisibilityWhere({ ...base, role, verticalHead: 'V' });
      expect(Object.keys(where).length, `${role} must add a scope beyond organizationId`).toBeGreaterThan(1);
    }
  });

  it('fails closed for an unknown role rather than granting the whole organization', () => {
    // Changed in M4. This used to assert the opposite — an undefined role got
    // full org visibility — which meant adding a Role to the enum and
    // forgetting its definition silently over-shared the entire portfolio.
    // visibilityScope() now falls back to the NARROWEST scope, so the failure
    // mode of a half-finished role is "sees too little", not "sees everything".
    const where = buildInitiativeVisibilityWhere({ ...base, role: 'SOME_FUTURE_ROLE' });
    expect(where).toEqual({ organizationId: base.organizationId, businessSpoc: base.name });
  });

  it('gives every defined role a visibility scope', () => {
    for (const role of Object.keys(ROLE_DEFINITIONS)) {
      expect(visibilityScope(role), role).toBeTruthy();
    }
  });
});

describe('role equivalence helpers', () => {
  it('treats PMO, PROGRAM_HEAD and PROGRAM_MANAGER as PMO-equivalent', () => {
    expect(isPmoEquivalent('PMO')).toBe(true);
    expect(isPmoEquivalent('PROGRAM_HEAD')).toBe(true);
    expect(isPmoEquivalent('PROGRAM_MANAGER')).toBe(true);
  });

  it('does not treat CIO, ADMIN or business roles as PMO-equivalent', () => {
    for (const role of ['CIO', 'ADMIN', 'BUSINESS', 'BUSINESS_HEAD', 'VERTICAL_HEAD']) {
      expect(isPmoEquivalent(role), role).toBe(false);
    }
  });

  it('treats BUSINESS and BUSINESS_HEAD as business-equivalent', () => {
    expect(isBusinessEquivalent('BUSINESS')).toBe(true);
    expect(isBusinessEquivalent('BUSINESS_HEAD')).toBe(true);
  });

  it('is safe against null and undefined', () => {
    expect(isPmoEquivalent(null)).toBe(false);
    expect(isPmoEquivalent(undefined)).toBe(false);
    expect(isBusinessEquivalent(null)).toBe(false);
  });
});


describe('capabilities', () => {
  it('keeps exception approval one tier above the roles that fund work', () => {
    // The whole point of the exception gate: the people who create and sign off
    // initiatives cannot also approve their own below-threshold investments.
    expect(can('CIO', 'APPROVE_EXCEPTION')).toBe(true);
    expect(can('PMO', 'APPROVE_EXCEPTION')).toBe(false);
    expect(can('PROGRAM_HEAD', 'APPROVE_EXCEPTION')).toBe(false);
    expect(can('PROGRAM_MANAGER', 'APPROVE_EXCEPTION')).toBe(false);
  });

  it('does not let the platform administrator run the portfolio', () => {
    // ADMIN configures the workspace and manages users; it is not a delivery role.
    expect(can('ADMIN', 'CONFIGURE_WORKSPACE')).toBe(true);
    expect(can('ADMIN', 'MANAGE_USERS')).toBe(true);
    expect(can('ADMIN', 'MANAGE_PORTFOLIO')).toBe(false);
  });

  it('keeps outcome confirmation on the business side', () => {
    expect(can('BUSINESS', 'VALIDATE_OUTCOME')).toBe(true);
    expect(can('BUSINESS_HEAD', 'VALIDATE_OUTCOME')).toBe(true);
    expect(can('VERTICAL_HEAD', 'VALIDATE_OUTCOME')).toBe(false);
  });

  it('grants nothing to an unknown role', () => {
    for (const capability of CAPABILITIES) {
      expect(can('SOME_FUTURE_ROLE', capability), capability).toBe(false);
    }
  });

  it('only grants capabilities that actually exist', () => {
    for (const [role, def] of Object.entries(ROLE_DEFINITIONS)) {
      for (const capability of def.capabilities) {
        expect(CAPABILITIES, `${role} grants an unknown capability`).toContain(capability);
      }
    }
  });
});

describe('derived role lists still match the shipped roles', () => {
  it('derives PMO-equivalence from MANAGE_PORTFOLIO, excluding the CIO tier', () => {
    // These lists used to be hand-written. Deriving them means a new role with
    // MANAGE_PORTFOLIO is picked up by middleware and requireRole() for free.
    expect(isPmoEquivalent('PMO')).toBe(true);
    expect(isPmoEquivalent('PROGRAM_HEAD')).toBe(true);
    expect(isPmoEquivalent('PROGRAM_MANAGER')).toBe(true);
    expect(isPmoEquivalent('CIO')).toBe(false);
    expect(isPmoEquivalent('BUSINESS')).toBe(false);
  });

  it('derives business-equivalence without pulling in portfolio managers', () => {
    expect(isBusinessEquivalent('BUSINESS')).toBe(true);
    expect(isBusinessEquivalent('BUSINESS_HEAD')).toBe(true);
    expect(isBusinessEquivalent('PMO')).toBe(false);
    expect(isBusinessEquivalent('CIO')).toBe(false);
  });
});
