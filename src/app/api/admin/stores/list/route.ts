import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
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

    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        verificationCode: true,
        verificationCodeExpiry: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            orders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      stores,
      total: stores.length,
    });
  } catch (error: any) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}
