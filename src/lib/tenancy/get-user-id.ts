import { headers } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

/**
 * Extract user ID from JWT token in Authorization header
 * Returns the ID of the currently authenticated user
 */
export async function getUserId(): Promise<string | null> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader) {
      console.log('[getUserId] No authorization header found');
      return null;
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      const userId = verified.payload.userId as string;
      console.log('[getUserId] Extracted userId from token:', userId);
      return userId;
    } catch (error) {
      console.error('[getUserId] JWT verification failed:', error);
      return null;
    }
  } catch (error) {
    console.error('[getUserId] Error extracting user ID:', error);
    return null;
  }
}
