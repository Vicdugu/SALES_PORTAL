# Security Audit Report
## Sales Till Multi-Tenant POS System

**Date**: May 2026  
**Scope**: Full application security review  
**System**: Next.js 15 / Prisma / PostgreSQL / Vercel / Supabase Realtime  

---

## Table of Contents

1. [Authentication & Session Management](#1-authentication--session-management)
2. [API Route Security](#2-api-route-security)
3. [Database & Data Handling](#3-database--data-handling)
4. [Environment & Configuration](#4-environment--configuration)
5. [Input Validation & Sanitization](#5-input-validation--sanitization)
6. [Multi-Tenancy Isolation](#6-multi-tenancy-isolation)
7. [Payment Handling](#7-payment-handling)
8. [Email & Notifications](#8-email--notifications)
9. [Infrastructure & Dependencies](#9-infrastructure--dependencies)
10. [Feature Flags](#10-feature-flags)
11. [Additional Concerns](#11-additional-concerns)
12. [Summary Table](#12-summary-table)

---

## 1. Authentication & Session Management

### What is Currently In Place ✅

| Control | Status | Details |
|---------|--------|---------|
| Password hashing | ✅ Present | `bcryptjs` with 10 salt rounds (`src/lib/auth/hash.ts`) |
| JWT authentication | ✅ Present | `jsonwebtoken` library; tokens signed and verified (`src/lib/auth/jwt.ts`) |
| Email verification | ✅ Present | 6-digit codes + verification token flow (`src/lib/auth/verification.ts`) |
| Verification token entropy | ✅ Present | 32 bytes from `crypto.randomBytes` (256-bit); SHA-256 hashed before storage |
| Rate limiting on verification | ✅ Present | `src/lib/auth/rate-limit.ts` — blocks brute-force on codes |
| Role-based access control | ✅ Present | `SUPERADMIN`, `ADMIN`, `STAFF` roles enforced per-route |

### Vulnerabilities Found ⚠️

---

#### CRIT-01 — JWT Secret Falls Back to Hardcoded Default
**Severity**: 🔴 CRITICAL  
**File**: `src/lib/auth/jwt.ts`

```typescript
// CURRENT (INSECURE)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
```

**Risk**: If `JWT_SECRET` is not set in any environment, all tokens are signed with the literal string `'your-secret-key'` which is publicly known. An attacker can forge valid JWTs for any user or store.  
**Evidence**: The fallback exists in the JWT module used by every authenticated request.

---

#### CRIT-02 — Hardcoded Superadmin Credentials
**Severity**: 🔴 CRITICAL  
**File**: `src/app/api/admin/setup-superadmin/route.ts`

```typescript
// CURRENT (INSECURE)
const hashedPassword = await bcryptjs.hash('superadmin123', 10);
await prisma.user.create({
  data: {
    email: 'superadmin@system.local',
    password: hashedPassword,
    ...
  },
});

return NextResponse.json({
  credentials: {
    email: 'superadmin@system.local',
    password: 'superadmin123',   // ← Returned in API response
  },
});
```

**Risk**: Anyone with access to the codebase (or network access to the endpoint) knows the superadmin credentials. This endpoint has no environment guard, meaning it is callable in production.  
**OWASP**: A02 Cryptographic Failures, A07 Identification and Authentication Failures.

---

#### HIGH-01 — No Rate Limiting on Login Endpoint
**Severity**: 🟠 HIGH  
**File**: `src/app/api/auth/login/route.ts`

Rate limiting exists in `src/lib/auth/rate-limit.ts` for verification code attempts, but **login itself has no rate limiting**. An attacker can attempt unlimited password guesses per account.

**Risk**: Enables credential stuffing and brute-force attacks against any user account.

---

#### HIGH-02 — JWT Stored in localStorage (XSS-Accessible)
**Severity**: 🟠 HIGH  
**File**: `src/contexts/AuthContext.tsx`

```typescript
// CURRENT (INSECURE)
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(user));
localStorage.setItem('store', JSON.stringify(store));
```

**Risk**: Any JavaScript executing in the browser (including injected scripts via XSS) can read `localStorage` and steal tokens. `httpOnly` cookies are inaccessible to JavaScript.  
**OWASP**: A03 Injection, A07 Identification and Authentication Failures.

---

#### HIGH-03 — JWT Expiry is 24 Hours
**Severity**: 🟠 HIGH  
**File**: `src/lib/auth/jwt.ts`

```typescript
const TOKEN_EXPIRY = '24h';
```

**Risk**: A stolen token is valid for 24 hours. Combined with localStorage storage, a compromised browser session gives an attacker a full-day window. No refresh token mechanism exists, so reducing expiry would require users to re-login frequently without a proper refresh flow.

---

#### HIGH-04 — Verification Codes Stored as Plaintext in Database
**Severity**: 🟠 HIGH  
**File**: `prisma/schema.prisma`

```prisma
model Store {
  verificationCode       String?
  verificationCodeExpiry DateTime?
}
```

**Risk**: A database breach exposes all live verification codes directly. Codes are 6-digit PINs (1,000,000 possibilities) with a 24-hour window — trivially brute-forceable if obtained from the DB.

---

#### MED-01 — Verification Code Window is 24 Hours
**Severity**: 🟡 MEDIUM  
**File**: `src/lib/auth/verification.ts`

```typescript
expiryDate.setHours(expiryDate.getHours() + 24);
```

**Risk**: Industry standard for OTP codes is 5–15 minutes. 24 hours provides an excessive window for code interception or brute-force.

---

#### MED-02 — Forgot Password Flow Not Implemented
**Severity**: 🟡 MEDIUM  
**File**: `src/app/api/auth/forgot-password/route.ts`

```typescript
// The response claims an email was sent but no email is actually dispatched
return NextResponse.json(
  successResponse({ message: 'Password reset instructions have been sent...' })
);
// No token generated, no email sent
```

**Risk**: Users cannot recover locked accounts. This is also a deception — the system tells users an email was sent when none was. Customers lose access permanently.

---

#### MED-03 — Two Different JWT Libraries in Use
**Severity**: 🟡 MEDIUM

- `src/lib/auth/jwt.ts` uses `jsonwebtoken` (synchronous)  
- `src/lib/tenancy/get-user-id.ts` uses `jose` (async/modern)

**Risk**: Inconsistency could allow tokens signed by one library to fail verification in another context, or introduce subtle algorithm confusion bugs.

---

#### LOW-01 — Rate Limit Fails Open on Missing DB Table
**Severity**: 🟢 LOW  
**File**: `src/lib/auth/rate-limit.ts`

```typescript
} catch {
  console.error('[RATE_LIMIT] Could not query VerificationAttempt table — failing open');
  return { allowed: true, remaining: MAX_FAILED_ATTEMPTS };
}
```

**Risk**: During initial deployment (before migrations run), the rate limiter allows all attempts through, eliminating brute-force protection during the first-run window.

---

## 2. API Route Security

### What is Currently In Place ✅

| Control | Status | Details |
|---------|--------|---------|
| JWT verification on most routes | ✅ Present | `Authorization: Bearer` header checked |
| Role enforcement | ✅ Present | SUPERADMIN / ADMIN / STAFF checks per route |
| ORM-based queries | ✅ Present | Prisma prevents SQL injection |
| Store ownership checks | ✅ Present | Non-superadmin users filtered to their `storeId` |
| Enum validation on payment methods | ✅ Present | `['CASH', 'TRANSFER', 'POS']` whitelist in orders route |

### Vulnerabilities Found ⚠️

---

#### CRIT-03 — Store ID Extracted from Untrusted Client Header
**Severity**: 🔴 CRITICAL  
**File**: `src/lib/tenancy/get-store-id.ts`

```typescript
// CURRENT (INSECURE)
const headerStoreId = headersList.get('x-store-id');
if (headerStoreId) {
  return headerStoreId;  // ← Returned with no verification
}
```

**Risk**: Any client can set `x-store-id: <another-store-id>` in their request headers and gain access to another tenant's orders, transactions, inventory, and user data. This is a **tenant data isolation breach** — the most severe category of multi-tenant vulnerability.  
**OWASP**: A01 Broken Access Control.

---

#### HIGH-05 — No Security Headers on Any Response
**Severity**: 🟠 HIGH  
**Files**: `next.config.ts`, `next.config.js`

None of the following HTTP security headers are configured:

| Header | Protection Against |
|--------|--------------------|
| `Content-Security-Policy` | XSS, code injection |
| `X-Frame-Options` | Clickjacking |
| `X-Content-Type-Options` | MIME-type sniffing |
| `Strict-Transport-Security` | Protocol downgrade, MITM |
| `Referrer-Policy` | Information leakage via Referer |
| `Permissions-Policy` | Camera/mic/geo misuse |

**Risk**: The application is fully exposed to clickjacking, MIME-sniffing, and lacks HSTS which means it could be served over HTTP.

---

#### HIGH-06 — No CORS Policy
**Severity**: 🟠 HIGH

No `Access-Control-Allow-Origin` or OPTIONS handler is configured on any API route. Without an explicit CORS policy, the browser applies the same-origin default — but this means if a CORS policy IS added incorrectly later, it could allow all origins.

**Risk**: If configured incorrectly (e.g., `Access-Control-Allow-Origin: *`) in the future, any website could make authenticated API calls on behalf of logged-in users.

---

#### HIGH-07 — No Rate Limiting on Sensitive API Endpoints
**Severity**: 🟠 HIGH

The following endpoints have no rate limiting:

- `POST /api/orders` — create new orders
- `POST /api/receipts/send-email` — send emails to any address
- `POST /api/users` — create staff accounts
- `GET /api/transactions` — read financial records
- `POST /api/auth/login` — authenticate users (see HIGH-01)

**Risk**: All endpoints are vulnerable to DoS via request flooding and data enumeration.

---

#### MED-04 — No CSRF Protection on State-Changing Endpoints
**Severity**: 🟡 MEDIUM

No CSRF token validation is present. All POST/PATCH/DELETE endpoints are vulnerable to cross-site request forgery if an attacker can lure a logged-in user to a malicious page.

**Risk**: Attacker could create orders, modify inventory, or delete records in the victim's store by embedding a cross-origin form.

---

#### MED-05 — No Request Body Size Limits
**Severity**: 🟡 MEDIUM

```typescript
const body = await request.json();
// No Content-Length check; no maximum payload size
```

**Risk**: A client can send a multi-megabyte JSON payload that consumes server memory. In a serverless environment (Vercel), this affects function execution costs and cold-start latency.

---

#### MED-06 — Inconsistent Error Response Leak Prevention
**Severity**: 🟡 MEDIUM

Some routes return detailed internal messages (table names, prisma error codes) in error responses. Prisma error codes like `P2002` (unique constraint) should not be passed to clients as they reveal schema details.

---

#### LOW-02 — No Request Correlation IDs
**Severity**: 🟢 LOW

No `x-request-id` tracing. Security incident investigation requires correlating a specific bad request across logs, which is impossible without request IDs.

---

## 3. Database & Data Handling

### What is Currently In Place ✅

| Control | Status | Details |
|---------|--------|---------|
| ORM (Prisma) | ✅ Present | Parameterized queries; no raw SQL exposed |
| Password hashing | ✅ Present | Passwords never stored in plaintext |
| Cascade deletes | ✅ Present | Proper `onDelete: Cascade` for tenant data cleanup |
| Indexes on tenant columns | ✅ Present | `storeId`, `email`, `createdAt` indexed |
| Verification token hashing | ✅ Present | SHA-256 hashed before storage |
| Audit log table | ✅ Present | `AuditLog` model with storeId, userId, action, resource |

### Vulnerabilities Found ⚠️

---

#### HIGH-08 — Verification Codes Stored Plaintext (DB-Level)
**Severity**: 🟠 HIGH  
*(Also listed under Auth as HIGH-04 — cross-category)*

A database backup or breach exposes all active verification codes. These are 6-digit codes valid for 24 hours.

---

#### MED-07 — No Encryption at Rest Configured
**Severity**: 🟡 MEDIUM

The schema stores customer-related data (emails, names, order details, store branding). There is no evidence of application-level field encryption or confirmed database-level encryption-at-rest configuration.

**Recommendation**: Confirm PostgreSQL host (Supabase/Neon/Railway) has encryption at rest enabled. For PII fields, consider application-level encryption using a library such as `@prisma-field-encryption`.

---

#### MED-08 — No Data Retention or Purge Policy
**Severity**: 🟡 MEDIUM

The `AuditLog`, `Notification`, `VerificationAttempt`, and `Order` tables grow indefinitely. GDPR requires the ability to delete a user's personal data upon request (Right to Erasure — Article 17).

No deletion mechanism, no TTL, no archive strategy exists.

---

#### MED-09 — Float Used for Currency Amounts
**Severity**: 🟡 MEDIUM

```prisma
model PaymentRecord {
  amount Float  // ← IEEE 754 floating point
}

model OrderItem {
  unitPrice Float
  subtotal  Float
}
```

**Risk**: Floating-point arithmetic is imprecise for currency. `0.1 + 0.2 = 0.30000000000000004` in IEEE 754. Summing many items could produce totals that are off by 1 cent, leading to reconciliation errors and potential payment disputes.

**Industry standard**: Store currency as integers (pence/cents).

---

#### MED-10 — No DB Connection Pool Limits
**Severity**: 🟡 MEDIUM

`PrismaClient` is instantiated with no explicit pool configuration. Serverless functions create a new client per invocation. Without pool limits or connection limits in the `DATABASE_URL`, the database can be overwhelmed by simultaneous connections.

---

#### LOW-03 — No Point-in-Time Recovery Evidence
**Severity**: 🟢 LOW

No backup configuration or PITR policy is visible in the codebase or deployment config. A data loss event would be unrecoverable.

---

## 4. Environment & Configuration

### What is Currently In Place ✅

| Control | Status | Details |
|---------|--------|---------|
| Env vars for secrets | ✅ Present | `JWT_SECRET`, `DATABASE_URL`, `RESEND_API_KEY` loaded from env |
| Production error check | ✅ Present | JWT module logs error if `JWT_SECRET` missing in production |
| Reduced logging in production | ✅ Present | Prisma log level lowered to `['error']` in production |

### Vulnerabilities Found ⚠️

---

#### HIGH-09 — No Security HTTP Headers in Next.js Config
**Severity**: 🟠 HIGH  
*(Cross-referenced with HIGH-05)*  
**File**: `next.config.ts`

The `headers()` async function is not implemented. All documented CSP, HSTS, frame options, etc. are absent.

---

#### HIGH-10 — Conflicting next.config Files
**Severity**: 🟠 HIGH

Both `next.config.ts` and `next.config.js` exist simultaneously. Next.js will only use one. The `next.config.js` contains `allowedDevOrigins: ['192.168.1.98']` which is a hardcoded private IP.

**Risk**: Configuration conflict causes unpredictable behaviour. A hardcoded internal IP in source control is an information disclosure.

---

#### MED-11 — No Startup Environment Validation
**Severity**: 🟡 MEDIUM

The application boots without validating all required environment variables. If `RESEND_API_KEY` is missing, email sending fails silently at runtime rather than crashing during startup with a clear error.

---

#### LOW-04 — No `.env.example` File
**Severity**: 🟢 LOW

No documented template for required environment variables. Developers deploying the system may omit critical secrets.

---

#### LOW-05 — Vercel Function Timeout May Cause Data Loss
**Severity**: 🟢 LOW  
**File**: `vercel.json`

```json
"maxDuration": 60
```

If a database write + email send takes > 60 seconds, the function terminates mid-operation. This could leave the database in a partially written state.

---

## 5. Input Validation & Sanitization

### What is Currently In Place ✅

| Control | Status | Details |
|---------|--------|---------|
| Payment method enum check | ✅ Present | Explicit `includes()` check in orders route |
| Required field checks | ✅ Present | Most routes check for missing required fields |
| TypeScript types | ✅ Present | Static type safety at compile time |
| Zod library installed | ✅ Present | Available in `package.json` but not used consistently |

### Vulnerabilities Found ⚠️

---

#### HIGH-11 — No Standardised Input Validation (Zod Underused)
**Severity**: 🟠 HIGH

Zod is installed but used on a minority of endpoints. Most routes manually check fields with `if (!field)` patterns, missing:
- String max-length limits
- Numeric range bounds
- Enum whitelisting
- Type coercion safety

---

#### HIGH-12 — HTML Injection in Email Templates (XSS via Email)
**Severity**: 🟠 HIGH  
**File**: `src/lib/email/receipt-generator.ts` (and related email templates)

```typescript
// User-controlled values interpolated directly into HTML
const html = `<h1>Welcome to ${storeName}!</h1>`;
// If storeName = '</h1><script>...</script><h1>' → XSS in email client
```

**Risk**: Store names, order notes, and item names inserted into HTML email templates without escaping. An attacker who controls a store name could inject HTML or JavaScript into emails sent to customers.  
**OWASP**: A03 Injection.

---

#### MED-12 — Negative / Zero Amounts Not Validated
**Severity**: 🟡 MEDIUM

```typescript
// From order creation
quantity: parseInt(quantity),   // Could be 0 or negative
unitPrice: parseFloat(unitPrice) // Could be negative
```

A staff member (or attacker) could create an order with negative unit prices, reducing total amounts, or submit a zero-quantity item that corrupts kitchen queue logic.

---

#### MED-13 — Email Header Injection Risk
**Severity**: 🟡 MEDIUM

```typescript
subject: `Your receipt from ${storeName}`
// storeName not stripped of \r\n
```

Email subject lines containing `\r\n` can inject additional headers (BCC, CC) into the outgoing email, enabling spam amplification via the application's email API.

---

#### LOW-06 — Weak Email Regex Validation
**Severity**: 🟢 LOW

```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

Accepts invalid formats. Use `z.string().email()` from Zod which implements RFC 5322.

---

## 6. Multi-Tenancy Isolation

### What is Currently In Place ✅

| Control | Status | Details |
|---------|--------|---------|
| storeId filtering on DB queries | ✅ Present | Most queries include `where: { storeId }` |
| SUPERADMIN bypass mechanism | ✅ Present | Superadmin can query across stores with explicit param |
| Store-scoped user lookup | ✅ Present | Users tied to stores via storeId FK |

### Vulnerabilities Found ⚠️

---

#### CRIT-04 — Tenant ID Sourced from Unverified Client Header
**Severity**: 🔴 CRITICAL  
**File**: `src/lib/tenancy/get-store-id.ts`

*(Full detail under CRIT-03 in API section — reproduced here for multi-tenancy emphasis)*

```typescript
const headerStoreId = headersList.get('x-store-id');
if (headerStoreId) {
  return headerStoreId;  // No cross-check against JWT payload
}
```

This is the single most dangerous vulnerability in the application. Every API endpoint that relies on `getStoreId()` for tenant isolation can be bypassed by any authenticated user simply by setting the `x-store-id` header to another store's ID.

**Impact**: Complete cross-tenant data access — orders, transactions, staff records, payment history, inventory.

---

#### HIGH-13 — No Database-Level Row Security
**Severity**: 🟠 HIGH

Tenant isolation is enforced entirely at the application layer. If any code path omits the `storeId` filter (now or in future), that query leaks all tenants' data. PostgreSQL supports Row-Level Security (RLS) which provides a DB-enforced safety net.

---

#### MED-14 — Superadmin Scope Not Audited
**Severity**: 🟡 MEDIUM

SUPERADMIN can access all stores but this access generates no audit log entries. Cross-tenant access by a superadmin should always be logged.

---

## 7. Payment Handling

### What is Currently In Place ✅

| Control | Status | Details |
|---------|--------|---------|
| Payment method whitelist | ✅ Present | `CASH`, `TRANSFER`, `POS` enum enforced |
| Split payment support | ✅ Present | Multiple payment records per order |
| Total validation | ✅ Present | Sum of payments compared to order total |
| DB transaction for payments | ✅ Present | Payment records wrapped in Prisma create |

### Vulnerabilities Found ⚠️

---

#### CRIT-05 — Payment Logs Not Actually Persisted
**Severity**: 🔴 CRITICAL  
**File**: `src/app/api/payment-logs/route.ts`

```typescript
// "Log to console (in production, would save to database)"
console.log(`[PAYMENT LOG] Order: ${orderId} | Method: ${paymentMethod}...`);
return NextResponse.json({...}, { status: 201 });
// No database write occurs
```

**Risk**: All payment audit records are lost the moment the serverless function terminates. There is no persistent financial audit trail. This violates financial record-keeping requirements and makes disputes irresolvable.

---

#### HIGH-14 — Floating-Point Arithmetic for Payment Totals
**Severity**: 🟠 HIGH

```typescript
const totalPaid = payments.reduce(
  (sum: number, p: any) => sum + (p.amount || 0), 0
);
if (Math.abs(totalPaid - total) > 0.01) { ... }
```

**Risk**: IEEE 754 floating-point errors accumulate. With large orders or many split payments, a valid transaction could fail the `> 0.01` check, or an invalid one could pass.

---

#### HIGH-15 — No Concurrency Control on Order Completion
**Severity**: 🟠 HIGH

Two simultaneous requests to complete the same order could both succeed, creating duplicate payment records. No optimistic lock, database lock, or idempotency key prevents this.

---

#### MED-15 — No Refund / Reversal API
**Severity**: 🟡 MEDIUM

No mechanism to reverse, void, or refund a transaction. Payment disputes cannot be handled within the system.

---

## 8. Email & Notifications

### What is Currently In Place ✅

| Control | Status | Details |
|---------|--------|---------|
| Transactional email via Resend | ✅ Present | Professional email provider |
| HTML receipt generation | ✅ Present | jsPDF + HTML templates |
| Real-time notifications (SSE) | ✅ Present | Server-Sent Events for kitchen/till |
| Notification persistence | ✅ Present | `Notification` table in DB |

### Vulnerabilities Found ⚠️

---

#### HIGH-12 — HTML Injection in Email Templates
*(Reproduced from Input Validation section — this affects emails sent to customers)*

---

#### HIGH-16 — No Rate Limiting on Receipt Email Endpoint
**Severity**: 🟠 HIGH

`POST /api/receipts/send-email` has no rate limiting or authentication requirement verification. An attacker can use the endpoint to spam arbitrary email addresses using the business's email identity, potentially getting the domain blacklisted.

---

#### MED-16 — No Email Retry Mechanism
**Severity**: 🟡 MEDIUM

Single-attempt email sending. A transient Resend API failure causes the customer to never receive their receipt with no retry or alerting.

---

#### LOW-07 — No Unsubscribe Link in Emails
**Severity**: 🟢 LOW (but Compliance Risk)

Marketing or notification emails lack an unsubscribe mechanism. This is required by CAN-SPAM (USA), CASL (Canada), and GDPR Article 21 (EU/UK) for commercial emails.

---

## 9. Infrastructure & Dependencies

### What is Currently In Place ✅

| Control | Status | Details |
|---------|--------|---------|
| Prisma ORM (latest) | ✅ Present | v6.19.3 — prevents SQL injection |
| bcryptjs for passwords | ✅ Present | v3.0.3 |
| jsonwebtoken | ✅ Present | v9.0.3 |
| Zod validation library | ✅ Present | v4.4.3 — installed, underused |
| TypeScript strict mode | ✅ Present | Reduces runtime type errors |

### Vulnerabilities Found ⚠️

---

#### HIGH-17 — Duplicate bcrypt Libraries
**Severity**: 🟠 HIGH

Both `bcrypt` (native) and `bcryptjs` (pure JS) are listed as dependencies. If both are imported in different files, they could produce different hashes for the same input, breaking authentication comparisons.

---

#### MED-17 — `next-auth` Installed but Unused
**Severity**: 🟡 MEDIUM

`next-auth ^4.24.14` is in `package.json` but the application uses a custom JWT implementation. This adds maintenance burden, increases bundle size, and carries any future `next-auth` CVEs as exposure even though it provides no benefit.

---

#### MED-18 — No Automated Dependency Vulnerability Scanning
**Severity**: 🟡 MEDIUM

No `npm audit` integration in CI/CD, no Dependabot or Snyk configured. Known CVEs in dependencies will go undetected.

---

## 10. Feature Flags

### What is Currently In Place ✅

| Control | Status | Details |
|---------|--------|---------|
| DB-backed feature flags | ✅ Present | `StoreFeature` table |
| Safe defaults | ✅ Present | Unknown flags default to `false` |
| TTL cache | ✅ Present | 60-second in-memory cache |
| Superadmin-only management | ✅ Present | Role check on admin features API |

### Vulnerabilities Found ⚠️

---

#### MED-19 — In-Memory Feature Flag Cache (Multi-Instance Problem)
**Severity**: 🟡 MEDIUM

In serverless deployments (Vercel), each function instance maintains its own memory. A flag change on instance A is invisible to instances B and C for up to 60 seconds, and indefinitely if instance A is recycled before the next request.

---

#### LOW-08 — No Audit Trail on Feature Flag Changes
**Severity**: 🟢 LOW

Feature flag changes are not written to the `AuditLog` table. There is no record of who enabled/disabled a feature or when.

---

## 11. Additional Concerns

### GDPR / Data Subject Rights

The system collects and processes personal data (names, email addresses, order histories) on behalf of its merchant tenants. Under GDPR:

- **Article 17 — Right to Erasure**: No user or store deletion mechanism that purges all associated PII
- **Article 20 — Data Portability**: No data export mechanism for end users
- **Article 30 — Records of Processing**: No documented data processing inventory
- **Article 33 — Breach Notification**: No security incident response plan or breach notification flow

### No Security Middleware / Middleware.ts

There is no `middleware.ts` at the Next.js root. This means:

- No global authentication guard (each route handles auth independently — inconsistency risk)
- No global rate limiting layer
- No global security header injection point
- No IP blocking or geo-restriction capability

---

## 12. Summary Table

| ID | Severity | Area | Issue |
|----|----------|------|-------|
| CRIT-01 | 🔴 CRITICAL | Auth | JWT secret falls back to hardcoded string |
| CRIT-02 | 🔴 CRITICAL | Auth | Superadmin setup returns hardcoded credentials |
| CRIT-03 | 🔴 CRITICAL | API / Tenancy | Store ID sourced from unverified client header |
| CRIT-04 | 🔴 CRITICAL | Multi-Tenancy | Same as CRIT-03 — cross-tenant data access |
| CRIT-05 | 🔴 CRITICAL | Payments | Payment logs not persisted to database |
| HIGH-01 | 🟠 HIGH | Auth | No rate limiting on login endpoint |
| HIGH-02 | 🟠 HIGH | Auth | JWT token stored in localStorage (XSS risk) |
| HIGH-03 | 🟠 HIGH | Auth | JWT expiry is 24 hours, no refresh token |
| HIGH-04 | 🟠 HIGH | Auth/DB | Verification codes stored plaintext in DB |
| HIGH-05 | 🟠 HIGH | Config | No HTTP security headers (CSP, HSTS, X-Frame) |
| HIGH-06 | 🟠 HIGH | API | No explicit CORS policy |
| HIGH-07 | 🟠 HIGH | API | No rate limiting on sensitive endpoints |
| HIGH-08 | 🟠 HIGH | DB | Verification codes stored plaintext |
| HIGH-09 | 🟠 HIGH | Config | Security headers absent from Next.js config |
| HIGH-10 | 🟠 HIGH | Config | Conflicting next.config files; hardcoded IP |
| HIGH-11 | 🟠 HIGH | Input | Zod installed but validation not standardised |
| HIGH-12 | 🟠 HIGH | Email | HTML injection in email templates (XSS) |
| HIGH-13 | 🟠 HIGH | Tenancy | No database-level row security (RLS) |
| HIGH-14 | 🟠 HIGH | Payments | Float arithmetic for currency calculations |
| HIGH-15 | 🟠 HIGH | Payments | No concurrency control on order completion |
| HIGH-16 | 🟠 HIGH | Email | No rate limiting on receipt email endpoint |
| HIGH-17 | 🟠 HIGH | Deps | Duplicate bcrypt libraries |
| MED-01 | 🟡 MEDIUM | Auth | Verification code window is 24 hours |
| MED-02 | 🟡 MEDIUM | Auth | Forgot password flow not implemented |
| MED-03 | 🟡 MEDIUM | Auth | Two different JWT libraries in use |
| MED-04 | 🟡 MEDIUM | API | No CSRF protection |
| MED-05 | 🟡 MEDIUM | API | No request body size limits |
| MED-06 | 🟡 MEDIUM | API | Prisma error codes leaked in responses |
| MED-07 | 🟡 MEDIUM | DB | No encryption at rest confirmed |
| MED-08 | 🟡 MEDIUM | DB | No data retention / GDPR erasure mechanism |
| MED-09 | 🟡 MEDIUM | DB | Float type for currency (precision loss) |
| MED-10 | 🟡 MEDIUM | DB | No DB connection pool limits |
| MED-11 | 🟡 MEDIUM | Config | No startup env var validation |
| MED-12 | 🟡 MEDIUM | Input | Negative/zero amounts not validated |
| MED-13 | 🟡 MEDIUM | Input | Email header injection risk |
| MED-14 | 🟡 MEDIUM | Tenancy | Superadmin cross-tenant access not audited |
| MED-15 | 🟡 MEDIUM | Payments | No refund/reversal API |
| MED-16 | 🟡 MEDIUM | Email | No email retry mechanism |
| MED-17 | 🟡 MEDIUM | Deps | next-auth installed but unused |
| MED-18 | 🟡 MEDIUM | Deps | No automated dependency vulnerability scanning |
| MED-19 | 🟡 MEDIUM | Features | In-memory flag cache breaks in multi-instance |
| LOW-01 | 🟢 LOW | Auth | Rate limit fails open on missing DB table |
| LOW-02 | 🟢 LOW | API | No request correlation IDs |
| LOW-03 | 🟢 LOW | DB | No backup / PITR evidence |
| LOW-04 | 🟢 LOW | Config | No .env.example file |
| LOW-05 | 🟢 LOW | Config | Vercel timeout may cause partial writes |
| LOW-06 | 🟢 LOW | Input | Weak email regex validation |
| LOW-07 | 🟢 LOW | Email | No unsubscribe link (GDPR/CAN-SPAM risk) |
| LOW-08 | 🟢 LOW | Features | No audit trail on feature flag changes |

**Totals**: 5 Critical · 17 High · 19 Medium · 8 Low/Info = **49 findings**
