import { NextRequest, NextResponse } from 'next/server';
import { brandingBroadcaster, type BrandingEvent } from '@/lib/realtime/BrandingBroadcaster';

// Map to track active SSE connections
const activeConnections = new Map<string, ReadableStreamDefaultController>();

/**
 * GET /api/stores/branding/subscribe - Server-Sent Events endpoint for real-time branding updates
 * Clients connect here and receive branding update events in real-time
 */
export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    // Setup SSE response
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController;
    let isStreamClosed = false;

    const stream = new ReadableStream({
      start(ctrl) {
        controller = ctrl;
        
        // Store connection reference
        const connectionKey = `branding-${storeId}-${Date.now()}-${Math.random()}`;
        activeConnections.set(connectionKey, controller);

        console.log('[Branding SSE] Client connected for store:', storeId);

        // Send initial connection message
        try {
          const initMessage = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
          controller.enqueue(encoder.encode(initMessage));
        } catch (err) {
          console.error('[Branding SSE] Error sending initial message:', err);
          isStreamClosed = true;
          return;
        }

        // Subscribe to branding events for this store
        const unsubscribe = brandingBroadcaster.subscribe(storeId, (event: BrandingEvent) => {
          if (isStreamClosed) {
            console.log('[Branding SSE] Stream closed, skipping event');
            return;
          }

          try {
            const message = `event: branding\ndata: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(message));
            console.log('[Branding SSE] Event sent for store:', storeId);
          } catch (err) {
            console.error('[Branding SSE] Error sending branding event:', err);
            isStreamClosed = true;
          }
        });

        // Cleanup on close
        return () => {
          console.log('[Branding SSE] Stream cleanup for store:', storeId);
          isStreamClosed = true;
          unsubscribe();
          activeConnections.delete(connectionKey);
        };
      },
      cancel() {
        console.log('[Branding SSE] Stream cancelled');
        isStreamClosed = true;
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[Branding SSE] Error setting up branding subscription:', error);
    return NextResponse.json(
      { error: 'Failed to setup subscription' },
      { status: 500 }
    );
  }
}

/**
 * Broadcast a branding update to all connected clients
 * Called internally from branding update endpoints
 */
export function broadcastBrandingUpdate(event: BrandingEvent) {
  brandingBroadcaster.broadcast(event);
}
