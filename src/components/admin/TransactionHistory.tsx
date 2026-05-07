'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/api/client';
import { useTheme } from '@/contexts/ThemeContext';
import { useStore } from '@/contexts/AuthContext';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { useRealtimeOrders, OrderEvent } from '@/hooks/useRealtimeOrders';

interface Transaction {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName?: string;
  total: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'POS';
  status: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  itemCount: number;
}

export function TransactionHistory() {
  const { theme } = useTheme();
  const store = useStore();
  const currencySymbol = getCurrencySymbol(store.currency);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPayment, setFilterPayment] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      const response = await apiCall(`/api/transactions?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Handle nested data structure from API response
        const transactionData = data.data?.data || data.data || [];
        setTransactions(Array.isArray(transactionData) ? transactionData : []);
      } else {
        setError('Failed to load transactions');
      }
    } catch (err) {
      setError('Error fetching transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate, fetchTransactions]);

  // Polling fallback: refresh transactions every 2 seconds to guarantee updates
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchTransactions();
    }, 2000); // Poll every 2 seconds for guaranteed updates

    return () => clearInterval(pollInterval);
  }, [fetchTransactions]);

  // Handle real-time order updates
  const handleOrderEvent = useCallback(
    (event: OrderEvent) => {
      console.log('TransactionHistory received event:', event.type, event.orderId);
      
      // Update the transactions list based on the event type
      setTransactions((prevTransactions) => {
        // For statusChange events, update the transaction's status
        if (event.type === 'statusChange') {
          console.log('Updating status for order', event.orderId, 'to', event.status);
          return prevTransactions.map((t) =>
            t.id === event.orderId
              ? { ...t, status: (event.status || t.status) as any }
              : t
          );
        }

        // For create events, add new transaction at the top (if within date range)
        if (event.type === 'create') {
          // Only add if the event happened within our current date range
          const eventDate = new Date(event.timestamp);
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);
          endDateObj.setDate(endDateObj.getDate() + 1); // Include end date fully

          if (eventDate >= startDateObj && eventDate <= endDateObj) {
            const newTransaction: Transaction = {
              id: event.orderId,
              orderNumber: (event.data?.orderNumber as string) || `ORD-${event.timestamp}`,
              storeId: event.storeId,
              total: (event.data?.total as number) || 0,
              paymentMethod: 'CASH',
              status: (event.status as any) || 'PENDING',
              createdAt: new Date(event.timestamp).toISOString(),
              itemCount: (event.data?.itemCount as number) || 0,
            };
            console.log('Adding new transaction:', newTransaction);
            return [newTransaction, ...prevTransactions];
          }
        }

        return prevTransactions;
      });
    },
    [startDate, endDate]
  );

  // Connect to real-time order updates
  useRealtimeOrders(handleOrderEvent);

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPayment && t.paymentMethod !== filterPayment) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'READY':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return '💵';
      case 'TRANSFER':
        return '💳';
      case 'POS':
        return '🏧';
      default:
        return '💰';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} p-6 rounded-2xl shadow-lg`}>
        <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                theme === 'dark'
                  ? 'bg-gray-700 border border-gray-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            />
          </div>
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                theme === 'dark'
                  ? 'bg-gray-700 border border-gray-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            />
          </div>
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                theme === 'dark'
                  ? 'bg-gray-700 border border-gray-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING">Pending</option>
              <option value="READY">Ready</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Payment Method
            </label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                theme === 'dark'
                  ? 'bg-gray-700 border border-gray-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            >
              <option value="">All Methods</option>
              <option value="CASH">💵 Cash</option>
              <option value="TRANSFER">💳 Bank Transfer</option>
              <option value="POS">🏧 POS/Card</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-2xl shadow-lg overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  Order #
                </th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  Store
                </th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  Payment
                </th>
                <th className={`px-6 py-3 text-right text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  Amount
                </th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  Items
                </th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  Date
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={`hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} transition`}
                  >
                    <td className={`px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      #{transaction.orderNumber}
                    </td>
                    <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {transaction.storeName || transaction.storeId}
                    </td>
                    <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getPaymentIcon(transaction.paymentMethod)} {transaction.paymentMethod}
                    </td>
                    <td className={`px-6 py-4 text-sm font-semibold text-right ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                      {currencySymbol}{transaction.total.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 text-sm`}>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {transaction.itemCount}
                    </td>
                    <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {new Date(transaction.createdAt).toLocaleDateString()} {new Date(transaction.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
