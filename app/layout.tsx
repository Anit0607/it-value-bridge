import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { RoleProvider } from '@/components/RoleProvider';
import { DemoBanner } from '@/components/DemoBanner';
import { EnvironmentBanner } from '@/components/EnvironmentBanner';

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
        {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && <DemoBanner />}
        {/* Non-production marker, read from APP_ENV at runtime (M5). */}
        <EnvironmentBanner />
      </body>
    </html>
  );
}
