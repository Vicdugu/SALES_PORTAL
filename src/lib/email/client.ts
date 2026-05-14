import { Resend } from "resend";

// ── Security helpers ──────────────────────────────────────────────────────────

/**
 * Escape user-supplied strings before embedding them in an HTML template.
 * Prevents XSS / HTML injection in email bodies.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitise a value used as an email header (subject, to, from).
 * Strips CR/LF characters that could enable header injection, and
 * truncates to 998 chars per RFC 5322.
 */
function sanitiseHeader(value: string): string {
  return value.replace(/[\r\n]+/g, '').slice(0, 998);
}

/**
 * Shared HTML footer included in all outbound emails.
 * Satisfies CAN-SPAM (physical address) and provides an unsubscribe note.
 * The unsubscribe address is the support email from env, falling back to a placeholder.
 */
function emailFooter(): string {
  const supportEmail = process.env.EMAIL_SUPPORT ?? process.env.EMAIL_FROM ?? 'support@yourdomain.com';
  const address = process.env.BUSINESS_ADDRESS ?? 'Questbridge Ltd, United Kingdom';
  return `
  <div style="text-align:center;font-size:11px;color:#aaa;margin-top:32px;padding-top:16px;border-top:1px solid #e0e0e0;">
    <p style="margin:4px 0;">${escapeHtml(address)}</p>
    <p style="margin:4px 0;">
      You received this email because you have an account with Sales Portal.
      To stop receiving emails, reply with &ldquo;unsubscribe&rdquo; to
      <a href="mailto:${escapeHtml(supportEmail)}" style="color:#aaa;">${escapeHtml(supportEmail)}</a>.
    </p>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────

let resend: Resend | null = null;

function getResend() {
  // Always try to initialize if we have the key
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!resend && apiKey) {
    try {
      resend = new Resend(apiKey);
      console.log("[EMAIL] ✅ Resend instance created successfully");
    } catch (err) {
      console.error("[EMAIL] ❌ Failed to create Resend instance:", err);
      return null;
    }
  }
  
  if (!apiKey) {
    console.error("[EMAIL] ❌ RESEND_API_KEY environment variable not set");
    console.error("[EMAIL] Available env vars:", Object.keys(process.env).filter(k => k.includes('RESEND') || k.includes('EMAIL')));
  }
  
  return resend;
}

if (typeof process !== 'undefined' && process.env) {
  console.log("[EMAIL] Module loaded - Environment check:", {
    hasResendApiKey: !!process.env.RESEND_API_KEY,
    apiKeyPreview: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    fromEmail: process.env.EMAIL_FROM || "onboarding@resend.dev (default)",
    nodeEnv: process.env.NODE_ENV,
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const MAX_ATTEMPTS = 3;
  const INITIAL_DELAY_MS = 500;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
      const resendInstance = getResend();
      if (!resendInstance) {
        console.error("[EMAIL] Resend API Key is missing");
        return false;
      }

      const result = await resendInstance.emails.send({
        from,
        to: sanitiseHeader(options.to),
        subject: sanitiseHeader(options.subject),
        html: options.html,
      });

      if (result.error) {
        // Certain errors are terminal — no point retrying (e.g. invalid address)
        const isTerminal =
          result.error.message?.toLowerCase().includes('invalid') ||
          result.error.message?.toLowerCase().includes('not found');
        if (isTerminal || attempt === MAX_ATTEMPTS) {
          console.error(`[EMAIL] Permanent failure after ${attempt} attempt(s):`, result.error);
          return false;
        }
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[EMAIL] Attempt ${attempt} failed, retrying in ${delay}ms:`, result.error.message);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      console.log(`[EMAIL] Sent successfully to ${sanitiseHeader(options.to)} (attempt ${attempt})`);
      return true;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        console.error("[EMAIL] Exception sending email (final attempt):", error);
        return false;
      }
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[EMAIL] Exception on attempt ${attempt}, retrying in ${delay}ms:`, error);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return false;
}

export async function sendVerificationEmail(
  storeName: string,
  email: string,
  verificationCode: string
): Promise<boolean> {
  const safeStoreName = escapeHtml(storeName);
  const safeCode = escapeHtml(verificationCode);
  const html = `<!DOCTYPE html>
<html>
<body>
  <h1>Welcome to Sales Portal!</h1>
  <p>Hi <strong>${safeStoreName}</strong>,</p>
  <p>Your Verification Code: <strong>${safeCode}</strong></p>
</body>
</html>`;

  return sendEmail({
    to: email,
    subject: "Your Sales Portal Verification Code",
    html,
  });
}

/**
 * Send a secure verification link email to a new store owner.
 * The link embeds the raw token — the raw token is never stored server-side.
 */
export async function sendVerificationLinkEmail(
  storeName: string,
  email: string,
  verificationLink: string
): Promise<boolean> {
  const safeStoreName = escapeHtml(storeName);
  // The verification link is a trusted internal URL — escape only for HTML attribute safety
  const safeLink = escapeHtml(verificationLink);
  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
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
      <h2 style="margin-top:0">Verify your email address</h2>
      <p>Hi <strong>${safeStoreName}</strong>,</p>
      <p>Thank you for registering. Click the button below to verify your email address and activate your store account.</p>
      <a href="${safeLink}" class="cta">Verify Email</a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break:break-all;font-size:13px;color:#555">${safeLink}</p>
      <p class="note">This link expires in 24 hours and can only be used once. If you did not register for Sales Portal, you can safely ignore this email.</p>
    </div>
    <div class="footer">Sales Portal &mdash; Powered by Questbridge Ltd</div>
    ${emailFooter()}
  </div>
</body>
</html>`;

  return sendEmail({
    to: email,
    subject: sanitiseHeader(`Verify your Sales Portal account — ${storeName}`),
    html,
  });
}

export interface ReceiptEmailOptions {
  to: string;
  storeName: string;
  orderNumber: string;
  total: number;
  currency: string;
  pdfBuffer: Buffer;
}

export async function sendReceiptEmail(
  options: ReceiptEmailOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[EMAIL] sendReceiptEmail called with:", {
      to: options.to,
      storeName: options.storeName,
      orderNumber: options.orderNumber,
      pdfSize: options.pdfBuffer.length,
    });

    // Use verified custom email
    const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
    
    console.log("[EMAIL] Configuration:", {
      customFromConfigured: process.env.EMAIL_FROM,
      usingFrom: from,
      isVerified: !!process.env.EMAIL_FROM,
    });

    const resendInstance = getResend();

    if (!resendInstance) {
      const errMsg = "Resend instance not initialized";
      console.error("[EMAIL] ❌", errMsg);
      console.error("[EMAIL] Debug info:", {
        hasResendApiKey: !!process.env.RESEND_API_KEY,
        apiKeyLength: process.env.RESEND_API_KEY?.length,
        hasEmailFrom: !!process.env.EMAIL_FROM,
      });
      return { success: false, error: errMsg };
    }

    console.log("[EMAIL] ✅ Resend instance available, proceeding with send...");

    // Sanitise user-supplied values used in HTML template and email headers
    const safeStoreName = escapeHtml(options.storeName);
    const safeOrderNumber = escapeHtml(options.orderNumber);

    // Format currency symbol
    let currencySymbol = "$";
    const currencyMap: { [key: string]: string } = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      AUD: "A$",
      CAD: "C$",
      CHF: "CHF",
      CNY: "¥",
      INR: "₹",
      MXN: "$",
      ZAR: "R",
      NGN: "₦",
      GHS: "₵",
      KES: "KSh",
      EGP: "£",
    };
    currencySymbol = currencyMap[options.currency] || "$";

    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .store-name { font-size: 24px; font-weight: bold; color: #2c3e50; }
    .receipt-details { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .receipt-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
    .receipt-item.total { font-weight: bold; font-size: 18px; border-bottom: 2px solid #2c3e50; padding: 12px 0; }
    .footer { text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="store-name">${safeStoreName}</div>
      <p style="margin: 10px 0 0 0; color: #7f8c8d;">Digital Receipt</p>
    </div>
    
    <div class="receipt-details">
      <div class="receipt-item">
        <span>Order Number:</span>
        <span>#${safeOrderNumber}</span>
      </div>
      <div class="receipt-item">
        <span>Date:</span>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
      <div class="receipt-item">
        <span>Time:</span>
        <span>${new Date().toLocaleTimeString()}</span>
      </div>
    </div>

    <div class="receipt-details">
      <div class="receipt-item total">
        <span>Total Amount:</span>
        <span>${currencySymbol}${options.total.toFixed(2)}</span>
      </div>
    </div>

    <p style="text-align: center; color: #7f8c8d; font-size: 14px;">
      A detailed receipt is attached as a PDF file.
    </p>

    <div class="footer">
      <p>Thank you for your purchase!</p>
      <p style="margin: 5px 0;">Please keep this email and attached receipt for your records.</p>
      <p style="margin: 5px 0;">Generated on ${new Date().toLocaleString()}</p>
      ${emailFooter()}
    </div>
  </div>
</body>
</html>`;

    // Convert Buffer to base64 for Resend attachment
    const base64Pdf = options.pdfBuffer.toString("base64");

    console.log("[EMAIL] Preparing receipt email with PDF attachment...");
    console.log("[EMAIL] PDF size:", options.pdfBuffer.length, "bytes");
    console.log("[EMAIL] Recipient:", options.to);
    console.log("[EMAIL] From:", from);

    const result = await resendInstance.emails.send({
      from,
      to: options.to,
      subject: sanitiseHeader(`Receipt for Order #${options.orderNumber} from ${options.storeName}`),
      html,
      attachments: [
        {
          filename: `receipt_${options.orderNumber}.pdf`,
          content: base64Pdf,
        },
      ],
    });

    console.log("[EMAIL] Resend API response received:", {
      hasError: !!result.error,
      hasData: !!result.data,
      errorMessage: result.error?.message,
      dataId: result.data?.id,
    });

    if (result.error) {
      console.error("[EMAIL] ❌ Resend API Error:", result.error);
      const errorMsg = `Resend error: ${result.error.message}`;
      console.error("[EMAIL] Full error:", result.error);
      return { success: false, error: errorMsg };
    }

    console.log(`[EMAIL] ✅ Receipt email sent successfully to ${options.to}`);
    console.log(`[EMAIL] Email ID: ${result.data?.id}`);
    return { success: true };
  } catch (error) {
    console.error("[EMAIL] ❌ Exception sending receipt email:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[EMAIL] Exception details:", {
      type: typeof error,
      errorConstructor: error?.constructor?.name,
      message: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}
