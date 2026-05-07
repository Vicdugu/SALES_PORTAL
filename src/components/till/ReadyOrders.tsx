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

interface ReadyOrder {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

interface ReadyOrdersProps {
  isActive?: boolean;
  onOrderCompleted?: () => void;
}

export function ReadyOrders({ isActive = false, onOrderCompleted }: ReadyOrdersProps) {
  const store = useStore();
  const [orders, setOrders] = useState<ReadyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (isActive) {
      fetchReadyOrders();
    }
  }, [isActive]);

  // Auto-refresh ready orders every 5 seconds when tab is active
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(fetchReadyOrders, 5000);
    return () => clearInterval(interval);
  }, [isActive]);

  const fetchReadyOrders = async () => {
    try {
      const response = await apiCall('/api/orders?status=READY', {
        method: 'GET',
      });

      if (!response.ok) {
        setError('Failed to load ready orders');
        return;
      }

      const data = await response.json();
      setOrders(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching ready orders:', err);
      setError('Error loading ready orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    setCompletingOrderId(orderId);
    try {
      const response = await apiCall(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      if (response.ok) {
        // Remove order from list
        setOrders(orders.filter((o) => o.id !== orderId));
        setExpandedOrderId(null);
        onOrderCompleted?.();
      } else {
        setError('Failed to complete order');
      }
    } catch (err) {
      console.error('Error completing order:', err);
      setError('Error completing order');
    } finally {
      setCompletingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <p className="text-gray-600">Loading ready orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Error Loading Orders</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchReadyOrders}
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
          <p className="text-lg font-semibold">No Ready Orders</p>
          <p className="text-sm">Orders will appear here once the kitchen marks them as ready.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white rounded-lg shadow p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Ready for Collection ({orders.length})
        </h3>
        <p className="text-sm text-green-600 mt-1">✓ These orders are prepared and ready for customers</p>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {orders.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          const isCompleting = completingOrderId === order.id;

          return (
            <div
              key={order.id}
              className="border-2 border-green-200 rounded-lg p-4 bg-green-50 hover:border-green-400 transition"
            >
              {/* Order Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-lg text-gray-800">{order.orderNumber}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Order placed: {new Date(order.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-full">
                  ✓ READY
                </span>
              </div>

              {/* Summary */}
              <div className="bg-white rounded p-2 mb-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items:</span>
                  <span className="font-semibold">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-bold">
                    {formatCurrency(order.total, store.currency)}
                  </span>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>Payment Method:</span>
                  <span>{order.paymentMethod || 'Not specified'}</span>
                </div>
              </div>

              {/* Expand Details Button */}
              <button
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded mb-2 text-sm font-medium hover:bg-gray-300 transition"
              >
                {isExpanded ? '▼ Hide Details' : '▶ View Details'}
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="bg-white rounded p-3 mb-3 border border-gray-200">
                  <h5 className="font-semibold text-sm mb-2 text-gray-800">Items Ordered:</h5>
                  <ul className="space-y-1 text-sm">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex justify-between text-gray-700">
                        <span>{item.name}</span>
                        <span className="font-semibold">× {item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Complete Button */}
              <button
                onClick={() => handleCompleteOrder(order.id)}
                disabled={isCompleting}
                className="w-full px-4 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {isCompleting ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Completing...
                  </>
                ) : (
                  <>✓ Mark as Completed</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
