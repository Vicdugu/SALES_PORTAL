'use client';

import { useState } from 'react';
import { apiCall } from '@/lib/api/client';
import { useOrderStore } from '@/store/orderStore';
import { useStore } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';
import { ReceiptModal } from './ReceiptModal';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'POS';

interface PaymentRecord {
  method: PaymentMethod;
  amount: number;
}

interface PaymentOptionsProps {
  orderId?: string;
  onPaymentSelected: (method: PaymentMethod) => void;
  onCancel: () => void;
  splitPayment?: boolean;
}

export function PaymentOptions({
  orderId,
  onPaymentSelected,
  onCancel,
  splitPayment = false,
}: PaymentOptionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{ id: string; orderNumber: string } | null>(null);

  // Single payment state
  const [singleMethod, setSingleMethod] = useState<PaymentMethod | null>(null);

  // Split payment state
  const [splitStep, setSplitStep] = useState<'amount1' | 'method2' | 'amount2' | 'confirm'>('amount1');
  const [firstPayment, setFirstPayment] = useState<PaymentRecord | null>(null);
  const [secondPayment, setSecondPayment] = useState<PaymentRecord | null>(null);
  const [firstAmount, setFirstAmount] = useState<string>('');
  const [secondAmount, setSecondAmount] = useState<string>('');

  const { items, subtotal, tax, total, clearCart } = useOrderStore();
  const store = useStore();

  const paymentMethods: Array<{ id: PaymentMethod; name: string; label: string }> = [
    { id: 'CASH', name: 'Cash Payment', label: '💰 Cash' },
    { id: 'TRANSFER', name: 'Bank Transfer', label: '🏦 Transfer' },
    { id: 'POS', name: 'Card (POS)', label: '💳 Card' },
  ];

  const remainingBalance = total - (firstPayment?.amount || 0);
  const isReadyToConfirm =
    firstPayment &&
    (remainingBalance <= 0.01 || (secondPayment && Math.abs(remainingBalance - secondPayment.amount) < 0.01));

  // ========== SINGLE PAYMENT HANDLERS ==========
  const handleSingleMethodSelect = (method: PaymentMethod) => {
    setSingleMethod(method);
    setError(null);
  };

  // ========== SPLIT PAYMENT HANDLERS ==========
  const handleFirstAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0 && numValue <= total) {
      setFirstAmount(value);
      setError(null);
    }
  };

  const handleFirstAmountSubmit = () => {
    const amount = parseFloat(firstAmount);
    if (!firstAmount || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (amount > total) {
      setError(`Amount cannot exceed total ${formatCurrency(total, store.currency)}`);
      return;
    }
    // Move to method selection for payment 1
    setSplitStep('method2');
    setError(null);
  };

  const handleFirstMethodSelect = (method: PaymentMethod) => {
    const amount = parseFloat(firstAmount);
    setFirstPayment({ method, amount });
    setSplitStep('amount2');
    setFirstAmount('');
    setError(null);
  };

  const handleSecondAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0 && numValue <= remainingBalance * 1.1) {
      setSecondAmount(value);
      setError(null);
    }
  };

  const handleSecondMethodSelect = (method: PaymentMethod) => {
    const amount = parseFloat(secondAmount);
    const required = remainingBalance;
    
    if (!secondAmount || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    
    if (amount > required * 1.1) {
      setError(`Amount cannot exceed remaining balance ${formatCurrency(required, store.currency)}`);
      return;
    }

    setSecondPayment({ method, amount });
    setSplitStep('confirm');
    setSecondAmount('');
    setError(null);
  };

  const handleSecondAmountSubmit = () => {
    const amount = parseFloat(secondAmount);
    if (!secondAmount || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    // Move to method selection for payment 2
  };

  // ========== PAYMENT PROCESSING ==========
  const handlePayNow = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      let payments: PaymentRecord[] = [];

      if (splitPayment) {
        if (!firstPayment) return;
        payments = [firstPayment];
        if (secondPayment) {
          payments.push(secondPayment);
        }
      } else {
        if (!singleMethod) return;
        payments = [{ method: singleMethod, amount: total }];
      }

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
          payments: payments,
          notes: '',
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error?.message || 'Failed to create order');
      }

      const orderData = await orderResponse.json();
      const createdOrder = orderData.data;

      const paymentDetails = payments
        .map((p, i) => `${p.method}: ${formatCurrency(p.amount, store.currency)}`)
        .join(' + ');

      const successMsg = `[SUCCESS] Payment Complete!\n\nOrder: #${createdOrder.orderNumber}\nPayment: ${paymentDetails}\nTotal: ${formatCurrency(createdOrder.total, store.currency)}`;
      setSuccessMessage(successMsg);

      setCompletedOrder({
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
      });
      setShowReceiptModal(true);

      clearCart();
      onPaymentSelected(payments[0].method);
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setCompletedOrder(null);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  const handleReset = () => {
    setSplitStep('amount1');
    setFirstPayment(null);
    setSecondPayment(null);
    setFirstAmount('');
    setSecondAmount('');
    setSingleMethod(null);
    setError(null);
  };

  // ========== SINGLE PAYMENT UI ==========
  const singlePaymentUI = (
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full relative">
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg max-w-sm whitespace-pre-line z-[100] animate-pulse text-xs sm:text-sm font-semibold">
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="p-4 sm:p-6 border-b-2 border-gray-300 bg-gradient-to-r from-blue-50 to-blue-100">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-950">Single Payment</h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Select payment method to proceed</p>
      </div>

      {/* Total Amount Display */}
      <div className="p-4 sm:p-6 bg-gray-100 border-b-2 border-gray-300">
        <div className="flex justify-between items-center">
          <span className="text-sm sm:text-base text-gray-700 font-semibold">Total Amount Due:</span>
          <span className="text-2xl sm:text-3xl font-bold text-green-700">
            {formatCurrency(total, store.currency)}
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-2">No manual entry needed — full amount will be charged</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 sm:p-4 bg-red-100 border-b-2 border-red-600 text-red-900 font-semibold text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Payment Method Selection */}
      <div className="p-4 sm:p-6 space-y-3">
        <label className="block text-sm font-bold text-gray-950">Select Payment Method</label>
        <div className="space-y-2">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => handleSingleMethodSelect(method.id)}
              className={`w-full p-4 rounded-lg border-2 transition flex items-center gap-3 active:scale-95 ${
                singleMethod === method.id
                  ? 'border-green-600 bg-green-50 shadow-md'
                  : 'border-gray-300 hover:border-gray-400 bg-white'
              }`}
            >
              <span className="text-lg">{method.label}</span>
              <span className="flex-1 font-semibold text-gray-950">{method.name}</span>
              {singleMethod === method.id && (
                <span className="text-2xl font-bold text-green-600">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 sm:p-6 border-t-2 border-gray-300 bg-gray-50 flex gap-3">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 sm:py-4 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 disabled:opacity-50 active:scale-95 transition border-2 border-gray-700 text-xs sm:text-sm min-h-12 sm:min-h-14"
        >
          Cancel
        </button>
        <button
          onClick={handlePayNow}
          disabled={isProcessing || !singleMethod}
          className="flex-1 px-4 py-3 sm:py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 transition border-2 border-green-700 text-xs sm:text-sm min-h-12 sm:min-h-14"
        >
          {isProcessing ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Processing...</span>
            </>
          ) : (
            <>✓ Confirm Payment</>
          )}
        </button>
      </div>
    </div>
  );

  // ========== SPLIT PAYMENT UI ==========
  const splitPaymentUI = (
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full relative">
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg max-w-sm whitespace-pre-line z-[100] animate-pulse text-xs sm:text-sm font-semibold">
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="p-4 sm:p-6 border-b-2 border-gray-300 bg-gradient-to-r from-purple-50 to-purple-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-950">Split Payment</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Step {splitStep === 'amount1' ? '1' : splitStep === 'method2' ? '2' : '3'} of 3
          </p>
        </div>
        {splitStep !== 'amount1' && (
          <button
            onClick={handleReset}
            className="px-3 py-2 text-sm font-bold text-purple-700 hover:text-purple-900 bg-purple-100 rounded hover:bg-purple-200 transition"
          >
            RESET
          </button>
        )}
      </div>

      {/* Payment Summary Bar */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300 space-y-2">
        <div className="flex justify-between text-xs sm:text-sm font-bold text-gray-950">
          <span>Total Order Amount:</span>
          <span className="text-lg">{formatCurrency(total, store.currency)}</span>
        </div>
        {firstPayment && (
          <>
            <div className="flex justify-between text-xs sm:text-sm text-gray-700 font-semibold pt-2 border-t border-gray-300">
              <span>Payment 1 ({firstPayment.method}):</span>
              <span className="text-green-700 font-bold">+{formatCurrency(firstPayment.amount, store.currency)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm font-bold text-gray-950 bg-white p-2 rounded border-l-4 border-orange-500">
              <span>Remaining Balance:</span>
              <span className="text-orange-700">{formatCurrency(remainingBalance, store.currency)}</span>
            </div>
            {secondPayment && (
              <div className="flex justify-between text-xs sm:text-sm text-gray-700 font-semibold">
                <span>Payment 2 ({secondPayment.method}):</span>
                <span className="text-green-700 font-bold">+{formatCurrency(secondPayment.amount, store.currency)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 sm:p-4 bg-red-100 border-b-2 border-red-600 text-red-900 font-semibold text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Step 1: First Amount Input */}
      {splitStep === 'amount1' && (
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-950 mb-3">Enter Amount for Payment 1</label>
            <input
              type="number"
              value={firstAmount}
              onChange={(e) => handleFirstAmountChange(e.target.value)}
              placeholder="0.00"
              min="0"
              max={total}
              step="0.01"
              autoFocus
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg text-2xl font-bold text-gray-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-2">
              Maximum: {formatCurrency(total, store.currency)}
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Second Payment Method Selection */}
      {splitStep === 'method2' && firstPayment && (
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-950 mb-3">Select Payment Method for Payment 1</label>
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleFirstMethodSelect(method.id)}
                  className="w-full p-4 rounded-lg border-2 border-gray-300 hover:border-purple-400 transition flex items-center gap-3 bg-white active:scale-95"
                >
                  <span className="text-lg">{method.label}</span>
                  <span className="flex-1 font-semibold text-gray-950">{method.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Second Amount Input & Method Selection */}
      {splitStep === 'amount2' && firstPayment && (
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-950 mb-3">
              Enter Amount for Payment 2
            </label>
            <p className="text-xs sm:text-sm text-gray-600 mb-2 font-semibold">
              Remaining due: <span className="text-orange-700 font-bold">{formatCurrency(remainingBalance, store.currency)}</span>
            </p>
            <input
              type="number"
              value={secondAmount}
              onChange={(e) => handleSecondAmountChange(e.target.value)}
              placeholder="0.00"
              min="0"
              max={remainingBalance * 1.1}
              step="0.01"
              autoFocus
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg text-2xl font-bold text-gray-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-2">
              Maximum: {formatCurrency(remainingBalance * 1.1, store.currency)}
            </p>
          </div>

          <button
            onClick={handleSecondAmountSubmit}
            disabled={!secondAmount}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition border-2 border-purple-700 text-sm active:scale-95"
          >
            Continue to Payment Method
          </button>

          {remainingBalance <= 0.01 && (
            <button
              onClick={() => setSplitStep('confirm')}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition border-2 border-green-700 text-sm active:scale-95"
            >
              ✓ Payment 1 Only (Fully Paid)
            </button>
          )}
        </div>
      )}

      {/* Step 4: Confirm Payment Summary */}
      {splitStep === 'confirm' && firstPayment && (
        <div className="p-4 sm:p-6 space-y-4">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border-2 border-gray-300">
            <h3 className="font-bold text-gray-950 text-base sm:text-lg mb-4">Payment Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center pb-3 border-b-2 border-gray-300">
                <span className="font-semibold text-gray-700">Order Total:</span>
                <span className="font-bold text-lg text-gray-950">{formatCurrency(total, store.currency)}</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Payment 1 - {firstPayment.method}:</span>
                  <span className="font-bold text-green-700">{formatCurrency(firstPayment.amount, store.currency)}</span>
                </div>

                {secondPayment ? (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Payment 2 - {secondPayment.method}:</span>
                    <span className="font-bold text-green-700">{formatCurrency(secondPayment.amount, store.currency)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-orange-700">
                    <span className="font-semibold">Single Payment (Full Amount):</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300 bg-white p-2 rounded">
                <span className="font-bold text-gray-950">Total Paid:</span>
                <span className="font-bold text-lg text-green-700">
                  {formatCurrency((firstPayment?.amount || 0) + (secondPayment?.amount || 0), store.currency)}
                </span>
              </div>
            </div>
          </div>

          {!secondPayment && remainingBalance > 0.01 && (
            <button
              onClick={() => setSplitStep('amount2')}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition border-2 border-orange-600 text-sm active:scale-95"
            >
              ← Add Second Payment
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 sm:p-6 border-t-2 border-gray-300 bg-gray-50 flex gap-3">
        <button
          onClick={handleReset}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 sm:py-4 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 disabled:opacity-50 active:scale-95 transition border-2 border-gray-700 text-xs sm:text-sm min-h-12 sm:min-h-14"
        >
          {splitStep === 'amount1' ? 'Cancel' : 'Back'}
        </button>

        {splitStep === 'amount1' && (
          <button
            onClick={handleFirstAmountSubmit}
            disabled={isProcessing || !firstAmount}
            className="flex-1 px-4 py-3 sm:py-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 transition border-2 border-purple-700 text-xs sm:text-sm min-h-12 sm:min-h-14"
          >
            → Next
          </button>
        )}

        {splitStep === 'method2' && (
          <button
            onClick={() => setSplitStep('amount2')}
            className="flex-1 px-4 py-3 sm:py-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 flex items-center justify-center gap-2 active:scale-95 transition border-2 border-purple-700 text-xs sm:text-sm min-h-12 sm:min-h-14"
          >
            → Next
          </button>
        )}

        {splitStep === 'confirm' && (
          <button
            onClick={handlePayNow}
            disabled={isProcessing || !isReadyToConfirm}
            className="flex-1 px-4 py-3 sm:py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 transition border-2 border-green-700 text-xs sm:text-sm min-h-12 sm:min-h-14"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Processing...</span>
              </>
            ) : (
              <>✓ Complete Payment</>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      {!splitPayment ? singlePaymentUI : splitPaymentUI}

      {completedOrder && (
        <ReceiptModal
          isOpen={showReceiptModal}
          orderId={completedOrder.id}
          orderNumber={completedOrder.orderNumber}
          onClose={handleCloseReceiptModal}
        />
      )}
    </div>
  );
}
