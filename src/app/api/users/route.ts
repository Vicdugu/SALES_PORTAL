import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withTenantContext, withSuperadminContext } from '@/lib/db/tenant-context';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { getAuthPayload } from '@/lib/tenancy/get-auth-payload';
import { hashPassword } from '@/lib/auth/hash';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { logSuperadminAccess } from '@/lib/auth/superadmin-audit';

/**
 * GET /api/users - Get all users for a store
 */
export async function GET(request: NextRequest) {
  try {
    // Get user role from JWT token (header or httpOnly cookie)
    const authPayload = await getAuthPayload();
    const userRole = authPayload?.role ?? 'STAFF';

    let storeId = await getStoreId();
    
    // For superadmins, ALWAYS prefer explicit storeId parameter
    if (userRole === 'SUPERADMIN') {
      const storeIdParam = request.nextUrl.searchParams.get('storeId');
      if (storeIdParam) {
        storeId = storeIdParam;
        if (authPayload?.userId) {
          void logSuperadminAccess(authPayload.userId, storeIdParam, 'READ_USERS', { endpoint: '/api/users' });
        }
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

    const users = await (userRole === 'SUPERADMIN' && !request.nextUrl.searchParams.get('storeId')
      ? withSuperadminContext((tx) => tx.user.findMany({
          where: { storeId: storeId ?? undefined },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }))
      : withTenantContext(storeId!, (tx) => tx.user.findMany({
          where: { storeId },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }))
    );

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

    // For superadmins, ALWAYS prefer bodyStoreId when provided
    const authPayload = await getAuthPayload();
    let userRole = authPayload?.role ?? 'STAFF';
    if (bodyStoreId && userRole === 'SUPERADMIN') {
      storeId = bodyStoreId;
      if (authPayload?.userId) {
        void logSuperadminAccess(authPayload.userId, bodyStoreId, 'CREATE_USER', { email: body.email, role: body.role });
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
    // Determine caller role from JWT (header or httpOnly cookie)
    const authPayload = await getAuthPayload();
    const callerRole = authPayload?.role ?? 'STAFF';

    const storeId = await getStoreId();

    // Non-superadmins must have a storeId
    if (!storeId && callerRole !== 'SUPERADMIN') {
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

    // Verify the user exists
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'User not found'),
        { status: 404 }
      );
    }

    // Security check: non-superadmins can only delete from their own store
    if (callerRole !== 'SUPERADMIN' && userToDelete.storeId !== storeId) {
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
