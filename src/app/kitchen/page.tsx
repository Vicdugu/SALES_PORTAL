'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useStore } from '@/contexts/AuthContext';
import { BrandingHeader } from '@/components/BrandingHeader';
import { OrderQueue } from '@/components/kitchen/OrderQueue';
import { CompletedTransactions } from '@/components/till/CompletedTransactions';
import { useBrandingUpdates } from '@/hooks/useBrandingUpdates';

export const dynamic = 'force-dynamic';

type KitchenTab = 'queue' | 'completed';

export default function KitchenPage() {
  const { user, isLoading } = useAuth();
  const store = useStore();
  const primaryColor = store?.primaryColor || '#000000';
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<KitchenTab>('queue');

  // Listen for real-time branding updates and refresh when changes occur
  useBrandingUpdates();

  // Show nothing while auth is loading to avoid flashing access denied
  if (isLoading) {
    return null;
  }

  if (!user || user.role !== 'KITCHEN') {
    return <div className="p-8 text-red-600">Access denied. Kitchen staff only.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Branding Header */}
      <div className="px-4 pt-4">
        <BrandingHeader />
      </div>

      {/* Header */}
      <div className="bg-white border-b shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <p className="text-gray-600">Staff: {user.name}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('queue')}
              style={{
                borderBottomColor: activeTab === 'queue' ? primaryColor : 'transparent',
                color: activeTab === 'queue' ? primaryColor : '#666',
              }}
              className="py-4 px-4 border-b-2 font-semibold transition-colors"
            >
              📋 Order Queue
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              style={{
                borderBottomColor: activeTab === 'completed' ? primaryColor : 'transparent',
                color: activeTab === 'completed' ? primaryColor : '#666',
              }}
              className="py-4 px-4 border-b-2 font-semibold transition-colors"
            >
              📦 Completed Transactions
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Order Queue Tab */}
        {activeTab === 'queue' && (
          <div>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Order Queue</h2>
                <button
                  onClick={() => setRefreshKey((prev) => prev + 1)}
                  style={{ backgroundColor: primaryColor }}
                  className="px-4 py-2 text-white rounded hover:opacity-90 font-semibold transition-opacity"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                <strong>💡 Tip:</strong> Orders are automatically refreshed every 3 seconds. Change status
                to move orders through the workflow.
              </div>
            </div>

            {/* Order Queue */}
            <OrderQueue key={refreshKey} onStatusUpdate={() => setRefreshKey((prev) => prev + 1)} />
          </div>
        )}

        {/* Completed Transactions Tab */}
        {activeTab === 'completed' && (
          <div className="h-[600px]">
            <CompletedTransactions isActive={activeTab === 'completed'} />
          </div>
        )}
      </div>
    </div>
  );
}
