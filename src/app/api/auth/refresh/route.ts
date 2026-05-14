import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { generateToken } from '@/lib/auth/jwt';
import { hashToken, generateVerificationToken } from '@/lib/auth/verification-token';
import { errorResponse, successResponse } from '@/lib/utils/response';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (!refreshToken) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'No refresh token'), { status: 401 });
    }

    const tokenHash = hashToken(refreshToken);

    const user = await prisma.user.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        refreshTokenExpiry: { gt: new Date() },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storeId: true,
      },
    });

    if (!user) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Invalid or expired refresh token'), { status: 401 });
    }

    // Rotate refresh token (prevents replay)
    const { rawToken: newRefreshToken, tokenHash: newRefreshTokenHash } = generateVerificationToken();
    const newRefreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        refreshTokenExpiry: newRefreshExpiry,
      },
    });

    const accessToken = generateToken({
      userId: user.id,
      storeId: user.storeId,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(successResponse({ token: accessToken }));

    response.cookies.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 2,
      path: '/',
    });

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/api/auth/refresh',
    });

    return response;
  } catch (error) {
    console.error('[AUTH] Refresh token error:', error);
    return NextResponse.json(errorResponse('INTERNAL_ERROR', 'Failed to refresh token'), { status: 500 });
  }
}
