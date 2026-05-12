import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { hashToken, isTokenExpired } from '@/lib/auth/verification-token';
import { checkVerificationRateLimit, logVerificationAttempt } from '@/lib/auth/rate-limit';
import { runMigrations } from '@/lib/db/migrations';

function getClientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    undefined
  );
}

/**
 * GET /api/stores/verify?token=RAW_TOKEN&email=EMAIL
 * Lightweight pre-check used by the verify-email page before rendering.
 * Does NOT consume the token or log an attempt.
 */
export async function GET(request: NextRequest) {
  try {
    await runMigrations();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Token and email are required'),
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({ where: { email } });

    if (!store || !store.verificationCode || !store.verificationCodeExpiry) {
      return NextResponse.json(successResponse({ valid: false, reason: 'INVALID_TOKEN' }));
    }

    if (store.emailVerified) {
      return NextResponse.json(successResponse({ valid: true, alreadyVerified: true, storeName: store.name }));
    }

    const tokenHash = hashToken(token);
    const hashMatch = tokenHash === store.verificationCode;
    const expired = isTokenExpired(store.verificationCodeExpiry);

    return NextResponse.json(
      successResponse({
        valid: hashMatch && !expired,
        reason: !hashMatch ? 'INVALID_TOKEN' : expired ? 'EXPIRED' : null,
        storeName: store.name,
      })
    );
  } catch (error) {
    console.error('[VERIFY GET] Error:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Verification check failed'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/stores/verify
 * Body: { token: string, email: string }
 * Verifies the token, enforces rate limit and expiry, marks store as verified (one-time use).
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    await runMigrations();

    const body = await request.json();
    const { token, email } = body;

    if (!token || !email) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Token and email are required'),
        { status: 400 }
      );
    }

    // Rate limit check
    const { allowed, remaining } = await checkVerificationRateLimit(email);
    if (!allowed) {
      await logVerificationAttempt(email, false, 'RATE_LIMITED', ip);
      return NextResponse.json(
        errorResponse('RATE_LIMITED', 'Too many verification attempts. Please try again in 15 minutes.'),
        {
          status: 429,
          headers: { 'Retry-After': '900' },
        }
      );
    }

    const store = await prisma.store.findUnique({ where: { email } });

    // Consistent error shape for not-found vs invalid-token (prevents email enumeration)
    if (!store || !store.verificationCode || !store.verificationCodeExpiry) {
      await logVerificationAttempt(email, false, 'INVALID_TOKEN', ip);
      return NextResponse.json(
        errorResponse('INVALID_TOKEN', 'This verification link is invalid or has already been used.'),
        { status: 400 }
      );
    }

    // Already verified — idempotent success
    if (store.emailVerified) {
      await logVerificationAttempt(email, true, 'ALREADY_VERIFIED', ip);
      return NextResponse.json(
        successResponse({ message: 'Email is already verified. You can log in.' })
      );
    }

    // Hash comparison
    const tokenHash = hashToken(token);
    if (tokenHash !== store.verificationCode) {
      await logVerificationAttempt(email, false, 'INVALID_TOKEN', ip);
      return NextResponse.json(
        errorResponse('INVALID_TOKEN', `This verification link is invalid or has already been used. ${remaining} attempt(s) remaining.`),
        { status: 400 }
      );
    }

    // Expiry check
    if (isTokenExpired(store.verificationCodeExpiry)) {
      await logVerificationAttempt(email, false, 'EXPIRED', ip);
      return NextResponse.json(
        errorResponse('TOKEN_EXPIRED', 'This verification link has expired. Please request a new one.'),
        { status: 400 }
      );
    }

    // Mark verified and invalidate token (one-time use)
    await prisma.store.update({
      where: { email },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
      },
    });

    await logVerificationAttempt(email, true, 'SUCCESS', ip);

    return NextResponse.json(
      successResponse({ message: 'Email verified successfully! You can now log in to your store.' })
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[VERIFY POST] Error:', msg);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Verification failed'),
      { status: 500 }
    );
  }
}


