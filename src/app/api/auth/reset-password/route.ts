import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { hashToken, isTokenExpired } from '@/lib/auth/verification-token';
import { hashPassword } from '@/lib/auth/hash';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { checkApiRateLimit, recordApiCall, getClientIp } from '@/lib/utils/api-rate-limit';

/**
 * POST /api/auth/reset-password
 * Verifies the one-time reset token and updates the store admin's password.
 * Body: { token: string, email: string, password: string }
 */
export async function POST(request: NextRequest) {
  // Rate limit: max 10 attempts per IP per 15 minutes
  const ip = getClientIp(request);
  const rl = await checkApiRateLimit(ip, 'reset-password', 10, 15);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } },
      { status: 429, headers: { 'Retry-After': '900' } }
    );
  }
  await recordApiCall(ip, 'reset-password');

  try {
    const body = await request.json();
    const { token, email, password } = body;

    if (!token || !email || !password) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Token, email, and new password are required'),
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Password must be at least 8 characters'),
        { status: 400 }
      );
    }

    // Look up the store by email
    const store = await prisma.store.findUnique({ where: { email } });
    if (
      !store ||
      !store.passwordResetToken ||
      !store.passwordResetExpiry
    ) {
      return NextResponse.json(
        errorResponse('INVALID_TOKEN', 'Invalid or expired password reset link'),
        { status: 400 }
      );
    }

    // Verify the token hash and expiry
    const tokenHash = hashToken(token);
    const tokenMatches = tokenHash === store.passwordResetToken;
    const tokenExpired = isTokenExpired(store.passwordResetExpiry);

    if (!tokenMatches || tokenExpired) {
      return NextResponse.json(
        errorResponse('INVALID_TOKEN', 'Invalid or expired password reset link'),
        { status: 400 }
      );
    }

    // Update the ADMIN user's password for this store
    const adminUser = await prisma.user.findFirst({
      where: { storeId: store.id, role: 'ADMIN' },
    });

    if (!adminUser) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'No admin user found for this store'),
        { status: 404 }
      );
    }

    const hashed = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: adminUser.id },
        data: { password: hashed },
      }),
      // Consume the token so it cannot be reused
      prisma.store.update({
        where: { id: store.id },
        data: { passwordResetToken: null, passwordResetExpiry: null },
      }),
    ]);

    return NextResponse.json(
      successResponse({ message: 'Password updated successfully. You may now log in.' })
    );
  } catch (error) {
    console.error('[RESET_PASSWORD]', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to reset password'),
      { status: 500 }
    );
  }
}
