import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

/**
 * GET /api/transactions - Get transaction history
 * For SUPERADMIN: returns all store transactions
 * For ADMIN/STAFF: returns only their store transactions
 */
export async function GET(request: NextRequest) {
  try {
    // Get user role from JWT token
    let userRole = 'STAFF'; // default
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const verified = await jwtVerify(token, JWT_SECRET);
        userRole = verified.payload.role as string;
      } catch (e) {
        // Token verification failed, continue with default
      }
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const filterStatus = searchParams.get('status');
    const filterPayment = searchParams.get('paymentMethod');

    // Build date filters
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // Build where clause
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = dateFilter;
    }

    if (filterStatus) {
      where.status = filterStatus;
    }

    if (filterPayment) {
      where.paymentMethod = filterPayment;
    }

    // SUPERADMIN: fetch all stores' transactions
    if (userRole === 'SUPERADMIN') {
      // No storeId filter needed - get all
    } else {
      // ADMIN/STAFF: only their store
      const storeId = await getStoreId();
      if (!storeId) {
        return NextResponse.json(
          errorResponse('UNAUTHORIZED', 'Store ID not found'),
          { status: 401 }
        );
      }
      where.storeId = storeId;
    }

    // Fetch orders with their store info and items
    const orders = await prisma.order.findMany({
      where,
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500, // Limit to 500 transactions
    });

    // Format response
    const transactions = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
      storeName: order.store?.name || 'Unknown Store',
      total: order.total,
      paymentMethod: order.paymentMethod,
      status: order.status,
      createdAt: order.createdAt,
      itemCount: order.items.length,
    }));

    return NextResponse.json(
      successResponse({
        data: transactions,
        count: transactions.length,
      })
    );
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch transactions'),
      { status: 500 }
    );
  }
}
