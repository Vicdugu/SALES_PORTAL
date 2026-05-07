'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useStore } from '@/contexts/AuthContext';
import { useOrderStore } from '@/store/orderStore';
import { apiCall } from '@/lib/api/client';
import { ProductGrid } from '@/components/till/ProductGrid';
import { CartSummary } from '@/components/till/CartSummary';
import { PaymentOptions, PaymentMethod } from '@/components/till/PaymentOptions';
import { CompletedTransactions } from '@/components/till/CompletedTransactions';
import { ReadyOrders } from '@/components/till/ReadyOrders';
import { StoreCurrencyBadge } from '@/components/StoreCurrencyBadge';
import { BrandingHeader } from '@/components/BrandingHeader';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { useBrandingUpdates } from '@/hooks/useBrandingUpdates';

type TabType = 'pos' | 'ready' | 'transactions';

export const dynamic = 'force-dynamic';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
}

export default function TillPage() {
  const { user, isLoading } = useAuth();
  const store = useStore();
  const primaryColor = store?.primaryColor || '#000000';
  const currencySymbol = getCurrencySymbol(store.currency);
  const router = useRouter();
  const { items, addItem, subtotal, tax, total, clearCart } = useOrderStore();

  // Listen for real-time branding updates and refresh when changes occur
  useBrandingUpdates();

  const [activeTab, setActiveTab] = useState<TabType>('pos');
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [readyOrdersCount, setReadyOrdersCount] = useState(0);
  const [previousReadyCount, setPreviousReadyCount] = useState(0);
  const [showReadyNotification, setShowReadyNotification] = useState(false);
  const [dailyCompletedCount, setDailyCompletedCount] = useState(0);

  // Memoize tab change for faster response (before any conditional hooks)
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  // Block superadmin from accessing till - redirect instead of rendering
  useEffect(() => {
    if (user && user.role === 'SUPERADMIN') {
      router.push('/admin');
    }
  }, [user, router]);

  // Monitor for new READY orders and auto-redirect cashier
  useEffect(() => {
    const monitorReadyOrders = async () => {
      try {
        const response = await apiCall('/api/orders?status=READY');
        if (response.ok) {
          const data = await response.json();
          const currentCount = (data.data || []).length;

          // Initialize previous count on first check
          if (previousReadyCount === 0 && currentCount >= 0) {
            setPreviousReadyCount(currentCount);
            setReadyOrdersCount(currentCount);
            return;
          }

          // If new READY orders appeared, redirect to ready tab
          if (currentCount > previousReadyCount) {
            console.log(
              `🔔 New ready orders detected! (${previousReadyCount} → ${currentCount}) Redirecting cashier to Ready for Collection...`
            );
            setActiveTab('ready');
            setShowReadyNotification(true);
            setTimeout(() => setShowReadyNotification(false), 5000);
          }

          // Update counts
          setReadyOrdersCount(currentCount);
          setPreviousReadyCount(currentCount);
        }
      } catch (err) {
        // Silent fail - don't disrupt cashier experience
        console.error('Error checking ready orders:', err);
      }
    };

    // Check for ready orders every 2 seconds
    const interval = setInterval(monitorReadyOrders, 2000);
    return () => clearInterval(interval);
  }, []);

  // Monitor daily completed orders count
  useEffect(() => {
    const fetchDailyCompletedCount = async () => {
      try {
        const response = await apiCall('/api/analytics/daily-completed-count');
        if (response.ok) {
          const data = await response.json();
          setDailyCompletedCount(data.data.count || 0);
        }
      } catch (err) {
        console.error('Error fetching daily completed count:', err);
      }
    };

    fetchDailyCompletedCount();
    // Fetch every 5 seconds to keep count up-to-date
    const interval = setInterval(fetchDailyCompletedCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddItem = (item: InventoryItem, quantity: number, notes: string = '') => {
    addItem({
      id: item.id,
      name: item.name,
      quantity,
      unitPrice: item.unitPrice,
      notes: notes || undefined,
    });
  };

  const handleCheckout = () => {
    setShowPayment(true);
  };

  const handlePaymentSelected = async (method: PaymentMethod) => {
    // Payment and modal closing is handled by PaymentOptions component
    // Trigger inventory refresh after payment succeeds
    setRefreshCount((prev) => prev + 1);
  };

  // Show nothing while auth is loading to avoid flashing messages
  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Branding Header */}
      <div className="px-4 pt-4">
        <BrandingHeader />
      </div>

      {/* Header */}
      <div className="bg-white border-b p-4 shadow">
        <div className="max-w-full flex justify-between items-center mb-4">
          <div>
            <p className="text-gray-600 text-sm">Cashier: {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-green-50 border border-green-300 rounded px-4 py-2 text-center">
              <p className="text-xs text-green-700 font-semibold">Today's Completed</p>
              <p className="text-2xl font-bold text-green-600">{dailyCompletedCount}</p>
            </div>
            <StoreCurrencyBadge />
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Back
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-t pt-3">
          <button
            onClick={() => handleTabChange('pos')}
            style={{
              backgroundColor: activeTab === 'pos' ? primaryColor : '#E5E7EB',
              color: activeTab === 'pos' ? '#FFFFFF' : '#374151',
            }}
            className="px-4 py-2 rounded font-semibold transition-colors duration-150 hover:opacity-90 will-change-colors"
          >
            🛒 Point of Sale
          </button>
          <button
            onClick={() => handleTabChange('ready')}
            style={{
              backgroundColor: activeTab === 'ready' ? primaryColor : '#E5E7EB',
              color: activeTab === 'ready' ? '#FFFFFF' : '#374151',
            }}
            className="px-4 py-2 rounded font-semibold transition-colors duration-150 hover:opacity-90 will-change-colors flex items-center gap-2"
          >
            <span>🟢 Ready for Collection</span>
            {readyOrdersCount > 0 && (
              <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-1 ml-1">
                {readyOrdersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('transactions')}
            style={{
              backgroundColor: activeTab === 'transactions' ? primaryColor : '#E5E7EB',
              color: activeTab === 'transactions' ? '#FFFFFF' : '#374151',
            }}
            className="px-4 py-2 rounded font-semibold transition-colors duration-150 hover:opacity-90 will-change-colors"
          >
            📋 Completed Transactions
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-4 p-4">
        {activeTab === 'pos' ? (
          <>
            {/* Product Grid */}
            <ProductGrid onAddItem={handleAddItem} refreshTrigger={refreshCount} />

            {/* Cart Summary */}
            <CartSummary onCheckout={handleCheckout} />
          </>
        ) : activeTab === 'ready' ? (
          <>
            {/* Ready Orders */}
            <div className="flex-1">
              <ReadyOrders
                isActive={activeTab === 'ready'}
                onOrderCompleted={() => setRefreshCount((prev) => prev + 1)}
              />
            </div>
          </>
        ) : (
          <>
            {/* Completed Transactions */}
            <div className="flex-1">
              <CompletedTransactions isActive={activeTab === 'transactions'} />
            </div>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded shadow-lg max-w-sm">
          <div>{error}</div>
          <button
            onClick={() => setError(null)}
            className="ml-4 font-bold hover:underline"
          >
            ×
          </button>
        </div>
      )}

      {/* Ready Orders Notification - Auto-redirect Alert */}
      {showReadyNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-8 py-4 rounded-lg shadow-2xl max-w-lg z-50 animate-bounce">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-bold text-lg">New Orders Ready!</p>
              <p className="text-sm">Redirecting to Ready for Collection...</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <PaymentOptions
          orderId={orderId || undefined}
          onPaymentSelected={handlePaymentSelected}
          onCancel={() => {
            setShowPayment(false);
            setError(null);
          }}
        />
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-8">
            <div className="animate-spin text-4xl mb-4">⟳</div>
            <p className="text-center font-semibold">Processing payment...</p>
          </div>
        </div>
      )}
    </div>
  );
}
