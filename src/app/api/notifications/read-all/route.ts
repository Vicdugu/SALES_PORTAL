import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { errorResponse, successResponse } from '@/lib/utils/response';

/**
 * PATCH /api/notifications/read-all
 * Marks every unread notification for the current store as read.
 */
export async function PATCH(_request: NextRequest) {
  try {
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store ID not found'), { status: 401 });
    }

    const now = new Date();
    const { count } = await prisma.notification.updateMany({
      where: { storeId, isRead: false },
      data: { isRead: true, readAt: now },
    });

    return NextResponse.json(successResponse({ updated: count }));
  } catch (error) {
    console.error('[PATCH /api/notifications/read-all]', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to mark all as read'),
      { status: 500 }
    );
  }
}
