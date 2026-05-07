import { useEffect, useCallback, useRef } from 'react';

export type OrderEventType = 'create' | 'statusChange' | 'update' | 'delete';

export interface OrderEvent {
  type: OrderEventType;
  orderId: string;
  storeId: string;
  status?: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

interface SSEMessage {
  type: 'connected' | 'sync' | 'orderEvent' | 'heartbeat';
  event?: OrderEvent;
  events?: OrderEvent[];
  storeId?: string;
  timestamp: number;
}

type OrderEventCallback = (event: OrderEvent) => void;

/**
 * Hook for consuming real-time order updates via SSE
 * 
 * Usage:
 * ```
 * const handleOrderUpdate = (event) => {
 *   console.log(`Order ${event.orderId} status changed to ${event.status}`);
 * };
 * useRealtimeOrders(handleOrderUpdate);
 * ```
 */
export function useRealtimeOrders(onOrderEvent: OrderEventCallback) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const callbackRef = useRef(onOrderEvent);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onOrderEvent;
  }, [onOrderEvent]);

  const connect = useCallback(() => {
    // Don't reconnect if already connected
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      console.log('SSE already connected');
      return;
    }

    try {
      console.log('Establishing SSE connection to /api/orders/stream');
      const eventSource = new EventSource('/api/orders/stream', {
        withCredentials: true,
      });

      eventSource.addEventListener('message', (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          console.log('SSE message received:', message.type);

          if (message.type === 'orderEvent' && message.event) {
            // Call the callback with the event
            callbackRef.current(message.event);
          } else if (message.type === 'sync' && message.events) {
            // For initial sync, we might want to handle it differently
            // For now, treat each event as an individual update
            console.log('Sync received with', message.events.length, 'events');
            message.events.forEach((evt) => {
              callbackRef.current(evt);
            });
          }
          // 'connected' and 'heartbeat' types are informational, no action needed
        } catch (err) {
          console.error('Error parsing SSE message:', err, event.data);
        }
      });

      eventSource.addEventListener('error', (error) => {
        console.error('SSE connection error:', error, 'readyState:', eventSource.readyState);
        if (
          eventSource.readyState === EventSource.CLOSED ||
          error.type === 'error'
        ) {
          eventSource.close();
          eventSourceRef.current = null;
          // Attempt to reconnect after 5 seconds
          console.log('SSE connection closed, retrying in 5 seconds...');
          setTimeout(connect, 5000);
        }
      });

      eventSource.addEventListener('open', () => {
        console.log('SSE connection opened successfully');
      });

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      // Retry connection after 5 seconds
      setTimeout(connect, 5000);
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  // Return a manual reconnect function for debugging/manual reconnection
  return {
    reconnect: connect,
    isConnected:
      eventSourceRef.current?.readyState === EventSource.OPEN ? true : false,
  };
}
