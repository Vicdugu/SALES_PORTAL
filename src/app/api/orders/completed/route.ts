import { NextRequest, NextResponse } from 'next/server';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';

/**
 * GET /api/orders/completed - Get completed orders for the current store
 * Query params:
 * - limit: number of orders to fetch (default: 20)
 * - offset: pagination offset (default: 0)
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

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Fetch completed orders with their items and staff info
    const orders = await prisma.order.findMany({
      where: {
        storeId,
        status: 'COMPLETED',
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        tax: true,
        total: true,
        paymentMethod: true,
        createdAt: true,
        completedAt: true,
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await prisma.order.count({
      where: {
        storeId,
        status: 'COMPLETED',
      },
    });

    console.log(`[completed orders] Found ${orders.length} completed orders for store: ${storeId}`);

    return NextResponse.json(
      successResponse({
        orders,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      })
    );
  } catch (error) {
    console.error('Error fetching completed orders:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch completed orders'),
      { status: 500 }
    );
  }
}
