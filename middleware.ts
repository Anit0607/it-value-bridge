import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import { getRoleHome } from '@/lib/rbac';
import type { Role } from '@prisma/client';

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

  const role = user.role as Role;

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

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
