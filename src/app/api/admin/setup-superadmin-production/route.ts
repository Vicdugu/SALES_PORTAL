import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { successResponse } from '@/lib/utils/response';
import { hashPassword } from '@/lib/auth/hash';

/**
 * POST /api/admin/setup-superadmin - One-time setup endpoint to create superadmin
 * ⚠️ WARNING: This endpoint should only be called once, then removed from production
 * Delete this file after superadmin account is created
 */
export async function POST(request: NextRequest) {
  try {
    // Check if superadmin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@questbridge.com' },
    });

    if (existingAdmin) {
      return NextResponse.json(
        successResponse({
          message: 'Superadmin already exists',
          email: existingAdmin.email,
          role: existingAdmin.role,
          id: existingAdmin.id,
        })
      );
    }

    // Hash the password
    const hashedPassword = await hashPassword('admin123');

    // Create superadmin user
    const superadmin = await prisma.user.create({
      data: {
        email: 'admin@questbridge.com',
        password: hashedPassword,
        name: 'System Administrator',
        role: 'SUPERADMIN',
        storeId: null,
        isActive: true,
      },
    });

    return NextResponse.json(
      successResponse({
        message: '✅ Superadmin created successfully!',
        email: superadmin.email,
        password: 'admin123',
        role: superadmin.role,
        id: superadmin.id,
        warning: '⚠️ DELETE THIS ENDPOINT AFTER USE - This file should be removed from production',
      })
    );
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to setup superadmin' } },
      { status: 500 }
    );
  }
}
