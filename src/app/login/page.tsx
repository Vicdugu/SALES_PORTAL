'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      
      // Wait a moment for auth context to update
      setTimeout(() => {
        // Redirect based on user role
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user.role === 'SUPERADMIN') {
              router.push('/admin');
            } else {
              router.push('/');
            }
          } catch {
            router.push('/');
          }
        } else {
          router.push('/');
        }
      }, 100);
    } catch (err: any) {
      const errorMessage = 
        typeof err === 'string' ? err :
        err?.message ? err.message :
        err?.error?.message ? err.error.message :
        err?.error ? err.error :
        'Login failed';
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
          <p className="text-white drop-shadow text-lg font-semibold" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-8 backdrop-blur-sm">
          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm font-medium shadow-md">
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">⚠️</span>
                <div>{error}</div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xl hover:scale-110 transition-transform"
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
            <div className="text-right mt-2">
              <Link 
                href="/forgot-password" 
                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium transition"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-3">Don't have a store?</p>
              <Link 
                href="/register" 
                className="inline-block w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-2 rounded-lg hover:from-amber-600 hover:to-amber-700 font-medium transition text-center"
              >
                Register New Store
              </Link>
            </div>
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