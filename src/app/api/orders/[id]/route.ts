import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { orderBroadcaster } from '@/lib/realtime/OrderBroadcaster';

/**
 * PATCH /api/orders/[id] - Update order status
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Store ID not found'),
        { status: 401 }
      );
    }
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Status is required'),
        { status: 400 }
      );
    }

    // Verify order belongs to this store
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order || order.storeId !== storeId) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'Order not found'),
        { status: 404 }
      );
    }

    // Update order
    const updateData: any = { status };
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }
    
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Broadcast status change event to all admin dashboards
    orderBroadcaster.broadcast({
      type: 'statusChange',
      orderId: id,
      storeId,
      status,
      timestamp: Date.now(),
      data: {
        previousStatus: order.status,
        newStatus: status,
        completedAt: updateData.completedAt,
      },
    });

    return NextResponse.json(successResponse(updatedOrder));
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to update order'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders/[id] - Get order details
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Store ID not found'),
        { status: 401 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order || order.storeId !== storeId) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'Order not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(order));
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch order'),
      { status: 500 }
    );
  }
}
