'use client';

import { useEffect, useRef } from 'react';
import { useOrderStore } from '@/store/orderStore';
import { useStore } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';

interface PrintKitchenModalProps {
  staffName: string;
  orderNumber: string; // Temporary reference number shown before DB write (e.g. timestamp-based)
  onPrint: () => void;
  onSkip: () => void;
}

/**
 * PrintKitchenModal
 *
 * Shown when `enable_print_before_kitchen` is active.
 * Presents a thermal-printer-friendly order slip preview.
 * "Print Order" → window.print() then calls onPrint
 * "Skip"         → calls onSkip (no print)
 *
 * CSS: a hidden #print-slip div is rendered; @media print hides
 * everything except that div.
 */
export function PrintKitchenModal({
  staffName,
  orderNumber,
  onPrint,
  onSkip,
}: PrintKitchenModalProps) {
  const { items, total } = useOrderStore();
  const store = useStore();
  const printRef = useRef<HTMLDivElement>(null);

  // Inject print-only CSS once
  useEffect(() => {
    const styleId = 'print-kitchen-slip-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #print-kitchen-slip,
        #print-kitchen-slip * { visibility: visible !important; }
        #print-kitchen-slip {
          position: fixed !important;
          top: 0; left: 0;
          width: 80mm;
          padding: 4mm;
          font-family: monospace;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          background: #fff;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  const handlePrint = () => {
    window.print();
    onPrint();
  };

  const now = new Date();
  const timestamp = now.toLocaleString();

  return (
    <>
      {/* ── Hidden print-only slip ───────────────────────────── */}
      <div id="print-kitchen-slip" ref={printRef} style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '4mm', marginBottom: '4mm' }}>
          <strong style={{ fontSize: '14px' }}>{store?.name || 'Kitchen Order'}</strong>
          <br />
          <span>KITCHEN SLIP</span>
        </div>

        <div style={{ marginBottom: '4mm' }}>
          <strong>Order Ref:</strong> {orderNumber}
          <br />
          <strong>Staff:</strong> {staffName}
          <br />
          <strong>Time:</strong> {timestamp}
        </div>

        <div style={{ borderTop: '1px dashed #000', paddingTop: '4mm', marginBottom: '4mm' }}>
          <strong>ITEMS</strong>
          {items.map((item, idx) => (
            <div key={idx} style={{ marginTop: '2mm' }}>
              <span>{item.quantity}x {item.name}</span>
              {item.notes && (
                <div style={{ paddingLeft: '4mm', fontStyle: 'italic', fontSize: '11px' }}>
                  Note: {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px dashed #000', paddingTop: '4mm', textAlign: 'right' }}>
          <strong>TOTAL: {formatCurrency(total, store?.currency)}</strong>
        </div>

        <div style={{ marginTop: '4mm', textAlign: 'center', fontSize: '10px', borderTop: '1px dashed #000', paddingTop: '2mm' }}>
          — Kitchen Copy —
        </div>
      </div>

      {/* ── Visible modal overlay ────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5 text-white">
            <h2 className="text-xl font-bold">🖨️ Print Kitchen Order</h2>
            <p className="text-sm text-orange-100 mt-1">
              This store requires printing an order slip before sending to kitchen.
            </p>
          </div>

          {/* Order preview */}
          <div className="p-5 space-y-4">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-gray-900">Order Ref</span>
                <span className="text-gray-600 font-mono">{orderNumber}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-gray-900">Staff</span>
                <span className="text-gray-600">{staffName}</span>
              </div>
              <div className="divide-y divide-gray-200">
                {items.map((item, idx) => (
                  <div key={idx} className="py-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-800">
                        {item.quantity}× {item.name}
                      </span>
                      <span className="text-gray-600">
                        {formatCurrency(item.unitPrice * item.quantity, store?.currency)}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-yellow-700 mt-0.5 italic">Note: {item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-300 font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(total, store?.currency)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onSkip}
                className="py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition active:scale-95"
              >
                Skip Printing
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition active:scale-95"
              >
                🖨️ Print Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
