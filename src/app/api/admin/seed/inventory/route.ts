import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { successResponse, errorResponse } from '@/lib/utils/response';

/**
 * POST /api/admin/seed/inventory
 * Seed sample inventory items for a store (development only)
 * WARNING: This endpoint should only be available in development mode
 */
export async function POST(request: NextRequest) {
  try {
    // Check if in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'This endpoint is only available in development mode'),
        { status: 403 }
      );
    }

    // Get the first store (for testing)
    const store = await prisma.store.findFirst();

    if (!store) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'No stores found. Create a store first.'),
        { status: 404 }
      );
    }

    // Sample menu items
    const sampleItems = [
      { name: 'Burger', category: 'Food', unitPrice: 5.99, quantity: 50 },
      { name: 'Fries', category: 'Food', unitPrice: 2.49, quantity: 75 },
      { name: 'Chicken Wings', category: 'Food', unitPrice: 4.99, quantity: 40 },
      { name: 'Pizza Slice', category: 'Food', unitPrice: 3.49, quantity: 30 },
      { name: 'Coke', category: 'Drink', unitPrice: 1.99, quantity: 100 },
      { name: 'Sprite', category: 'Drink', unitPrice: 1.99, quantity: 100 },
      { name: 'Water', category: 'Drink', unitPrice: 0.99, quantity: 200 },
      { name: 'Orange Juice', category: 'Drink', unitPrice: 2.49, quantity: 50 },
    ];

    let createdCount = 0;
    const createdItems = [];

    for (const item of sampleItems) {
      const existing = await prisma.inventoryItem.findFirst({
        where: {
          storeId: store.id,
          name: {
            equals: item.name,
            mode: 'insensitive',
          },
        },
      });

      if (!existing) {
        const created = await prisma.inventoryItem.create({
          data: {
            storeId: store.id,
            name: item.name,
            category: item.category,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            unit: 'pieces',
            currentStock: item.quantity,
          },
        });
        createdCount++;
        createdItems.push(created);
        console.log(`✓ Created inventory item: ${item.name}`);
      }
    }

    return NextResponse.json(
      successResponse({
        message: `Seeded ${createdCount} inventory items for store: ${store.name}`,
        store: {
          id: store.id,
          name: store.name,
        },
        createdItems,
        createdCount,
      })
    );
  } catch (error) {
    console.error('Error seeding inventory:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to seed inventory'),
      { status: 500 }
    );
  }
}
