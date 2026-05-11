import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type BrandingEventType = 'wallpaperUpdate' | 'colorsUpdate' | 'fullUpdate';

export interface BrandingEvent {
  type: BrandingEventType;
  storeId: string;
  backgroundImage?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  timestamp: number;
}

type BrandingEventCallback = (event: BrandingEvent) => void;

/**
 * Hook for consuming real-time branding updates
 * Uses polling as a reliable alternative to SSE
 */
export function useRealtimeBranding(onBrandingEvent?: BrandingEventCallback) {
  const { storeId, updateStore, store } = useAuth();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBrandingRef = useRef<Partial<BrandingEvent> | null>(null);

  const pollBranding = useCallback(async () => {
    if (!storeId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/stores/branding`, {
        headers: {
          'x-store-id': storeId,
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        console.error('[Branding Poll] Failed to fetch branding:', response.status);
        return;
      }

      const data = await response.json();
      if (!data.success || !data.data) {
        return;
      }

      // Check if anything has changed
      const hasChanges = 
        lastBrandingRef.current?.backgroundImage !== data.data.backgroundImage ||
        lastBrandingRef.current?.primaryColor !== data.data.primaryColor ||
        lastBrandingRef.current?.secondaryColor !== data.data.secondaryColor ||
        lastBrandingRef.current?.accentColor !== data.data.accentColor;

      if (hasChanges) {
        console.log('[Branding Poll] Branding changed, updating:', {
          backgroundImage: data.data.backgroundImage ? 'present' : 'null',
          primaryColor: data.data.primaryColor,
        });

        // Update store context
        const updates: Record<string, any> = {
          backgroundImage: data.data.backgroundImage,
          primaryColor: data.data.primaryColor,
          secondaryColor: data.data.secondaryColor,
          accentColor: data.data.accentColor,
        };

        updateStore(updates);

        // Call callback if provided
        if (onBrandingEvent) {
          onBrandingEvent({
            type: 'fullUpdate',
            storeId,
            ...updates,
            timestamp: Date.now(),
          });
        }

        // Update last known state
        lastBrandingRef.current = updates;
      }
    } catch (err) {
      console.error('[Branding Poll] Error fetching branding:', err);
    }
  }, [storeId, updateStore, onBrandingEvent]);

  // Setup polling when component mounts or storeId changes
  useEffect(() => {
    if (!storeId) {
      console.log('[Branding Poll] No storeId, skipping polling');
      return;
    }

    console.log('[Branding Poll] Starting polling for store:', storeId);

    // Initial poll
    pollBranding();

    // Then poll every 10 seconds
    pollingIntervalRef.current = setInterval(pollBranding, 10000);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [storeId, pollBranding]);

  return {
    isActive: !!pollingIntervalRef.current,
  };
}
