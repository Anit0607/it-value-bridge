import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { RoleProvider } from '@/components/RoleProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'IT Value Bridge',
  description: 'Banking IT Portfolio Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <SessionProvider>
          <RoleProvider>
            {children}
          </RoleProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
