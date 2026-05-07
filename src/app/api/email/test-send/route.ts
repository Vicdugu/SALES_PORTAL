import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/email/client';

export async function POST(request: NextRequest) {
  try {
    const { email = 'qbigvic@gmail.com', storeName = 'Test Store', code = '123456' } = await request.json().catch(() => ({}));

    console.log('[DEBUG] Test email endpoint called');
    console.log('[DEBUG] Sending to:', email);
    console.log('[DEBUG] Store name:', storeName);
    console.log('[DEBUG] Code:', code);

    const result = await sendVerificationEmail(storeName, email, code);

    console.log('[DEBUG] Email send result:', result);

    return NextResponse.json({
      success: result,
      message: result ? `Email sent successfully to ${email} with code ${code}` : 'Failed to send email',
      details: {
        email,
        storeName,
        code,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error sending test email',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
