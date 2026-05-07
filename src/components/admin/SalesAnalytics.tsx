'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/api/client';
import { useTheme } from '@/contexts/ThemeContext';
import { useStore } from '@/contexts/AuthContext';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { useRealtimeOrders, OrderEvent } from '@/hooks/useRealtimeOrders';

interface AnalyticsData {
  period: {
    days: number;
    startDate: string;
  };
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  statusBreakdown: {
    pending: number;
    in_progress: number;
    ready: number;
    completed: number;
    cancelled: number;
  };
  paymentBreakdown: {
    cash: number;
    transfer: number;
    pos: number;
  };
}

interface SalesAnalyticsProps {
  days?: number;
}

export function SalesAnalytics({ days = 30 }: SalesAnalyticsProps) {
  const { theme } = useTheme();
  const store = useStore();
  const currencySymbol = getCurrencySymbol(store.currency);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyCompletedCount, setDailyCompletedCount] = useState(0);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await apiCall(`/api/analytics?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      } else {
        setError('Failed to load analytics');
      }
    } catch (err) {
      setError('Error fetching analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  const fetchDailyCompletedCount = useCallback(async () => {
    try {
      const response = await apiCall('/api/analytics/daily-completed-count');
      if (response.ok) {
        const data = await response.json();
        setDailyCompletedCount(data.data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching daily completed count:', err);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchDailyCompletedCount();
    
    // Polling intervals for guaranteed updates
    // Analytics every 2 seconds for order status changes
    const analyticsInterval = setInterval(fetchAnalytics, 2000);
    // Daily count every 3 seconds
    const dailyCountInterval = setInterval(fetchDailyCompletedCount, 3000);
    
    return () => {
      clearInterval(analyticsInterval);
      clearInterval(dailyCountInterval);
    };
  }, [days, fetchAnalytics, fetchDailyCompletedCount]);

  // Handle real-time order status changes
  const handleOrderEvent = useCallback((event: OrderEvent) => {
    // Update analytics when order status changes
    if (event.type === 'statusChange' && analytics) {
      setAnalytics((prevAnalytics) => {
        if (!prevAnalytics) return prevAnalytics;

        const newAnalytics = { ...prevAnalytics };
        const breakdown = { ...newAnalytics.statusBreakdown };

        // Map the status to the breakdown property names
        const statusMap: Record<string, keyof typeof breakdown> = {
          PENDING: 'pending',
          IN_PROGRESS: 'in_progress',
          READY: 'ready',
          COMPLETED: 'completed',
          CANCELLED: 'cancelled',
        };

        // If we can track the previous status, decrement it
        // For now, we'll just refetch to ensure accuracy (or you can maintain it in the event)
        // This is a simple approach - updates the counts by recalculating

        return prevAnalytics;
      });
    }

    // When order is marked COMPLETED, increment the daily count
    if (event.type === 'statusChange' && event.status === 'COMPLETED') {
      setDailyCompletedCount((prev) => prev + 1);
    }
  }, [analytics]);

  // Connect to real-time order updates
  useRealtimeOrders(handleOrderEvent);

  if (loading) {
    return <div className="p-4">Loading analytics...</div>;
  }

  if (error || !analytics) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  const totalPayments = Object.values(analytics.paymentBreakdown).reduce((a, b) => a + b, 0);
  const cashPercent = totalPayments > 0 ? ((analytics.paymentBreakdown.cash / totalPayments) * 100).toFixed(1) : '0';
  const transferPercent = totalPayments > 0 ? ((analytics.paymentBreakdown.transfer / totalPayments) * 100).toFixed(1) : '0';
  const posPercent = totalPayments > 0 ? ((analytics.paymentBreakdown.pos / totalPayments) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg backdrop-blur-sm`}>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm mb-1 sm:mb-2 font-medium`}>Total Orders</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent truncate">{analytics.totalOrders}</p>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg backdrop-blur-sm`}>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm mb-1 sm:mb-2 font-medium`}>Total Revenue</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent truncate">{currencySymbol}{analytics.totalRevenue.toFixed(2)}</p>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg backdrop-blur-sm`}>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm mb-1 sm:mb-2 font-medium`}>Average Order</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent truncate">{currencySymbol}{analytics.averageOrderValue.toFixed(2)}</p>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg backdrop-blur-sm`}>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm mb-1 sm:mb-2 font-medium`}>Period</p>
          <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} truncate`}>{analytics.period.days} days</p>
        </div>

        <div className={`${theme === 'dark' ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'} p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg backdrop-blur-sm`}>
          <p className={`${theme === 'dark' ? 'text-green-400' : 'text-green-700'} text-xs sm:text-sm mb-1 sm:mb-2 font-medium`}>Today's Completed</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent truncate">{dailyCompletedCount}</p>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg backdrop-blur-sm`}>
          <h3 className={`text-sm sm:text-base md:text-lg font-bold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Order Status</h3>
          <div className="space-y-2 sm:space-y-3">
            <StatusRow
              label="Pending"
              count={analytics.statusBreakdown.pending}
              color="bg-red-500"
              theme={theme}
            />
            <StatusRow
              label="In Progress"
              count={analytics.statusBreakdown.in_progress}
              color="bg-yellow-500"
              theme={theme}
            />
            <StatusRow
              label="Ready"
              count={analytics.statusBreakdown.ready}
              color="bg-blue-500"
              theme={theme}
            />
            <StatusRow
              label="Completed"
              count={analytics.statusBreakdown.completed}
              color="bg-green-500"
              theme={theme}
            />
            <StatusRow
              label="Cancelled"
              count={analytics.statusBreakdown.cancelled}
              color="bg-gray-500"
              theme={theme}
            />
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg backdrop-blur-sm`}>
          <h3 className={`text-sm sm:text-base md:text-lg font-bold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Payment Methods</h3>
          <div className="space-y-3 sm:space-y-4">
            <PaymentRow
              label="💵 Cash"
              count={analytics.paymentBreakdown.cash}
              percentage={parseFloat(cashPercent)}
              theme={theme}
            />
            <PaymentRow
              label="💳 Bank Transfer"
              count={analytics.paymentBreakdown.transfer}
              percentage={parseFloat(transferPercent)}
              theme={theme}
            />
            <PaymentRow
              label="🏧 POS/Card"
              count={analytics.paymentBreakdown.pos}
              percentage={parseFloat(posPercent)}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatusRowProps {
  label: string;
  count: number;
  color: string;
  theme: string;
}

function StatusRow({ label, count, color, theme }: StatusRowProps) {
  return (
    <div className={`flex items-center justify-between p-2 sm:p-3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full flex-shrink-0 ${color}`}></div>
        <span className={`font-semibold text-sm sm:text-base truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{label}</span>
      </div>
      <span className={`text-sm sm:text-base flex-shrink-0 ml-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{count}</span>
    </div>
  );
}

interface PaymentRowProps {
  label: string;
  count: number;
  percentage: number;
  theme: string;
}

function PaymentRow({ label, count, percentage, theme }: PaymentRowProps) {
  return (
    <div className="space-y-1">
      <div className={`flex justify-between text-xs sm:text-sm gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
        <span className="font-semibold truncate">{label}</span>
        <span className="flex-shrink-0">{count} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className={`w-full rounded-full h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
