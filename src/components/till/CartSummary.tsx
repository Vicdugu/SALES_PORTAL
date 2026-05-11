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
    <div className="w-full lg:w-80 bg-white border-l-2 border-gray-300 flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b-2 border-gray-300">
        <h2 className="text-lg sm:text-xl font-bold text-gray-950">Order Summary</h2>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4">
        {items.length === 0 ? (
          <div className="text-center text-gray-700 py-8 font-semibold">No items added</div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-100 rounded-lg border border-gray-300">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm sm:text-base text-gray-950 truncate">{item.name}</h4>
                  <p className="text-xs sm:text-sm text-gray-700 font-semibold">
                    {formatCurrency(item.unitPrice, store.currency)} × {item.quantity}
                  </p>
                  <p className="text-sm sm:text-base font-bold text-green-800 mt-1">
                    {formatCurrency(item.unitPrice * item.quantity, store.currency)}
                  </p>
                  {item.notes && <p className="text-xs text-gray-700 mt-1">{item.notes}</p>}
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col gap-1 items-center justify-center">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 text-white text-sm sm:text-base font-bold rounded hover:bg-blue-700 active:scale-95 transition border border-blue-700"
                  >
                    +
                  </button>
                  <span className="text-sm sm:text-base font-bold text-gray-950">{item.quantity}</span>
                  <button
                    onClick={() => {
                      if (item.quantity > 1) {
                        updateQuantity(item.id, item.quantity - 1);
                      } else {
                        removeItem(item.id);
                      }
                    }}
                    className="w-7 h-7 sm:w-8 sm:h-8 bg-red-600 text-white text-sm sm:text-base font-bold rounded hover:bg-red-700 active:scale-95 transition border border-red-700"
                  >
                    −
                  </button>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-700 hover:text-red-900 font-bold text-xl sm:text-2xl active:scale-90 transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="border-t-2 border-gray-300 p-3 sm:p-4 space-y-2 bg-gray-50">
        <div className="flex justify-between text-xs sm:text-sm text-gray-700 font-semibold">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal, store.currency)}</span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm text-gray-700 font-semibold">
          <span>Tax:</span>
          <span>{formatCurrency(tax, store.currency)}</span>
        </div>
        <div className="border-t-2 border-gray-300 pt-2 flex justify-between text-base sm:text-lg font-bold text-gray-950">
          <span>Total:</span>
          <span className="text-green-800">{formatCurrency(total, store.currency)}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="p-2 sm:p-4 space-y-2">
        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full bg-green-600 text-white py-3 sm:py-4 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition border-2 border-green-700 text-sm sm:text-base min-h-12 sm:min-h-14"
        >
          Proceed to Checkout
        </button>
        <button
          onClick={() => useOrderStore.setState({ items: [] })}
          className="w-full bg-gray-600 text-white py-2 sm:py-3 rounded-lg font-bold hover:bg-gray-700 active:scale-95 transition border-2 border-gray-700 text-xs sm:text-sm min-h-10 sm:min-h-12"
        >
          Clear Cart
        </button>
      </div>
    </div>
  );
}
