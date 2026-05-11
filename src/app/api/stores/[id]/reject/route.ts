import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { getTokenFromHeader, verifyToken } from '@/lib/auth/jwt';

/**
 * POST /api/stores/[id]/reject - Reject a pending store (SUPERADMIN only)
 * Marks store as inactive and rejected
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Extract and verify JWT token
    const authHeader = request.headers.get('Authorization');
    const token = getTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Missing authentication token'),
        { status: 401 }
      );
    }
    
    const tokenPayload = verifyToken(token);
    if (!tokenPayload) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Invalid or expired token'),
        { status: 401 }
      );
    }

    // Only SUPERADMIN can reject stores
    if (tokenPayload.role !== 'SUPERADMIN') {
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'Only superadmin can reject stores'),
        { status: 403 }
      );
    }

    const { id: storeId } = await context.params;

    // Find the store
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'Store not found'),
        { status: 404 }
      );
    }

    // Update store status to inactive (rejected)
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        isActive: false,
        isApproved: false, // Keep as not approved
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isApproved: true,
      },
    });

    return NextResponse.json(
      successResponse({
        message: `Store "${updatedStore.name}" has been rejected and deactivated`,
        store: updatedStore,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error rejecting store:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to reject store'),
      { status: 500 }
    );
  }
}
