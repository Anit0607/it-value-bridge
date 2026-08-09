import { describe, it, expect } from 'vitest';
import { buildInitiativeVisibilityWhere, isPmoEquivalent, isBusinessEquivalent } from './rbac';

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

  it('treats an unknown role as unscoped-within-org, matching the documented default', () => {
    // Guards the switch default: a new Role added to the enum without a case
    // here silently gets full org visibility. If this test ever fails because
    // someone added a role, add an explicit case rather than changing this.
    const where = buildInitiativeVisibilityWhere({ ...base, role: 'SOME_FUTURE_ROLE' });
    expect(Object.keys(where)).toEqual(['organizationId']);
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
