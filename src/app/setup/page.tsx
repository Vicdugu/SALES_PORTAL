'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateSuperadmin = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/setup-superadmin', {
        method: 'POST',
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white/80 border border-white/60 backdrop-blur-md p-8 rounded-2xl max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">
          🔐 System Setup
        </h1>

        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 mb-6">
          <p className="text-sm">
            Create a superadmin account to access the system cleanup features. This allows you to:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm space-y-1">
            <li>Delete registered stores</li>
            <li>Clear verification codes</li>
            <li>Reset verified emails</li>
          </ul>
        </div>

        {!result ? (
          <button
            onClick={handleCreateSuperadmin}
            disabled={loading}
            className="w-full p-3 rounded-lg font-semibold transition bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white"
          >
            {loading ? 'Creating...' : 'Create Superadmin Account'}
          </button>
        ) : result.success ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-900 rounded-lg p-4">
              ✓ {result.message}
            </div>

            <div className="bg-gray-100 rounded-lg p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Email:
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={result.credentials.email}
                    readOnly
                    className="flex-1 px-3 py-2 rounded text-sm bg-white border border-gray-300 text-gray-900"
                  />
                  <button
                    onClick={() => copyToClipboard(result.credentials.email)}
                    className="px-3 py-2 rounded text-sm font-semibold bg-gray-300 hover:bg-gray-400 text-gray-900"
                  >
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Password:
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={result.credentials.password}
                    readOnly
                    className="flex-1 px-3 py-2 rounded text-sm bg-white border border-gray-300 text-gray-900"
                  />
                  <button
                    onClick={() => copyToClipboard(result.credentials.password)}
                    className="px-3 py-2 rounded text-sm font-semibold bg-gray-300 hover:bg-gray-400 text-gray-900"
                  >
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg p-3 text-xs">
              ⚠️ {result.credentials.warning}
            </div>

            <button
              onClick={() => router.push('/login')}
              className="w-full p-3 rounded-lg font-semibold transition bg-green-500 hover:bg-green-600 text-white"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg p-4">
            <strong>Error:</strong> {result.error}
            {result.message && <p className="mt-2 text-sm">{result.message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
