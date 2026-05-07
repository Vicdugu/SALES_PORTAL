'use client';

import { useState, useEffect } from 'react';
import { apiCall } from '@/lib/api/client';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED';
  items: OrderItem[];
  notes?: string;
  createdAt: string;
  staff?: {
    name: string;
    email: string;
  } | null;
}

interface OrderQueueProps {
  onStatusUpdate: (orderId: string, status: string) => void;
}

export function OrderQueue({ onStatusUpdate }: OrderQueueProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [pendingCount, setPendingCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      // Fetch both PENDING and IN_PROGRESS orders
      const pendingResponse = await apiCall('/api/orders?status=PENDING');
      const inProgressResponse = await apiCall('/api/orders?status=IN_PROGRESS');

      if (pendingResponse.ok && inProgressResponse.ok) {
        const pendingData = await pendingResponse.json();
        const inProgressData = await inProgressResponse.json();

        // Get counts
        const pendingOrders = pendingData.data || [];
        const inProgressOrders = inProgressData.data || [];
        
        setPendingCount(pendingOrders.length);
        setInProgressCount(inProgressOrders.length);

        // Combine both sets of orders, with PENDING first
        const allOrders = [
          ...pendingOrders,
          ...inProgressOrders,
        ];
        setOrders(allOrders);
        setError(null);
      } else {
        setError('Failed to load orders');
      }
    } catch (err) {
      setError('Error fetching orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-red-100 text-red-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      READY: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-4">Loading orders...</div>;
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-4 bg-red-50 text-red-700 rounded">{error}</div>}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSelectedStatus('PENDING')}
          className={`px-4 py-2 rounded font-semibold ${
            selectedStatus === 'PENDING'
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-800'
          }`}
        >
          Pending {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button
          onClick={() => setSelectedStatus('IN_PROGRESS')}
          className={`px-4 py-2 rounded font-semibold ${
            selectedStatus === 'IN_PROGRESS'
              ? 'bg-yellow-600 text-white'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          In Progress {inProgressCount > 0 && `(${inProgressCount})`}
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center p-12 text-gray-500">
          <p className="text-lg">No orders in queue</p>
          <p className="text-sm mt-2">👍 Kitchen is caught up!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders
            .filter((o) => o.status === selectedStatus)
            .map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={onStatusUpdate}
              />
            ))}
        </div>
      )}
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  onStatusUpdate: (orderId: string, status: string) => void;
}

function OrderCard({ order, onStatusUpdate }: OrderCardProps) {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const response = await apiCall(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        onStatusUpdate(order.id, newStatus);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow hover:shadow-lg transition">
      {/* Order Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold">{order.orderNumber}</h3>
          <p className="text-xs text-gray-600">{order.staff?.name || 'Unknown Cashier'}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            order.status === 'PENDING'
              ? 'bg-red-100 text-red-800 animate-pulse'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {order.status}
        </span>
      </div>

      {/* Items */}
      <div className="bg-gray-50 p-3 rounded mb-3">
        <h4 className="font-semibold text-sm mb-2">Items:</h4>
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="bg-white p-2 rounded border-l-4 border-blue-500">
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1">
                  <h5 className="font-semibold text-sm">{item.name}</h5>
                  <p className="text-xs text-gray-600">
                    ₦{item.unitPrice.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  × {item.quantity}
                </span>
              </div>
              {item.notes && (
                <div className="mt-2 p-2 bg-yellow-50 rounded border-l-2 border-yellow-400">
                  <p className="text-xs text-yellow-900">
                    <strong>Notes:</strong> {item.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mb-3 p-2 bg-blue-50 rounded">
          <p className="text-sm text-blue-900">
            <strong>Notes:</strong> {order.notes}
          </p>
        </div>
      )}

      {/* Time */}
      <div className="text-xs text-gray-500 mb-3">
        Placed: {new Date(order.createdAt).toLocaleTimeString()}
      </div>

      {/* Status Buttons */}
      <div className="flex gap-2">
        {order.status === 'PENDING' && (
          <button
            onClick={() => handleStatusChange('IN_PROGRESS')}
            disabled={loading}
            className="flex-1 bg-yellow-500 text-white py-2 rounded font-semibold hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Start Cooking'}
          </button>
        )}
        {order.status === 'IN_PROGRESS' && (
          <button
            onClick={() => handleStatusChange('READY')}
            disabled={loading}
            className="flex-1 bg-green-500 text-white py-2 rounded font-semibold hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Mark Ready'}
          </button>
        )}
      </div>
    </div>
  );
}
