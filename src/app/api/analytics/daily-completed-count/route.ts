import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { errorResponse, successResponse } from '@/lib/utils/response';

/**
 * GET /api/analytics/daily-completed-count
 * Returns the count of orders completed today (current calendar day)
 * Automatically resets at midnight based on timestamp logic
 */
export async function GET(request: NextRequest) {
  try {
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Store ID not found'),
        { status: 401 }
      );
    }

    // Get today's date range (00:00:00 to 23:59:59)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Count completed orders for today only
    const completedCount = await prisma.order.count({
      where: {
        storeId: storeId,
        status: 'COMPLETED',
        completedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    return NextResponse.json(
      successResponse({
        count: completedCount,
        date: now.toISOString().split('T')[0], // YYYY-MM-DD
        timestamp: now.toISOString(),
        storeId: storeId,
      })
    );
  } catch (error) {
    console.error('Error fetching daily completed count:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch daily completed count'),
      { status: 500 }
    );
  }
}
