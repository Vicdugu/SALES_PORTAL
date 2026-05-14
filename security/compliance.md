# Regulatory Compliance Requirements
## Sales Till Multi-Tenant POS System

This document maps the system's obligations under applicable data protection and payment regulations.

---

## Applicable Regulations

| Regulation | Applicability | Scope |
|------------|---------------|-------|
| **GDPR** (EU 2016/679) | ✅ Applies | System processes personal data of EU/UK data subjects (customer names, emails, order history) |
| **UK GDPR** | ✅ Applies | UK equivalent of EU GDPR; applies post-Brexit |
| **PCI-DSS v4.0** | ⚠️ Partial | Applies if any card data is processed; currently limited to cash/transfer/POS method labels |
| **CAN-SPAM Act** | ✅ Applies | Transactional/commercial emails sent via Resend |
| **CASL** | ✅ Applies if Canadian users | Commercial electronic messages to Canadian recipients |

---

## GDPR Requirements

### Article 5 — Principles of Processing

| Principle | Current Status | Gap |
|-----------|---------------|-----|
| Lawfulness, fairness, transparency | ❌ No Privacy Policy | No visible privacy notice |
| Purpose limitation | ⚠️ Unclear | Data collected for POS but extent of use not defined |
| Data minimisation | ✅ Acceptable | Only collects names, emails, order data |
| Accuracy | ⚠️ No update mechanism | Users cannot update their personal data |
| Storage limitation | ❌ No retention policy | Data retained indefinitely |
| Integrity and confidentiality | ❌ Gaps | See audit findings CRIT-01 through HIGH-14 |
| Accountability | ❌ No DPO or records | No Data Protection Officer designated |

---

### Article 6 — Lawful Basis for Processing

The system must document a lawful basis for each category of processing:

| Data Category | Recommended Lawful Basis |
|---------------|--------------------------|
| Staff account credentials | **Contract** (Art 6(1)(b)) — necessary to provide the service |
| Customer email for receipts | **Legitimate Interests** (Art 6(1)(f)) or **Consent** (Art 6(1)(a)) |
| Order history / transaction records | **Legal Obligation** (Art 6(1)(c)) — financial records retention |
| Marketing notifications | **Consent** (Art 6(1)(a)) — explicit opt-in required |

**Action Required**: Implement a consent mechanism if sending marketing emails. Display a privacy notice at the point of data collection.

---

### Article 13 — Information to Be Provided at Data Collection

A privacy notice must be displayed to users providing data. Required content:

- Identity and contact details of the data controller (each store is the controller; the platform is a processor)
- Purposes and legal basis for processing
- Recipients / third parties (Resend for email, Supabase for realtime, database host)
- Retention periods
- Data subject rights (access, erasure, portability, objection)
- Right to lodge a complaint with the supervisory authority (ICO in UK)

**Action Required**: Create a Privacy Policy page accessible from the login/register screen.

---

### Article 17 — Right to Erasure ("Right to Be Forgotten")

**Current Status**: ❌ Not Implemented

The system has no mechanism to delete a user's personal data upon request.

**Required Implementation**:

```typescript
// DELETE /api/users/:id endpoint should:
// 1. Anonymise user data
await prisma.user.update({
  where: { id: userId },
  data: {
    name: '[Deleted User]',
    email: `deleted-${userId}@placeholder.invalid`,
    password: '',     // Invalidate login
    deletedAt: new Date(),
  },
});

// 2. Anonymise related transaction records (preserve financial totals)
await prisma.order.updateMany({
  where: { createdByUserId: userId },
  data: { createdByUserId: null },
});

// 3. Log the erasure
await prisma.auditLog.create({
  data: {
    storeId,
    userId: requestingUserId,
    action: 'USER_DATA_ERASED',
    resource: userId,
    details: 'GDPR Article 17 erasure request',
  },
});
```

> **Note**: Financial records (orders, transactions, payment amounts) may need to be retained for tax purposes under **Art 6(1)(c)** for the legally required period (typically 7 years in the UK). Personal identifying fields within those records should be anonymised while preserving the financial data.

---

### Article 20 — Right to Data Portability

**Current Status**: ❌ Not Implemented

Users can request a machine-readable export of their data.

**Required Implementation**: `GET /api/users/:id/export` returning a JSON or CSV of the user's personal data and order history.

---

### Article 25 — Privacy by Design

- Enable encryption at rest on the PostgreSQL database host (**confirm with hosting provider**)
- Only collect the minimum data required
- Apply access controls (role-based) — ✅ partially done
- Pseudonymise where possible

---

### Article 28 — Data Processor Agreements

The platform (as a SaaS) is a **data processor** on behalf of each store (the **data controller**). A Data Processing Agreement (DPA) must be in place with:

- Each store that uses the platform
- Third-party sub-processors: Resend (email), Supabase (realtime), database host (Neon/Supabase/Railway)

**Action Required**: Obtain DPAs from Resend, Supabase, and the database provider. Include a DPA template in the merchant onboarding process.

---

### Article 32 — Security of Processing

**Required security measures (current gaps highlighted)**:

| Measure | Status |
|---------|--------|
| Encryption in transit (TLS) | ✅ Vercel enforces HTTPS |
| Encryption at rest | ❓ Unconfirmed — depends on DB host settings |
| Access controls / authentication | ⚠️ Present but with gaps (see CRIT-01 through HIGH-03) |
| Ability to ensure confidentiality | ❌ JWT in localStorage, no httpOnly cookies |
| Regular testing of security measures | ❌ No penetration testing scheduled |
| Pseudonymisation | ❌ Not implemented |

---

### Article 33 — Breach Notification

**Current Status**: ❌ No Incident Response Plan

In the event of a personal data breach:
- Must notify the supervisory authority (ICO) **within 72 hours** of becoming aware
- Must notify affected individuals if the breach is likely to result in high risk

**Action Required**:
1. Create an incident response runbook (who to contact, how to assess risk, notification templates)
2. Implement monitoring/alerting for anomalous data access (e.g., mass export queries)
3. Document the breach notification procedure

---

## PCI-DSS Requirements

### Current Scope

The system uses **cash, bank transfer, and POS terminal** as payment methods. No card numbers, CVVs, or magnetic stripe data are processed or stored by the application itself.

**Risk**: If POS terminal integration is added in future, or if the `TRANSFER` method involves capturing bank account details, PCI-DSS scope expands significantly.

### Applicable Controls (Even at Current Scope)

| Requirement | Status |
|-------------|--------|
| Do not store sensitive authentication data | ✅ No card data stored |
| Protect stored cardholder data | N/A — not applicable currently |
| Encrypt transmission of cardholder data | N/A |
| Use strong access controls | ⚠️ Gaps identified (CRIT-01, HIGH-01 through HIGH-03) |
| Monitor and test networks | ❌ No monitoring |
| Maintain an information security policy | ❌ Not documented |

### Recommendation if Card Payments are Added

Use a **payment processor SDK** (Stripe Elements, Square Web Payments SDK) that handles card data entirely within their iframe. This keeps card data out of your system entirely (**out-of-scope for PCI-DSS SAQ A**).

---

## CAN-SPAM Act Compliance

Applies to all commercial electronic messages sent from the system (receipts, notifications, marketing).

| Requirement | Status |
|-------------|--------|
| Identify the message as an advertisement | ⚠️ Unclear for notification emails |
| Include physical postal address | ❌ Not included in email templates |
| Provide opt-out mechanism | ❌ No unsubscribe link (see LOW-07) |
| Honor opt-out requests within 10 business days | ❌ No mechanism |
| Do not use deceptive subject lines | ✅ Subject lines appear accurate |

**Action Required**:
1. Add unsubscribe links to all commercial/notification emails
2. Add a business postal address to email footers
3. Implement an unsubscribe database and honour requests

---

## Compliance Summary

| Regulation | Current Status | Priority |
|------------|---------------|----------|
| GDPR — Security | ❌ Significant gaps | Immediate |
| GDPR — Rights | ❌ Not implemented | 2–4 weeks |
| GDPR — Documentation | ❌ Missing Privacy Policy, DPAs | 1–2 weeks |
| GDPR — Breach Response | ❌ No plan | 2 weeks |
| PCI-DSS (current scope) | ⚠️ Partial | Ongoing |
| CAN-SPAM | ❌ Unsubscribe missing | 1 week |

> **Important**: This system **should not handle real customer PII in production** until GDPR Article 32 security requirements are met. The 5 critical findings in the audit report represent breaches of Article 32 obligations.
