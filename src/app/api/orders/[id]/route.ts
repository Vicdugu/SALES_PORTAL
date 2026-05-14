import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { orderBroadcaster } from '@/lib/realtime/OrderBroadcaster';
import { createNotification } from '@/lib/notifications/service';

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

    // Update order — use updateMany with a status guard on COMPLETED transitions
    // to prevent double-completion races (returns count:0 if already processed).
    const updateData: any = { status };
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    let updatedOrder;
    if (status === 'COMPLETED') {
      const result = await prisma.order.updateMany({
        where: { id, storeId, status: 'PENDING' },
        data: updateData,
      });
      if (result.count === 0) {
        return NextResponse.json(
          errorResponse('CONFLICT', 'Order has already been completed or is no longer pending'),
          { status: 409 }
        );
      }
      updatedOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
          staff: { select: { id: true, name: true, email: true } },
        },
      });
    } else {
      updatedOrder = await prisma.order.update({
        where: { id },
        data: updateData,
        include: {
          items: true,
          staff: { select: { id: true, name: true, email: true } },
        },
      });
    }

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

    // Persist notification for relevant status changes
    const orderNum = updatedOrder?.orderNumber ?? order.orderNumber;
    if (status === 'IN_PROGRESS') {
      await createNotification({
        storeId,
        type: 'ORDER_IN_PROGRESS',
        title: `Order In Progress — ${orderNum}`,
        message: 'Kitchen has started preparing this order.',
        link: '/till',
      });
    } else if (status === 'READY') {
      await createNotification({
        storeId,
        type: 'ORDER_READY',
        title: `Order Ready — ${orderNum}`,
        message: 'Order is ready for collection at the counter.',
        link: '/till',
      });
    } else if (status === 'COMPLETED') {
      await createNotification({
        storeId,
        type: 'ORDER_COMPLETED',
        title: `Order Completed — ${orderNum}`,
        message: 'Order has been collected and marked complete.',
        link: '/admin',
      });
    }

    return NextResponse.json(successResponse(updatedOrder ?? order));
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
