// Branding event broadcaster for real-time store branding updates
// Uses a simple in-memory pub/sub system compatible with Next.js

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

type BrandingEventListener = (event: BrandingEvent) => void;

class BrandingBroadcaster {
  private listeners: Map<string, Set<BrandingEventListener>> = new Map();
  private eventBuffer: BrandingEvent[] = [];
  private maxBufferSize = 50;

  /**
   * Subscribe to branding events for a specific store
   */
  subscribe(storeId: string, listener: BrandingEventListener): () => void {
    if (!this.listeners.has(storeId)) {
      this.listeners.set(storeId, new Set());
    }
    this.listeners.get(storeId)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(storeId)?.delete(listener);
    };
  }

  /**
   * Broadcast a branding event to all subscribers
   */
  broadcast(event: BrandingEvent): void {
    const storeListeners = this.listeners.get(event.storeId);
    if (storeListeners && storeListeners.size > 0) {
      storeListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error('Error calling branding event listener:', err);
        }
      });
    }

    // Buffer the event for late subscribers
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift();
    }
  }

  /**
   * Get buffered events for a store (useful for initial sync)
   */
  getBufferedEvents(storeId: string): BrandingEvent[] {
    return this.eventBuffer.filter((event) => event.storeId === storeId);
  }

  /**
   * Clear listeners for a store
   */
  clearStore(storeId: string): void {
    this.listeners.delete(storeId);
  }
}

export const brandingBroadcaster = new BrandingBroadcaster();
