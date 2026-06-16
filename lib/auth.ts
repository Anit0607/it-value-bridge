import type { AuthUser } from './types';

const DEMO_ACCOUNTS: Record<string, AuthUser> = {
  'cio@bank.com': {
    email: 'cio@bank.com',
    role: 'cio',
    name: 'Mahesh Iyer',
  },
  'pmo@bank.com': {
    email: 'pmo@bank.com',
    role: 'pmo',
    name: 'Anita Desai',
  },
  'vh@bank.com': {
    email: 'vh@bank.com',
    role: 'vh',
    name: 'Rajesh Kumar',
    verticalHead: 'Rajesh Kumar',
  },
  'business@bank.com': {
    email: 'business@bank.com',
    role: 'business',
    name: 'Suman Bose',
  },
};

export function getUser(email: string): AuthUser | null {
  return DEMO_ACCOUNTS[email] ?? null;
}

export const DEMO_USERS = Object.values(DEMO_ACCOUNTS);
