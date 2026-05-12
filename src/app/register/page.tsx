'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function RegisterStorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    storeName: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    phone: '',
    currency: 'USD',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (!formData.storeName || !formData.email || !formData.password) {
      setError('Store name, email, and password are required');
      setLoading(false);
      return;
    }

    if (!formData.address || !formData.address.trim()) {
      setError('Address is required');
      setLoading(false);
      return;
    }

    if (!formData.phone || !formData.phone.trim()) {
      setError('Phone number is required');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.storeName,
          email: formData.email,
          password: formData.password,
          address: formData.address,
          phone: formData.phone,
          currency: formData.currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to create store');
      }

      // Redirect to email verification waiting page
      setTimeout(() => {
        router.push(`/verify-code?email=${encodeURIComponent(formData.email)}`);
      }, 2000);

      setSuccess(
        `Store registered successfully! 🎉\n\nA verification link has been sent to ${formData.email}.\nPlease check your email and click the link to verify your account.\n\nRedirecting...`
      );
    } catch (err: any) {
      const errorMessage = 
        typeof err === 'string' ? err :
        err?.message ? err.message :
        err?.error ? err.error :
        'Failed to create store';
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
          <p className="text-white drop-shadow text-lg font-semibold" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Register Your Store</p>
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

          {success && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg text-green-700 text-sm font-medium shadow-md">
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">✓</span>
                <div className="whitespace-pre-line">{success}</div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Name *
            </label>
            <input
              type="text"
              name="storeName"
              value={formData.storeName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password (min 6 chars) *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
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
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xl hover:scale-110 transition-transform"
                tabIndex={-1}
              >
                {showConfirmPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency *
            </label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              disabled={loading}
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="AUD">AUD - Australian Dollar</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="CHF">CHF - Swiss Franc</option>
              <option value="CNY">CNY - Chinese Yuan</option>
              <option value="INR">INR - Indian Rupee</option>
              <option value="MXN">MXN - Mexican Peso</option>
              <option value="ZAR">ZAR - South African Rand</option>
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="GHS">GHS - Ghanaian Cedi</option>
              <option value="KES">KES - Kenyan Shilling</option>
              <option value="EGP">EGP - Egyptian Pound</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium transition"
          >
            {loading ? 'Creating Store...' : 'Create Store'}
          </button>

          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm">
              Already have a store?{' '}
              <Link href="/login" className="text-amber-600 hover:text-amber-700 font-medium">
                Sign in
              </Link>
            </p>
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
