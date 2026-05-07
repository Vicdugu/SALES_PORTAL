import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { getUserId } from '@/lib/tenancy/get-user-id';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { orderBroadcaster } from '@/lib/realtime/OrderBroadcaster';

/**
 * GET /api/orders - Get orders for a store
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const statusParam = searchParams.get('status');

    const where: any = { storeId };
    if (statusParam) {
      where.status = statusParam;
    }

    const orders = await prisma.order.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json(successResponse(orders));
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch orders'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders - Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Store ID not found'),
        { status: 401 }
      );
    }

    // Extract the current cashier's user ID from JWT token
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'User ID not found. Authentication required.'),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { staffId, items, notes, paymentMethod } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Items are required'),
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.unitPrice * item.quantity,
      0
    );
    const tax = 0; // No tax
    const total = subtotal;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}`;

    console.log('Creating order with:', {
      storeId,
      staffId: userId,
      itemsCount: items.length,
      paymentMethod,
    });

    // Verify store exists - do NOT auto-create
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'Store not found. Please ensure the store is registered first.'),
        { status: 404 }
      );
    }

    // Check inventory availability and prepare inventory updates
    const inventoryUpdates: { inventoryItemId: string; quantityToReduce: number }[] = [];
    
    for (const item of items) {
      // Find inventory item by name and store
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          name: item.name,
          storeId: storeId,
        },
      });

      if (!inventoryItem) {
        return NextResponse.json(
          errorResponse('NOT_FOUND', `Inventory item "${item.name}" not found`),
          { status: 404 }
        );
      }

      // Check if sufficient quantity is available
      if (inventoryItem.quantity < item.quantity) {
        return NextResponse.json(
          errorResponse('VALIDATION_ERROR', `Insufficient stock for "${item.name}". Available: ${inventoryItem.quantity}, Requested: ${item.quantity}`),
          { status: 400 }
        );
      }

      inventoryUpdates.push({
        inventoryItemId: inventoryItem.id,
        quantityToReduce: item.quantity,
      });
    }

    // Create order and update inventory in a transaction
    const order = await prisma.order.create({
      data: {
        orderNumber,
        storeId,
        staffId: userId,
        status: 'PENDING',
        items: {
          createMany: {
            data: items,
          },
        },
        subtotal,
        tax,
        total,
        notes,
        paymentMethod,
      },
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

    // Update inventory quantities and create usage records
    for (const update of inventoryUpdates) {
      await prisma.inventoryItem.update({
        where: { id: update.inventoryItemId },
        data: {
          quantity: {
            decrement: update.quantityToReduce,
          },
        },
      });

      // Record the inventory usage
      await prisma.inventoryUsage.create({
        data: {
          itemId: update.inventoryItemId,
          quantity: update.quantityToReduce,
          reason: 'ORDER',
        },
      });
    }

    // Broadcast order create event to all admin dashboards
    orderBroadcaster.broadcast({
      type: 'create',
      orderId: order.id,
      storeId,
      status: order.status,
      timestamp: Date.now(),
      data: {
        orderNumber: order.orderNumber,
        total: order.total,
        itemCount: order.items.length,
      },
    });

    return NextResponse.json(successResponse(order), { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', `Failed to create order: ${errorMessage}`),
      { status: 500 }
    );
  }
}