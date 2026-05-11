import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { generateVerificationToken } from '@/lib/auth/verification-token';
import { checkVerificationRateLimit, logVerificationAttempt } from '@/lib/auth/rate-limit';
import { sendVerificationLinkEmail } from '@/lib/email/client';
import { runMigrations } from '@/lib/db/migrations';

/**
 * POST /api/stores/resend-code - Resend a new verification link
 */
export async function POST(request: NextRequest) {
  try {
    await runMigrations();

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Email is required'),
        { status: 400 }
      );
    }

    // Rate limit check (shared with verify endpoint)
    const { allowed } = await checkVerificationRateLimit(email);
    if (!allowed) {
      await logVerificationAttempt(email, false, 'RATE_LIMITED');
      return NextResponse.json(
        errorResponse('RATE_LIMITED', 'Too many attempts. Please try again in 15 minutes.'),
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }

    const store = await prisma.store.findUnique({ where: { email } });

    if (!store) {
      // Do not reveal whether the email exists
      return NextResponse.json(
        successResponse({ message: 'If that email is registered, a new verification link has been sent.' })
      );
    }

    if (store.emailVerified) {
      return NextResponse.json(
        successResponse({ message: 'Your email is already verified. You can now log in.' })
      );
    }

    const { rawToken, tokenHash, expiry } = generateVerificationToken();

    const host = request.headers.get('host') ?? 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const verificationLink = `${protocol}://${host}/verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`;

    await prisma.store.update({
      where: { email },
      data: { verificationCode: tokenHash, verificationCodeExpiry: expiry },
    });

    sendVerificationLinkEmail(store.name, email, verificationLink).catch((err) =>
      console.error('[RESEND] Failed to send verification email:', err)
    );

    return NextResponse.json(
      successResponse({
        message: 'A new verification link has been sent to your email. Please check your inbox.',
      })
    );
  } catch (error) {
    console.error('[RESEND] Error:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to resend verification link'),
      { status: 500 }
    );
  }
}

