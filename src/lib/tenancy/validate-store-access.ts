import { prisma } from '@/lib/db/client';

/**
 * Validate that a store exists and is active
 */
export async function validateStoreAccess(storeId: string): Promise<boolean> {
  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, isActive: true },
    });

    return store?.isActive === true;
  } catch (error) {
    console.error('Error validating store access:', error);
    return false;
  }
}

/**
 * Get store by ID with full details
 */
export async function getStore(storeId: string) {
  try {
    return await prisma.store.findUnique({
      where: { id: storeId },
    });
  } catch (error) {
    console.error('Error fetching store:', error);
    return null;
  }
}