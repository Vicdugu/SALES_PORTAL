import { prisma } from '@/lib/db/client';

/**
 * Cleanup utility to remove test/demo/placeholder stores and all linked data.
 * Safe to run in development or when explicitly called from the admin API.
 */

// ─── Detection criteria ──────────────────────────────────────────────────────

const TEST_EMAIL_DOMAINS = [
  '@example.com',
  '@test.com',
  '@demo.com',
  '@sample.com',
  '@fake.com',
  '@placeholder.com',
  '@temp.com',
  '@dummy.com',
];

const TEST_NAME_KEYWORDS = [
  'test',
  'demo',
  'sample',
  'placeholder',
  'temp',
  'temporary',
  'dummy',
  'fake',
  'dev store',
  'development',
  'trial',
  'sandbox',
];

function buildTestStoreFilter() {
  return {
    OR: [
      ...TEST_EMAIL_DOMAINS.map((domain) => ({
        email: { endsWith: domain },
      })),
      ...TEST_NAME_KEYWORDS.map((keyword) => ({
        name: { contains: keyword, mode: 'insensitive' as const },
      })),
    ],
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function removeTestAccounts() {
  try {
    console.log('🧹 Starting test account cleanup...');

    const testStores = await prisma.store.findMany({
      where: buildTestStoreFilter(),
      include: {
        _count: {
          select: { users: true, orders: true },
        },
      },
    });

    console.log(`Found ${testStores.length} test stores`);

    // Cascade delete removes: users, orders, orderItems, paymentRecords,
    // inventory, adverts, notifications, auditLogs, staffMembers
    let deletedCount = 0;
    for (const store of testStores) {
      try {
        await prisma.store.delete({ where: { id: store.id } });
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
        name: { contains: storeName, mode: 'insensitive' },
        ...{ OR: buildTestStoreFilter().OR },
      },
    });

    if (!store) {
      console.log(`✗ Test store not found: ${storeName}`);
      return { success: false, message: `Test store '${storeName}' not found` };
    }

    await prisma.store.delete({ where: { id: store.id } });

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
      where: buildTestStoreFilter(),
      include: {
        _count: {
          select: { users: true, orders: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`\n📊 Test Stores Report:`);
    console.log('═'.repeat(80));

    if (testStores.length === 0) {
      console.log('✅ No test stores found!');
      return testStores;
    }

    testStores.forEach((store: { id: string; name: string; email: string; createdAt: Date; _count: { users: number; orders: number } }, index: number) => {
      console.log(`\n${index + 1}. ${store.name} (${store.email})`);
      console.log(`   ID: ${store.id}`);
      console.log(`   Users: ${store._count.users} | Orders: ${store._count.orders}`);
      console.log(`   Created: ${store.createdAt.toLocaleDateString()}`);
    });

    console.log('\n' + '═'.repeat(80));
    return testStores;
  } catch (error) {
    console.error('Error listing test stores:', error);
    throw error;
  }
}
