import crypto from 'crypto';

/**
 * Generate a random 6-digit verification code
 */
export function generateVerificationCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * Get the expiry time for verification codes (15 minutes from now).
 * Reduced from 24 hours — short window limits brute-force exposure.
 */
export function getVerificationCodeExpiry(): Date {
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + 15);
  return expiryDate;
}

/**
 * Check if a verification code has expired
 */
export function isCodeExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}
