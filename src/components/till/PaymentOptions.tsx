/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { apiCall } from '@/lib/api/client';
import { useOrderStore } from '@/store/orderStore';
import { useStore } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';
import { ReceiptModal } from './ReceiptModal';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'POS';

// ─────────────────────────────────────────────────────────────────────────────
// PaymentOptions
//
// Split-payment flow (3 steps):
//   Step 1 — select payment type + enter amount for Payment 1
//   Step 2 — select payment type for Payment 2; remaining balance is locked/auto
//   Confirm — summary + receipt option (skip / send email) + Pay Now
//
// Single-payment flow:
//   Select method → Confirm Payment → ReceiptModal
// ─────────────────────────────────────────────────────────────────────────────

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
  orderId: _orderId,
  onPaymentSelected,
  onCancel,
  splitPayment = false,
}: PaymentOptionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{ id: string; orderNumber: string } | null>(null);

  // ── Single payment ──────────────────────────────────────────────────────
  const [singleMethod, setSingleMethod] = useState<PaymentMethod | null>(null);

  // ── Split payment ───────────────────────────────────────────────────────
  const [splitStep, setSplitStep] = useState<'step1' | 'step2' | 'confirm'>('step1');
  const [firstMethod, setFirstMethod] = useState<PaymentMethod | null>(null);
  const [firstAmountInput, setFirstAmountInput] = useState<string>('');
  const [firstPayment, setFirstPayment] = useState<PaymentRecord | null>(null);
  const [secondMethod, setSecondMethod] = useState<PaymentMethod | null>(null);
  const [secondPayment, setSecondPayment] = useState<PaymentRecord | null>(null);
  // Receipt preference (split confirm screen)
  const [receiptOption, setReceiptOption] = useState<'skip' | 'email'>('skip');
  const [receiptEmail, setReceiptEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const { items, total, clearCart } = useOrderStore();
  const store = useStore();

  const paymentMethods: Array<{ id: PaymentMethod; label: string; icon: string }> = [
    { id: 'CASH', label: 'Cash', icon: '💰' },
    { id: 'TRANSFER', label: 'Transfer', icon: '🏦' },
    { id: 'POS', label: 'Card / POS', icon: '💳' },
  ];

  const remainingBalance = total - (firstPayment?.amount ?? 0);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // ── Split handlers ───────────────────────────────────────────────────────
  const handleStep1Next = () => {
    if (!firstMethod) {
      setError('Please select a payment type for Payment 1');
      return;
    }
    const amount = parseFloat(firstAmountInput);
    if (!firstAmountInput || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (amount >= total) {
      setError(
        `Amount must be less than ${formatCurrency(total, store.currency)}. Use Single Payment for the full amount.`
      );
      return;
    }
    setFirstPayment({ method: firstMethod, amount });
    setError(null);
    setSplitStep('step2');
  };

  const handleStep2Confirm = () => {
    if (!secondMethod) {
      setError('Please select a payment type for Payment 2');
      return;
    }
    setSecondPayment({ method: secondMethod, amount: remainingBalance });
    setError(null);
    setSplitStep('confirm');
  };

  const handleBack = () => {
    setError(null);
    if (splitStep === 'step2') {
      setSecondMethod(null);
      setFirstPayment(null);
      setSplitStep('step1');
    } else if (splitStep === 'confirm') {
      setSecondPayment(null);
      setSplitStep('step2');
    }
  };

  const handleReset = () => {
    setSplitStep('step1');
    setFirstMethod(null);
    setFirstAmountInput('');
    setFirstPayment(null);
    setSecondMethod(null);
    setSecondPayment(null);
    setReceiptOption('skip');
    setReceiptEmail('');
    setEmailError(null);
    setError(null);
  };

  // ── Payment processing ───────────────────────────────────────────────────
  const handlePayNow = async () => {
    if (splitPayment && receiptOption === 'email') {
      if (!receiptEmail.trim()) {
        setEmailError("Please enter the customer's email address");
        return;
      }
      if (!validateEmail(receiptEmail.trim())) {
        setEmailError('Please enter a valid email address');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);
    setEmailError(null);

    try {
      let payments: PaymentRecord[];
      if (splitPayment) {
        if (!firstPayment || !secondPayment) return;
        payments = [firstPayment, secondPayment];
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
          payments,
          notes: '',
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error?.message || 'Failed to create order');
      }

      const orderData = await orderResponse.json();
      const createdOrder = orderData.data;

      clearCart();
      onPaymentSelected(payments[0].method);

      if (splitPayment) {
        // Non-blocking receipt email
        if (receiptOption === 'email' && receiptEmail.trim()) {
          apiCall('/api/receipts/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: createdOrder.id, email: receiptEmail.trim() }),
          }).catch(() => console.error('[PaymentOptions] Receipt email failed'));
        }
        onCancel();
      } else {
        setCompletedOrder({ id: createdOrder.id, orderNumber: createdOrder.orderNumber });
        setShowReceiptModal(true);
      }
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
    setTimeout(() => onCancel(), 500);
  };

  // ── Shared payment-method selector ──────────────────────────────────────
  function MethodSelector({
    selected,
    onSelect,
    label,
  }: {
    selected: PaymentMethod | null;
    onSelect: (m: PaymentMethod) => void;
    label: string;
  }) {
    return (
      <div>
        <label className="block text-sm font-bold text-gray-950 mb-3">{label}</label>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {paymentMethods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onSelect(m.id); setError(null); }}
              className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition active:scale-95 ${
                selected === m.id
                  ? 'border-purple-600 bg-purple-50 shadow-md'
                  : 'border-gray-300 hover:border-purple-300 bg-white'
              }`}
            >
              <span className="text-2xl sm:text-3xl mb-1">{m.icon}</span>
              <span className={`text-xs sm:text-sm font-bold text-center leading-tight ${selected === m.id ? 'text-purple-700' : 'text-gray-800'}`}>
                {m.label}
              </span>
              {selected === m.id && (
                <span className="text-purple-600 text-xs font-bold mt-1">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Always-visible order summary bar (split) ─────────────────────────────
  function SplitSummaryBar() {
    const payLabel = (p: PaymentRecord) =>
      `${paymentMethods.find((m) => m.id === p.method)?.icon} ${p.method}`;

    return (
      <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b-2 border-gray-200 space-y-1.5 flex-shrink-0">
        <div className="flex justify-between items-center text-sm font-bold text-gray-950">
          <span>Order Total:</span>
          <span className="text-base sm:text-lg">{formatCurrency(total, store.currency)}</span>
        </div>
        {firstPayment && (
          <div className="flex justify-between items-center text-sm text-gray-700 font-semibold border-t border-gray-200 pt-1.5">
            <span>Payment 1 — {payLabel(firstPayment)}:</span>
            <span className="text-green-700 font-bold">{formatCurrency(firstPayment.amount, store.currency)}</span>
          </div>
        )}
        {firstPayment && !secondPayment && (
          <div className="flex justify-between items-center text-sm font-bold bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
            <span className="text-orange-800">Remaining (Payment 2):</span>
            <span className="text-orange-700 text-base">{formatCurrency(remainingBalance, store.currency)}</span>
          </div>
        )}
        {secondPayment && (
          <div className="flex justify-between items-center text-sm text-gray-700 font-semibold">
            <span>Payment 2 — {payLabel(secondPayment)}:</span>
            <span className="text-green-700 font-bold">{formatCurrency(secondPayment.amount, store.currency)}</span>
          </div>
        )}
        {firstPayment && secondPayment && (
          <div className="flex justify-between items-center text-sm font-bold bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 border-t border-gray-200 pt-1.5">
            <span className="text-green-900">Combined Total:</span>
            <span className="text-green-700 text-base">
              {formatCurrency(firstPayment.amount + secondPayment.amount, store.currency)}
            </span>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // SINGLE PAYMENT UI
  // ════════════════════════════════════════════════════════════════════════
  const singlePaymentUI = (
    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
      <div className="p-4 sm:p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-xl">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-950">Single Payment</h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Select payment method to proceed</p>
      </div>

      <div className="p-4 sm:p-6 bg-gray-50 border-b-2 border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm sm:text-base text-gray-700 font-semibold">Total Amount Due:</span>
          <span className="text-2xl sm:text-3xl font-bold text-green-700">
            {formatCurrency(total, store.currency)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Full amount will be charged</p>
      </div>

      {error && (
        <div className="px-4 sm:px-6 py-3 bg-red-50 border-b-2 border-red-300 text-red-800 font-semibold text-sm">
          {error}
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-2">
        <label className="block text-sm font-bold text-gray-950 mb-2">Select Payment Method</label>
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            onClick={() => { setSingleMethod(method.id); setError(null); }}
            className={`w-full p-4 rounded-lg border-2 transition flex items-center gap-3 active:scale-95 ${
              singleMethod === method.id
                ? 'border-green-600 bg-green-50 shadow'
                : 'border-gray-300 hover:border-gray-400 bg-white'
            }`}
          >
            <span className="text-2xl">{method.icon}</span>
            <span className="flex-1 font-semibold text-gray-950 text-sm sm:text-base">{method.label}</span>
            {singleMethod === method.id && <span className="text-2xl font-bold text-green-600">✓</span>}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6 border-t-2 border-gray-200 bg-gray-50 rounded-b-xl flex gap-3">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 sm:py-4 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 disabled:opacity-50 active:scale-95 transition text-sm min-h-[3rem]"
        >
          Cancel
        </button>
        <button
          onClick={handlePayNow}
          disabled={isProcessing || !singleMethod}
          className="flex-1 px-4 py-3 sm:py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 transition text-sm min-h-[3rem]"
        >
          {isProcessing ? <><span className="animate-spin">⏳</span> Processing…</> : '✓ Confirm Payment'}
        </button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // SPLIT PAYMENT UI
  // ════════════════════════════════════════════════════════════════════════
  const stepLabel =
    splitStep === 'step1' ? 'Step 1 of 3 — Payment 1' :
    splitStep === 'step2' ? 'Step 2 of 3 — Payment 2' :
    'Step 3 of 3 — Confirm & Pay';

  const splitPaymentUI = (
    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-xl flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-950">Split Payment</h2>
          <p className="text-xs sm:text-sm text-purple-700 font-semibold mt-0.5">{stepLabel}</p>
        </div>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-100 rounded-lg hover:bg-purple-200 transition border border-purple-300"
        >
          RESET
        </button>
      </div>

      {/* Always-visible summary */}
      <SplitSummaryBar />

      {/* Scrollable step content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="px-4 sm:px-6 py-3 bg-red-50 border-b-2 border-red-300 text-red-800 font-semibold text-sm">
            {error}
          </div>
        )}

        {/* ── Step 1: Payment Type 1 + Amount 1 ──────────────────────────── */}
        {splitStep === 'step1' && (
          <div className="p-4 sm:p-6 space-y-5">
            <MethodSelector
              selected={firstMethod}
              onSelect={setFirstMethod}
              label="Payment Type 1"
            />
            <div>
              <label className="block text-sm font-bold text-gray-950 mb-2">Amount for Payment 1</label>
              <input
                type="number"
                value={firstAmountInput}
                onChange={(e) => { setFirstAmountInput(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleStep1Next()}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                autoFocus
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-2xl sm:text-3xl font-bold text-gray-950 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Max: {formatCurrency(total, store.currency)} — Payment 2 will cover the remainder automatically
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: Payment Type 2 + Locked Remaining Balance ──────────── */}
        {splitStep === 'step2' && firstPayment && (
          <div className="p-4 sm:p-6 space-y-5">
            <MethodSelector
              selected={secondMethod}
              onSelect={setSecondMethod}
              label="Payment Type 2"
            />
            <div>
              <label className="block text-sm font-bold text-gray-950 mb-2">
                Amount for Payment 2
              </label>
              <div className="w-full px-4 py-4 border-2 border-gray-200 bg-gray-50 rounded-xl flex items-center gap-3">
                <span className="text-gray-400 text-xl" title="Auto-calculated">🔒</span>
                <span className="text-2xl sm:text-3xl font-bold text-orange-700">
                  {formatCurrency(remainingBalance, store.currency)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Automatically set to the remaining balance — no manual entry required
              </p>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm + Receipt Options ─────────────────────────── */}
        {splitStep === 'confirm' && firstPayment && secondPayment && (
          <div className="p-4 sm:p-6 space-y-5">
            {/* Payment summary */}
            <div className="bg-gray-50 rounded-xl border-2 border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                <h3 className="font-bold text-gray-950 text-sm sm:text-base">Payment Summary</h3>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600 font-semibold">Order Total</span>
                  <span className="font-bold text-base text-gray-950">{formatCurrency(total, store.currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">
                    {paymentMethods.find((m) => m.id === firstPayment.method)?.icon} Payment 1 — {firstPayment.method}
                  </span>
                  <span className="font-bold text-green-700">{formatCurrency(firstPayment.amount, store.currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">
                    {paymentMethods.find((m) => m.id === secondPayment.method)?.icon} Payment 2 — {secondPayment.method}
                  </span>
                  <span className="font-bold text-green-700">{formatCurrency(secondPayment.amount, store.currency)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="font-bold text-gray-950">Combined Total</span>
                  <span className="font-bold text-base text-green-700">
                    {formatCurrency(firstPayment.amount + secondPayment.amount, store.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Receipt option */}
            <div>
              <label className="block text-sm font-bold text-gray-950 mb-3">Receipt Option</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setReceiptOption('skip'); setEmailError(null); }}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition active:scale-95 ${
                    receiptOption === 'skip'
                      ? 'border-gray-600 bg-gray-100 shadow'
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                  }`}
                >
                  <span className="text-2xl mb-1">🚫</span>
                  <span className={`text-xs sm:text-sm font-bold ${receiptOption === 'skip' ? 'text-gray-900' : 'text-gray-600'}`}>
                    Skip Receipt
                  </span>
                  {receiptOption === 'skip' && <span className="text-gray-600 text-xs mt-0.5">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptOption('email')}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition active:scale-95 ${
                    receiptOption === 'email'
                      ? 'border-blue-600 bg-blue-50 shadow'
                      : 'border-gray-300 hover:border-blue-300 bg-white'
                  }`}
                >
                  <span className="text-2xl mb-1">✉️</span>
                  <span className={`text-xs sm:text-sm font-bold text-center leading-tight ${receiptOption === 'email' ? 'text-blue-700' : 'text-gray-600'}`}>
                    Send to Email
                  </span>
                  {receiptOption === 'email' && <span className="text-blue-600 text-xs mt-0.5">✓</span>}
                </button>
              </div>

              {receiptOption === 'email' && (
                <div className="mt-3">
                  <input
                    type="email"
                    value={receiptEmail}
                    onChange={(e) => { setReceiptEmail(e.target.value); setEmailError(null); }}
                    placeholder="customer@email.com"
                    autoComplete="email"
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-semibold text-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                      emailError ? 'border-red-400 bg-red-50' : 'border-blue-300 focus:border-blue-500'
                    }`}
                  />
                  {emailError && (
                    <p className="text-xs text-red-600 font-semibold mt-1">{emailError}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer action buttons */}
      <div className="p-4 sm:p-5 border-t-2 border-gray-200 bg-gray-50 rounded-b-xl flex gap-3 flex-shrink-0">
        {splitStep === 'step1' ? (
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 sm:py-4 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 disabled:opacity-50 active:scale-95 transition text-sm min-h-[3rem]"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={handleBack}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 sm:py-4 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 disabled:opacity-50 active:scale-95 transition text-sm min-h-[3rem]"
          >
            ← Back
          </button>
        )}

        {splitStep === 'step1' && (
          <button
            onClick={handleStep1Next}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 sm:py-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 active:scale-95 transition text-sm min-h-[3rem]"
          >
            Next →
          </button>
        )}
        {splitStep === 'step2' && (
          <button
            onClick={handleStep2Confirm}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 sm:py-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 active:scale-95 transition text-sm min-h-[3rem]"
          >
            Confirm Payment 2 →
          </button>
        )}
        {splitStep === 'confirm' && (
          <button
            onClick={handlePayNow}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 sm:py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 transition text-sm min-h-[3rem]"
          >
            {isProcessing ? <><span className="animate-spin">⏳</span> Processing…</> : '✓ Pay Now'}
          </button>
        )}
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
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
