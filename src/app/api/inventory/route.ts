import { NextRequest, NextResponse } from 'next/server';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { prisma } from '@/lib/db/client';
import { withTenantContext } from '@/lib/db/tenant-context';
import { errorResponse, successResponse } from '@/lib/utils/response';

/**
 * GET /api/inventory - Get inventory items for a store
 * Returns menu items (meals and drinks) for the till interface
 */
export async function GET(request: NextRequest) {
  try {
    const storeId = await getStoreId();
    console.log('[inventory GET] storeId:', storeId);
    if (!storeId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Store ID not found'),
        { status: 401 }
      );
    }

    // Get inventory items from database
    console.log('[inventory GET] Fetching items for store:', storeId);
    const items = await withTenantContext(storeId, (tx) =>
      tx.inventoryItem.findMany({
        where: { storeId },
        select: {
          id: true,
          name: true,
          category: true,
          unitPrice: true,
          quantity: true,
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      })
    );

    console.log('[inventory GET] Found items:', items.length);
    return NextResponse.json(successResponse(items));
  } catch (error) {
    console.error('[inventory GET] Error:', error instanceof Error ? error.message : error);
    console.error('[inventory GET] Full error:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch inventory'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory - Create new inventory item (admin only)
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
    const { name, category, unitPrice, quantity, unit } = body;

    // Validation
    if (!name || !category || unitPrice === undefined || quantity === undefined) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Missing required fields: name, category, unitPrice, quantity'),
        { status: 400 }
      );
    }

    // Check if item already exists in this store (case-insensitive)
    // Note: The database has a @@unique([name, storeId]) constraint
    const allItems = await prisma.inventoryItem.findMany({
      where: { storeId },
      select: { name: true },
    });

    const nameLower = name.toLowerCase();
    const hasDuplicate = allItems.some((item: { name: string }) => item.name.toLowerCase() === nameLower);
    if (hasDuplicate) {
      return NextResponse.json(
        errorResponse('CONFLICT', 'Item with this name already exists in this store'),
        { status: 409 }
      );
    }

    const item = await prisma.inventoryItem.create({
      data: {
        storeId,
        name,
        category,
        unitPrice: parseFloat(unitPrice),
        quantity: parseInt(quantity),
        unit: unit || 'pieces',
        currentStock: parseInt(quantity),
      },
    });

    return NextResponse.json(successResponse(item), { status: 201 });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to create inventory item'),
      { status: 500 }
    );
  }
}

