import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { RoleProvider } from '@/components/RoleProvider';
import { StoreProvider } from '@/lib/store';

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
        <RoleProvider>
          <StoreProvider>
            {children}
          </StoreProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
