import { prisma } from '@/lib/db/client';

/**
 * Seed sample inventory items for testing
 */
export async function seedSampleInventory() {
  try {
    // Get the first store (usually "Euro Store Test" or first registered store)
    const store = await prisma.store.findFirst();

    if (!store) {
      console.log('No stores found. Create a store first.');
      return;
    }

    console.log(`Seeding inventory for store: ${store.name}`);

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
        await prisma.inventoryItem.create({
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
        console.log(`✓ Created: ${item.name}`);
      } else {
        console.log(`⊘ Skipped (exists): ${item.name}`);
      }
    }

    console.log('✅ Inventory seeding complete!');
  } catch (error) {
    console.error('Error seeding inventory:', error);
    throw error;
  }
}

// Run the seed if this file is executed directly
if (require.main === module) {
  seedSampleInventory()
    .then(() => {
      console.log('Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
