import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

console.log('[EMAIL] Resend initialized:', {
  apiKeyConfigured: !!process.env.RESEND_API_KEY,
  fromEmail: process.env.EMAIL_FROM || 'noreply@salesportal.com',
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Use onboarding@resend.dev for testing, or configure a verified domain
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    
    console.log(`[EMAIL] Sending to ${options.to} from ${from}`);
    console.log(`[EMAIL] Subject: ${options.subject}`);
    console.log(`[EMAIL] Resend API Key configured: ${!!process.env.RESEND_API_KEY}`);
    
    const result = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (result.error) {
      console.error(`[EMAIL] ✗ Resend API Error:`, result.error);
      console.error(`[EMAIL] Error type:`, result.error);
      return false;
    }

    console.log(`[EMAIL] ✓ Sent successfully to ${options.to}, Email ID: ${result.data?.id}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] ✗ Exception sending email:', error);
    if (error instanceof Error) {
      console.error('[EMAIL] Message:', error.message);
      console.error('[EMAIL] Stack:', error.stack?.substring(0, 200));
    }
    return false;
  }
}

export async function sendVerificationEmail(
  storeName: string,
  email: string,
  verificationCode: string
): Promise<boolean> {
  console.log(`[EMAIL] sendVerificationEmail called with code: ${verificationCode}`);
  
  // Build HTML with the code included
  const codeDisplay = verificationCode;
  
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
.container { max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
.header { background-color: #f39c12; color: white; padding: 30px 20px; text-align: center; }
.header h1 { margin: 0; font-size: 24px; }
.content { padding: 30px 20px; }
.code-box { background-color: #fff3cd; border: 3px solid #f39c12; padding: 30px; text-align: center; border-radius: 8px; margin: 20px 0; }
.code-box .code { font-size: 48px; font-weight: bold; color: #d67e22; letter-spacing: 8px; font-family: 'Courier New', monospace; }
.footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>Welcome to Sales Portal! 🎉</h1>
</div>
<div class="content">
<p>Hi <strong>${storeName}</strong>,</p>
<p>Thank you for registering with Sales Portal! To complete your registration and activate your store, please verify your email address by entering the code below:</p>
<div class="code-box">
<p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your Verification Code:</p>
<div class="code">${codeDisplay}</div>
<p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">This code will expire in 24 hours</p>
</div>
<p style="color: #666; font-size: 14px;">Enter this code on the verification page in your Sales Portal account.</p>
<p style="color: #999; font-size: 12px; margin-top: 30px;">If you did not create this account, please ignore this email.</p>
</div>
<div class="footer">
<p style="margin: 5px 0;">&copy; 2026 Sales Portal. All rights reserved.</p>
<p style="margin: 5px 0;">Powered by Questbridge Ltd</p>
</div>
</div>
</body>
</html>`;

  console.log(`[EMAIL] HTML includes code at position: ${html.indexOf(codeDisplay)}`);
  
  return sendEmail({
    to: email,
    subject: 'Your Sales Portal Verification Code',
    html,
  });
}
