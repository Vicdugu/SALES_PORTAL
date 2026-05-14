import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getTokenFromHeader, verifyToken } from '@/lib/auth/jwt';

/**
 * POST /api/auth/logout
 * Clears the httpOnly auth_token and refresh_token cookies.
 * Also invalidates the stored refresh token hash in the DB.
 */
export async function POST(request: NextRequest) {
  // Invalidate refresh token in DB if we can identify the user
  try {
    const token = getTokenFromHeader(request.headers.get('authorization') ?? '') ??
      request.cookies.get('auth_token')?.value;
    if (token) {
      const payload = verifyToken(token);
      if (payload?.userId) {
        await prisma.user.update({
          where: { id: payload.userId },
          data: { refreshTokenHash: null, refreshTokenExpiry: null },
        });
      }
    }
  } catch {
    // Non-fatal — proceed to clear cookies regardless
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/api/auth/refresh',
  });
  return response;
}
