/**
 * API client utility with automatic storeId header and JWT token
 */

export async function apiCall(
  endpoint: string,
  options?: RequestInit
) {
  const storeId = typeof window !== 'undefined' 
    ? localStorage.getItem('storeId')
    : null;

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token')
    : null;

  const headers = new Headers(options?.headers || {});
  
  // DEBUG: Log storeId context
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
    console.log(`[API Call] ${endpoint}`, {
      storeId,
      hasToken: !!token,
      userRole: user?.role,
      userName: user?.name,
      userStoreId: user?.storeId,
    });
  }
  
  // Add storeId header if available
  if (storeId) {
    headers.set('x-store-id', storeId);
  }

  // Add JWT token if available
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  return response;
}
