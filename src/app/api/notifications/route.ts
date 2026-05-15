import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withTenantContext } from '@/lib/db/tenant-context';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { createNotification, NotificationType } from '@/lib/notifications/service';

/** Extract the authenticated userId from the request, or return null. */
function getUserId(request: NextRequest): string | null {
  const token = getTokenFromHeader(request.headers.get('Authorization'));
  if (!token) return null;
  return verifyToken(token)?.userId ?? null;
}

/**
 * GET /api/notifications
 * Returns notifications for the current store that this user has NOT dismissed.
 * Unread = no NotificationRead row for this user.
 * Read   = NotificationRead row exists with no dismissedAt.
 */
export async function GET(request: NextRequest) {
  try {
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store ID not found'), { status: 401 });
    }
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Missing token'), { status: 401 });
    }

    // Fetch recent notifications for this store (last 60 to keep response small)
    const allNotifications = await withTenantContext(storeId, (tx) =>
      tx.notification.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        take: 60,
        include: {
          reads: {
            where: { userId },
            select: { readAt: true, dismissedAt: true },
          },
        },
      })
    );

    // Attach per-user isRead / filter out dismissed ones
    const visible = allNotifications
      .filter((n) => {
        const userRead = n.reads[0];
        return !userRead?.dismissedAt; // hide dismissed
      })
      .map((n) => {
        const userRead = n.reads[0];
        return {
          id: n.id,
          storeId: n.storeId,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          category: n.category,
          createdAt: n.createdAt,
          isRead: !!userRead,
          readAt: userRead?.readAt ?? null,
        };
      });

    return NextResponse.json(
      successResponse({
        notifications: visible,
        unreadCount: visible.filter((n) => !n.isRead).length,
      })
    );
  } catch (error) {
    console.error('[GET /api/notifications]', error);
    return NextResponse.json(errorResponse('INTERNAL_ERROR', 'Failed to fetch notifications'), { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Creates a notification (used client-side for PAYMENT_ERROR).
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Missing token'), { status: 401 });
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
 * Dismisses all read notifications for THIS user only.
 * Other users' views are unaffected.
 */
export async function DELETE(request: NextRequest) {
  try {
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store ID not found'), { status: 401 });
    }
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Missing token'), { status: 401 });
    }

    const now = new Date();

    // Get all notifications in this store
    const storeNotificationIds = await prisma.notification
      .findMany({ where: { storeId }, select: { id: true } })
      .then((rows) => rows.map((r) => r.id));

    if (storeNotificationIds.length === 0) {
      return NextResponse.json(successResponse({ cleared: 0 }));
    }

    // Dismiss all that this user has already read (NotificationRead row exists, no dismissedAt yet)
    const { count } = await (prisma as unknown as { notificationRead: { updateMany: (args: unknown) => Promise<{ count: number }> } }).notificationRead.updateMany({
      where: {
        userId,
        notificationId: { in: storeNotificationIds },
        dismissedAt: null,
        readAt: { not: undefined },
      },
      data: { dismissedAt: now },
    });

    return NextResponse.json(successResponse({ cleared: count }));
  } catch (error) {
    console.error('[DELETE /api/notifications]', error);
    return NextResponse.json(errorResponse('INTERNAL_ERROR', 'Failed to clear notifications'), { status: 500 });
  }
}


