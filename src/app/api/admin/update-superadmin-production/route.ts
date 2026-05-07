import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { successResponse } from '@/lib/utils/response';
import { hashPassword } from '@/lib/auth/hash';

/**
 * POST /api/admin/update-superadmin-production - Update superadmin credentials
 * ⚠️ WARNING: This endpoint should only be called once, then removed from production
 * Delete this file after superadmin credentials are updated
 */
export async function POST(request: NextRequest) {
  try {
    const { newEmail, newPassword } = await request.json();

    if (!newEmail || !newPassword) {
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400 }
      );
    }

    // Find the current superadmin
    const currentAdmin = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN' },
    });

    if (!currentAdmin) {
      return NextResponse.json(
        { error: 'Superadmin not found' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update superadmin with new email and password
    const updatedAdmin = await prisma.user.update({
      where: { id: currentAdmin.id },
      data: {
        email: newEmail,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      successResponse({
        message: '✅ Superadmin credentials updated successfully!',
        email: updatedAdmin.email,
        password: newPassword,
        role: updatedAdmin.role,
        id: updatedAdmin.id,
        warning: '⚠️ DELETE THIS ENDPOINT AFTER USE',
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Failed to update superadmin credentials',
      },
      { status: 500 }
    );
  }
}
