import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header'),
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'SUPERADMIN') {
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'Only superadmin can approve stores'),
        { status: 403 }
      );
    }

    // Get store ID from request body
    const { storeId, approve } = await request.json();

    if (!storeId) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'storeId is required'),
        { status: 400 }
      );
    }

    // Update store approval status
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: { isApproved: approve === true },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    console.log(`[ADMIN] Store ${approve ? 'approved' : 'rejected'}: ${storeId} by superadmin`);

    return NextResponse.json(
      successResponse({
        message: approve ? 'Store approved successfully' : 'Store rejection recorded',
        store: updatedStore,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[ADMIN] Error approving store:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to approve store'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/approve-store - Get pending stores (superadmin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header'),
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'SUPERADMIN') {
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'Only superadmin can view pending stores'),
        { status: 403 }
      );
    }

    // Get all pending stores
    const pendingStores = await prisma.store.findMany({
      where: { isApproved: false },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      successResponse({
        pendingStores,
        count: pendingStores.length,
      })
    );
  } catch (error) {
    console.error('[ADMIN] Error fetching pending stores:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch pending stores'),
      { status: 500 }
    );
  }
}
