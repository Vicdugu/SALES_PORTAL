'use client';

import { useState, useEffect } from 'react';
import { apiCall } from '@/lib/api/client';
import { useTheme } from '@/contexts/ThemeContext';

interface Store {
  id: string;
  name: string;
  email: string;
  address?: string;
  phone?: string;
  currency: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
}

export function PendingApprovals() {
  const { theme } = useTheme();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingStores();
  }, []);

  const fetchPendingStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall('/api/stores', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to fetch pending stores');
        return;
      }

      const data = await response.json();
      if (data.success) {
        // Filter only pending (not approved) stores
        const pendingStores = data.data.filter((store: Store) => !store.isApproved);
        setStores(pendingStores);
      } else {
        setError('Failed to fetch pending stores');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pending stores');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (storeId: string, storeName: string) => {
    if (!confirm(`Approve store "${storeName}"?`)) return;

    try {
      setApprovingId(storeId);
      const response = await apiCall(`/api/stores/${storeId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        setStores(stores.filter(s => s.id !== storeId));
        setSuccessMessage(`✅ "${storeName}" has been approved!`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to approve store');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to approve store');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (storeId: string, storeName: string) => {
    if (!confirm(`Reject and deactivate store "${storeName}"? This action cannot be undone.`)) return;

    try {
      setRejectingId(storeId);
      const response = await apiCall(`/api/stores/${storeId}/reject`, {
        method: 'POST',
      });

      if (response.ok) {
        setStores(stores.filter(s => s.id !== storeId));
        setSuccessMessage(`❌ "${storeName}" has been rejected and deactivated.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to reject store');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reject store');
    } finally {
      setRejectingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <p>Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-4 sm:p-6 m-4 sm:m-6`}>
      {/* Success Message */}
      {successMessage && (
        <div className={`mb-6 p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-green-900/30 border-green-600 text-green-300'
            : 'bg-green-50 border-green-500 text-green-700'
        } font-semibold`}>
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={`mb-6 p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-red-900/30 border-red-600 text-red-300'
            : 'bg-red-50 border-red-500 text-red-700'
        } font-semibold`}>
          {error}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-950'}`}>
          ⏳ Pending Store Approvals ({stores.length})
        </h2>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
          Review and approve newly registered stores
        </p>
      </div>

      {/* No Pending Stores */}
      {stores.length === 0 ? (
        <div className={`text-center py-12 rounded-lg border-2 border-dashed ${
          theme === 'dark'
            ? 'bg-gray-800/50 border-gray-700 text-gray-400'
            : 'bg-gray-50 border-gray-300 text-gray-500'
        }`}>
          <div className="text-4xl mb-3">✅</div>
          <p className="text-lg font-semibold">No pending approvals</p>
          <p className="text-sm mt-2">All stores have been reviewed and approved</p>
        </div>
      ) : (
        /* Pending Stores Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {stores.map((store) => (
            <div
              key={store.id}
              className={`rounded-lg border-2 p-4 sm:p-6 transition-shadow hover:shadow-lg ${
                theme === 'dark'
                  ? 'bg-gray-800 border-yellow-600/50 hover:border-yellow-600'
                  : 'bg-yellow-50/50 border-yellow-400 hover:border-yellow-500'
              }`}
            >
              {/* Store Badge */}
              <div className="flex items-start justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  theme === 'dark'
                    ? 'bg-yellow-900/50 text-yellow-300'
                    : 'bg-yellow-200 text-yellow-800'
                }`}>
                  ⏳ Pending
                </div>
                <div className={`text-xs font-semibold ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {new Date(store.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Store Info */}
              <div className="mb-4">
                <h3 className={`text-lg font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-950'
                }`}>
                  {store.name}
                </h3>
                <div className={`space-y-1 text-sm ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <p><span className="font-semibold">Email:</span> {store.email}</p>
                  {store.address && <p><span className="font-semibold">Address:</span> {store.address}</p>}
                  {store.phone && <p><span className="font-semibold">Phone:</span> {store.phone}</p>}
                  <p><span className="font-semibold">Currency:</span> {store.currency}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => handleApprove(store.id, store.name)}
                  disabled={approvingId === store.id}
                  className={`flex-1 px-4 py-2 sm:py-3 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
                    theme === 'dark'
                      ? 'bg-green-600 hover:bg-green-700 text-white border-green-700 border'
                      : 'bg-green-600 hover:bg-green-700 text-white border-green-700 border'
                  }`}
                >
                  {approvingId === store.id ? (
                    <>
                      <span className="animate-spin inline-block mr-2">⟳</span>
                      Approving...
                    </>
                  ) : (
                    '✓ Approve'
                  )}
                </button>
                <button
                  onClick={() => handleReject(store.id, store.name)}
                  disabled={rejectingId === store.id}
                  className={`flex-1 px-4 py-2 sm:py-3 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
                    theme === 'dark'
                      ? 'bg-red-700 hover:bg-red-800 text-white border-red-800 border'
                      : 'bg-red-600 hover:bg-red-700 text-white border-red-700 border'
                  }`}
                >
                  {rejectingId === store.id ? (
                    <>
                      <span className="animate-spin inline-block mr-2">⟳</span>
                      Rejecting...
                    </>
                  ) : (
                    '✕ Reject'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
