'use client';

import { useState } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to process request');
      }

      setSubmitted(true);
      setMessage(data.message || 'Check your email for password reset instructions');
    } catch (err: any) {
      const errorMessage = 
        typeof err === 'string' ? err :
        err?.message ? err.message :
        err?.error?.message ? err.error.message :
        err?.error ? err.error :
        'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><radialGradient id="goldGrad1" cx="20%" cy="20%" r="60%"><stop offset="0%" style="stop-color:%23FFD700;stop-opacity:1" /><stop offset="100%" style="stop-color:%23DAA520;stop-opacity:1" /></radialGradient><radialGradient id="goldGrad2" cx="80%" cy="80%" r="60%"><stop offset="0%" style="stop-color:%23FFD700;stop-opacity:1" /><stop offset="100%" style="stop-color:%23B8860B;stop-opacity:1" /></radialGradient></defs><rect width="1200" height="800" fill="%23000000"/><circle cx="200" cy="150" r="200" fill="%23FFD700" opacity="0.5"/><circle cx="1000" cy="250" r="250" fill="%23DAA520" opacity="0.4"/><circle cx="600" cy="600" r="180" fill="%23FFD700" opacity="0.5"/><path d="M 0 400 Q 300 350 600 400 T 1200 400" stroke="%23FFD700" stroke-width="3" fill="none" opacity="0.4"/><path d="M 0 500 Q 300 480 600 500 T 1200 500" stroke="%23DAA520" stroke-width="3" fill="none" opacity="0.4"/><circle cx="100" cy="100" r="40" fill="%23FFD700" opacity="0.6"/><circle cx="1100" cy="700" r="50" fill="%23FFD700" opacity="0.5"/><polygon points="600,50 650,100 550,100" fill="%23DAA520" opacity="0.5"/><polygon points="150,600 180,650 120,650" fill="%23FFD700" opacity="0.5"/></svg>')`,
        backgroundSize: 'cover',
      }}
    >
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg" style={{ textShadow: '0 4px 8px rgba(255, 107, 157, 0.5)' }}>Sales Portal</h1>
          <p className="text-white drop-shadow text-lg font-semibold" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Reset Your Password</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 backdrop-blur-sm">
          {submitted ? (
            <div>
              <div className="text-center">
                <div className="text-5xl mb-4">📧</div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Check Your Email</h2>
                <p className="text-gray-600 mb-6">
                  If an account with <strong>{email}</strong> exists, you'll receive password reset instructions shortly.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  The email may take a few minutes to arrive. Check your spam folder if you don't see it.
                </p>
                <Link 
                  href="/login" 
                  className="inline-block bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 font-medium transition"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm font-medium shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">⚠️</span>
                    <div>{error}</div>
                  </div>
                </div>
              )}

              {message && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 rounded-lg text-blue-700 text-sm font-medium shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">ℹ️</span>
                    <div>{message}</div>
                  </div>
                </div>
              )}

              <p className="text-gray-600 text-sm mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                  disabled={loading}
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium transition"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                <p className="text-gray-600 text-sm">
                  Remember your password?{' '}
                  <Link href="/login" className="text-amber-600 hover:text-amber-700 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          )}
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
