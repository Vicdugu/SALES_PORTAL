import { NextRequest } from 'next/server';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { notificationBroadcaster, NotificationPayload } from '@/lib/realtime/NotificationBroadcaster';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/notifications/stream
 * Server-Sent Events endpoint for real-time notification delivery.
 * Streams new notification events to all connected clients of the same store.
 */
export async function GET(request: NextRequest) {
  // EventSource cannot send custom headers, so storeId is passed as a query param.
  // Fall back to header/cookie via getStoreId() for server-side callers.
  const storeId =
    request.nextUrl.searchParams.get('storeId') || (await getStoreId());
  if (!storeId) {
    return new Response('Unauthorized - No store ID', { status: 401 });
  }

  const encoder = new TextEncoder();
  let isConnected = true;

  const stream = new ReadableStream({
    async start(controller) {
      // Send connection confirmation
      try {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'connected', storeId, timestamp: Date.now() })}\n\n`
          )
        );
      } catch {
        return;
      }

      // Subscribe to new notification events
      const unsubscribe = notificationBroadcaster.subscribe(
        storeId,
        (payload: NotificationPayload) => {
          if (!isConnected) return;
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'notification', notification: payload, timestamp: Date.now() })}\n\n`
              )
            );
          } catch {
            isConnected = false;
            controller.close();
            unsubscribe();
          }
        }
      );

      // Heartbeat every 25 seconds to keep connection alive through Vercel's 60s limit
      const heartbeat = setInterval(() => {
        if (!isConnected) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`)
          );
        } catch {
          isConnected = false;
          clearInterval(heartbeat);
          controller.close();
          unsubscribe();
        }
      }, 25_000);

      // Cleanup when client disconnects
      return () => {
        isConnected = false;
        clearInterval(heartbeat);
        unsubscribe();
      };
    },

    cancel() {
      isConnected = false;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
