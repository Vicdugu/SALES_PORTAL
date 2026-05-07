import { prisma } from '@/lib/db/client';

/**
 * Cleanup utility to remove test accounts and test stores
 * This should only be run in development or when explicitly requested
 */

export async function removeTestAccounts() {
  try {
    console.log('🧹 Starting test account cleanup...');

    // Find all test stores (those with @example.com emails)
    const testStores = await prisma.store.findMany({
      where: {
        email: {
          endsWith: '@example.com',
        },
      },
      include: {
        _count: {
          select: { users: true, orders: true },
        },
      },
    });

    console.log(`Found ${testStores.length} test stores`);

    // Delete all test stores and their associated data
    // Cascade delete will remove: users, orders, inventory items, staff members
    let deletedCount = 0;
    for (const store of testStores) {
      try {
        await prisma.store.delete({
          where: { id: store.id },
        });
        deletedCount++;
        console.log(`✓ Deleted test store: ${store.name} (${store.email})`);
      } catch (error) {
        console.error(`✗ Failed to delete store ${store.id}:`, error);
      }
    }

    console.log(`\n✅ Cleanup complete: Deleted ${deletedCount} test stores`);
    console.log('⚠️  All associated data (users, orders, inventory) has been removed');

    return {
      success: true,
      deletedStores: deletedCount,
      message: `Removed ${deletedCount} test stores and all associated test accounts`,
    };
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    throw error;
  }
}

export async function removeSpecificTestStore(storeName: string) {
  try {
    console.log(`🧹 Removing test store: ${storeName}`);

    const store = await prisma.store.findFirst({
      where: {
        name: {
          contains: storeName,
        },
      },
    });

    if (!store) {
      console.log(`✗ Store not found: ${storeName}`);
      return { success: false, message: `Store '${storeName}' not found` };
    }

    if (!store.email.endsWith('@example.com')) {
      console.log(`✗ Store is not a test store (does not use @example.com email)`);
      return { success: false, message: 'This is not a test store and cannot be removed' };
    }

    await prisma.store.delete({
      where: { id: store.id },
    });

    console.log(`✅ Successfully deleted test store: ${store.name}`);
    return {
      success: true,
      message: `Removed test store '${storeName}' and all associated data`,
    };
  } catch (error) {
    console.error('❌ Error removing store:', error);
    throw error;
  }
}

export async function listTestStores() {
  try {
    const testStores = await prisma.store.findMany({
      where: {
        email: {
          endsWith: '@example.com',
        },
      },
      include: {
        _count: {
          select: { users: true, orders: true },
        },
      },
    });

    console.log(`\n📊 Test Stores Report:`);
    console.log('═'.repeat(80));

    if (testStores.length === 0) {
      console.log('✅ No test stores found!');
      return testStores;
    }

    testStores.forEach((store, index) => {
      console.log(
        `\n${index + 1}. ${store.name} (${store.email})`
      );
      console.log(
        `   ID: ${store.id}`
      );
      console.log(
        `   Users: ${store._count.users} | Orders: ${store._count.orders}`
      );
      console.log(
        `   Created: ${store.createdAt.toLocaleDateString()}`
      );
    });

    console.log('\n' + '═'.repeat(80));
    return testStores;
  } catch (error) {
    console.error('Error listing test stores:', error);
    throw error;
  }
}
