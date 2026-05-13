'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useStore } from '@/contexts/AuthContext';
import { useOrderStore } from '@/store/orderStore';
import { apiCall } from '@/lib/api/client';
import { ProductGrid } from '@/components/till/ProductGrid';
import { CartSummary } from '@/components/till/CartSummary';
import { PaymentOptions, PaymentMethod } from '@/components/till/PaymentOptions';
import { PaymentMethodSelection } from '@/components/till/PaymentMethodSelection';
import { CompletedTransactions } from '@/components/till/CompletedTransactions';
import { ReadyOrders } from '@/components/till/ReadyOrders';
import { AdvertPanel } from '@/components/AdvertPanel';
import { StoreCurrencyBadge } from '@/components/StoreCurrencyBadge';
import { BrandingHeader } from '@/components/BrandingHeader';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { NotificationPanel } from '@/components/NotificationPanel';

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

  const [activeTab, setActiveTab] = useState<TabType>('pos');
  const [showPaymentMethodSelection, setShowPaymentMethodSelection] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [splitPaymentMode, setSplitPaymentMode] = useState(false);
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
    setShowPaymentMethodSelection(true);
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
    <div className="h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Main Content */}
      <div className="order-1 flex flex-col flex-1 overflow-y-auto min-h-0">
        {/* Branding Header */}
        <div className="px-2 sm:px-4 pt-2 sm:pt-4 flex-shrink-0">
          <BrandingHeader />
        </div>

        {/* Header */}
        <div className="bg-white border-b-2 border-gray-300 p-2 sm:p-4 shadow flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-start sm:items-center mb-3 sm:mb-4">
            <div className="min-w-0">
              <p className="text-gray-900 text-xs sm:text-sm truncate font-semibold">Cashier: {user.name}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <div className="bg-green-100 border-2 border-green-600 rounded px-2 sm:px-4 py-2 text-center flex-shrink-0">
                <p className="text-xs text-green-900 font-bold">Today's Completed</p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">{dailyCompletedCount}</p>
              </div>
              <StoreCurrencyBadge />
              <NotificationPanel
                userRole={user.role}
                buttonClass="bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
              />
              <button
                onClick={() => router.push('/')}
                className="px-2 sm:px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs sm:text-sm font-bold active:scale-95 transition-transform border border-gray-700"
              >
                Back
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 sm:gap-2 border-t-2 border-gray-300 pt-2 sm:pt-3 overflow-x-auto">
            <button
              onClick={() => handleTabChange('pos')}
              style={{
                backgroundColor: activeTab === 'pos' ? primaryColor : '#D1D5DB',
                color: activeTab === 'pos' ? '#FFFFFF' : '#1F2937',
                borderColor: activeTab === 'pos' ? primaryColor : '#9CA3AF',
              }}
              className="px-2 sm:px-4 py-1.5 sm:py-2 rounded font-bold transition-colors duration-150 hover:opacity-90 active:scale-95 will-change-colors text-xs sm:text-base whitespace-nowrap flex-shrink-0 border border-current"
            >
              🛒 POS
            </button>
            <button
              onClick={() => handleTabChange('ready')}
              style={{
                backgroundColor: activeTab === 'ready' ? primaryColor : '#D1D5DB',
                color: activeTab === 'ready' ? '#FFFFFF' : '#1F2937',
                borderColor: activeTab === 'ready' ? primaryColor : '#9CA3AF',
              }}
              className="px-2 sm:px-4 py-1.5 sm:py-2 rounded font-bold transition-colors duration-150 hover:opacity-90 active:scale-95 will-change-colors flex items-center gap-1 sm:gap-2 text-xs sm:text-base whitespace-nowrap flex-shrink-0 border border-current"
            >
              <span>🟢 Ready</span>
              {readyOrdersCount > 0 && (
                <span className="bg-red-700 text-white text-xs font-bold rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 border border-red-900">
                  {readyOrdersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('transactions')}
              style={{
                backgroundColor: activeTab === 'transactions' ? primaryColor : '#D1D5DB',
                color: activeTab === 'transactions' ? '#FFFFFF' : '#1F2937',
                borderColor: activeTab === 'transactions' ? primaryColor : '#9CA3AF',
              }}
              className="px-2 sm:px-4 py-1.5 sm:py-2 rounded font-bold transition-colors duration-150 hover:opacity-90 active:scale-95 will-change-colors text-xs sm:text-base whitespace-nowrap flex-shrink-0 border border-current"
            >
              📋 Transactions
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row md:overflow-hidden overflow-y-auto gap-2 sm:gap-4 p-2 sm:p-4 min-h-0">
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
              <div className="flex-1 min-h-0">
                <ReadyOrders
                  isActive={activeTab === 'ready'}
                  onOrderCompleted={() => setRefreshCount((prev) => prev + 1)}
                />
              </div>
            </>
          ) : (
            <>
              {/* Completed Transactions */}
              <div className="flex-1 min-h-0">
                <CompletedTransactions isActive={activeTab === 'transactions'} />
              </div>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 sm:px-6 py-3 rounded shadow-lg max-w-sm text-sm z-20">
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

      {/* Payment Method Selection Modal */}
      {showPaymentMethodSelection && (
        <PaymentMethodSelection
          total={total}
          onSelectSinglePayment={() => {
            setSplitPaymentMode(false);
            setShowPaymentMethodSelection(false);
            setShowPayment(true);
          }}
          onSelectSplitPayment={() => {
            setSplitPaymentMode(true);
            setShowPaymentMethodSelection(false);
            setShowPayment(true);
          }}
          onCancel={() => {
            setShowPaymentMethodSelection(false);
          }}
        />
      )}

      {/* Payment Modal */}
      {showPayment && (
        <PaymentOptions
          orderId={orderId || undefined}
          onPaymentSelected={handlePaymentSelected}
          onCancel={() => {
            setShowPayment(false);
            setShowPaymentMethodSelection(false);
            setError(null);
          }}
          splitPayment={splitPaymentMode}
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
