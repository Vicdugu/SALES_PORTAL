import { NextRequest, NextResponse } from 'next/server';

// ── Configuration ─────────────────────────────────────────────────────────────

/** Max request body size: 1 MB */
const MAX_BODY_BYTES = 1 * 1024 * 1024;

/** HTTP methods that mutate state and therefore require CSRF checks. */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Return the list of explicitly allowed origins, plus the app URL if configured.
 * In development every origin is allowed.
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) origins.push(appUrl.replace(/\/$/, '')); // strip trailing slash
  const extra = process.env.ALLOWED_ORIGINS;
  if (extra) origins.push(...extra.split(',').map((o) => o.trim()).filter(Boolean));
  return origins;
}

// ── Middleware ─────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestMethod = request.method;

  // Only process API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 1. Body size guard (Content-Length header check)
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the 1 MB limit' } },
      { status: 413 }
    );
  }

  // 2. CORS — set headers on every API response
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  const isDev = process.env.NODE_ENV !== 'production';

  const corsHeaders: HeadersInit = {};
  if (origin) {
    const originAllowed = isDev || allowedOrigins.length === 0 || allowedOrigins.includes(origin);
    if (originAllowed) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
      corsHeaders['Access-Control-Allow-Credentials'] = 'true';
      corsHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
      corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      corsHeaders['Vary'] = 'Origin';
    }
  }

  // Handle CORS pre-flight
  if (requestMethod === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // 3. CSRF — for state-mutating requests that carry an Origin header,
  //    verify it belongs to an allowed origin (in production only).
  //    Browser requests always send Origin for cross-origin fetches.
  //    Non-browser API clients (curl, server-to-server) typically do NOT
  //    send Origin, so they are unaffected by this check.
  if (!isDev && origin && MUTATING_METHODS.has(requestMethod)) {
    const origins = getAllowedOrigins();
    if (origins.length > 0 && !origins.includes(origin)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cross-origin request denied' } },
        { status: 403 }
      );
    }
  }

  // Pass through — attach CORS headers to the real response
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  // Apply to all API routes
  matcher: '/api/:path*',
};
