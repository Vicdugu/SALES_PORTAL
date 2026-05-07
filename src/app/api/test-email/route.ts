import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/email/client';

/**
 * POST /api/test-email - Test email sending (DEVELOPMENT ONLY)
 */
export async function POST(request: NextRequest) {
  try {
    // Allow in development or with test token
    const isDevelopment = process.env.NODE_ENV === 'development';
    const testToken = request.headers.get('X-Test-Token');
    
    if (!isDevelopment && testToken !== 'test-email-debug-2024') {
      return NextResponse.json(
        { error: 'Test endpoint requires X-Test-Token header' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email = 'test@example.com', storeName = 'Test Store', code = '123456' } = body;

    // Test email configuration
    const config = {
      SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
      SMTP_PORT: process.env.SMTP_PORT || 'NOT SET',
      SMTP_SECURE: process.env.SMTP_SECURE || 'NOT SET',
      SMTP_USER: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 10)}***` : 'NOT SET',
      EMAIL_FROM: process.env.EMAIL_FROM || 'NOT SET',
    };

    console.log('Email Configuration:', config);

    // Try to send test email
    const emailSent = await sendVerificationEmail(storeName, email, code);
    
    console.log('[TEST] Email send result:', emailSent);
    console.log('[TEST] Sent to:', email);

    return NextResponse.json({
      success: emailSent,
      message: emailSent ? 'Test email sent successfully!' : 'Failed to send test email',
      config,
      testEmail: email,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
