import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { errorResponse, successResponse } from '@/lib/utils/response';

/**
 * PATCH /api/notifications/[id]  — mark a single notification as read.
 * DELETE /api/notifications/[id] — dismiss (permanently delete) a notification.
 */

export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store ID not found'), { status: 401 });
    }

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.storeId !== storeId) {
      return NextResponse.json(errorResponse('NOT_FOUND', 'Notification not found'), { status: 404 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json(successResponse(updated));
  } catch (error) {
    console.error('[PATCH /api/notifications/[id]]', error);
    return NextResponse.json(errorResponse('INTERNAL_ERROR', 'Failed to mark notification as read'), { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store ID not found'), { status: 401 });
    }

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.storeId !== storeId) {
      return NextResponse.json(errorResponse('NOT_FOUND', 'Notification not found'), { status: 404 });
    }

    await prisma.notification.delete({ where: { id } });

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error('[DELETE /api/notifications/[id]]', error);
    return NextResponse.json(errorResponse('INTERNAL_ERROR', 'Failed to dismiss notification'), { status: 500 });
  }
}
