import { prisma } from '@/lib/db/client';

/**
 * General-purpose DB-backed IP rate limiter.
 * Reuses the VerificationAttempt table with a synthetic email key so that no
 * extra schema migration is needed.
 *
 * Key format: `ratelimit:<endpoint>:<ip>`
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining allowed calls in the current window. */
  remaining: number;
}

/**
 * Check whether an IP address has exceeded the per-endpoint call limit.
 *
 * @param ip          Client IP address (use getClientIp() helper below).
 * @param endpoint    Short stable string identifying the route, e.g. "forgot-password".
 * @param limit       Max calls per window (default 20).
 * @param windowMin   Window length in minutes (default 15).
 */
export async function checkApiRateLimit(
  ip: string,
  endpoint: string,
  limit = 20,
  windowMin = 15
): Promise<RateLimitResult> {
  try {
    const key = `ratelimit:${endpoint}:${ip}`;
    const windowStart = new Date(Date.now() - windowMin * 60 * 1000);

    const count = await prisma.verificationAttempt.count({
      where: {
        email: key,
        reason: 'API_RATE_LIMITED',
        createdAt: { gte: windowStart },
      },
    });

    const remaining = Math.max(0, limit - count);
    return { allowed: count < limit, remaining };
  } catch {
    return { allowed: true, remaining: limit };
  }
}

/**
 * Record one API call for the given IP + endpoint combination.
 */
export async function recordApiCall(ip: string, endpoint: string): Promise<void> {
  try {
    const key = `ratelimit:${endpoint}:${ip}`;
    await prisma.verificationAttempt.create({
      data: {
        email: key,
        success: true,
        reason: 'API_RATE_LIMITED',
        ipAddress: ip,
      },
    });
  } catch {
    // non-fatal
  }
}

/**
 * Extract the client IP from a Next.js Request object.
 * Trusts the x-forwarded-for header set by Vercel / reverse proxies.
 */
export function getClientIp(request: Request): string {
  const forwarded = (request.headers as Headers).get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return (request.headers as Headers).get('x-real-ip') ?? 'unknown';
}
