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

    const stream = new ReadableStream({
      start(ctrl) {
        controller = ctrl;
        
        // Store connection reference
        const connectionKey = `branding-${storeId}-${Date.now()}-${Math.random()}`;
        activeConnections.set(connectionKey, controller);

        // Send initial connection message
        const initMessage = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
        controller.enqueue(encoder.encode(initMessage));

        // Subscribe to branding events for this store
        const unsubscribe = brandingBroadcaster.subscribe(storeId, (event: BrandingEvent) => {
          const message = `event: branding\ndata: ${JSON.stringify(event)}\n\n`;
          try {
            controller.enqueue(encoder.encode(message));
          } catch (err) {
            console.error('Error sending branding event:', err);
          }
        });

        // Cleanup on close
        return () => {
          unsubscribe();
          activeConnections.delete(connectionKey);
        };
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
    console.error('Error setting up branding subscription:', error);
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
