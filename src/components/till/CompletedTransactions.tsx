'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils/currency';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface StaffMember {
  id: string;
  name: string;
}

interface CompletedOrder {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
  completedAt: string;
  staff: StaffMember | null;
  items: OrderItem[];
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface CompletedTransactionsProps {
  isActive?: boolean;
}

export function CompletedTransactions({ isActive = false }: CompletedTransactionsProps) {
  const store = useStore();
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterOrderNumber, setFilterOrderNumber] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCashier, setFilterCashier] = useState('');

  const ITEMS_PER_PAGE = 10;

  // Filter orders based on criteria
  const filteredOrders = orders.filter((order) => {
    // Filter by order number
    if (filterOrderNumber && !order.orderNumber.toLowerCase().includes(filterOrderNumber.toLowerCase())) {
      return false;
    }

    // Filter by amount range
    if (filterMinAmount && order.total < parseFloat(filterMinAmount)) {
      return false;
    }
    if (filterMaxAmount && order.total > parseFloat(filterMaxAmount)) {
      return false;
    }

    // Filter by date range
    if (filterStartDate) {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      if (orderDate < filterStartDate) {
        return false;
      }
    }
    if (filterEndDate) {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      if (orderDate > filterEndDate) {
        return false;
      }
    }

    // Filter by cashier name
    if (filterCashier && !order.staff?.name.toLowerCase().includes(filterCashier.toLowerCase())) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    fetchOrders();
  }, [currentPage]);

  // Auto-refresh transactions every 30 seconds when tab is active (silently in background)
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      if (currentPage === 0) {
        backgroundRefresh();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isActive, currentPage, previousOrderCount]);

  // Background refresh - updates data silently without showing loading state
  const backgroundRefresh = async () => {
    try {
      const response = await apiCall(
        `/api/orders/completed?limit=${ITEMS_PER_PAGE}&offset=${currentPage * ITEMS_PER_PAGE}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        return; // Silently fail without updating error state
      }

      const data = await response.json();
      const newOrders = data.data.orders;
      setOrders(newOrders);
      setPagination(data.data.pagination);

      // Show notification if new orders appeared
      if (currentPage === 0 && newOrders.length > 0 && previousOrderCount === 0) {
        setShowNotification(`✓ New transaction completed! (Total: ${data.data.pagination?.total || 0} orders)`);
        setTimeout(() => setShowNotification(null), 3000);
      } else if (currentPage === 0 && newOrders.length > previousOrderCount) {
        const newOrdersCount = newOrders.length - previousOrderCount;
        setShowNotification(`✓ ${newOrdersCount} new transaction(s) added!`);
        setTimeout(() => setShowNotification(null), 3000);
      }

      setPreviousOrderCount(newOrders.length);
    } catch (err) {
      // Silently catch errors during background refresh
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall(
        `/api/orders/completed?limit=${ITEMS_PER_PAGE}&offset=${currentPage * ITEMS_PER_PAGE}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch completed orders');
      }

      const data = await response.json();
      const newOrders = data.data.orders;
      setOrders(newOrders);
      setPagination(data.data.pagination);

      // Show notification if new orders appeared
      if (currentPage === 0 && newOrders.length > 0 && previousOrderCount === 0) {
        setShowNotification(`✓ New transaction completed! (Total: ${data.data.pagination?.total || 0} orders)`);
        setTimeout(() => setShowNotification(null), 3000);
      } else if (currentPage === 0 && newOrders.length > previousOrderCount) {
        const newOrdersCount = newOrders.length - previousOrderCount;
        setShowNotification(`✓ ${newOrdersCount} new transaction(s) added!`);
        setTimeout(() => setShowNotification(null), 3000);
      }

      setPreviousOrderCount(newOrders.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <p className="text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Error Loading Transactions</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchOrders}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-600">
          <p className="text-lg font-semibold">No Completed Transactions</p>
          <p className="text-sm">Transactions will appear here once orders are completed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white rounded-lg shadow p-4 relative">
      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded shadow-lg max-w-sm whitespace-pre-line z-50 animate-pulse">
          {showNotification}
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          Completed Transactions ({filteredOrders.length} of {pagination?.total || 0})
        </h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition text-sm"
        >
          {showFilters ? '🔍 Hide Filters' : '🔍 Show Filters'}
        </button>
      </div>

      {/* Filters - Collapsible */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Order Number</label>
          <input
            type="text"
            placeholder="Search order..."
            value={filterOrderNumber}
            onChange={(e) => setFilterOrderNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Min Amount</label>
          <input
            type="number"
            placeholder="Min"
            value={filterMinAmount}
            onChange={(e) => setFilterMinAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Max Amount</label>
          <input
            type="number"
            placeholder="Max"
            value={filterMaxAmount}
            onChange={(e) => setFilterMaxAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">From Date</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">To Date</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Cashier Name</label>
          <input
            type="text"
            placeholder="Search cashier..."
            value={filterCashier}
            onChange={(e) => setFilterCashier(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => {
            setFilterOrderNumber('');
            setFilterMinAmount('');
            setFilterMaxAmount('');
            setFilterStartDate('');
            setFilterEndDate('');
            setFilterCashier('');
          }}
          className="col-span-1 sm:col-span-2 lg:col-span-3 px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-400 transition"
        >
          Clear Filters
        </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 z-10 bg-gray-100 border-b border-gray-300">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Order Number</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Cashier</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Order Date & Time</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Item</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Quantity</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Amount</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;

              return (
                <React.Fragment key={`order-${order.id}`}>
                  {/* Main Row */}
                  <tr>
                    <td className="py-3 px-4 text-gray-700 font-semibold">{order.orderNumber}</td>
                    <td className="py-3 px-4 text-gray-700">{order.staff?.name || 'System'}</td>
                    <td className="py-3 px-4 text-gray-700">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {order.items.map((item) => item.name).join(', ')}
                    </td>
                    <td className="text-center py-3 px-4 text-gray-700">
                      {order.items.reduce((total, item) => total + item.quantity, 0)}
                    </td>
                    <td className="text-right py-3 px-4 font-semibold text-gray-800">
                      {formatCurrency(order.total, store.currency)}
                    </td>
                    <td className="text-center py-3 px-4">
                      <button
                        onClick={() =>
                          setExpandedOrderId(isExpanded ? null : order.id)
                        }
                        className={`px-3 py-1 rounded text-sm font-medium transition ${
                          isExpanded
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                        }`}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Details Row - Appears Immediately Below */}
                  {isExpanded && (
                    <tr className="bg-blue-50 border-b border-gray-200">
                      <td colSpan={6} className="py-4 px-4">
                        <div className="bg-white rounded-lg p-4 space-y-3">
                          {/* Order Header */}
                          <div className="flex justify-between items-start pb-3 border-b border-gray-200">
                            <div>
                              <p className="font-semibold text-gray-800">
                                Order #{order.orderNumber}
                              </p>
                              <p className="text-xs text-gray-500">
                                Cashier: {order.staff?.name || 'System'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Payment: {order.paymentMethod || 'N/A'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Order Date & Time</p>
                              <p className="text-sm text-gray-700">
                                {new Date(order.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {/* Items Detail */}
                          <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Items:</h4>
                            <div className="space-y-1 text-sm">
                              {order.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex justify-between px-3 py-1 bg-gray-50 rounded"
                                >
                                  <span>
                                    {item.name} × {item.quantity}
                                  </span>
                                  <span>
                                    {formatCurrency(
                                      item.unitPrice * item.quantity,
                                      store.currency
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Summary */}
                          <div className="bg-gray-50 rounded p-3 space-y-1 text-sm">
                            <div className="flex justify-between font-semibold text-gray-800">
                              <span>Total:</span>
                              <span>
                                {formatCurrency(order.total, store.currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {filteredOrders.length === 0 && orders.length > 0 && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center text-gray-500">
              <p className="text-sm font-semibold">No matching transactions found</p>
              <p className="text-xs">Try adjusting your filters</p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total > ITEMS_PER_PAGE && (
        <div className="mt-4 flex justify-between items-center border-t pt-4">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <span className="text-sm text-gray-600">
            Page {currentPage + 1} of {Math.ceil(pagination.total / ITEMS_PER_PAGE)}
          </span>

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={!pagination.hasMore}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
