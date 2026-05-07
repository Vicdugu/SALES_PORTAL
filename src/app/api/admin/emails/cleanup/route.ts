import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    
    if (!payload || payload.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { action } = await request.json();

    if (action === 'clear-codes') {
      // Clear all verification codes (but keep the emails)
      // SECURITY: Only clear codes for test stores to avoid affecting production
      const result = await prisma.store.updateMany({
        where: {
          email: {
            endsWith: '@example.com',
          },
        },
        data: {
          verificationCode: null,
          verificationCodeExpiry: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Cleared verification codes from ${result.count} test stores.`,
        count: result.count,
      });
    } else if (action === 'reset-verified-emails') {
      // Reset all verified emails back to unverified (for testing)
      // SECURITY: Only reset test stores to avoid affecting production stores
      const result = await prisma.store.updateMany({
        where: {
          email: {
            endsWith: '@example.com',
          },
        },
        data: {
          emailVerified: false,
          verificationCode: null,
          verificationCodeExpiry: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Reset ${result.count} test store emails to unverified status.`,
        count: result.count,
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error cleaning up emails:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to clean up emails' },
      { status: 500 }
    );
  }
}
