import { headers, cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * Extract store ID from the verified JWT.
 * Checks the Authorization header first (API clients), then the httpOnly
 * auth_token cookie (browser requests). Never trusts client-controlled headers.
 */
export async function getStoreId(): Promise<string | null> {
  try {
    const headersList = await headers();

    // 1. Authorization header (programmatic / API client requests)
    const authHeader = headersList.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload?.storeId) return payload.storeId;
    }

    // 2. httpOnly cookie (browser requests — cookie sent automatically)
    const cookiesList = await cookies();
    const cookieToken = cookiesList.get('auth_token')?.value;
    if (cookieToken) {
      const payload = verifyToken(cookieToken);
      return payload?.storeId ?? null;
    }

    return null;
  } catch (error) {
    console.error('Error getting store ID:', error);
    return null;
  }
}