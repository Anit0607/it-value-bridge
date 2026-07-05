import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import { getRoleHome, PMO_EQUIVALENT_ROLES, BUSINESS_EQUIVALENT_ROLES } from '@/lib/rbac';
import type { Role } from '@/lib/types';

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ['/', '/sign-in', '/sign-up'];

// ── Route access matrix ───────────────────────────────────────────────────────
// Each entry defines which roles are ALLOWED on that path prefix.
// ADMIN is granted full access before this table is checked.
// More-specific paths (e.g. /items/[id]/edit) must be checked before
// their parent prefix (/items).

type RouteRule = { path: string; allow: Role[] };

const ROUTE_RULES: RouteRule[] = [
  // Platform admin — ADMIN only
  { path: '/admin',         allow: ['ADMIN'] },

  // CIO — leadership dashboards
  { path: '/cio',           allow: ['CIO'] },

  // PMO — governance control tower (also reused by PROGRAM_HEAD / PROGRAM_MANAGER)
  { path: '/pmo',           allow: PMO_EQUIVALENT_ROLES },

  // Vertical Head — delivery workspace
  { path: '/vertical-head', allow: ['VERTICAL_HEAD'] },

  // Business SPOC — validation/demand views (also reused by BUSINESS_HEAD)
  { path: '/business',      allow: BUSINESS_EQUIVALENT_ROLES },

  // Leadership + intelligence — CIO and PMO-equivalent
  { path: '/value',         allow: ['CIO', ...PMO_EQUIVALENT_ROLES] },
  { path: '/okrs',          allow: ['CIO', ...PMO_EQUIVALENT_ROLES] },
  { path: '/report',        allow: ['CIO', ...PMO_EQUIVALENT_ROLES] },

  // Governance tools — CIO and PMO-equivalent
  { path: '/import',        allow: PMO_EQUIVALENT_ROLES },

  // Dependencies — everyone except BUSINESS
  { path: '/dependencies',  allow: ['CIO', ...PMO_EQUIVALENT_ROLES, 'VERTICAL_HEAD'] },

  // Initiative edit — governance owners only (not BUSINESS / VH)
  { path: '/items/',        allow: ['CIO', ...PMO_EQUIVALENT_ROLES, 'VERTICAL_HEAD', ...BUSINESS_EQUIVALENT_ROLES] },
  // Note: /items/[id]/edit and /items/[id]/validate are handled below
  // before the /items/ prefix is matched.
];

// Sub-routes with narrower access
const ITEM_EDIT_RE     = /^\/items\/[^/]+\/edit(\/.*)?$/;
const ITEM_VALIDATE_RE = /^\/items\/[^/]+\/validate(\/.*)?$/;

export default auth(req => {
  const { pathname } = req.nextUrl;

  // Allow public paths and Next.js internals
  const isPublic =
    PUBLIC_PATHS.some(p => pathname === p) ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.');

  if (isPublic) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) return NextResponse.redirect(new URL('/sign-in', req.url));

  const roleStr = user.role as string;
  const role    = roleStr as Role;

  // ADMIN bypasses all route guards
  if (roleStr === 'ADMIN') return NextResponse.next();

  // ── Fine-grained item sub-routes (checked before prefix /items/) ──────────

  // /items/[id]/edit — PMO-equivalent and CIO only
  if (ITEM_EDIT_RE.test(pathname)) {
    if (!(['CIO', ...PMO_EQUIVALENT_ROLES] as string[]).includes(roleStr)) {
      return NextResponse.redirect(new URL(getRoleHome(role), req.url));
    }
    return NextResponse.next();
  }

  // /items/[id]/validate — Business-equivalent, PMO-equivalent, CIO
  if (ITEM_VALIDATE_RE.test(pathname)) {
    if (!(['CIO', ...PMO_EQUIVALENT_ROLES, ...BUSINESS_EQUIVALENT_ROLES] as string[]).includes(roleStr)) {
      return NextResponse.redirect(new URL(getRoleHome(role), req.url));
    }
    return NextResponse.next();
  }

  // ── Route rules table ─────────────────────────────────────────────────────
  for (const rule of ROUTE_RULES) {
    if (pathname.startsWith(rule.path)) {
      if (!(rule.allow as string[]).includes(roleStr)) {
        return NextResponse.redirect(new URL(getRoleHome(role), req.url));
      }
      return NextResponse.next();
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
