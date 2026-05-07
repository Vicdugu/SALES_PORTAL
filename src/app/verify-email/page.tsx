'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [storeName, setStoreName] = useState('');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token || !email) {
        setError('Invalid verification link. Missing token or email.');
        setLoading(false);
        return;
      }

      try {
        // First, check if the token is valid
        const checkResponse = await fetch(
          `/api/stores/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
        );

        const checkData = await checkResponse.json();

        if (!checkResponse.ok) {
          throw new Error(checkData.error?.message || checkData.error || 'Verification failed');
        }

        if (checkData.data?.valid) {
          setStoreName(checkData.data?.storeName || '');

          // Now verify the email
          const verifyResponse = await fetch('/api/stores/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, email }),
          });

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok) {
            throw new Error(verifyData.error?.message || verifyData.error || 'Verification failed');
          }

          setSuccess(true);
          setError('');

          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        }
      } catch (err: any) {
        const errorMessage =
          typeof err === 'string' ? err :
          err?.message ? err.message :
          err?.error ? err.error :
          'Failed to verify email';
        setError(errorMessage);
        setSuccess(false);
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, email, router]);

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
          <p className="text-white drop-shadow text-lg font-semibold" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Email Verification</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 backdrop-blur-sm">
          {loading && (
            <div className="text-center">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
              </div>
              <p className="text-gray-700 mt-4 font-medium">Verifying your email...</p>
              <p className="text-gray-500 text-sm mt-2">Please wait while we confirm your email address.</p>
            </div>
          )}

          {!loading && success && (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-700 mb-2">Email Verified!</h2>
              <p className="text-gray-700 mb-4">
                {storeName ? `Congratulations ${storeName}!` : 'Congratulations!'} Your email has been successfully verified.
              </p>
              <p className="text-gray-600 text-sm mb-6">
                You can now log in to your store with your credentials.
              </p>
              <p className="text-gray-500 text-sm">
                Redirecting to login in 3 seconds...
              </p>
              <Link
                href="/login"
                className="inline-block mt-6 bg-amber-600 text-white py-2 px-6 rounded-lg hover:bg-amber-700 font-medium transition"
              >
                Go to Login
              </Link>
            </div>
          )}

          {!loading && error && (
            <div className="text-center">
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-red-700 mb-2">Verification Failed</h2>
              <p className="text-gray-700 mb-4">{error}</p>
              <p className="text-gray-600 text-sm mb-6">
                This verification link may have expired or is invalid.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link
                  href="/register"
                  className="inline-block bg-amber-600 text-white py-2 px-6 rounded-lg hover:bg-amber-700 font-medium transition"
                >
                  Register Again
                </Link>
                <Link
                  href="/login"
                  className="inline-block bg-gray-600 text-white py-2 px-6 rounded-lg hover:bg-gray-700 font-medium transition"
                >
                  Back to Login
                </Link>
              </div>
            </div>
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
