import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { getUserId } from '@/lib/tenancy/get-user-id';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { orderBroadcaster } from '@/lib/realtime/OrderBroadcaster';
import { createNotification } from '@/lib/notifications/service';
import { CreateOrderSchema } from '@/lib/validation/schemas';

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
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; ')),
        { status: 400 }
      );
    }
    const { items, notes, paymentMethod, payments, printedForKitchen } = parsed.data;

    if (!payments && !paymentMethod) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Payment method is required'),
        { status: 400 }
      );
    }

    // Calculate totals using integer arithmetic (pence) to avoid float rounding errors
    const subtotal = Math.round(
      items.reduce((sum: number, item: any) => sum + item.unitPrice * item.quantity, 0) * 100
    ) / 100;
    const tax = 0; // No tax
    const total = subtotal;

    // Validate split payments if provided
    if (payments && Array.isArray(payments)) {
      if (payments.length > 2) {
        return NextResponse.json(
          errorResponse('VALIDATION_ERROR', 'Maximum 2 payment methods per order'),
          { status: 400 }
        );
      }

      const totalPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      // Compare using integer arithmetic to avoid float precision errors
      if (Math.round(totalPaid * 100) !== Math.round(total * 100)) {
        return NextResponse.json(
          errorResponse('VALIDATION_ERROR', `Payment total (${totalPaid.toFixed(2)}) does not match order total (${total.toFixed(2)})`),
          { status: 400 }
        );
      }
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}`;

    console.log('Creating order with:', {
      storeId,
      staffId: userId,
      itemsCount: items.length,
      paymentMethod,
      paymentCount: payments?.length || 1,
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
        paymentMethod: paymentMethod || (payments?.[0]?.method),
        printedForKitchen: printedForKitchen === true,
        // Create payment records for split payments
        payments: payments && Array.isArray(payments) ? {
          createMany: {
            data: payments.map((p: any, index: number) => ({
              paymentMethod: p.method,
              amount: p.amount,
              sequence: index + 1,
            })),
          },
        } : undefined,
      },
      include: {
        items: true,
        payments: true,
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
      const afterUpdate = await prisma.inventoryItem.update({
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

      // Notify admin if stock dropped below minimum
      if (afterUpdate.quantity < afterUpdate.minimumStock) {
        await createNotification({
          storeId,
          type: 'LOW_STOCK',
          title: `Low Stock — ${afterUpdate.name}`,
          message: `Only ${afterUpdate.quantity} ${afterUpdate.unit} remaining (minimum: ${afterUpdate.minimumStock}).`,
          link: '/admin',
        });
      }
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

    // Notify kitchen + admin of the new pending order
    await createNotification({
      storeId,
      type: 'ORDER_PENDING',
      title: `New Order — ${order.orderNumber}`,
      message: `${order.items.length} item(s) · Total: ${order.total.toFixed(2)}`,
      link: '/kitchen',
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