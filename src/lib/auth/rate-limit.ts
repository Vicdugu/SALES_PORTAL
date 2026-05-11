import { prisma } from '@/lib/db/client';

const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;

/**
 * Check whether an email address has exceeded the failed-attempt threshold.
 * DB-backed — safe across serverless instances.
 */
export async function checkVerificationRateLimit(
  email: string
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  const failedCount = await prisma.verificationAttempt.count({
    where: {
      email,
      success: false,
      createdAt: { gte: windowStart },
    },
  });

  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - failedCount);
  return { allowed: failedCount < MAX_FAILED_ATTEMPTS, remaining };
}

export type VerificationReason =
  | 'SUCCESS'
  | 'INVALID_TOKEN'
  | 'EXPIRED'
  | 'ALREADY_VERIFIED'
  | 'RATE_LIMITED';

/**
 * Persist a verification attempt for audit and rate-limit purposes.
 */
export async function logVerificationAttempt(
  email: string,
  success: boolean,
  reason: VerificationReason,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.verificationAttempt.create({
      data: { email, success, reason, ipAddress: ipAddress ?? null },
    });
  } catch {
    // Non-fatal — log but do not surface to caller
    console.error('[VERIFY] Failed to write verification attempt log');
  }
}
