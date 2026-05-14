export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Who we are</h2>
        <p>
          Sales Portal is operated by <strong>Questbridge Ltd</strong>, United Kingdom
          (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;). This policy explains what
          personal data we collect, why we collect it, and your rights under the UK GDPR and
          EU GDPR.
        </p>
        <p className="mt-2">
          Contact:{' '}
          <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@yourdomain.com'}`}
             className="text-blue-600 underline">
            {process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@yourdomain.com'}
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Data we collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Account data</strong>: name, email address, hashed password, role.</li>
          <li><strong>Transaction data</strong>: order details, payment method, amounts, timestamps.</li>
          <li><strong>Usage data</strong>: login timestamps, IP addresses (for rate-limiting only).</li>
          <li><strong>Email delivery data</strong>: whether emails were sent (via Resend).</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Legal basis and purpose</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Contract</strong>: processing orders and operating your store account.</li>
          <li><strong>Legitimate interests</strong>: security logging, fraud prevention, rate limiting.</li>
          <li><strong>Legal obligation</strong>: retaining transaction records for tax/accounting purposes.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Data retention</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Rate-limit attempt logs: deleted after <strong>90 days</strong>.</li>
          <li>Security audit logs: deleted after <strong>1 year</strong>.</li>
          <li>Cancelled orders: deleted after <strong>7 years</strong>.</li>
          <li>Active account data: retained while your account is active; deleted on erasure request.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Third-party processors</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Neon</strong> — PostgreSQL database hosting (data stored in the EU/US).</li>
          <li><strong>Vercel</strong> — application hosting (EU/US).</li>
          <li><strong>Resend</strong> — transactional email delivery.</li>
          <li><strong>Supabase</strong> — file storage for PDF receipts.</li>
          <li><strong>Upstash</strong> — Redis caching (if configured; no personal data stored).</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Your rights</h2>
        <p>Under UK/EU GDPR you have the right to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>Access</strong> your data — request a copy via your account settings.</li>
          <li><strong>Portability</strong> — download your data in machine-readable JSON format.</li>
          <li><strong>Erasure</strong> — request deletion of your personal data.</li>
          <li><strong>Rectification</strong> — correct inaccurate data.</li>
          <li><strong>Objection</strong> — object to processing based on legitimate interests.</li>
        </ul>
        <p className="mt-3">
          To exercise any right, contact us at the email above. We will respond within 30 days.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Cookies</h2>
        <p>
          We use a single httpOnly session cookie (<code>auth_token</code>) strictly necessary
          for authentication. No tracking or advertising cookies are used.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Changes to this policy</h2>
        <p>
          We may update this policy. Material changes will be communicated by email or via an
          in-app notice. The date at the top of this page indicates when it was last revised.
        </p>
      </section>
    </main>
  );
}
