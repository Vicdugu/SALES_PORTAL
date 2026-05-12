'use client';

import { ReactNode } from 'react';
import { useRealtimeBranding } from '@/hooks/useRealtimeBranding';

/**
 * BrandingUpdater component - Sets up real-time branding update listener
 * Ensures store branding settings are kept in sync across the app
 */
export function BrandingUpdater({ children }: { children: ReactNode }) {
  // Initialize the real-time branding listener
  useRealtimeBranding();

  return <>{children}</>;
}
