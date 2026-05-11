import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { getTokenFromHeader, verifyToken } from '@/lib/auth/jwt';

/**
 * POST /api/stores/[id]/approve - Approve a pending store (SUPERADMIN only)
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

    // Only SUPERADMIN can approve stores
    if (tokenPayload.role !== 'SUPERADMIN') {
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'Only superadmin can approve stores'),
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

    // Update store approval status
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        isApproved: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isApproved: true,
      },
    });

    return NextResponse.json(
      successResponse({
        message: `Store "${updatedStore.name}" has been approved`,
        store: updatedStore,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error approving store:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to approve store'),
      { status: 500 }
    );
  }
}
