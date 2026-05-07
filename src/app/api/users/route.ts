import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { hashPassword } from '@/lib/auth/hash';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

/**
 * GET /api/users - Get all users for a store
 */
export async function GET(request: NextRequest) {
  try {
    // Get user role from JWT token
    let userRole = 'STAFF';
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const verified = await jwtVerify(token, JWT_SECRET);
        userRole = verified.payload.role as string;
      } catch (e) {
        // Token verification failed, continue with default
      }
    }

    let storeId = await getStoreId();
    
    // DEBUG LOGGING
    console.log('=== API /users GET DEBUG ===');
    console.log('x-store-id header:', request.headers.get('x-store-id'));
    console.log('storeId from getStoreId():', storeId);
    console.log('userRole:', userRole);
    console.log('Host:', request.headers.get('host'));
    
    // For superadmins, check for explicit storeId parameter
    if (userRole === 'SUPERADMIN' && !storeId) {
      const storeIdParam = request.nextUrl.searchParams.get('storeId');
      if (storeIdParam) {
        storeId = storeIdParam;
      }
    }

    // IMPORTANT: Prevent returning users from other stores
    if (!storeId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Store ID not found. You can only view staff for your assigned store.'),
        { status: 401 }
      );
    }

    // Double-check: For non-superadmins, verify they're querying their own store
    if (userRole !== 'SUPERADMIN') {
      // Additional security: verify the storeId matches their assignment
      // This prevents a user from using a storeId parameter to view other stores
      const requestedStoreId = request.nextUrl.searchParams.get('storeId');
      if (requestedStoreId && requestedStoreId !== storeId) {
        return NextResponse.json(
          errorResponse('FORBIDDEN', 'You do not have permission to view staff from other stores'),
          { status: 403 }
        );
      }
    }

    const users = await prisma.user.findMany({
      where: { storeId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(successResponse(users));
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch users'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - Create new staff user
 */
export async function POST(request: NextRequest) {
  try {
    let storeId = await getStoreId();
    const body = await request.json();
    const { name, email, password, role, storeId: bodyStoreId } = body;

    // For superadmins, allow storeId to be passed in the request body
    if (bodyStoreId && !storeId) {
      // Verify the user is a superadmin by checking JWT token
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        try {
          const verified = await jwtVerify(token, JWT_SECRET);
          // Only superadmins can specify storeId in request body
          if (verified.payload.role === 'SUPERADMIN') {
            storeId = bodyStoreId;
          }
        } catch (e) {
          // JWT verification failed, storeId will remain null and fail below
        }
      }
    }

    if (!storeId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Store ID not found or superadmin must provide storeId'),
        { status: 401 }
      );
    }

    // Validation
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Missing required fields'),
        { status: 400 }
      );
    }

    // Check if user already exists (email is globally unique)
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        errorResponse('CONFLICT', 'User with this email already exists'),
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as any,
        storeId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(successResponse(user), { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errorMessage);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', `Failed to create user: ${errorMessage}`),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id] - Delete a staff user
 */
export async function DELETE(request: NextRequest) {
  try {
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Store ID not found'),
        { status: 401 }
      );
    }

    // Get user ID from URL
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'User ID is required'),
        { status: 400 }
      );
    }

    // Verify the user belongs to the current store
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'User not found'),
        { status: 404 }
      );
    }

    // Security check: ensure user belongs to the current store
    if (userToDelete.storeId !== storeId) {
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'Cannot delete staff from other stores'),
        { status: 403 }
      );
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json(successResponse({ message: 'User deleted successfully' }));
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to delete user'),
      { status: 500 }
    );
  }
}
