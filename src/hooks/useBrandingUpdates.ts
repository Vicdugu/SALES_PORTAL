import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { BrandingEvent } from '@/lib/realtime/BrandingBroadcaster';

/**
 * Hook to listen for real-time branding updates and force page refresh
 * This ensures staff pages immediately reflect any branding changes made by admin
 */
export function useBrandingUpdates() {
  const { storeId } = useAuth();

  useEffect(() => {
    if (!storeId) return;

    // Setup EventSource to listen for branding updates via SSE
    const eventSource = new EventSource(`/api/stores/branding/subscribe?storeId=${storeId}`);

    const handleBrandingUpdate = (event: Event) => {
      try {
        const messageEvent = event as MessageEvent;
        const data: BrandingEvent = JSON.parse(messageEvent.data);
        
        // Verify this is for the current store
        if (data.storeId === storeId) {
          // Force a hard refresh to update all branding across the page
          // This ensures changes like colors and wallpaper are immediately visible
          window.location.reload();
        }
      } catch (err) {
        console.error('Error parsing branding update:', err);
      }
    };

    const handleError = () => {
      console.error('Branding update connection closed');
      eventSource.close();
    };

    eventSource.addEventListener('branding', handleBrandingUpdate);
    eventSource.addEventListener('error', handleError);

    // Cleanup on unmount
    return () => {
      eventSource.removeEventListener('branding', handleBrandingUpdate);
      eventSource.removeEventListener('error', handleError);
      eventSource.close();
    };
  }, [storeId]);
}
