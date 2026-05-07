import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import bcryptjs from 'bcryptjs';

// WARNING: This endpoint should only be used in development!
// Remove or restrict this in production

export async function POST(request: NextRequest) {
  try {
    // Check if superadmin already exists
    const existingSuperadmin = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN' },
    });

    if (existingSuperadmin) {
      return NextResponse.json({
        error: 'Superadmin already exists',
        message: 'A superadmin account already exists. Email: ' + existingSuperadmin.email,
      }, { status: 400 });
    }

    // Create a temporary store for the superadmin
    const tempStore = await prisma.store.create({
      data: {
        name: 'System Administrator',
        email: 'superadmin@system.local',
        emailVerified: true,
      },
    });

    // Create superadmin user
    const hashedPassword = await bcryptjs.hash('superadmin123', 10);
    const superadmin = await prisma.user.create({
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
      message: 'Superadmin account created successfully!',
      credentials: {
        email: 'superadmin@system.local',
        password: 'superadmin123',
        warning: '⚠️ Change this password immediately in production!',
      },
    });
  } catch (error: any) {
    console.error('Error creating superadmin:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create superadmin' },
      { status: 500 }
    );
  }
}
