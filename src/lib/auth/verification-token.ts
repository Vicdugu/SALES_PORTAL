import crypto from 'crypto';

const TOKEN_EXPIRY_HOURS = 24;

export interface VerificationTokenResult {
  rawToken: string;
  tokenHash: string;
  expiry: Date;
}

/**
 * Generate a cryptographically secure verification token.
 * Returns the raw token (to be sent to the user) and its SHA-256 hash (to be stored).
 */
export function generateVerificationToken(): VerificationTokenResult {
  const rawToken = crypto.randomBytes(32).toString('hex'); // 256-bit entropy
  const tokenHash = hashToken(rawToken);
  const expiry = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  return { rawToken, tokenHash, expiry };
}

/**
 * Hash a token using SHA-256. Used for storage and comparison.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Check whether a stored token expiry has passed.
 */
export function isTokenExpired(expiry: Date): boolean {
  return new Date() > expiry;
}
