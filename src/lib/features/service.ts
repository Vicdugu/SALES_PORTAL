/**
 * Feature Flags Service
 *
 * Provides per-store feature flag lookups backed by the StoreFeature table.
 * Results are cached in memory for 60 seconds to avoid repeated DB reads.
 *
 * Known flags:
 *   enable_print_before_kitchen  — cashier must print order slip before payment flows to kitchen
 *   enable_split_payment         — allow split payment across two methods
 */

import { prisma } from '@/lib/db/client';

export const KNOWN_FLAGS = [
  'enable_print_before_kitchen',
  'enable_split_payment',
] as const;

export type FeatureFlag = (typeof KNOWN_FLAGS)[number];

interface CacheEntry {
  features: Record<string, boolean>;
  expiresAt: number;
}

// Module-level cache — shared across all requests in the same serverless instance
const cache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 60_000; // 60 seconds

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all feature flags for a store as a plain boolean map. */
export async function getStoreFeatures(storeId: string): Promise<Record<string, boolean>> {
  const cached = cache.get(storeId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.features;
  }

  const rows = await (prisma as any).storeFeature.findMany({
    where: { storeId },
    select: { flagKey: true, enabled: true },
  });

  const features: Record<string, boolean> = {};
  // Seed all known flags as false first so clients always see every flag
  for (const flag of KNOWN_FLAGS) {
    features[flag] = false;
  }
  for (const row of rows) {
    features[row.flagKey] = row.enabled;
  }

  cache.set(storeId, { features, expiresAt: Date.now() + CACHE_TTL_MS });
  return features;
}

/** Returns true if the named flag is enabled for the store. */
export async function hasFeature(storeId: string, flag: string): Promise<boolean> {
  const features = await getStoreFeatures(storeId);
  return features[flag] === true;
}

/**
 * Upserts a feature flag for a store and invalidates the cache for that store.
 * Returns the updated feature record.
 */
export async function setFeature(
  storeId: string,
  flagKey: string,
  enabled: boolean
): Promise<{ storeId: string; flagKey: string; enabled: boolean }> {
  const record = await (prisma as any).storeFeature.upsert({
    where: { storeId_flagKey: { storeId, flagKey } },
    update: { enabled },
    create: { storeId, flagKey, enabled },
    select: { storeId: true, flagKey: true, enabled: true },
  });

  // Invalidate cache immediately so next read reflects the change
  cache.delete(storeId);

  return record;
}

/** Removes the cached entry for a store, forcing next read to hit DB. */
export function invalidateCache(storeId: string): void {
  cache.delete(storeId);
}
