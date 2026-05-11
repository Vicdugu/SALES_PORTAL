import { jsPDF } from 'jspdf';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils/currency';

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

interface ReceiptPayment {
  method: string;
  amount: number;
}

interface ReceiptData {
  orderNumber: string;
  storeName: string;
  storeCurrency: string;
  subtotal: number;
  tax: number;
  total: number;
  items: ReceiptItem[];
  payments: ReceiptPayment[];
  createdAt: Date;
  staffName?: string;
  primaryColor?: string;
}

/**
 * Converts hex color to RGB array for jsPDF
 */
function hexToRgb(hex: string): [number, number, number] {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return [r, g, b];
}

/**
 * Generates a PDF receipt and returns it as a Buffer
 */
export async function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  try {
    // Create PDF document (A4 size, mm units)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let yPos = margin;

    const currencySymbol = getCurrencySymbol(data.storeCurrency);
    const primaryColor = data.primaryColor ? hexToRgb(data.primaryColor) : [0, 0, 0];

    // Header - Store name
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", 'bold');
    doc.text(data.storeName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Subtitle
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", 'normal');
    doc.text('RECEIPT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;

    // Receipt details
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(`Receipt #: ${data.orderNumber}`, margin, yPos);
    yPos += 5;
    doc.text(`Date: ${data.createdAt.toLocaleDateString('en-NG')}`, margin, yPos);
    yPos += 5;
    doc.text(`Time: ${data.createdAt.toLocaleTimeString('en-NG')}`, margin, yPos);
    yPos += 5;

    if (data.staffName) {
      doc.text(`Cashier: ${data.staffName}`, margin, yPos);
      yPos += 5;
    }

    // Separator line
    yPos += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    // Items header
    doc.setFontSize(9);
    doc.setFont("helvetica", 'bold');
    doc.text('Item', margin, yPos);
    doc.text('Qty', pageWidth - 50, yPos);
    doc.text('Price', pageWidth - 35, yPos);
    doc.text('Total', pageWidth - margin - 20, yPos);
    yPos += 6;

    // Separator line
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // Items
    doc.setFontSize(8);
    doc.setFont("helvetica", 'normal');
    doc.setTextColor(50, 50, 50);

    data.items.forEach((item) => {
      const itemTotal = item.unitPrice * item.quantity;
      const itemName = item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name;

      doc.text(itemName, margin, yPos);
      doc.text(item.quantity.toString(), pageWidth - 50, yPos, { align: 'center' });
      doc.text(`${currencySymbol}${item.unitPrice.toFixed(2)}`, pageWidth - 35, yPos, {
        align: 'right',
      });
      doc.text(`${currencySymbol}${itemTotal.toFixed(2)}`, pageWidth - margin, yPos, {
        align: 'right',
      });
      yPos += 5;

      if (item.notes) {
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Note: ${item.notes}`, margin + 2, yPos);
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        yPos += 4;
      }
    });

    // Separator line
    yPos += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Totals section
    doc.setFontSize(9);
    doc.setFont("helvetica", 'normal');
    doc.setTextColor(100, 100, 100);

    doc.text('Subtotal:', pageWidth - 50, yPos, { align: 'right' });
    doc.text(`${currencySymbol}${data.subtotal.toFixed(2)}`, pageWidth - margin, yPos, {
      align: 'right',
    });
    yPos += 5;

    doc.text('Tax:', pageWidth - 50, yPos, { align: 'right' });
    doc.text(`${currencySymbol}${data.tax.toFixed(2)}`, pageWidth - margin, yPos, {
      align: 'right',
    });
    yPos += 6;

    // Grand total
    doc.setFontSize(11);
    doc.setFont("helvetica", 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('TOTAL:', pageWidth - 50, yPos, { align: 'right' });
    doc.text(`${currencySymbol}${data.total.toFixed(2)}`, pageWidth - margin, yPos, {
      align: 'right',
    });
    yPos += 8;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Payments section
    doc.setFontSize(8);
    doc.setFont("helvetica", 'normal');
    doc.setTextColor(50, 50, 50);

    if (data.payments.length === 1) {
      const payment = data.payments[0];
      doc.text(`Payment: ${payment.method}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text(`Amount: ${currencySymbol}${payment.amount.toFixed(2)}`, pageWidth / 2, yPos, {
        align: 'center',
      });
    } else if (data.payments.length > 1) {
      doc.setFont("helvetica", 'bold');
      doc.text('Split Payment:', pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.setFont("helvetica", 'normal');

      data.payments.forEach((payment, index) => {
        doc.text(
          `${index + 1}. ${payment.method}: ${currencySymbol}${payment.amount.toFixed(2)}`,
          pageWidth / 2,
          yPos,
          { align: 'center' }
        );
        yPos += 4;
      });
    }

    yPos += 3;

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for your purchase!', pageWidth / 2, yPos, { align: 'center' });
    yPos += 3;
    doc.text('Please keep this receipt for your records', pageWidth / 2, yPos, { align: 'center' });
    yPos += 3;
    doc.text(`Generated: ${new Date().toLocaleString('en-NG')}`, pageWidth / 2, yPos, {
      align: 'center',
    });

    // Return as Buffer
    return Buffer.from(doc.output('arraybuffer'));
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    throw error;
  }
}
