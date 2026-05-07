import { headers, cookies } from 'next/headers';

/**
 * Extract store ID from request headers, cookies, or localStorage
 * Supports multiple tenancy patterns:
 * - Subdomain: store.app.com
 * - Header: X-Store-ID
 * - Cookie: storeId
 */
export async function getStoreId(): Promise<string | null> {
  try {
    const headersList = await headers();
    const cookiesList = await cookies();

    // DEBUG
    const debugInfo = {
      'x-store-id': headersList.get('x-store-id'),
      'cookie storeId': cookiesList.get('storeId')?.value,
    };
    console.log('[getStoreId] Debug:', debugInfo);

    // 1. Check custom header (PRIMARY - THIS IS WHAT WE SHOULD USE)
    const headerStoreId = headersList.get('x-store-id');
    if (headerStoreId) {
      console.log('[getStoreId] Found via x-store-id header:', headerStoreId);
      return headerStoreId;
    }

    // 2. Check cookie
    const cookieStoreId = cookiesList.get('storeId')?.value;
    if (cookieStoreId) {
      console.log('[getStoreId] Found via cookie:', cookieStoreId);
      return cookieStoreId;
    }

    // 3. Check subdomain (but not for IP addresses)
    const host = headersList.get('host') || '';
    
    // Skip subdomain extraction for IP addresses
    if (!/^\d+\./.test(host)) {
      const parts = host.split('.');
      if (parts.length > 2 && parts[0] !== 'www') {
        console.log('[getStoreId] Found via subdomain:', parts[0]);
        return parts[0]; // Subdomain is store ID
      }
    }

    console.log('[getStoreId] No storeId found from any source');
    return null;
  } catch (error) {
    console.error('Error getting store ID:', error);
    return null;
  }
}