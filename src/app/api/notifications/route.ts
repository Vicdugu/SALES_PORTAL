import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { verifyToken } from '@/lib/auth/jwt';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { createNotification, NotificationType } from '@/lib/notifications/service';

/**
 * GET /api/notifications
 * Returns all unread + last 20 read notifications for the current store.
 * Requires a valid JWT in Authorization header.
 */
export async function GET(request: NextRequest) {
  try {
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store ID not found'), { status: 401 });
    }

    const [unread, recent] = await Promise.all([
      prisma.notification.findMany({
        where: { storeId, isRead: false },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: { storeId, isRead: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const notifications = [...unread, ...recent];

    return NextResponse.json(
      successResponse({
        notifications,
        unreadCount: unread.length,
      })
    );
  } catch (error) {
    console.error('[GET /api/notifications]', error);
    return NextResponse.json(errorResponse('INTERNAL_ERROR', 'Failed to fetch notifications'), { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Creates a notification. Used by client-side for PAYMENT_ERROR events.
 * Requires authenticated user (any role).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Missing token'), { status: 401 });
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Invalid token'), { status: 401 });
    }

    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store ID not found'), { status: 401 });
    }

    const body = await request.json();
    const { type, title, message, link } = body as {
      type: NotificationType;
      title: string;
      message: string;
      link?: string;
    };

    if (!type || !title || !message) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'type, title, and message are required'),
        { status: 400 }
      );
    }

    await createNotification({ storeId, type, title, message, link });

    return NextResponse.json(successResponse({ created: true }));
  } catch (error) {
    console.error('[POST /api/notifications]', error);
    return NextResponse.json(errorResponse('INTERNAL_ERROR', 'Failed to create notification'), { status: 500 });
  }
}

/**
 * DELETE /api/notifications
 * Clears all read notifications for the current store.
 */
export async function DELETE(request: NextRequest) {
  try {
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store ID not found'), { status: 401 });
    }

    const { count } = await prisma.notification.deleteMany({
      where: { storeId, isRead: true },
    });

    return NextResponse.json(successResponse({ cleared: count }));
  } catch (error) {
    console.error('[DELETE /api/notifications]', error);
    return NextResponse.json(errorResponse('INTERNAL_ERROR', 'Failed to clear notifications'), { status: 500 });
  }
}
