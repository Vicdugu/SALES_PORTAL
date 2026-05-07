const { PrismaClient } = require('@prisma/client');

// Simulate what the API does
async function testInventoryAPI() {
  const db = new PrismaClient();
  
  try {
    const storeId = 'cmostfypy000mlejooieqa5lu';
    console.log('Testing with storeId:', storeId);
    
    // First, verify store exists
    const store = await db.store.findUnique({
      where: { id: storeId }
    });
    console.log('Store found:', store ? store.name : 'NOT FOUND');
    
    // Try to query inventoryItem
    console.log('Querying InventoryItem for store:', storeId);
    const items = await db.inventoryItem.findMany({
      where: { storeId },
      select: {
        id: true,
        name: true,
        category: true,
        unitPrice: true,
        quantity: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    
    console.log('Items found:', items.length);
    console.log('Items:', items);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    if (error.meta) {
      console.error('Meta:', error.meta);
    }
  } finally {
    await db.$disconnect();
  }
}

testInventoryAPI();
