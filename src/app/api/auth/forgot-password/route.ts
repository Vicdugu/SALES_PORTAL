import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { generateVerificationToken } from '@/lib/auth/verification-token';
import { sendEmail } from '@/lib/email/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { checkApiRateLimit, recordApiCall, getClientIp } from '@/lib/utils/api-rate-limit';

const PASSWORD_RESET_EXPIRY_MINUTES = 30;

/**
 * POST /api/auth/forgot-password
 * Generates a 30-minute password-reset link and sends it to the registered store email.
 * Always returns HTTP 200 so callers cannot enumerate valid email addresses.
 */
export async function POST(request: NextRequest) {
  const GENERIC_RESPONSE = successResponse({
    message: 'If an account with this email exists, password reset instructions will be sent.',
  });

  // Rate limit: max 5 requests per IP per 15 minutes
  const ip = getClientIp(request);
  const rl = await checkApiRateLimit(ip, 'forgot-password', 5, 15);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } },
      { status: 429, headers: { 'Retry-After': '900' } }
    );
  }
  await recordApiCall(ip, 'forgot-password');

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Find store by email
    const store = await prisma.store.findUnique({ where: { email } });
    if (!store) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Generate a short-lived reset token
    const { rawToken, tokenHash } = generateVerificationToken();
    const expiry = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

    await prisma.store.update({
      where: { id: store.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: expiry,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;

    await sendEmail({
      to: email,
      subject: 'Reset your Sales Portal password',
      html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
    .header { background: #000; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { color: #FFD700; margin: 0; font-size: 26px; }
    .body { background: #f9f9f9; padding: 32px 24px; border: 1px solid #e0e0e0; }
    .cta { display: block; margin: 28px auto; padding: 14px 32px; background: #FFD700; color: #000;
           text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;
           text-align: center; max-width: 240px; }
    .note { font-size: 12px; color: #888; margin-top: 24px; }
    .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Sales Portal</h1></div>
    <div class="body">
      <h2 style="margin-top:0">Reset your password</h2>
      <p>We received a request to reset the password for the Sales Portal account associated with this email address.</p>
      <p>Click the button below to set a new password. This link is valid for <strong>${PASSWORD_RESET_EXPIRY_MINUTES} minutes</strong>.</p>
      <a href="${resetLink}" class="cta">Reset Password</a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break:break-all;font-size:13px;color:#555">${resetLink}</p>
      <p class="note">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
    </div>
    <div class="footer">Sales Portal &mdash; Powered by Questbridge Ltd</div>
    <div style="text-align:center;font-size:11px;color:#aaa;margin-top:32px;padding-top:16px;border-top:1px solid #e0e0e0;">
      <p style="margin:4px 0;">${process.env.BUSINESS_ADDRESS ?? 'Questbridge Ltd, United Kingdom'}</p>
      <p style="margin:4px 0;">You received this email because a password reset was requested for this address.</p>
    </div>
  </div>
</body>
</html>`,
    });

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('[FORGOT_PASSWORD]', error);
    // Still return generic success to avoid enumeration
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
