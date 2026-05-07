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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto shadow-lg">
        {/* Header */}
        <h2 className="text-xl font-bold mb-4">{item.name}</h2>

        {/* Item Details */}
        <div className="bg-gray-50 p-4 rounded mb-4">
          <p className="text-sm text-gray-600 mb-2">Category: {item.category}</p>
          <p className="text-lg font-semibold text-green-600">
            ₦{item.unitPrice.toFixed(2)}
          </p>
        </div>

        {/* Quantity Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Quantity</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 bg-red-500 text-white rounded font-bold hover:bg-red-600"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max={item.quantity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-center border rounded px-2 py-1 font-semibold"
            />
            <button
              onClick={() => setQuantity(Math.min(item.quantity, quantity + 1))}
              className="w-10 h-10 bg-green-500 text-white rounded font-bold hover:bg-green-600"
            >
              +
            </button>
            <span className="text-sm text-gray-600 ml-2">
              (max: {item.quantity})
            </span>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">
            Special Instructions (Add-ons, Extras, Notes)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Extra sauce, no onions, mild spice, etc."
            className="w-full border rounded px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Total */}
        <div className="bg-blue-50 p-3 rounded mb-6">
          <div className="flex justify-between">
            <span className="font-semibold">Subtotal:</span>
            <span className="font-bold text-lg text-blue-600">
              ₦{(item.unitPrice * quantity).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-800 py-2 rounded font-semibold hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
