'use client';

import { useOrderStore } from '@/store/orderStore';
import { useStore } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';

interface PrintKitchenModalProps {
  staffName: string;
  orderNumber: string;
  onPrint: () => void;
  onSkip: () => void;
}

/**
 * PrintKitchenModal
 *
 * Opens a dedicated popup window containing only the kitchen slip,
 * then calls window.print() on that window. This avoids any CSS
 * conflicts with the main page.
 */
export function PrintKitchenModal({
  staffName,
  orderNumber,
  onPrint,
  onSkip,
}: PrintKitchenModalProps) {
  const { items, total } = useOrderStore();
  const store = useStore();

  const now = new Date();
  const timestamp = now.toLocaleString();

  const handlePrint = () => {
    const storeName = store?.name || 'Kitchen Order';
    const currency = store?.currency;

    const itemRows = items
      .map(
        (item) => `
        <div class="item">
          <span class="qty">${item.quantity}x</span>
          <span class="name">${item.name}</span>
          ${item.notes ? `<div class="notes">Note: ${item.notes}</div>` : ''}
        </div>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Kitchen Slip</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: monospace;
      font-size: 13px;
      line-height: 1.5;
      color: #000;
      width: 80mm;
      padding: 6mm 4mm;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 4mm 0; }
    .store-name { font-size: 15px; font-weight: bold; }
    .slip-title { font-size: 12px; letter-spacing: 2px; margin-top: 1mm; }
    .meta { margin-bottom: 2mm; }
    .item { margin: 2mm 0; }
    .item .qty { font-weight: bold; margin-right: 2mm; }
    .item .notes { padding-left: 6mm; font-style: italic; font-size: 11px; }
    .total { font-size: 14px; font-weight: bold; }
    .footer { font-size: 10px; margin-top: 2mm; }
  </style>
</head>
<body>
  <div class="center">
    <div class="store-name">${storeName}</div>
    <div class="slip-title">KITCHEN SLIP</div>
  </div>
  <div class="divider"></div>
  <div class="meta"><span class="bold">Order Ref:</span> ${orderNumber}</div>
  <div class="meta"><span class="bold">Staff:</span> ${staffName}</div>
  <div class="meta"><span class="bold">Time:</span> ${timestamp}</div>
  <div class="divider"></div>
  <div class="bold" style="margin-bottom:2mm;">ITEMS</div>
  ${itemRows}
  <div class="divider"></div>
  <div class="right total">TOTAL: ${formatCurrency(total, currency)}</div>
  <div class="divider"></div>
  <div class="center footer">— Kitchen Copy —</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=350,height=600,toolbar=0,menubar=0,scrollbars=0');
    if (!win) {
      // Popup blocked — fall back to calling onPrint so payment isn't stuck
      onPrint();
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    // Close the popup after a short delay (gives print dialog time to open)
    setTimeout(() => { try { win.close(); } catch { /* ignore */ } }, 1000);
    onPrint();
  };

  return (
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
  );
}
