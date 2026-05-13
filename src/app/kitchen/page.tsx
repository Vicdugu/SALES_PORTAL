'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useStore } from '@/contexts/AuthContext';
import { BrandingHeader } from '@/components/BrandingHeader';
import { OrderQueue } from '@/components/kitchen/OrderQueue';
import { CompletedTransactions } from '@/components/till/CompletedTransactions';
import { AdvertPanel } from '@/components/AdvertPanel';
import { NotificationPanel } from '@/components/NotificationPanel';

export const dynamic = 'force-dynamic';

type KitchenTab = 'queue' | 'completed';

export default function KitchenPage() {
  const { user, isLoading } = useAuth();
  const store = useStore();
  const primaryColor = store?.primaryColor || '#000000';
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<KitchenTab>('queue');

  // Show nothing while auth is loading to avoid flashing access denied
  if (isLoading) {
    return null;
  }

  if (!user || user.role !== 'KITCHEN') {
    return <div className="p-8 text-red-600">Access denied. Kitchen staff only.</div>;
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Main Content */}
      <div className="order-1 flex flex-col flex-1 overflow-y-auto">
        {/* Branding Header */}
        <div className="px-2 sm:px-4 pt-2 sm:pt-4">
          <BrandingHeader />
        </div>

        {/* Header */}
        <div className="bg-white border-b-2 border-gray-300 shadow">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-start sm:items-center">
            <div className="min-w-0">
              <p className="text-gray-900 text-xs sm:text-base font-semibold truncate">Staff: {user.name}</p>
            </div>
            <NotificationPanel
              userRole={user.role}
              buttonClass="bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
            />
            <button
              onClick={() => router.back()}
              className="px-3 sm:px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-bold text-xs sm:text-base active:scale-95 transition-transform border border-gray-900"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b-2 border-gray-300 shadow overflow-x-auto">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 flex gap-2 sm:gap-4 min-w-min sm:min-w-full">
            <button
              onClick={() => setActiveTab('queue')}
              style={{
                borderBottomColor: activeTab === 'queue' ? primaryColor : 'transparent',
                color: activeTab === 'queue' ? primaryColor : '#1F2937',
              }}
              className="py-3 sm:py-4 px-2 sm:px-4 border-b-4 font-bold transition-colors text-xs sm:text-base whitespace-nowrap active:scale-95"
            >
              📋 Queue
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              style={{
                borderBottomColor: activeTab === 'completed' ? primaryColor : 'transparent',
                color: activeTab === 'completed' ? primaryColor : '#1F2937',
              }}
              className="py-3 sm:py-4 px-2 sm:px-4 border-b-4 font-bold transition-colors text-xs sm:text-base whitespace-nowrap active:scale-95"
            >
              📦 Completed
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-4 sm:py-8 flex-1 overflow-y-auto min-h-0">
          {/* Order Queue Tab */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-start sm:items-center mb-3 sm:mb-4">
                  <h2 className="text-lg sm:text-2xl font-bold">Order Queue</h2>
                  <button
                    onClick={() => setRefreshKey((prev) => prev + 1)}
                    style={{ backgroundColor: primaryColor }}
                    className="px-3 sm:px-4 py-2 text-white rounded hover:opacity-90 font-semibold transition-opacity text-xs sm:text-base active:scale-95"
                  >
                    🔄 Refresh
                  </button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-2 sm:p-3 text-xs sm:text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Orders refresh every 3 seconds. Swipe or tap status buttons to move orders.
                </div>
              </div>

              {/* Order Queue */}
              <OrderQueue key={refreshKey} onStatusUpdate={() => setRefreshKey((prev) => prev + 1)} />
            </div>
          )}

          {/* Completed Transactions Tab */}
          {activeTab === 'completed' && (
            <div className="h-96 sm:h-[600px]">
              <CompletedTransactions isActive={activeTab === 'completed'} />
            </div>
          )}
        </div>
      </div>

      {/* Advert Panel Sidebar - Right Side (Desktop only) */}
      <div className="hidden md:flex order-2 flex-shrink-0">
        <AdvertPanel />
      </div>

      {/* Advert Panel Mobile Floating Button */}
      <div className="md:hidden">
        <AdvertPanel />
      </div>
    </div>
  );
}
