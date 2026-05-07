import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { generateVerificationCode, getVerificationCodeExpiry } from '@/lib/auth/verification';
import { sendVerificationEmail } from '@/lib/email/client';

/**
 * POST /api/stores/resend-code - Resend verification code to email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Email is required'),
        { status: 400 }
      );
    }

    // Find store by email
    const store = await prisma.store.findUnique({
      where: { email },
    });

    if (!store) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'Store not found'),
        { status: 404 }
      );
    }

    // If already verified, return success but inform user
    if (store.emailVerified) {
      return NextResponse.json(
        successResponse({
          message: 'Your email is already verified. You can now log in.',
        })
      );
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiry = getVerificationCodeExpiry();

    // Update store with new code
    await prisma.store.update({
      where: { email },
      data: {
        verificationCode,
        verificationCodeExpiry,
      },
    });

    // Send verification email
    await sendVerificationEmail(email, store.name, verificationCode);

    console.log(`✓ Verification code resent to ${email}: ${verificationCode}`);

    return NextResponse.json(
      successResponse({
        message: 'Verification code has been resent to your email. Please check your inbox.',
      })
    );
  } catch (error) {
    console.error('Error resending verification code:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification code';
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', errorMessage),
      { status: 500 }
    );
  }
}
