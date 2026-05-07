import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { HideDevTools } from '@/components/HideDevTools';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sales Portal',
  description: 'Multi-tenant fast-food sales management system by Questbridge Ltd',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <HideDevTools />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
