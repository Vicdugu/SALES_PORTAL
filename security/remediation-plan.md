# Remediation Plan
## Sales Till Multi-Tenant POS System

Phased action plan to address all 49 security findings. Items within each phase are ordered by risk impact.

---

## Phase 1 — Critical: Must Fix Before Production Goes Live
**Target**: Within 1 week  
**Blocker**: System should not process real customer data until these are resolved.

| # | Finding | Recommendation | Owner | Est. Effort |
|---|---------|----------------|-------|-------------|
| 1 | CRIT-01: JWT secret fallback | REC-01: Remove `|| 'your-secret-key'` fallback | Dev | 30 min |
| 2 | CRIT-02: Hardcoded superadmin credentials | REC-02: Gate behind NODE_ENV + require supplied password | Dev | 1 hour |
| 3 | CRIT-03/04: storeId from client header | REC-03: Extract storeId from JWT only | Dev | 2 hours |
| 4 | CRIT-05: Payment logs not persisted | REC-04: Write payment logs to DB | Dev | 3 hours |
| 5 | HIGH-05/09: No security HTTP headers | REC-07: Add headers() to next.config.ts | Dev | 1 hour |
| 6 | HIGH-10: Conflicting next.config files | Delete `next.config.js`; consolidate config | Dev | 30 min |

**Phase 1 Estimated Total**: ~8 hours of development

---

## Phase 2 — High: Address Within 2 Weeks

| # | Finding | Recommendation | Owner | Est. Effort |
|---|---------|----------------|-------|-------------|
| 7 | HIGH-01: No login rate limiting | REC-05: Extend rate-limit.ts to login route | Dev | 2 hours |
| 8 | HIGH-02: JWT in localStorage | REC-06: Migrate to httpOnly cookies + /api/auth/me | Dev | 4 hours |
| 9 | HIGH-04/08: Plaintext verification codes | REC-09: Hash codes before DB storage | Dev | 2 hours |
| 10 | HIGH-11: Zod not standardised | REC-10: Create validation schemas; apply to all routes | Dev | 6 hours |
| 11 | HIGH-12: HTML injection in emails | REC-11: Install html-escaper; escape all template inputs | Dev | 2 hours |
| 12 | HIGH-14: Float currency arithmetic | REC-12: Migrate currency fields to integers (pence) | Dev | 4 hours |
| 13 | HIGH-15: No order concurrency control | REC-20: Use updateMany with status guard | Dev | 1 hour |
| 14 | HIGH-16: No email rate limiting | REC-13: Add rate limiting to send-email route | Dev | 1 hour |
| 15 | HIGH-17: Duplicate bcrypt libs | Remove `bcrypt`; keep only `bcryptjs` | Dev | 30 min |
| 16 | MED-02: Forgot password not implemented | REC-15: Complete the forgot-password flow | Dev | 4 hours |
| 17 | MED-13: Email header injection | REC-19: Sanitise subject lines | Dev | 30 min |

**Phase 2 Estimated Total**: ~27 hours of development

---

## Phase 3 — Medium: Address Within 4 Weeks

| # | Finding | Recommendation | Owner | Est. Effort |
|---|---------|----------------|-------|-------------|
| 18 | HIGH-06: No CORS policy | REC-08: Implement withCors() utility; set ALLOWED_ORIGINS | Dev | 2 hours |
| 19 | HIGH-07: No API rate limiting | Add rate limiting middleware to all sensitive routes | Dev | 4 hours |
| 20 | MED-01: Verification code 24h window | REC-14: Reduce to 15 minutes | Dev | 30 min |
| 21 | MED-03: Two JWT libraries | REC-16: Consolidate to one library | Dev | 1 hour |
| 22 | MED-04: No CSRF protection | REC-17: Add Next.js middleware with CSRF check | Dev | 3 hours |
| 23 | MED-05: No request body size limits | Add `Content-Length` check in middleware | Dev | 1 hour |
| 24 | MED-06: Prisma errors leaked | Sanitise error responses in all API routes | Dev | 3 hours |
| 25 | MED-08: No data retention policy | Implement DB cleanup jobs; GDPR erasure endpoint | Dev | 6 hours |
| 26 | MED-10: No DB connection pool limits | Add `connection_limit` to DATABASE_URL | Dev | 30 min |
| 27 | MED-11: No env var validation | REC-18: Add validateEnvironment() at startup | Dev | 1 hour |
| 28 | MED-12: Negative amounts not validated | REC-10: Zod schemas enforce positive values | Dev | Included above |
| 29 | MED-14: Superadmin cross-tenant not audited | Log all superadmin cross-store access | Dev | 2 hours |
| 30 | MED-15: No refund/reversal API | Design and implement reversal endpoint | Dev | 8 hours |
| 31 | MED-16: No email retry | Add exponential backoff to email sending | Dev | 2 hours |
| 32 | MED-17: Unused next-auth | REC-23: `npm uninstall next-auth` | Dev | 15 min |
| 33 | MED-18: No dependency scanning | REC-24: Add GitHub Actions security workflow | Dev | 1 hour |
| 34 | MED-19: In-memory feature flag cache | ARCH-03: Migrate to Redis (Upstash) | Dev | 4 hours |
| 35 | HIGH-03: JWT 24h expiry | ARCH-02: Implement refresh token flow | Dev | 6 hours |

**Phase 3 Estimated Total**: ~46 hours of development

---

## Phase 4 — Low & Compliance: Address Within 6 Weeks

| # | Finding | Recommendation | Owner | Est. Effort |
|---|---------|----------------|-------|-------------|
| 36 | LOW-01: Rate limit fails open | Fail hard on missing VerificationAttempt table | Dev | 30 min |
| 37 | LOW-02: No request IDs | REC-22: Add x-request-id to middleware | Dev | 30 min |
| 38 | LOW-03: No backup evidence | Confirm PITR with DB host; document recovery procedure | Ops | 2 hours |
| 39 | LOW-04: No .env.example | REC-21: Create .env.example | Dev | 30 min |
| 40 | LOW-05: Vercel timeout risk | Increase email function timeout; add async queue | Dev | 2 hours |
| 41 | LOW-06: Weak email regex | Use z.string().email() from Zod | Dev | 30 min |
| 42 | LOW-07: No unsubscribe link | REC-25: Add unsubscribe footer to all emails | Dev | 2 hours |
| 43 | LOW-08: Feature flag changes not audited | Write to AuditLog on flag change | Dev | 1 hour |
| 44 | GDPR Art 17: No erasure mechanism | Implement user data erasure endpoint | Dev/Legal | 6 hours |
| 45 | GDPR Art 20: No data export | Implement data portability endpoint | Dev | 4 hours |
| 46 | GDPR Art 13: No Privacy Policy | Write and publish Privacy Policy page | Legal/Dev | 8 hours |
| 47 | GDPR Art 28: No DPAs | Obtain DPAs from Resend, Supabase | Legal | 1 week |
| 48 | GDPR Art 33: No breach plan | Write incident response runbook | Security | 4 hours |
| 49 | CAN-SPAM: Physical address in emails | Add business address to email footers | Dev | 30 min |

**Phase 4 Estimated Total**: ~35 hours of development + legal work

---

## Phase 5 — Strategic / Architectural (Ongoing)

| # | Item | Description | Priority |
|---|------|-------------|----------|
| A | Database RLS | ARCH-01: Enable Row-Level Security on tenant tables | High |
| B | Penetration Testing | Engage external security firm for pen test | High |
| C | SIEM / Log Aggregation | Centralised logging with alerting for anomalous access | Medium |
| D | PCI-DSS Assessment | If card payments ever added, formal PCI scoping exercise | Conditional |
| E | Security Champions Programme | Assign security owner for each development sprint | Ongoing |
| F | Security Training | OWASP Top 10 training for all developers | Once/year |
| G | Dependency Monitoring | Enable GitHub Dependabot alerts on all repos | Immediate |
| H | Secrets Scanning | Enable GitHub secret scanning to prevent committing API keys | Immediate |

---

## Summary of Effort

| Phase | Issues | Est. Dev Hours |
|-------|--------|---------------|
| Phase 1 — Critical | 6 | ~8 hours |
| Phase 2 — High | 11 | ~27 hours |
| Phase 3 — Medium | 18 | ~46 hours |
| Phase 4 — Low / Compliance | 14 | ~35 hours + legal |
| Phase 5 — Strategic | 8 | Ongoing |
| **Total** | **49 findings + 8 strategic** | **~116 hours** |

---

## Pre-Production Checklist

Before the system handles real customer payment data, confirm all of the following:

- [ ] CRIT-01: JWT_SECRET required with no fallback
- [ ] CRIT-02: Superadmin setup endpoint blocked in production
- [ ] CRIT-03: Store ID extracted from JWT only
- [ ] CRIT-05: Payment logs persisted to database
- [ ] HIGH-05: Security headers configured in next.config.ts
- [ ] HIGH-10: Single next.config file; no hardcoded IPs
- [ ] HIGH-01: Login rate limiting active
- [ ] HIGH-02: JWT in httpOnly cookies (or equivalent protection)
- [ ] HIGH-12: All email templates HTML-escaped
- [ ] GDPR Art 13: Privacy Policy accessible to users
- [ ] Encryption at rest confirmed with hosting provider
- [ ] Backup/PITR policy confirmed and tested
