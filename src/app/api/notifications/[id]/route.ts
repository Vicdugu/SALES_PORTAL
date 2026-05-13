import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { errorResponse, successResponse } from '@/lib/utils/response';

function getUserId(request: NextRequest): string | null {
  const token = getTokenFromHeader(request.headers.get('Authorization'));
  if (!token) return null;
  return verifyToken(token)?.userId ?? null;
}

/**
 * PATCH /api/notifications/[id]
 * Marks a notification as read FOR THIS USER only.
 * Creates or updates the NotificationRead row.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store ID not found'), { status: 401 });
    }
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Missing token'), { status: 401 });
    }

    // Confirm the notification belongs to this store
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.storeId !== storeId) {
      return NextResponse.json(errorResponse('NOT_FOUND', 'Notification not found'), { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nr = await (prisma as any).notificationRead.upsert({
      where: { userId_notificationId: { userId, notificationId: id } },
      create: { userId, notificationId: id, readAt: new Date() },
      update: { readAt: new Date(), dismissedAt: null },
    });

    return NextResponse.json(successResponse(nr));
  } catch (error) {
    console.error('[PATCH /api/notifications/[id]]', error);
    return NextResponse.json(errorResponse('INTERNAL_ERROR', 'Failed to mark notification as read'), { status: 500 });
  }
}

/**
 * DELETE /api/notifications/[id]
 * Dismisses (hides) a notification FOR THIS USER only.
 * Sets dismissedAt on the NotificationRead row — does NOT delete the notification.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store ID not found'), { status: 401 });
    }
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Missing token'), { status: 401 });
    }

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.storeId !== storeId) {
      return NextResponse.json(errorResponse('NOT_FOUND', 'Notification not found'), { status: 404 });
    }

    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).notificationRead.upsert({
      where: { userId_notificationId: { userId, notificationId: id } },
      create: { userId, notificationId: id, readAt: now, dismissedAt: now },
      update: { dismissedAt: now },
    });

    return NextResponse.json(successResponse({ dismissed: true }));
  } catch (error) {
    console.error('[DELETE /api/notifications/[id]]', error);
    return NextResponse.json(errorResponse('INTERNAL_ERROR', 'Failed to dismiss notification'), { status: 500 });
  }
}
