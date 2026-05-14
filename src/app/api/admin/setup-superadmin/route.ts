import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import bcryptjs from 'bcryptjs';

export async function POST(request: NextRequest) {
  // Block entirely outside of development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string' || password.length < 16) {
      return NextResponse.json(
        { error: 'A password of at least 16 characters must be supplied in the request body.' },
        { status: 400 }
      );
    }

    // Check if superadmin already exists
    const existingSuperadmin = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN' },
    });

    if (existingSuperadmin) {
      return NextResponse.json(
        { error: 'A superadmin account already exists.' },
        { status: 400 }
      );
    }

    // Create a store record for the superadmin
    const tempStore = await prisma.store.create({
      data: {
        name: 'System Administrator',
        email: 'superadmin@system.local',
        emailVerified: true,
      },
    });

    const hashedPassword = await bcryptjs.hash(password, 12);
    await prisma.user.create({
      data: {
        email: 'superadmin@system.local',
        password: hashedPassword,
        name: 'System Administrator',
        role: 'SUPERADMIN',
        storeId: tempStore.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Superadmin account created. Use the email and password you supplied to log in.',
    });
  } catch (error: any) {
    console.error('Error creating superadmin:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create superadmin' },
      { status: 500 }
    );
  }
}
