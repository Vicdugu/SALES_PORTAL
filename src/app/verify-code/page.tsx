'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyCodePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setError('');
    setResendSuccess(false);

    try {
      const response = await fetch('/api/stores/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to resend verification link');
      }

      setResendSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification link');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center p-4"
      style={{
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><radialGradient id="goldGrad1" cx="20%" cy="20%" r="60%"><stop offset="0%" style="stop-color:%23FFD700;stop-opacity:1" /><stop offset="100%" style="stop-color:%23DAA520;stop-opacity:1" /></radialGradient></defs><rect width="1200" height="800" fill="%23000000"/><circle cx="200" cy="150" r="200" fill="%23FFD700" opacity="0.5"/><circle cx="1000" cy="250" r="250" fill="%23DAA520" opacity="0.4"/></svg>')`,
        backgroundSize: 'cover',
      }}
    >
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">Sales Portal</h1>
          <p className="text-white text-lg font-semibold drop-shadow">Check Your Email</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">📧</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Verify your email address</h2>
            <p className="text-gray-600 text-sm">
              We&apos;ve sent a verification link to{' '}
              {email ? <strong className="text-amber-700">{email}</strong> : 'your email address'}.
              Click the link in the email to activate your account.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
            <p className="font-medium mb-1">Can&apos;t find the email?</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>Check your spam or junk folder</li>
              <li>Make sure you used the correct email address</li>
              <li>The link expires in 24 hours</li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {resendSuccess && (
            <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg text-green-700 text-sm">
              ✓ A new verification link has been sent. Please check your inbox.
            </div>
          )}

          {!email && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || !email}
            className="w-full border-2 border-amber-600 text-amber-700 py-2 rounded-lg hover:bg-amber-50 disabled:opacity-50 font-medium transition mb-4"
          >
            {resendLoading ? 'Sending...' : 'Resend verification link'}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm text-gray-500 hover:text-amber-700 transition">
              Back to login
            </Link>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm font-semibold" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
            <span className="text-black">✨ Created by </span>
            <span className="text-black font-bold">Questbridge Ltd</span>
            <span className="text-black"> ✨</span>
          </p>
        </div>
      </div>
    </div>
  );
}
