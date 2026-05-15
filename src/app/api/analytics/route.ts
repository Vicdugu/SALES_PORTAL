import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withTenantContext } from '@/lib/db/tenant-context';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { errorResponse, successResponse } from '@/lib/utils/response';

/**
 * GET /api/analytics - Get sales analytics for a store
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

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get orders in the date range
    const orders = await withTenantContext(storeId, (tx) =>
      tx.order.findMany({
        where: {
          storeId,
          createdAt: { gte: startDate },
        },
      })
    );

    // Calculate metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum: number, order: typeof orders[0]) => sum + order.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Count by status
    const statusBreakdown = {
      pending: orders.filter((o: typeof orders[0]) => o.status === 'PENDING').length,
      in_progress: orders.filter((o: typeof orders[0]) => o.status === 'IN_PROGRESS').length,
      ready: orders.filter((o: typeof orders[0]) => o.status === 'READY').length,
      completed: orders.filter((o: typeof orders[0]) => o.status === 'COMPLETED').length,
      cancelled: orders.filter((o: typeof orders[0]) => o.status === 'CANCELLED').length,
    };

    // Count by payment method
    const paymentBreakdown = {
      cash: orders.filter((o: typeof orders[0]) => o.paymentMethod === 'CASH').length,
      transfer: orders.filter((o: typeof orders[0]) => o.paymentMethod === 'TRANSFER').length,
      pos: orders.filter((o: typeof orders[0]) => o.paymentMethod === 'POS').length,
    };

    const analytics = {
      period: { days, startDate: startDate.toISOString() },
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      statusBreakdown,
      paymentBreakdown,
    };

    return NextResponse.json(successResponse(analytics));
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch analytics'),
      { status: 500 }
    );
  }
}
