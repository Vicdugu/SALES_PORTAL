'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { BrandingUpdater } from './BrandingUpdater';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrandingUpdater>
          {children}
        </BrandingUpdater>
      </AuthProvider>
    </ThemeProvider>
  );
}
