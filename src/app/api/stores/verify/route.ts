import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { isCodeExpired } from '@/lib/auth/verification';

/**
 * POST /api/stores/verify - Verify store email with code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, email } = body;

    if (!code || !email) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Code and email are required'),
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

    // In development, accept any code
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment) {
      // Production: validate code
      if (store.verificationCode !== code) {
        return NextResponse.json(
          errorResponse('INVALID_CODE', 'Invalid verification code'),
          { status: 400 }
        );
      }

      // Check if code has expired
      if (store.verificationCodeExpiry && isCodeExpired(store.verificationCodeExpiry)) {
        return NextResponse.json(
          errorResponse('CODE_EXPIRED', 'Verification code has expired'),
          { status: 400 }
        );
      }
    } else {
      // Development: log the actual code for debugging
      console.log(`[DEV] Verification code for ${email}: ${store.verificationCode}`);
    }

    // Mark store as verified
    const updatedStore = await prisma.store.update({
      where: { email },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
      },
    });

    return NextResponse.json(
      successResponse({
        ...updatedStore,
        message: 'Email verified successfully! You can now log in to your store.',
      })
    );
  } catch (error) {
    console.error('Error verifying email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify email';
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', errorMessage),
      { status: 500 }
    );
  }
}
