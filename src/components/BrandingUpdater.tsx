'use client';

import { ReactNode, useEffect } from 'react';
import { useRealtimeBranding } from '@/hooks/useRealtimeBranding';
import { useAuth } from '@/contexts/AuthContext';

/**
 * BrandingUpdater component - Sets up real-time branding update listener
 * Ensures store branding settings are kept in sync across the app
 */
export function BrandingUpdater({ children }: { children: ReactNode }) {
  const { store, storeId } = useAuth();

  // Initialize the real-time branding listener
  useRealtimeBranding();

  // Log store data for debugging
  useEffect(() => {
    if (store) {
      console.log('[BrandingUpdater] Current store branding:', {
        storeId,
        backgroundImage: store.backgroundImage ? 'present' : 'null',
        primaryColor: store.primaryColor,
        secondaryColor: store.secondaryColor,
        accentColor: store.accentColor,
      });
    }
  }, [store, storeId]);

  return <>{children}</>;
}
