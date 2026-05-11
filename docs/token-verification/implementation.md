# Token Verification — Store Email Verification

## Findings

### Pre-Implementation State
- Store registration set `emailVerified: true` automatically — no email confirmation required.
- A 6-digit numeric code existed in the codebase but was never sent during registration.
- The `verificationCode` column stored codes in **plain text** — any database read exposed the secret.
- No rate limiting existed on the verify endpoint.
- No audit trail for verification attempts.
- `AuditLog` model requires an authenticated `userId`, making it unsuitable for pre-auth events.

---

## Industry Best-Practice Recommendations Applied

| Concern | Recommendation | Implementation |
|---|---|---|
| Token entropy | Minimum 128 bits | `crypto.randomBytes(32)` → 64 hex chars (256 bits) |
| Storage | Never store raw token | SHA-256 hash stored; raw token sent only via email |
| Expiry | Short-lived (≤ 24 h) | 24-hour window, configurable via constant |
| One-time use | Invalidate after use | Token hash + expiry cleared on successful verification |
| Rate limiting | Prevent brute force | Max 5 failed attempts per 15-minute window per email |
| Audit logging | Record all attempts | `VerificationAttempt` table: email, success, reason, IP, timestamp |
| Error messages | No enumeration | Store-not-found returns same error shape as invalid-token |
| Transport | HTTPS link, not plain code | Verification link embedded in email; no code to intercept via shoulder surfing |

---

## Architecture

```
POST /api/stores (register)
  │
  ├─ Create Store (emailVerified: false) + Admin User
  ├─ generateVerificationToken() → { rawToken, tokenHash, expiry }
  ├─ Store tokenHash + expiry in DB
  └─ sendVerificationLinkEmail(storeName, email, link) via Resend

GET /verify-email?token=RAW&email=ENCODED  (browser link click)
  │
  └─ POST /api/stores/verify { token, email }
       │
       ├─ checkVerificationRateLimit(email) → 5 attempts / 15 min
       ├─ Lookup Store by email
       ├─ SHA-256(rawToken) === store.verificationCode (hash compare)
       ├─ isTokenExpired(store.verificationCodeExpiry)
       ├─ store.emailVerified already? → short-circuit success
       ├─ UPDATE store SET emailVerified=true, verificationCode=null, verificationCodeExpiry=null
       ├─ logVerificationAttempt(email, success, reason, ip)
       └─ Return success / error

POST /api/stores/resend-code { email }
  │
  ├─ checkVerificationRateLimit(email)
  ├─ Re-generate token, overwrite stored hash
  └─ sendVerificationLinkEmail(...)
```

---

## Implementation Details

### Token Generation (`src/lib/auth/verification-token.ts`)
- `crypto.randomBytes(32)` produces 32 cryptographically random bytes encoded as 64 hex characters.
- SHA-256 hash computed via `crypto.createHash('sha256')` — deterministic, non-reversible.
- Raw token is **never persisted**; only the hash is written to the `verificationCode` column.
- Expiry defaults to 24 hours from generation time.

### Rate Limiting (`src/lib/auth/rate-limit.ts`)
- Counts `VerificationAttempt` rows for `email` where `success = false` and `createdAt >= now - 15 min`.
- DB-backed — stateless across serverless function instances (Vercel-safe).
- Returns `{ allowed: boolean, remaining: number }`.
- On block: endpoint returns `429 Too Many Requests`.

### Audit Logging (`VerificationAttempt` model)
- Standalone table — no `userId` foreign key required (pre-auth context).
- Fields: `id`, `email`, `ipAddress`, `success`, `reason`, `createdAt`.
- Indexed on `email` and `createdAt` for efficient rate-limit queries.
- Retention: rows are not auto-deleted — apply a cron cleanup or DB policy if needed.

### Email Delivery (`src/lib/email/client.ts`)
- `sendVerificationLinkEmail(storeName, email, verificationLink)` — sends branded HTML email.
- Falls back to `onboarding@resend.dev` if `EMAIL_FROM` is not configured.
- Link format: `{baseUrl}/verify-email?token={rawToken}&email={encodedEmail}`.
- Base URL derived from the incoming request `Host` header — no hard-coded domain.

### Verification Endpoint (`src/app/api/stores/verify/route.ts`)
- **GET** `/api/stores/verify?token=&email=` — lightweight pre-check (used by verify-email page before rendering success state).
- **POST** `/api/stores/verify` `{ token, email }` — full verification with rate limit, hash compare, expiry check, one-time invalidation, and audit log.

---

## Future Extension Points

| Enhancement | Extension Point |
|---|---|
| Multi-tenant branding | Pass `storeId` to `sendVerificationLinkEmail`; look up Store branding before sending |
| Custom email templates | Replace HTML string in `sendVerificationLinkEmail` with a template renderer (e.g. React Email) |
| SMS delivery | Add `sendVerificationLinkSMS(phone, link)` in `src/lib/sms/`; registration chooses channel |
| Magic-link login | Re-use `generateVerificationToken` + verify endpoint with a `purpose` discriminator field |
| Redis rate limiting | Swap `checkVerificationRateLimit` implementation — interface stays the same |
| TOTP / WebAuthn | Add alternative verifier in `src/lib/auth/` behind same `VerificationStrategy` interface |
