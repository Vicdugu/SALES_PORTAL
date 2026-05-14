/**
 * Feature Flags Service
 *
 * Provides per-store feature flag lookups backed by the StoreFeature table.
 * Results are cached for 60 seconds to avoid repeated DB reads.
 *
 * Cache strategy (in priority order):
 *   1. Redis — if UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
 *              Shared across all serverless instances.
 *   2. In-memory Map — fallback when Redis is not configured.
 *              Per-instance only; multiple instances may briefly diverge.
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

// ─────────────────────────────────────────────────────────────────────────────
// Redis (optional)
// ─────────────────────────────────────────────────────────────────────────────

let redisClient: import('@upstash/redis').Redis | null = null;

function getRedis(): import('@upstash/redis').Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  // Lazy import so the module loads even without the env vars
  const { Redis } = require('@upstash/redis');
  redisClient = new Redis({ url, token });
  return redisClient;
}

const REDIS_KEY = (storeId: string) => `ff:${storeId}`;
const CACHE_TTL_S = 60; // seconds (for Redis TTL)

// ─────────────────────────────────────────────────────────────────────────────
// In-memory fallback cache
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  features: Record<string, boolean>;
  expiresAt: number;
}

const memCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = CACHE_TTL_S * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchFromDb(storeId: string): Promise<Record<string, boolean>> {
  const rows = await (prisma as any).storeFeature.findMany({
    where: { storeId },
    select: { flagKey: true, enabled: true },
  });

  const features: Record<string, boolean> = {};
  for (const flag of KNOWN_FLAGS) features[flag] = false;
  for (const row of rows) features[row.flagKey] = row.enabled;
  return features;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all feature flags for a store as a plain boolean map. */
export async function getStoreFeatures(storeId: string): Promise<Record<string, boolean>> {
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get<Record<string, boolean>>(REDIS_KEY(storeId));
      if (cached) return cached;

      const features = await fetchFromDb(storeId);
      await redis.setex(REDIS_KEY(storeId), CACHE_TTL_S, features);
      return features;
    } catch (err) {
      console.warn('[FeatureFlags] Redis error, falling back to in-memory cache:', err);
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const cached = memCache.get(storeId);
  if (cached && cached.expiresAt > Date.now()) return cached.features;

  const features = await fetchFromDb(storeId);
  memCache.set(storeId, { features, expiresAt: Date.now() + CACHE_TTL_MS });
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
  enabled: boolean,
  changedByUserId?: string
): Promise<{ storeId: string; flagKey: string; enabled: boolean }> {
  const record = await (prisma as any).storeFeature.upsert({
    where: { storeId_flagKey: { storeId, flagKey } },
    update: { enabled },
    create: { storeId, flagKey, enabled },
    select: { storeId: true, flagKey: true, enabled: true },
  });

  // Audit log — only when we have a userId to attribute the change to
  if (changedByUserId) {
    try {
      await prisma.auditLog.create({
        data: {
          storeId,
          userId: changedByUserId,
          action: 'FEATURE_FLAG_CHANGED',
          resource: `FLAG:${flagKey}`,
          details: JSON.stringify({ flagKey, enabled }),
        },
      });
    } catch (err) {
      console.warn('[FeatureFlags] Failed to write audit log:', err);
    }
  }

  // Invalidate all cache layers immediately so next read reflects the change
  await invalidateCache(storeId);

  return record;
}

/** Removes the cached entry for a store, forcing next read to hit DB. */
export async function invalidateCache(storeId: string): Promise<void> {
  memCache.delete(storeId);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(REDIS_KEY(storeId));
    } catch (err) {
      console.warn('[FeatureFlags] Failed to invalidate Redis cache:', err);
    }
  }
}
