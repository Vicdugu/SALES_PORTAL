import { orderBroadcaster, OrderEvent } from '@/lib/realtime/OrderBroadcaster';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max 60 seconds for SSE connection

/**
 * Server-Sent Events endpoint for real-time order updates
 * Streams order events (create, statusChange, update, delete) to connected clients
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[SSE] Connection attempt from client');
    const storeId = await getStoreId();
    
    if (!storeId) {
      console.log('[SSE] No storeId found, returning 401');
      return new Response('Unauthorized - No store ID', { status: 401 });
    }

    console.log('[SSE] Store authenticated:', storeId);

    // Create SSE response with proper headers
    const encoder = new TextEncoder();
    let isConnected = true;

    const responseStream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        try {
          console.log('[SSE] Sending connection confirmation');
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'connected',
                storeId,
                timestamp: Date.now(),
              })}\n\n`
            )
          );

          // Send recent events for initial sync (last 10 events)
          const recentEvents = orderBroadcaster.getRecentEvents(storeId, 10);
          if (recentEvents.length > 0) {
            console.log('[SSE] Sending', recentEvents.length, 'recent events');
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'sync',
                  events: recentEvents,
                  timestamp: Date.now(),
                })}\n\n`
              )
            );
          }
        } catch (err) {
          console.error('[SSE] Error sending initial messages:', err);
        }

        // Subscribe to order events
        const unsubscribe = orderBroadcaster.subscribe(
          storeId,
          (event: OrderEvent) => {
            if (!isConnected) return;

            console.log('[SSE] Broadcasting event to client:', event.type, event.orderId);
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'orderEvent',
                    event,
                    timestamp: Date.now(),
                  })}\n\n`
                )
              );
            } catch (err) {
              console.error('[SSE] Error sending event:', err);
              isConnected = false;
              controller.close();
              unsubscribe();
            }
          }
        );

        console.log('[SSE] Client subscribed, listening for events');

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeat = setInterval(() => {
          if (!isConnected) {
            clearInterval(heartbeat);
            return;
          }

          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'heartbeat',
                  timestamp: Date.now(),
                })}\n\n`
              )
            );
          } catch (err) {
            console.error('[SSE] Error sending heartbeat:', err);
            isConnected = false;
            clearInterval(heartbeat);
            controller.close();
            unsubscribe();
          }
        }, 30000);

        // Cleanup on connection close
        const cleanup = () => {
          console.log('[SSE] Client disconnected');
          isConnected = false;
          clearInterval(heartbeat);
          unsubscribe();
        };

        request.signal.addEventListener('abort', cleanup);
      },

      cancel() {
        console.log('[SSE] Stream cancelled by client');
        isConnected = false;
      },
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering in proxies
      },
    });
  } catch (error) {
    console.error('[SSE] Fatal error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
