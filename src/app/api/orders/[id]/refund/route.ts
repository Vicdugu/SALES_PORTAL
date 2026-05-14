import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { getTokenFromHeader, verifyToken } from '@/lib/auth/jwt';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { logSuperadminAccess } from '@/lib/auth/superadmin-audit';

/**
 * POST /api/orders/[id]/refund
 * Marks a COMPLETED order as REFUNDED and writes an audit log entry.
 * Requires ADMIN or SUPERADMIN role.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json(errorResponse('BAD_REQUEST', 'Order ID is required'), { status: 400 });
  }

  // Authenticate
  const authHeader = request.headers.get('authorization');
  const token =
    getTokenFromHeader(authHeader ?? '') ?? request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json(errorResponse('UNAUTHORIZED', 'Authentication required'), { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(errorResponse('UNAUTHORIZED', 'Invalid token'), { status: 401 });
  }

  if (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') {
    return NextResponse.json(errorResponse('FORBIDDEN', 'Insufficient permissions'), { status: 403 });
  }

  const storeId = await getStoreId();
  if (!storeId) {
    return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store context required'), { status: 401 });
  }

  // Fetch order — enforce store tenancy for non-superadmin
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, storeId: true, status: true, orderNumber: true, total: true },
  });

  if (!order) {
    return NextResponse.json(errorResponse('NOT_FOUND', 'Order not found'), { status: 404 });
  }

  // SUPERADMIN can refund across stores; ADMIN only within their store
  if (payload.role === 'ADMIN' && order.storeId !== storeId) {
    return NextResponse.json(errorResponse('FORBIDDEN', 'Order does not belong to your store'), { status: 403 });
  }

  if (order.status !== 'COMPLETED') {
    return NextResponse.json(
      errorResponse('BAD_REQUEST', `Cannot refund an order with status: ${order.status}`),
      { status: 422 }
    );
  }

  // Parse optional reason from request body
  let reason: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.reason === 'string') reason = body.reason.slice(0, 500);
  } catch {
    // Body is optional
  }

  const refundedAt = new Date();

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: 'REFUNDED', refundedAt },
      select: { id: true, orderNumber: true, status: true, total: true, refundedAt: true },
    }),
    prisma.auditLog.create({
      data: {
        storeId: order.storeId,
        userId: payload.userId,
        action: 'ORDER_REFUNDED',
        resource: `ORDER:${orderId}`,
        details: JSON.stringify({
          orderNumber: order.orderNumber,
          total: order.total,
          reason: reason ?? null,
          refundedBy: payload.userId,
        }),
      },
    }),
  ]);

  if (payload.role === 'SUPERADMIN' && order.storeId !== storeId) {
    void logSuperadminAccess(payload.userId, order.storeId, 'REFUND_ORDER', {
      orderId,
      orderNumber: order.orderNumber,
    });
  }

  return NextResponse.json(successResponse(updatedOrder));
}
