import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
  interface User {
    role: Role;
    verticalHead?: string | null;
    organizationId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      verticalHead?: string | null;
      organizationId?: string | null;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: Role;
    verticalHead?: string | null;
    organizationId?: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Future enforcement — enable once all users are linked to an org:
        // if (!user.organizationId) throw new Error('User is not assigned to a workspace');

        return {
          id:             user.id,
          email:          user.email,
          name:           user.name,
          role:           user.role,
          verticalHead:   user.verticalHead   ?? null,
          organizationId: user.organizationId ?? null,
        };
      },
    }),
  ],
});
