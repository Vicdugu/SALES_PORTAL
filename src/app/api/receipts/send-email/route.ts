import { prisma } from '@/lib/db/client';
import { verifyToken } from '@/lib/auth/jwt';
import { generateReceiptPDF } from '@/lib/email/receipt-generator';
import { sendReceiptEmail } from '@/lib/email/client';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Validates email address format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: { message: 'Invalid token' } }, { status: 401 });
    }

    // Parse request body
    const { orderId, email } = await request.json();

    if (!orderId || !email) {
      return NextResponse.json(
        { error: { message: 'Order ID and email address are required' } },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        {
          error: {
            message: 'Invalid email address format',
          },
        },
        { status: 400 }
      );
    }

    // Fetch order with all details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
        store: true,
        staff: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: { message: 'Order not found' } }, { status: 404 });
    }

    // Verify user has access to this order (SUPERADMIN, or ADMIN/STAFF of same store)
    if (decoded.role !== 'SUPERADMIN' && decoded.storeId !== order.storeId) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
    }

    // Generate PDF receipt
    console.log(`[Receipt Email] Generating PDF for order ${order.orderNumber}...`);
    const pdfBuffer = await generateReceiptPDF({
      orderNumber: order.orderNumber,
      storeName: order.store.name,
      storeCurrency: order.store.currency,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes || undefined,
      })),
      payments: order.payments.map((payment) => ({
        method: payment.paymentMethod,
        amount: payment.amount,
      })),
      createdAt: order.createdAt,
      staffName: order.staff?.name,
      primaryColor: order.store.primaryColor,
    });

    try {
      // Send email with PDF attachment
      console.log(`[Receipt Email] Sending receipt email to ${email}...`);

      const result = await sendReceiptEmail({
        to: email,
        storeName: order.store.name,
        orderNumber: order.orderNumber,
        total: order.total,
        currency: order.store.currency,
        pdfBuffer: pdfBuffer,
      });

      if (!result.success) {
        console.error('[Receipt Email] Error sending email:', result.error);
        return NextResponse.json(
          {
            error: {
              message: 'Failed to send receipt email',
              details: result.error,
            },
          },
          { status: 500 }
        );
      }

      console.log(`[Receipt Email] ✅ Receipt email sent successfully to ${email}`);
      console.log(`[Receipt Email] Email details:`, {
        to: email,
        orderNumber: order.orderNumber,
        storeName: order.store.name,
      });

      return NextResponse.json(
        {
          data: {
            success: true,
            message: `Receipt sent to ${email}`,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('[Receipt Email] ❌ Error sending receipt email:', error);

      let errorDetails: any = {
        timestamp: new Date().toISOString(),
        orderNumber: order.orderNumber,
        recipient: email,
      };

      if (error instanceof Error) {
        errorDetails.message = error.message;
        errorDetails.name = error.name;

        console.error('[Receipt Email] Error details:', errorDetails);

        return NextResponse.json(
          {
            error: {
              message: 'Failed to send email',
              details: error.message,
              type: error.name,
            },
          },
          { status: 500 }
        );
      }

      console.error('[Receipt Email] Unknown error type:', error);
      return NextResponse.json(
        {
          error: {
            message: 'Failed to send receipt email',
            details: JSON.stringify(error),
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Receipt Email] ❌ Outer catch - Error in receipt email workflow:', error);

    if (error instanceof Error) {
      console.error('[Receipt Email] Error message:', error.message);
      console.error('[Receipt Email] Error stack:', error.stack);

      return NextResponse.json(
        {
          error: {
            message: error.message,
            type: error.name,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: {
          message: 'Unknown error during receipt email workflow',
          details: JSON.stringify(error),
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    data: {
      service: 'Email Receipt Service',
      status: 'operational',
      description: 'Send order receipts via email',
    },
  });
}
