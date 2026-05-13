import { NextRequest, NextResponse } from 'next/server';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { createNotification } from '@/lib/notifications/service';

/**
 * PUT /api/inventory/[id] - Update inventory item (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Store ID not found'),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, category, unitPrice, quantity, unit } = body;

    // Get the item to verify it belongs to this store
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item || item.storeId !== storeId) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'Item not found'),
        { status: 404 }
      );
    }

    // Check if updated name already exists (if name is being changed)
    if (name && name !== item.name) {
      const allItems = await prisma.inventoryItem.findMany({
        where: { storeId },
        select: { name: true, id: true },
      });

      const nameLower = name.toLowerCase();
      const hasDuplicate = allItems.some(
        (existingItem: { name: string; id: string }) =>
          existingItem.id !== id &&
          existingItem.name.toLowerCase() === nameLower
      );

      if (hasDuplicate) {
        return NextResponse.json(
          errorResponse('CONFLICT', 'Item with this name already exists'),
          { status: 409 }
        );
      }
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(unitPrice !== undefined && { unitPrice: parseFloat(unitPrice) }),
        ...(quantity !== undefined && { quantity: parseInt(quantity) }),
        ...(unit && { unit }),
      },
    });

    console.log(`✓ Updated inventory item: ${updated.name}`);

    // Notify admin if stock has dropped below minimum threshold
    if (updated.quantity < updated.minimumStock) {
      await createNotification({
        storeId,
        type: 'LOW_STOCK',
        title: `Low Stock — ${updated.name}`,
        message: `Only ${updated.quantity} ${updated.unit} remaining (minimum: ${updated.minimumStock}).`,
        link: '/admin',
      });
    }

    return NextResponse.json(successResponse(updated));
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to update inventory item'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/[id] - Delete inventory item (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Store ID not found'),
        { status: 401 }
      );
    }

    // Get the item to verify it belongs to this store
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item || item.storeId !== storeId) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'Item not found'),
        { status: 404 }
      );
    }

    const deleted = await prisma.inventoryItem.delete({
      where: { id },
    });

    console.log(`✓ Deleted inventory item: ${deleted.name}`);

    return NextResponse.json(
      successResponse({
        message: `Deleted item: ${deleted.name}`,
        item: deleted,
      })
    );
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to delete inventory item'),
      { status: 500 }
    );
  }
}
