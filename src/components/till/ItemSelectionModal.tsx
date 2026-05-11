'use client';

import { useState } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
}

interface ItemSelectionModalProps {
  item: InventoryItem;
  onConfirm: (quantity: number, notes: string) => void;
  onCancel: () => void;
}

export function ItemSelectionModal({
  item,
  onConfirm,
  onCancel,
}: ItemSelectionModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(quantity, notes);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full sm:w-96 max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <h2 className="text-lg sm:text-2xl font-bold mb-4 text-gray-950">{item.name}</h2>

        {/* Item Details */}
        <div className="bg-gray-100 p-3 sm:p-4 rounded-lg mb-4 border-2 border-gray-300">
          <p className="text-xs sm:text-sm text-gray-700 font-semibold mb-2">Category: {item.category}</p>
          <p className="text-lg sm:text-xl font-bold text-green-800">
            ₦{item.unitPrice.toFixed(2)}
          </p>
        </div>

        {/* Quantity Selection */}
        <div className="mb-6">
          <label className="block text-sm sm:text-base font-bold mb-3 text-gray-900">Quantity</label>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 text-white rounded-lg font-bold text-lg sm:text-xl hover:bg-red-700 active:scale-95 transition border-2 border-red-700"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max={item.quantity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 sm:w-20 text-center border-2 border-gray-300 rounded-lg px-2 py-2 font-bold text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setQuantity(Math.min(item.quantity, quantity + 1))}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 text-white rounded-lg font-bold text-lg sm:text-xl hover:bg-green-700 active:scale-95 transition border-2 border-green-700"
            >
              +
            </button>
            <span className="text-xs sm:text-sm text-gray-700 font-semibold">
              Max: {item.quantity}
            </span>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="mb-6">
          <label className="block text-sm sm:text-base font-bold mb-3 text-gray-900">
            Special Instructions
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Extra sauce, no onions"
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base resize-none h-20 sm:h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Total */}
        <div className="bg-blue-100 p-3 sm:p-4 rounded-lg mb-6 border-2 border-blue-300">
          <div className="flex justify-between">
            <span className="font-bold text-sm sm:text-base text-gray-900">Subtotal:</span>
            <span className="font-bold text-lg sm:text-xl text-blue-800">
              ₦{(item.unitPrice * quantity).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 text-white py-3 sm:py-4 px-3 rounded-lg font-bold text-sm sm:text-base hover:bg-gray-700 active:scale-95 transition border-2 border-gray-700 min-h-12 sm:min-h-14"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-green-600 text-white py-3 sm:py-4 px-3 rounded-lg font-bold text-sm sm:text-base hover:bg-green-700 active:scale-95 transition border-2 border-green-700 min-h-12 sm:min-h-14"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
