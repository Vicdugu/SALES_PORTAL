'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyCodePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/stores/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Verification failed');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
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
        throw new Error(data.error?.message || 'Failed to resend code');
      }

      setResendSuccess(true);
      setCode(''); // Clear the input field
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification code');
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-green-700 mb-2">Email Verified!</h1>
          <p className="text-gray-600 mb-4">Your store has been successfully verified.</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

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
          <p className="text-white text-lg font-semibold drop-shadow">Verify Your Email</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-8">
          <p className="text-gray-600 text-center mb-6">
            Enter the 6-digit code sent to your email
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div>{error}</div>
              </div>
            </div>
          )}

          {resendSuccess && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg text-green-700 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-lg">✓</span>
                <div>Verification code has been resent to your email. Please check your inbox.</div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              disabled={loading || resendLoading}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-3 py-2 text-2xl tracking-widest text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono font-bold"
              required
              disabled={loading || resendLoading}
            />
            <p className="text-xs text-gray-500 text-center mt-2">Enter the 6-digit code</p>
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6 || resendLoading}
            className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium transition"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-gray-600 text-sm mb-3">
              Didn't receive the code?
            </p>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendLoading || loading || !email}
              className="w-full border-2 border-amber-600 text-amber-600 py-2 rounded-lg hover:bg-amber-50 disabled:opacity-50 font-medium transition"
            >
              {resendLoading ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        </form>

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
