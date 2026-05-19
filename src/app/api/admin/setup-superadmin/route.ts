import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import bcryptjs from 'bcryptjs';
import { randomBytes } from 'crypto';

function generateSecurePassword(): string {
  // 24-char URL-safe base64 password (~143 bits of entropy)
  return randomBytes(18).toString('base64url').slice(0, 24);
}

export async function POST(request: NextRequest) {
  // Block entirely outside of development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Accept optional password from body; fall back to auto-generated
    let password = generateSecurePassword();
    try {
      const body = await request.json();
      if (typeof body?.password === 'string' && body.password.length >= 8) {
        password = body.password;
      }
    } catch {
      // no body — keep generated password
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

    const email = 'superadmin@system.local';

    // Create a store record for the superadmin
    const tempStore = await prisma.store.create({
      data: {
        name: 'System Administrator',
        email,
        emailVerified: true,
      },
    });

    const hashedPassword = await bcryptjs.hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'System Administrator',
        role: 'SUPERADMIN',
        storeId: tempStore.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Superadmin account created successfully.',
      credentials: { email, password },
    });
  } catch (error: any) {
    console.error('Error creating superadmin:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create superadmin' },
      { status: 500 }
    );
  }
}
