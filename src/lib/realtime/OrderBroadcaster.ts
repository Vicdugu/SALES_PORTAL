// Order event broadcaster for real-time updates
// Uses a simple in-memory pub/sub system compatible with Next.js

export type OrderEventType = 'create' | 'statusChange' | 'update' | 'delete';

export interface OrderEvent {
  type: OrderEventType;
  orderId: string;
  storeId: string;
  status?: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

type OrderEventListener = (event: OrderEvent) => void;

class OrderBroadcaster {
  private listeners: Map<string, Set<OrderEventListener>> = new Map();
  private eventBuffer: OrderEvent[] = [];
  private maxBufferSize = 100;

  /**
   * Subscribe to order events for a specific store
   */
  subscribe(storeId: string, listener: OrderEventListener): () => void {
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
   * Broadcast an order event to all subscribers
   */
  broadcast(event: OrderEvent): void {
    const storeListeners = this.listeners.get(event.storeId);
    if (storeListeners && storeListeners.size > 0) {
      storeListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error('Error calling order event listener:', err);
        }
      });
    }

    // Buffer event for new subscribers
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift();
    }
  }

  /**
   * Get recent events for a store (useful for SSE initial sync)
   */
  getRecentEvents(storeId: string, limit: number = 50): OrderEvent[] {
    return this.eventBuffer
      .filter((e) => e.storeId === storeId)
      .slice(-limit);
  }

  /**
   * Clear all listeners (for cleanup)
   */
  clear(): void {
    this.listeners.clear();
    this.eventBuffer = [];
  }
}

// Singleton instance
export const orderBroadcaster = new OrderBroadcaster();
