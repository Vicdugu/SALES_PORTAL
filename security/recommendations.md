# Security Recommendations
## Sales Till Multi-Tenant POS System

This document provides concrete, actionable code-level recommendations for every finding in the audit report.

---

## CRITICAL Fixes

---

### REC-01 — Remove JWT Secret Fallback
**Fixes**: CRIT-01  
**File**: `src/lib/auth/jwt.ts`

```typescript
// BEFORE (insecure)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// AFTER (secure)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}
```

---

### REC-02 — Remove Hardcoded Superadmin Credentials
**Fixes**: CRIT-02  
**File**: `src/app/api/admin/setup-superadmin/route.ts`

```typescript
// AFTER (secure)
export async function POST(request: NextRequest) {
  // 1. Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Require a password to be supplied in the request body
  const body = await request.json();
  const { password } = body;

  if (!password || password.length < 16) {
    return NextResponse.json(
      { error: 'Password must be at least 16 characters' },
      { status: 400 }
    );
  }

  const hashedPassword = await bcryptjs.hash(password, 12);

  // 3. Do NOT return the password in the response
  await prisma.user.create({
    data: {
      email: 'superadmin@system.local',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'SUPERADMIN',
    },
  });

  return NextResponse.json({ success: true });
}
```

---

### REC-03 — Extract Store ID from JWT Only
**Fixes**: CRIT-03, CRIT-04  
**File**: `src/lib/tenancy/get-store-id.ts`

```typescript
// AFTER (secure) — storeId is ONLY read from the verified JWT payload
import { headers } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function getStoreId(): Promise<string | null> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    return payload?.storeId ?? null;
  } catch {
    return null;
  }
}
```

> **Note**: Remove all `x-store-id` header extraction. The storeId stored in the JWT was set at login time by the server and cannot be tampered with by the client.

---

### REC-04 — Persist Payment Logs to Database
**Fixes**: CRIT-05  
**File**: `src/app/api/payment-logs/route.ts`

```typescript
// AFTER (secure) — actually write to DB
export async function POST(request: NextRequest) {
  const { orderId, paymentMethod, amount, storeId } = await request.json();

  // Validate
  const VALID_METHODS = ['CASH', 'TRANSFER', 'POS'];
  if (!orderId || !VALID_METHODS.includes(paymentMethod) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid payment log data' }, { status: 400 });
  }

  await prisma.paymentLog.create({
    data: {
      orderId,
      paymentMethod,
      amount,
      storeId,
      createdAt: new Date(),
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
```

> Ensure a `PaymentLog` model is added to `prisma/schema.prisma` and migrated.

---

## HIGH Priority Fixes

---

### REC-05 — Add Rate Limiting to Login Endpoint
**Fixes**: HIGH-01  
**File**: `src/app/api/auth/login/route.ts`

```typescript
import { checkRateLimit, recordAttempt } from '@/lib/auth/rate-limit';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body;

  // Rate limit by email address (5 attempts per 15 minutes)
  const rateLimit = await checkRateLimit(email, 5, 15);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again in 15 minutes.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    );
  }

  // ... existing login logic ...

  if (!passwordValid) {
    await recordAttempt(email);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // On success, clear attempts
  await clearAttempts(email);
  // ...
}
```

---

### REC-06 — Migrate Token Storage from localStorage to httpOnly Cookies
**Fixes**: HIGH-02  
**File**: `src/contexts/AuthContext.tsx` + `src/app/api/auth/login/route.ts`

**Step 1** — Set cookie server-side on login:
```typescript
// src/app/api/auth/login/route.ts
const response = NextResponse.json({ user, store });

response.cookies.set('auth_token', token, {
  httpOnly: true,       // Inaccessible to JavaScript
  secure: true,         // HTTPS only
  sameSite: 'strict',   // CSRF protection
  maxAge: 60 * 60 * 2,  // 2 hours
  path: '/',
});

return response;
```

**Step 2** — Remove localStorage usage from `AuthContext.tsx`:
```typescript
// REMOVE these lines
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(user));
localStorage.setItem('store', JSON.stringify(store));

// KEEP only non-sensitive UI state if needed
// Session state should be fetched from a /api/auth/me endpoint
```

**Step 3** — Add `/api/auth/me` endpoint to restore session from cookie:
```typescript
export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return NextResponse.json(null, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json(null, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  return NextResponse.json({ user, store: user?.store });
}
```

---

### REC-07 — Add Security Headers to Next.js Config
**Fixes**: HIGH-05, HIGH-09  
**File**: `next.config.ts`

```typescript
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",   // Tighten further once inline scripts removed
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' wss://*.supabase.co https://*.supabase.co",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

> Also delete `next.config.js` to eliminate the conflicting config file.

---

### REC-08 — Add CORS Policy
**Fixes**: HIGH-06  
**Create**: `src/lib/api/cors.ts`

```typescript
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function withCors(
  response: Response,
  requestOrigin: string | null
): Response {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin);
    response.headers.set('Vary', 'Origin');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  return response;
}
```

Set in environment: `ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com`

---

### REC-09 — Hash Verification Codes Before DB Storage
**Fixes**: HIGH-04, HIGH-08  
**File**: `src/lib/auth/verification.ts`

```typescript
import { createHash } from 'crypto';

export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

// When storing:
await prisma.store.update({
  where: { id: storeId },
  data: {
    verificationCode: hashCode(rawCode),   // ← Store hash, not raw code
    verificationCodeExpiry: getVerificationCodeExpiry(),
  },
});

// When verifying:
const hashedInput = hashCode(userSuppliedCode);
if (store.verificationCode !== hashedInput) {
  // Code invalid
}
```

---

### REC-10 — Standardise Input Validation with Zod
**Fixes**: HIGH-11, MED-12  
**Create**: `src/lib/validation/schemas.ts`

```typescript
import { z } from 'zod';

export const OrderItemSchema = z.object({
  menuItemId: z.string().cuid(),
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(999),
  unitPrice: z.number().positive().max(1_000_000),
});

export const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1).max(100),
  notes: z.string().max(500).optional(),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'POS']).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
  role: z.enum(['ADMIN', 'STAFF']),
});
```

**Usage in route**:
```typescript
const parsed = CreateOrderSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: 'Validation failed', details: parsed.error.flatten() },
    { status: 400 }
  );
}
const { items, notes } = parsed.data;
```

---

### REC-11 — HTML-Escape User Inputs in Email Templates
**Fixes**: HIGH-12  
**File**: `src/lib/email/receipt-generator.ts` and all email template files

```bash
npm install html-escaper
npm install --save-dev @types/html-escaper
```

```typescript
import { escape } from 'html-escaper';

// In all email templates:
const safeStoreName = escape(storeName);
const safeCustomerName = escape(customerName);
const safeNotes = escape(orderNotes ?? '');

const html = `
  <h1>Receipt from ${safeStoreName}</h1>
  <p>Hi ${safeCustomerName},</p>
  <p>Notes: ${safeNotes}</p>
`;
```

---

### REC-12 — Fix Floating-Point Currency Arithmetic
**Fixes**: HIGH-14, MED-09  
**Recommendation**: Store all monetary amounts as integers (pence/cents) in the database.

**Prisma schema change**:
```prisma
model OrderItem {
  unitPricePence Int    // Store in smallest currency unit
  subtotalPence  Int
}

model PaymentRecord {
  amountPence Int
}
```

**Calculation utility**:
```typescript
// src/lib/utils/currency.ts
export function toPence(amount: number): number {
  return Math.round(amount * 100);
}

export function fromPence(pence: number): number {
  return pence / 100;
}

export function formatCurrency(pence: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(pence / 100);
}
```

---

### REC-13 — Add Rate Limiting to Email Endpoint
**Fixes**: HIGH-16  
**File**: `src/app/api/receipts/send-email/route.ts`

```typescript
// Max 10 receipt emails per store per hour
const EMAIL_RATE_LIMIT = 10;
const EMAIL_RATE_WINDOW_MINUTES = 60;

export async function POST(request: NextRequest) {
  const storeId = await getStoreId();
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateCheck = await checkRateLimit(`email:${storeId}`, EMAIL_RATE_LIMIT, EMAIL_RATE_WINDOW_MINUTES);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Email rate limit exceeded. Try again later.' },
      { status: 429 }
    );
  }

  // ... existing logic
}
```

---

## MEDIUM Priority Fixes

---

### REC-14 — Reduce Verification Code Expiry to 15 Minutes
**Fixes**: MED-01  
**File**: `src/lib/auth/verification.ts`

```typescript
export function getVerificationCodeExpiry(): Date {
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + 15);  // 24h → 15min
  return expiryDate;
}
```

---

### REC-15 — Implement Forgot Password Flow
**Fixes**: MED-02  
**File**: `src/app/api/auth/forgot-password/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  // Always return the same response regardless of whether email exists (prevents enumeration)
  const genericResponse = NextResponse.json({
    message: 'If that email is registered, you will receive a reset link.',
  });

  const store = await prisma.store.findUnique({ where: { email } });
  if (!store) return genericResponse;

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await prisma.store.update({
    where: { id: store.id },
    data: {
      passwordResetToken: tokenHash,
      passwordResetExpiry: expiry,
    },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${rawToken}`;
  await sendEmail({
    to: email,
    subject: 'Reset your password',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 30 minutes.</p>`,
  });

  return genericResponse;
}
```

> Requires adding `passwordResetToken String?` and `passwordResetExpiry DateTime?` fields to the `Store` model.

---

### REC-16 — Consolidate to Single JWT Library
**Fixes**: MED-03  
**Action**: Migrate `src/lib/tenancy/get-user-id.ts` to use `src/lib/auth/jwt.ts`'s `verifyToken()` function instead of importing `jose` directly.

---

### REC-17 — Add Global Next.js Middleware
**Fixes**: MED-04 (CSRF), HIGH-07 (rate limiting), HIGH-05 (headers)  
**Create**: `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that require authentication
const PROTECTED_PATHS = ['/till', '/kitchen', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Enforce HTTPS in production
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') !== 'https'
  ) {
    return NextResponse.redirect(`https://${request.headers.get('host')}${pathname}`, 301);
  }

  // 2. CSRF: reject cross-origin state-changing requests
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (
    ['POST', 'PATCH', 'DELETE'].includes(request.method) &&
    origin &&
    !origin.includes(host ?? '')
  ) {
    return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 });
  }

  // 3. Protect page routes
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

### REC-18 — Add Startup Environment Validation
**Fixes**: MED-11  
**Create**: `src/lib/env-validation.ts`

```typescript
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_BASE_URL',
] as const;

export function validateEnvironment(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nSee .env.example for required variables.`
    );
  }
}
```

Call this in a server-only initialisation file that runs before any request handling.

---

### REC-19 — Prevent Email Header Injection
**Fixes**: MED-13  
**File**: Any email-sending code

```typescript
function sanitiseEmailHeader(value: string): string {
  // Remove carriage return and newline to prevent header injection
  return value.replace(/[\r\n]/g, '').trim().slice(0, 998); // RFC 5321 max header length
}

// Usage:
return sendEmail({
  to: sanitiseEmailHeader(recipientEmail),
  subject: sanitiseEmailHeader(`Your receipt from ${storeName}`),
  html: receiptHtml,
});
```

---

### REC-20 — Add Concurrency Control to Order Completion
**Fixes**: HIGH-15  
**File**: `src/app/api/orders/[id]/route.ts`

```typescript
// Use optimistic locking — only update if status is still PENDING
const updated = await prisma.order.updateMany({
  where: {
    id: orderId,
    storeId,
    status: 'PENDING',  // Guard: won't double-complete
  },
  data: { status: 'COMPLETED', paymentMethod, completedAt: new Date() },
});

if (updated.count === 0) {
  return NextResponse.json(
    { error: 'Order already completed or not found' },
    { status: 409 }
  );
}
```

---

## LOW Priority Fixes

---

### REC-21 — Add .env.example File
**Fixes**: LOW-04  
**Create**: `.env.example`

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Authentication
JWT_SECRET="your-256-bit-random-secret-here"

# Email
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"

# Application
NEXT_PUBLIC_BASE_URL="https://yourdomain.com"

# Feature flags
ALLOWED_ORIGINS="https://yourdomain.com"

# Optional: Redis for distributed caching
REDIS_URL="redis://localhost:6379"
```

---

### REC-22 — Add Request Correlation IDs
**Fixes**: LOW-02  
**File**: `src/middleware.ts` (add to REC-17)

```typescript
// Add to middleware response
const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
const response = NextResponse.next();
response.headers.set('x-request-id', requestId);
return response;
```

---

### REC-23 — Remove Unused next-auth Dependency
**Fixes**: MED-17

```bash
npm uninstall next-auth
```

---

### REC-24 — Add npm Audit to CI/CD
**Fixes**: MED-18  
**Create**: `.github/workflows/security.yml`

```yaml
name: Security Audit

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9am

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm audit --audit-level=moderate
```

---

### REC-25 — Add Unsubscribe Link to Notification Emails
**Fixes**: LOW-07  
**File**: Email templates

```typescript
const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/email/unsubscribe?token=${unsubToken}`;

const html = `
  ...email body...
  <hr>
  <p style="font-size:12px;color:#666;">
    You are receiving this because you registered at ${storeName}.<br>
    <a href="${unsubscribeUrl}">Unsubscribe</a> from these emails.
  </p>
`;
```

---

## Architectural Recommendations

### ARCH-01 — Implement Row-Level Security (PostgreSQL RLS)

Enable RLS on all tenant-scoped tables as a defence-in-depth layer. Even if the application layer is bypassed, the database prevents cross-tenant reads:

```sql
-- Enable RLS on orders table
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their store's orders
CREATE POLICY tenant_isolation ON "Order"
  USING (store_id = current_setting('app.current_store_id')::text);
```

Set the store ID at the start of each DB session:
```typescript
await prisma.$executeRaw`SELECT set_config('app.current_store_id', ${storeId}, true)`;
```

---

### ARCH-02 — Implement Refresh Token Flow

Current: 24-hour access tokens with no rotation.  
Recommended:

1. Issue short-lived access tokens (15–30 minutes)
2. Issue long-lived refresh tokens (7 days), stored in httpOnly cookies
3. `/api/auth/refresh` endpoint validates refresh token and issues new access token
4. On logout, invalidate the refresh token in the database

---

### ARCH-03 — Implement a Distributed Cache for Feature Flags

Replace in-memory map with Redis:

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export async function isFeatureEnabled(storeId: string, flagKey: string): Promise<boolean> {
  const cacheKey = `features:${storeId}:${flagKey}`;
  const cached = await redis.get<boolean>(cacheKey);

  if (cached !== null) return cached;

  const record = await prisma.storeFeature.findUnique({
    where: { storeId_flagKey: { storeId, flagKey } },
  });

  const value = record?.enabled ?? false;
  await redis.set(cacheKey, value, { ex: 60 });
  return value;
}
```

---

### ARCH-04 — GDPR Compliance: Right to Erasure

Add a `DELETE /api/users/:id` endpoint that:
1. Deletes all personal data (name, email)
2. Anonymises transaction records (replace user references with `[deleted]`)
3. Deletes session tokens
4. Logs the deletion event in the audit log

---

### ARCH-05 — PCI-DSS Consideration

If the system ever handles card numbers or payment tokens directly:
1. **Never store** raw card numbers (PANs)
2. Use a payment processor (Stripe, Square) for card handling — they absorb PCI scope
3. Tokenise all payment instruments
4. Segregate payment processing into a separate service with its own audit log

For current cash/transfer/POS operations: ensure payment amounts and methods are stored with an immutable, timestamped audit trail.
