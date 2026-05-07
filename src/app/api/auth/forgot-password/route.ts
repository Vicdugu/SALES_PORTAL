import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';

/**
 * POST /api/auth/forgot-password - Request password reset
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

    // Find store by email (not user to protect privacy)
    const store = await prisma.store.findUnique({
      where: { email },
    });

    // Always return success for security (don't reveal if email exists)
    if (!store) {
      return NextResponse.json(
        successResponse({
          message: 'If an account with this email exists, password reset instructions will be sent.',
        }),
        { status: 200 }
      );
    }

    // In production, you would:
    // 1. Generate a reset token (random string)
    // 2. Save it to database with expiry time (15 minutes)
    // 3. Send email with reset link containing the token
    // 4. User clicks link, enters new password, verify token and update

    console.log(`[PASSWORD RESET] Request for store: ${store.email} (${store.name})`);

    return NextResponse.json(
      successResponse({
        message: 'Password reset instructions have been sent to your email.',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing forgot password:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to process password reset request'),
      { status: 500 }
    );
  }
}
