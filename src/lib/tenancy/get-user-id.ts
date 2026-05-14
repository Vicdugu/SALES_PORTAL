import { headers, cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * Extract user ID from the verified JWT.
 * Checks the Authorization header first, then the httpOnly auth_token cookie.
 */
export async function getUserId(): Promise<string | null> {
  try {
    const headersList = await headers();

    // 1. Authorization header
    const authHeader = headersList.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload?.userId) return payload.userId;
    }

    // 2. httpOnly cookie
    const cookiesList = await cookies();
    const cookieToken = cookiesList.get('auth_token')?.value;
    if (cookieToken) {
      const payload = verifyToken(cookieToken);
      return payload?.userId ?? null;
    }

    return null;
  } catch (error) {
    console.error('[getUserId] Error extracting user ID:', error);
    return null;
  }
}
