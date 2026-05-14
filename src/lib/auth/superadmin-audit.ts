import { prisma } from '@/lib/db/client';

/**
 * Log a superadmin cross-tenant access event to the audit log.
 * Call this whenever a SUPERADMIN reads or writes data belonging to another store.
 */
export async function logSuperadminAccess(
  superadminUserId: string,
  targetStoreId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: superadminUserId,
        storeId: targetStoreId,
        action: `SUPERADMIN_${action}`,
        resource: 'CROSS_TENANT',
        details: details ? JSON.stringify(details) : undefined,
      },
    });
  } catch {
    console.error('[AUDIT] Failed to write superadmin cross-tenant audit log');
  }
}
