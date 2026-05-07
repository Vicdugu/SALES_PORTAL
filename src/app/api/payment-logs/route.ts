import { NextRequest, NextResponse } from 'next/server';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { errorResponse, successResponse } from '@/lib/utils/response';

/**
 * POST /api/payment-logs - Log payment selection
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

    const body = await request.json();
    const { orderId, paymentMethod } = body;

    if (!orderId || !paymentMethod) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Order ID and payment method required'),
        { status: 400 }
      );
    }

    // Validate payment method
    if (!['CASH', 'TRANSFER', 'POS'].includes(paymentMethod)) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Invalid payment method'),
        { status: 400 }
      );
    }

    // Log to console (in production, would save to database)
    console.log(`[PAYMENT LOG] Order: ${orderId} | Method: ${paymentMethod} | Store: ${storeId} | Time: ${new Date().toISOString()}`);

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
 * GET /api/payment-logs - Get payment logs (mock)
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

    // Return mock payment logs
    const mockLogs = [
      { id: '1', orderId: 'ORD-001', paymentMethod: 'CASH', timestamp: new Date().toISOString() },
      { id: '2', orderId: 'ORD-002', paymentMethod: 'TRANSFER', timestamp: new Date().toISOString() },
      { id: '3', orderId: 'ORD-003', paymentMethod: 'POS', timestamp: new Date().toISOString() },
    ];

    return NextResponse.json(successResponse(mockLogs));
  } catch (error) {
    console.error('Error fetching payment logs:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch payment logs'),
      { status: 500 }
    );
  }
}
