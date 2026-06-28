import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import { getRoleHome } from '@/lib/rbac';
import type { Role } from '@/lib/types';

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ['/', '/sign-in', '/sign-up'];

export default auth(req => {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some(p => pathname === p) ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.');

  if (isPublic) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Use string for the ADMIN check (enum not yet in DB; migration pending)
  const roleStr = user.role as string;
  const role = roleStr as Role;

  // ADMIN has full access to all dashboards and pages
  if (roleStr === 'ADMIN') return NextResponse.next();

  if (pathname.startsWith('/admin') && roleStr !== 'ADMIN') {
    return NextResponse.redirect(new URL(getRoleHome(role), req.url));
  }
  if (pathname.startsWith('/cio') && role !== 'CIO') {
    return NextResponse.redirect(new URL(getRoleHome(role), req.url));
  }
  if (pathname.startsWith('/pmo') && role !== 'PMO') {
    return NextResponse.redirect(new URL(getRoleHome(role), req.url));
  }
  if (pathname.startsWith('/vertical-head') && role !== 'VERTICAL_HEAD') {
    return NextResponse.redirect(new URL(getRoleHome(role), req.url));
  }
  if (pathname.startsWith('/business') && role !== 'BUSINESS') {
    return NextResponse.redirect(new URL(getRoleHome(role), req.url));
  }
  // Board value dashboard, OKR catalog and import are leadership-only (CIO + PMO).
  if (
    (pathname.startsWith('/value') || pathname.startsWith('/okrs') || pathname.startsWith('/import')) &&
    role !== 'CIO' &&
    role !== 'PMO'
  ) {
    return NextResponse.redirect(new URL(getRoleHome(role), req.url));
  }
  // Dependency view is for delivery owners (CIO + PMO + Vertical Head), not business.
  if (pathname.startsWith('/dependencies') && role === 'BUSINESS') {
    return NextResponse.redirect(new URL(getRoleHome(role), req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
