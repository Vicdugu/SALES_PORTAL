import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  } : undefined,
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const from = process.env.EMAIL_FROM || 'noreply@salesportal.com';
    
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendVerificationEmail(
  storeName: string,
  email: string,
  verificationCode: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f39c12; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; }
          .code-box { background-color: #fff3cd; border: 2px solid #f39c12; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .code { font-size: 36px; font-weight: bold; color: #f39c12; letter-spacing: 4px; font-family: monospace; }
          .footer { background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
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
              <div class="code">${verificationCode}</div>
              <p style="color: #666; margin-top: 10px;">This code will expire in 24 hours</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Enter this code on the verification page in your Sales Portal account.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If you did not create this account, please ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Sales Portal. All rights reserved.</p>
            <p>Powered by Questbridge Ltd</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Your Sales Portal Verification Code',
    html,
  });
}
