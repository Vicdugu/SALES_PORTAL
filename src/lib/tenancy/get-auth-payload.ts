import { headers, cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

interface TokenPayload {
  userId: string;
  storeId: string | null;
  email: string;
  role: string;
}

/**
 * Extract full auth payload from the verified JWT.
 * Checks the Authorization header first (API clients), then the httpOnly
 * auth_token cookie (browser requests). Never trusts client-controlled headers.
 */
export async function getAuthPayload(): Promise<TokenPayload | null> {
  try {
    const headersList = await headers();

    // 1. Authorization header (programmatic / API client requests)
    const authHeader = headersList.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload) return payload;
    }

    // 2. httpOnly cookie (browser requests — cookie sent automatically)
    const cookiesList = await cookies();
    const cookieToken = cookiesList.get('auth_token')?.value;
    if (cookieToken) {
      return verifyToken(cookieToken);
    }

    return null;
  } catch (error) {
    console.error('[getAuthPayload] Error extracting auth payload:', error);
    return null;
  }
}
