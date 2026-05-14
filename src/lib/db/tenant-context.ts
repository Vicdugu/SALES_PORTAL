import { Prisma } from '@prisma/client';
import { getRlsPrisma } from './client';

/**
 * Wraps a set of Prisma operations in a transaction with the store tenant
 * context set for this transaction.
 *
 * When DATABASE_URL_RLS is configured (a DB role without BYPASSRLS), the
 * Row-Level Security policies on each table are enforced — queries that try
 * to access rows belonging to a different store will silently return no rows
 * or raise a policy violation on write.
 *
 * `set_config(..., TRUE)` is transaction-local and works correctly with
 * PgBouncer in transaction pooling mode.
 *
 * Usage:
 *   const orders = await withTenantContext(storeId, (tx) =>
 *     tx.order.findMany({ where: { storeId } })
 *   );
 */
export async function withTenantContext<T>(
  storeId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return getRlsPrisma().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_store_id', ${storeId}, TRUE)`;
    return fn(tx);
  });
}

/**
 * Wraps operations that legitimately need cross-tenant (SUPERADMIN) access.
 * Sets the context sentinel 'SUPERADMIN' so all RLS policies pass.
 *
 * Only call from routes that have already verified SUPERADMIN role.
 */
export async function withSuperadminContext<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return getRlsPrisma().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_store_id', 'SUPERADMIN', TRUE)`;
    return fn(tx);
  });
}
