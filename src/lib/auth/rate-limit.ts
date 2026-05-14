import { prisma } from '@/lib/db/client';

const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;

/**
 * Generic rate-limit check against the VerificationAttempt table.
 * Used for both email verification and login attempts.
 */
async function checkRateLimit(
  email: string,
  failedReason: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const failedCount = await prisma.verificationAttempt.count({
      where: {
        email,
        success: false,
        reason: failedReason,
        createdAt: { gte: windowStart },
      },
    });
    const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - failedCount);
    return { allowed: failedCount < MAX_FAILED_ATTEMPTS, remaining };
  } catch {
    console.error('[RATE_LIMIT] Could not query VerificationAttempt table — failing open');
    return { allowed: true, remaining: MAX_FAILED_ATTEMPTS };
  }
}

/**
 * Check whether an email address has exceeded the failed verification-attempt threshold.
 */
export async function checkVerificationRateLimit(
  email: string
): Promise<{ allowed: boolean; remaining: number }> {
  return checkRateLimit(email, 'INVALID_TOKEN');
}

/**
 * Check whether an email address has exceeded the failed login-attempt threshold.
 * Max 5 failed attempts per 15-minute window.
 */
export async function checkLoginRateLimit(
  email: string
): Promise<{ allowed: boolean; remaining: number }> {
  return checkRateLimit(email, 'LOGIN_FAILED');
}

export type VerificationReason =
  | 'SUCCESS'
  | 'INVALID_TOKEN'
  | 'EXPIRED'
  | 'ALREADY_VERIFIED'
  | 'RATE_LIMITED'
  | 'LOGIN_FAILED'
  | 'LOGIN_SUCCESS';

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
    console.error('[VERIFY] Failed to write verification attempt log');
  }
}

/**
 * Persist a login attempt for audit and rate-limit purposes.
 */
export async function logLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string
): Promise<void> {
  return logVerificationAttempt(
    email,
    success,
    success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
    ipAddress
  );
}
