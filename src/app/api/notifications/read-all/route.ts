import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { errorResponse, successResponse } from '@/lib/utils/response';

/**
 * PATCH /api/notifications/read-all
 * Marks every notification in this store as read FOR THIS USER only.
 * Other users' unread counts are unaffected.
 */
export async function PATCH(request: NextRequest) {
  try {
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store ID not found'), { status: 401 });
    }

    const token = getTokenFromHeader(request.headers.get('Authorization'));
    const userId = token ? verifyToken(token)?.userId : null;
    if (!userId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Missing token'), { status: 401 });
    }

    // Find all notifications in this store not yet read by this user
    const allIds = await prisma.notification
      .findMany({ where: { storeId }, select: { id: true } })
      .then((rows) => rows.map((r) => r.id));

    if (allIds.length === 0) {
      return NextResponse.json(successResponse({ updated: 0 }));
    }

    // Find which ones already have a read row for this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).notificationRead.findMany({
      where: { userId, notificationId: { in: allIds } },
      select: { notificationId: true },
    }) as { notificationId: string }[];
    const existingIds = new Set(existing.map((r) => r.notificationId));
    const unreadIds = allIds.filter((id) => !existingIds.has(id));

    const now = new Date();

    // Bulk-create read rows for unread notifications
    if (unreadIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).notificationRead.createMany({
        data: unreadIds.map((notificationId) => ({ userId, notificationId, readAt: now })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(successResponse({ updated: unreadIds.length }));
  } catch (error) {
    console.error('[PATCH /api/notifications/read-all]', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to mark all as read'),
      { status: 500 }
    );
  }
}
