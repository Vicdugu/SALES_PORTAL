'use client';

import { useState } from 'react';
import { apiCall } from '@/lib/api/client';
import { useOrderStore } from '@/store/orderStore';
import { useStore } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'POS';

interface PaymentOptionsProps {
  orderId?: string;
  onPaymentSelected: (method: PaymentMethod) => void;
  onCancel: () => void;
}

export function PaymentOptions({ orderId, onPaymentSelected, onCancel }: PaymentOptionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { items, subtotal, tax, total, clearCart } = useOrderStore();
  const store = useStore();

  const handlePaymentSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setError(null);
  };

  const handlePayNow = async () => {
    if (!selectedMethod) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Create order with proper API call
      const orderResponse = await apiCall('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes || '',
          })),
          paymentMethod: selectedMethod,
          notes: '',
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error?.message || 'Failed to create order');
      }

      const orderData = await orderResponse.json();
      const createdOrder = orderData.data;

      // Show success message on payment page
      const successMsg = `✓ Payment Successful!\n\nOrder: #${createdOrder.orderNumber}\nMethod: ${selectedMethod}\nTotal: ${store.currency} ${createdOrder.total.toFixed(2)}`;
      setSuccessMessage(successMsg);

      // Clear cart
      clearCart();

      // Notify parent of successful payment (but don't close modal yet)
      onPaymentSelected(selectedMethod);

      // Close modal after delay so user sees confirmation for 3 seconds
      setTimeout(() => {
        onCancel();
      }, 3000);
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentMethods = [
    {
      id: 'CASH' as PaymentMethod,
      name: 'Cash Payment',
      description: 'Pay with cash',
      icon: '💵',
      color: 'bg-green-500',
    },
    {
      id: 'TRANSFER' as PaymentMethod,
      name: 'Bank Transfer',
      description: 'Pay via bank transfer',
      icon: '💳',
      color: 'bg-blue-500',
    },
    {
      id: 'POS' as PaymentMethod,
      name: 'Card (POS)',
      description: 'Pay with card/POS',
      icon: '🏧',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
        {/* Success Toast */}
        {successMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-4 rounded shadow-lg max-w-sm whitespace-pre-line z-[100] animate-pulse">
            {successMessage}
          </div>
        )}

        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Payment Method</h2>
          <p className="text-gray-600 mt-2">Select your preferred payment method</p>
        </div>

        {/* Order Summary */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Items:</span>
              <span className="font-semibold">{items.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">{formatCurrency(subtotal, store.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (10%):</span>
              <span className="font-semibold">{formatCurrency(tax, store.currency)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-bold">Total to Pay:</span>
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(total, store.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border-b text-red-700 text-sm">{error}</div>
        )}

        {/* Payment Options */}
        <div className="p-6 space-y-3">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => handlePaymentSelect(method.id)}
              disabled={isProcessing}
              className={`w-full p-4 rounded-lg border-2 transition flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedMethod === method.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <span className="text-3xl">{method.icon}</span>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-gray-900">{method.name}</h3>
                <p className="text-sm text-gray-600">{method.description}</p>
              </div>
              {selectedMethod === method.id && <span className="text-2xl">✓</span>}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>
          {selectedMethod && (
            <button
              onClick={handlePayNow}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Processing...
                </>
              ) : (
                <>💳 Pay Now {formatCurrency(total, store.currency)}</>
              )}
            </button>
          )}
        </div>

        {/* Payment Status Log */}
        {!isProcessing && (
          <div className="px-6 pb-4 text-xs text-gray-500">
            {selectedMethod ? (
              <p>✓ Payment method selected. Click "Pay Now" to complete the transaction.</p>
            ) : (
              <p>💡 Select a payment method and click "Pay Now" to complete the transaction for order #{orderId || 'pending'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
