import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db/client';

/**
 * DEBUG ENDPOINT: Get all stores with their verification codes
 * REMOVE THIS BEFORE PRODUCTION
 */
export async function GET(request: NextRequest) {
  try {
    const prismaClient = getPrisma();
    
    const stores = await prismaClient.store.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        verificationCode: true,
        verificationCodeExpiry: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      count: stores.length,
      stores: stores.map(store => ({
        ...store,
        verificationCodeExpiry: store.verificationCodeExpiry?.toISOString(),
        createdAt: store.createdAt.toISOString(),
        isExpired: store.verificationCodeExpiry ? new Date() > store.verificationCodeExpiry : false,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message,
    }, { status: 500 });
  }
}
