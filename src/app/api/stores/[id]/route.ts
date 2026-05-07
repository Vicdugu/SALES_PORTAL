import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { getTokenFromHeader, verifyToken } from '@/lib/auth/jwt';

/**
 * GET /api/stores/[id] - Get a specific store
 */
export async function GET(
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

    const { id } = await context.params;

    // Fetch the store
    const store = await prisma.store.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        backgroundImage: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'Store not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(store));
  } catch (error) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch store'),
      { status: 500 }
    );
  }
}

