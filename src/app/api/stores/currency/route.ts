import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { getTokenFromHeader, verifyToken } from '@/lib/auth/jwt';
import { getStoreId } from '@/lib/tenancy/get-store-id';

const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'MXN', 'ZAR', 'NGN', 'GHS', 'KES', 'EGP'
];

/**
 * GET /api/stores/currency - Get store currency
 */
export async function GET(request: NextRequest) {
  try {
    const storeId = await getStoreId();

    if (!storeId) {
      return NextResponse.json(
        errorResponse('BAD_REQUEST', 'Store ID not found'),
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        currency: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'Store not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(store));
  } catch (error) {
    console.error('Error fetching currency:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch currency'),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stores/currency - Update store currency
 * Only ADMIN users can update currency
 */
export async function PUT(request: NextRequest) {
  try {
    // Extract and verify JWT token
    const authHeader = request.headers.get('Authorization');
    const token = getTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Missing authentication token'),
        { status: 401 }
      );
    }

    const tokenPayload = verifyToken(token);
    if (!tokenPayload) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Invalid or expired token'),
        { status: 401 }
      );
    }

    // Check authorization - only ADMIN can update currency
    if (tokenPayload.role !== 'ADMIN' && tokenPayload.role !== 'SUPERADMIN') {
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'Only admins can update currency settings'),
        { status: 403 }
      );
    }

    const storeId = await getStoreId();

    if (!storeId) {
      return NextResponse.json(
        errorResponse('BAD_REQUEST', 'Store ID not found'),
        { status: 400 }
      );
    }

    // Verify the user owns this store
    if (tokenPayload.role === 'ADMIN' && tokenPayload.storeId !== storeId) {
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'You can only update your own store currency'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { currency } = body;

    // Validate currency code
    if (!currency || !SUPPORTED_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        errorResponse(
          'VALIDATION_ERROR',
          `Invalid currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}`
        ),
        { status: 400 }
      );
    }

    // Update store currency
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        currency,
      },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });

    console.log('[Currency Update] Store currency updated:', {
      storeId,
      storeName: updatedStore.name,
      newCurrency: updatedStore.currency,
      updatedAt: new Date(),
    });

    return NextResponse.json(
      successResponse({
        ...updatedStore,
        message: `Currency updated to ${currency} successfully`,
      })
    );
  } catch (error) {
    console.error('Error updating currency:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to update currency'),
      { status: 500 }
    );
  }
}
