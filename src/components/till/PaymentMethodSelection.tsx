'use client';

import { useState } from 'react';
import { useStore } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';

interface PaymentMethodSelectionProps {
  total: number;
  onSelectSinglePayment: () => void;
  onSelectSplitPayment: () => void;
  onCancel: () => void;
}

export function PaymentMethodSelection({
  total,
  onSelectSinglePayment,
  onSelectSplitPayment,
  onCancel,
}: PaymentMethodSelectionProps) {
  const store = useStore();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b-2 border-gray-300">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-950">Payment Options</h2>
          <p className="text-sm text-gray-600 mt-1">How would you like to complete this payment?</p>
        </div>

        {/* Order Total */}
        <div className="p-4 sm:p-6 bg-gray-100 border-b-2 border-gray-300">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-700">Total Amount:</span>
            <span className="text-2xl font-bold text-gray-950">{formatCurrency(total, store.currency)}</span>
          </div>
        </div>

        {/* Payment Options */}
        <div className="p-4 sm:p-6 space-y-3">
          {/* Single Payment Option */}
          <button
            onClick={onSelectSinglePayment}
            className="w-full p-4 sm:p-5 rounded-lg border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition flex flex-col items-start gap-2 bg-white active:scale-95"
          >
            <div className="flex items-center gap-3 w-full">
              <div className="text-3xl sm:text-4xl">💳</div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-gray-950 text-base sm:text-lg">Single Payment</h3>
                <p className="text-xs sm:text-sm text-gray-600">Pay with one method</p>
              </div>
            </div>
          </button>

          {/* Split Payment Option */}
          <button
            onClick={onSelectSplitPayment}
            className="w-full p-4 sm:p-5 rounded-lg border-2 border-green-300 hover:border-green-500 hover:bg-green-50 transition flex flex-col items-start gap-2 bg-white active:scale-95"
          >
            <div className="flex items-center gap-3 w-full">
              <div className="text-3xl sm:text-4xl">➕</div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-gray-950 text-base sm:text-lg">Split Payment</h3>
                <p className="text-xs sm:text-sm text-gray-600">Pay with two methods</p>
              </div>
            </div>
          </button>
        </div>

        {/* Cancel Button */}
        <div className="p-4 sm:p-6 border-t-2 border-gray-300 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded-lg font-bold hover:bg-gray-400 transition active:scale-95 text-sm sm:text-base min-h-10 sm:min-h-12"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
