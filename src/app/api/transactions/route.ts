import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withTenantContext, withSuperadminContext } from '@/lib/db/tenant-context';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { getAuthPayload } from '@/lib/tenancy/get-auth-payload';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { logSuperadminAccess } from '@/lib/auth/superadmin-audit';

/**
 * GET /api/transactions - Get transaction history
 * For SUPERADMIN: returns all store transactions
 * For ADMIN/STAFF: returns only their store transactions
 */
export async function GET(request: NextRequest) {
  try {
    // Get user role from JWT token (header or httpOnly cookie)
    const authPayload = await getAuthPayload();
    const userRole = authPayload?.role ?? 'STAFF';

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
      // No storeId filter — superadmin gets all. Audit this cross-tenant access.
      if (authPayload?.userId) {
        void logSuperadminAccess(authPayload.userId, 'ALL', 'READ_ALL_TRANSACTIONS', {
          filters: { startDate, endDate, filterStatus, filterPayment },
        });
      }
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
    const queryArgs = {
      where,
      include: {
        store: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' as const },
      take: 500,
    };

    const orders = userRole === 'SUPERADMIN'
      ? await withSuperadminContext((tx) => tx.order.findMany(queryArgs))
      : await withTenantContext(where.storeId as string, (tx) => tx.order.findMany(queryArgs));

    // Format response
    const transactions = orders.map((order: { id: string; orderNumber: string; storeId: string; store?: { name: string } | null; total: number; paymentMethod: string | null; status: string; createdAt: Date; items: unknown[] }) => ({
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
