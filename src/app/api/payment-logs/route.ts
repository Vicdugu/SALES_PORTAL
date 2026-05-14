import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';

function getTokenPayload(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7));
}

/**
 * POST /api/payment-logs - Log payment selection to the audit trail
 */
export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.storeId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Valid authentication token required'),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, paymentMethod } = body;

    if (!orderId || !paymentMethod) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Order ID and payment method required'),
        { status: 400 }
      );
    }

    const VALID_METHODS = ['CASH', 'TRANSFER', 'POS'];
    if (!VALID_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Invalid payment method'),
        { status: 400 }
      );
    }

    // Persist to AuditLog so the record survives beyond the serverless function
    await prisma.auditLog.create({
      data: {
        storeId: payload.storeId,
        userId: payload.userId,
        action: 'PAYMENT_METHOD_SELECTED',
        resource: orderId,
        details: paymentMethod,
      },
    });

    return NextResponse.json(
      successResponse({
        logged: true,
        paymentMethod,
        orderId,
        timestamp: new Date().toISOString(),
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error logging payment:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to log payment'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment-logs - Retrieve payment audit logs for this store
 */
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.storeId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Valid authentication token required'),
        { status: 401 }
      );
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        storeId: payload.storeId,
        action: 'PAYMENT_METHOD_SELECTED',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        resource: true,   // orderId
        details: true,    // paymentMethod
        createdAt: true,
      },
    });

    const formatted = logs.map((log) => ({
      id: log.id,
      orderId: log.resource,
      paymentMethod: log.details,
      timestamp: log.createdAt.toISOString(),
    }));

    return NextResponse.json(successResponse(formatted));
  } catch (error) {
    console.error('Error fetching payment logs:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch payment logs'),
      { status: 500 }
    );
  }
}
