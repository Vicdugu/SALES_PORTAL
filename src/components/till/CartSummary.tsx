'use client';

import { useOrderStore } from '@/store/orderStore';
import { useStore } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';

interface CartSummaryProps {
  onCheckout: () => void;
}

export function CartSummary({ onCheckout }: CartSummaryProps) {
  const { items, removeItem, updateQuantity, subtotal, tax, total } = useOrderStore();
  const store = useStore();

  return (
    <div className="w-80 bg-white border-l flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Order Summary</h2>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No items added</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{item.name}</h4>
                  <p className="text-xs text-gray-600">
                    {formatCurrency(item.unitPrice, store.currency)} × {item.quantity}
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {formatCurrency(item.unitPrice * item.quantity, store.currency)}
                  </p>
                  {item.notes && <p className="text-xs text-gray-600 mt-1">{item.notes}</p>}
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col gap-1 items-center">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    +
                  </button>
                  <span className="text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => {
                      if (item.quantity > 1) {
                        updateQuantity(item.id, item.quantity - 1);
                      } else {
                        removeItem(item.id);
                      }
                    }}
                    className="w-6 h-6 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    −
                  </button>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-600 hover:text-red-800 font-bold text-lg"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="border-t p-4 space-y-2 bg-gray-50">
        <div className="border-t pt-2 flex justify-between text-lg font-bold">
          <span>Total:</span>
          <span className="text-green-600">{formatCurrency(total, store.currency)}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="p-4">
        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Proceed to Checkout
        </button>
        <button
          onClick={() => useOrderStore.setState({ items: [] })}
          className="w-full mt-2 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400"
        >
          Clear Cart
        </button>
      </div>
    </div>
  );
}
