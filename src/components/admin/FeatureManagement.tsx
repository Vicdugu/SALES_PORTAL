'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface StoreRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  features: Record<string, boolean>;
}

const FLAG_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  enable_print_before_kitchen: {
    label: 'Print Before Kitchen',
    description: 'Require cashier to print an order slip before payment is sent to kitchen.',
    icon: '🖨️',
  },
  enable_split_payment: {
    label: 'Split Payment',
    description: 'Allow orders to be paid using two different payment methods.',
    icon: '💳',
  },
};

interface FeatureManagementProps {
  theme?: 'light' | 'dark';
}

export function FeatureManagement({ theme = 'light' }: FeatureManagementProps) {
  const { user } = useAuth();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null); // "storeId:flagKey"

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/features', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load feature flags');
      const data = await res.json();
      setStores(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleToggle = async (storeId: string, flagKey: string, currentValue: boolean) => {
    const key = `${storeId}:${flagKey}`;
    setToggling(key);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storeId, flagKey, enabled: !currentValue }),
      });
      if (!res.ok) throw new Error('Failed to update flag');
      // Optimistic update
      setStores((prev) =>
        prev.map((s) =>
          s.id === storeId
            ? { ...s, features: { ...s.features, [flagKey]: !currentValue } }
            : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setToggling(null);
    }
  };

  if (!user || user.role !== 'SUPERADMIN') {
    return <div className="p-8 text-red-600">Access denied. Superadmin only.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <span className="text-lg animate-pulse">Loading feature flags…</span>
      </div>
    );
  }

  const flags = Object.keys(FLAG_LABELS);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>🚩 Feature Flags</h2>
          <p className={`text-sm mt-1 ${textSecondary}`}>
            Enable or disable per-store features. Changes take effect immediately.
          </p>
        </div>
        <button
          onClick={fetchStores}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
            isDark
              ? 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
          }`}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Flag legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {flags.map((flagKey) => {
          const meta = FLAG_LABELS[flagKey];
          return (
            <div
              key={flagKey}
              className={`rounded-xl border p-4 ${isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-blue-50 border-blue-200'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{meta.icon}</span>
                <span className={`font-bold text-sm ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
                  {meta.label}
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-blue-700'}`}>{meta.description}</p>
            </div>
          );
        })}
      </div>

      {/* Store table */}
      {stores.length === 0 ? (
        <div className={`text-center py-12 ${textSecondary}`}>No stores found.</div>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => (
            <div
              key={store.id}
              className={`rounded-xl border ${cardBg} overflow-hidden`}
            >
              {/* Store header */}
              <div className={`px-4 py-3 flex items-center gap-3 border-b ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex-1 min-w-0">
                  <span className={`font-bold ${textPrimary}`}>{store.name}</span>
                  <span className={`ml-2 text-xs ${textSecondary}`}>{store.email}</span>
                </div>
                {!store.isActive && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
                    Inactive
                  </span>
                )}
              </div>

              {/* Feature toggles */}
              <div className="px-4 py-3 flex flex-wrap gap-4">
                {flags.map((flagKey) => {
                  const meta = FLAG_LABELS[flagKey];
                  const enabled = store.features[flagKey] ?? false;
                  const key = `${store.id}:${flagKey}`;
                  const busy = toggling === key;

                  return (
                    <div key={flagKey} className="flex items-center gap-3 min-w-[200px]">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={`${meta.label} for ${store.name}`}
                        disabled={busy}
                        onClick={() => handleToggle(store.id, flagKey, enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-60 ${
                          enabled ? 'bg-green-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                        {busy && (
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold animate-spin">
                            ⏳
                          </span>
                        )}
                      </button>
                      <span className={`text-sm font-semibold select-none ${enabled ? (isDark ? 'text-green-400' : 'text-green-700') : textSecondary}`}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
