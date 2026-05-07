'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface Store {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  verificationCode: string | null;
  verificationCodeExpiry: string | null;
  createdAt: string;
  _count: {
    users: number;
    orders: number;
  };
}

export function SystemCleanup() {
  const { theme } = useTheme();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [testStores, setTestStores] = useState<any[]>([]);

  // Fetch stores on mount
  useEffect(() => {
    fetchStores();
    fetchTestStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/stores/list', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stores');
      }

      const data = await response.json();
      setStores(data.stores || []);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStore = (storeId: string) => {
    const newSelected = new Set(selectedStores);
    if (newSelected.has(storeId)) {
      newSelected.delete(storeId);
    } else {
      newSelected.add(storeId);
    }
    setSelectedStores(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStores.size === stores.length) {
      setSelectedStores(new Set());
    } else {
      setSelectedStores(new Set(stores.map(s => s.id)));
    }
  };

  const handleDeleteStores = async () => {
    if (selectedStores.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one store to delete' });
      return;
    }

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      for (const storeId of selectedStores) {
        const response = await fetch('/api/admin/stores/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ storeId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to delete store ${storeId}`);
        }
      }

      setMessage({
        type: 'success',
        text: `Successfully deleted ${selectedStores.size} store(s)`,
      });
      setSelectedStores(new Set());
      setConfirmDelete(false);
      fetchStores();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClearVerificationCodes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/admin/emails/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'clear-codes' }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear verification codes');
      }

      const data = await response.json();
      setMessage({
        type: 'success',
        text: `${data.message} (${data.count} stores)`,
      });
      fetchStores();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResetVerifiedEmails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/admin/emails/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reset-verified-emails' }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset verified emails');
      }

      const data = await response.json();
      setMessage({
        type: 'success',
        text: `${data.message} (${data.count} stores)`,
      });
      fetchStores();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchTestStores = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/cleanup/test-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'list' }),
      });

      if (response.ok) {
        const data = await response.json();
        setTestStores(data.data?.testStores || []);
      }
    } catch (error) {
      console.error('Failed to fetch test stores:', error);
    }
  };

  const handleCleanupTestAccounts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/admin/cleanup/test-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'cleanup-all' }),
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup test accounts');
      }

      const data = await response.json();
      setMessage({
        type: 'success',
        text: `${data.message} - Removed ${data.deletedCount} test store(s) and all their accounts`,
      });
      setTestStores([]);
      fetchStores();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? `${theme === 'dark' ? 'bg-green-900/30 border-green-800 text-green-200' : 'bg-green-50 border-green-200 text-green-900'}`
              : `${theme === 'dark' ? 'bg-red-900/30 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-900'}`
          } border`}
        >
          {message.text}
        </div>
      )}

      {/* Quick Actions */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white/80 border border-white/60 backdrop-blur-md'} p-6 rounded-2xl`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          🧹 Quick Cleanup Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleClearVerificationCodes}
            disabled={loading}
            className={`p-4 rounded-lg font-semibold transition ${
              theme === 'dark'
                ? 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white'
                : 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white'
            }`}
          >
            🔄 Clear Verification Codes
          </button>
          <button
            onClick={handleResetVerifiedEmails}
            disabled={loading}
            className={`p-4 rounded-lg font-semibold transition ${
              theme === 'dark'
                ? 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white'
                : 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white'
            }`}
          >
            ↩️ Reset All Verified Emails
          </button>
          {testStores.length > 0 && (
            <button
              onClick={handleCleanupTestAccounts}
              disabled={loading}
              className={`p-4 rounded-lg font-semibold transition md:col-span-2 ${
                theme === 'dark'
                  ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white'
                  : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white'
              }`}
            >
              🗑️ Remove All Test Accounts ({testStores.length} test stores)
            </button>
          )}
        </div>
      </div>

      {/* Stores List */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white/80 border border-white/60 backdrop-blur-md'} p-6 rounded-2xl`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          🏪 Registered Stores ({stores.length})
        </h3>

        {stores.length === 0 ? (
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>No stores registered yet.</p>
        ) : (
          <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-700">
              <input
                type="checkbox"
                id="select-all"
                checked={selectedStores.size === stores.length && stores.length > 0}
                onChange={handleSelectAll}
                className="w-5 h-5 cursor-pointer"
              />
              <label htmlFor="select-all" className={`cursor-pointer ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Select All ({selectedStores.size}/{stores.length})
              </label>
            </div>

            {/* Stores Table */}
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className="text-left py-3 px-4">Select</th>
                    <th className="text-left py-3 px-4">Store Name</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-center py-3 px-4">Verified</th>
                    <th className="text-center py-3 px-4">Users</th>
                    <th className="text-center py-3 px-4">Orders</th>
                    <th className="text-left py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr
                      key={store.id}
                      className={`border-b transition ${
                        theme === 'dark'
                          ? 'border-gray-700 hover:bg-gray-700/50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedStores.has(store.id)}
                          onChange={() => handleSelectStore(store.id)}
                          className="w-5 h-5 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">{store.name}</td>
                      <td className="py-3 px-4">{store.email}</td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            store.emailVerified
                              ? theme === 'dark'
                                ? 'bg-green-900/50 text-green-300'
                                : 'bg-green-100 text-green-700'
                              : theme === 'dark'
                              ? 'bg-red-900/50 text-red-300'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {store.emailVerified ? '✓ Yes' : '✗ No'}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">{store._count.users}</td>
                      <td className="text-center py-3 px-4">{store._count.orders}</td>
                      <td className="py-3 px-4">{new Date(store.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Test Stores Display */}
      {testStores.length > 0 && (
        <div className={`${theme === 'dark' ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200'} p-6 rounded-2xl border`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-red-200' : 'text-red-900'}`}>
            ⚠️ Test Accounts Found ({testStores.length} test stores)
          </h3>
          <div className="space-y-3">
            {testStores.map((store) => (
              <div
                key={store.id}
                className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-red-900/50 border-red-800' : 'bg-white border-red-200'} border text-sm`}
              >
                <div className={`font-semibold ${theme === 'dark' ? 'text-red-200' : 'text-red-900'}`}>
                  {store.name}
                </div>
                <div className={`text-xs ${theme === 'dark' ? 'text-red-300/70' : 'text-red-700/70'}`}>
                  Email: {store.email} | Users: {store._count.users} | Orders: {store._count.orders}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Action */}
      {selectedStores.size > 0 && (
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white/80 border border-white/60 backdrop-blur-md'} p-6 rounded-2xl`}>
          {!confirmDelete ? (
            <button
              onClick={handleDeleteStores}
              disabled={loading}
              className={`w-full p-4 rounded-lg font-semibold transition ${
                theme === 'dark'
                  ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white'
                  : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white'
              }`}
            >
              🗑️ Delete {selectedStores.size} Selected Store(s)
            </button>
          ) : (
            <div className="space-y-3">
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-red-900/30 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-900'} border`}>
                <strong>⚠️ Warning!</strong> This will permanently delete {selectedStores.size} store(s) and all their data (users, orders, inventory). This cannot be undone.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteStores}
                  disabled={loading}
                  className={`flex-1 p-4 rounded-lg font-semibold transition ${
                    theme === 'dark'
                      ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white'
                      : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white'
                  }`}
                >
                  {loading ? '🔄 Deleting...' : '✓ Confirm Delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={loading}
                  className={`flex-1 p-4 rounded-lg font-semibold transition ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white'
                      : 'bg-gray-400 hover:bg-gray-500 disabled:bg-gray-200 text-white'
                  }`}
                >
                  ✗ Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
