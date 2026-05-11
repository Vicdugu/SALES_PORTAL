'use client';

import { useState } from 'react';
import { apiCall } from '@/lib/api/client';

interface ReceiptModalProps {
  isOpen: boolean;
  orderId: string;
  orderNumber: string;
  onClose: () => void;
}

export function ReceiptModal({ isOpen, orderId, orderNumber, onClose }: ReceiptModalProps) {
  const [step, setStep] = useState<'ask' | 'input' | 'sending' | 'success' | 'error'>('ask');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleSendReceipt = async () => {
    // Validate email
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setStep('sending');
    setError(null);

    try {
      const response = await apiCall('/api/receipts/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to send receipt');
      }

      const data = await response.json();
      setSuccessMessage(
        `✓ Receipt sent successfully to ${email}!\n\nThe customer will receive their PDF receipt in their email inbox.`
      );
      setStep('success');

      // Auto-close after 4 seconds
      setTimeout(() => {
        onClose();
      }, 4000);
    } catch (err) {
      console.error('Error sending receipt:', err);
      setError(err instanceof Error ? err.message : 'Failed to send receipt. Please try again.');
      setStep('error');
    }
  };

  const handleSkip = () => {
    onClose();
  };

  // STEP 1: Ask if customer wants digital receipt
  if (step === 'ask') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 sm:p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">�</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-950 mb-2">Send Digital Receipt?</h2>
            <p className="text-sm sm:text-base text-gray-700 mb-6">
              Send a PDF receipt to the customer via email
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setStep('input')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 active:scale-95 transition border-2 border-blue-700 text-sm sm:text-base"
              >
                ✉️ Send Receipt via Email
              </button>
              <button
                onClick={handleSkip}
                className="w-full bg-gray-400 text-white py-3 rounded-lg font-bold hover:bg-gray-500 active:scale-95 transition border-2 border-gray-500 text-sm sm:text-base"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Input email address
  if (step === 'input') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-950 mb-4">Customer Email Address</h2>
          <p className="text-sm text-gray-700 mb-4">
            Enter the customer's email address to send the receipt
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-950 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., customer@example.com"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-950 placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 text-sm sm:text-base"
              />
              <p className="text-xs text-gray-600 mt-2">
                ✓ Receipt will be sent with PDF attachment
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleSendReceipt}
                disabled={!email.trim()}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition border-2 border-blue-700 text-sm sm:text-base"
              >
                Send Receipt
              </button>
              <button
                onClick={() => setStep('ask')}
                className="w-full bg-gray-300 text-gray-950 py-2 rounded-lg font-bold hover:bg-gray-400 active:scale-95 transition border-2 border-gray-400 text-sm sm:text-base"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: Sending
  if (step === 'sending') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 sm:p-8 text-center">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-950 mb-2">Sending Receipt...</h2>
          <p className="text-sm text-gray-700">Please wait while we prepare your receipt</p>
        </div>
      </div>
    );
  }

  // STEP 4: Success
  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 sm:p-8 text-center">
          <div className="text-5xl mb-4 animate-bounce">✓</div>
          <h2 className="text-xl sm:text-2xl font-bold text-green-700 mb-2">Receipt Sent!</h2>
          <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line mb-6">
            {successMessage}
          </p>
          <p className="text-xs text-gray-600">Auto-closing in 4 seconds...</p>
        </div>
      </div>
    );
  }

  // STEP 5: Error
  if (step === 'error') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 sm:p-8">
          <div className="text-5xl mb-4 text-center">⚠️</div>
          <h2 className="text-xl sm:text-2xl font-bold text-red-700 mb-4 text-center">Failed to Send</h2>

          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setStep('input')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 active:scale-95 transition border-2 border-blue-700 text-sm sm:text-base"
            >
              Try Again
            </button>
            <button
              onClick={handleSkip}
              className="w-full bg-gray-400 text-white py-2 rounded-lg font-bold hover:bg-gray-500 active:scale-95 transition border-2 border-gray-500 text-sm sm:text-base"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }
}
