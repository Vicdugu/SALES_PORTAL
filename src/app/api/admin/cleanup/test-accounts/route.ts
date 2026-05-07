import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { verifyToken } from '@/lib/auth/jwt';
import { errorResponse, successResponse } from '@/lib/utils/response';

/**
 * POST /api/admin/cleanup/test-accounts
 * Removes all test accounts and test stores (with @example.com emails)
 * Requires SUPERADMIN role
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'Missing authorization header'),
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    if (!payload || payload.role !== 'SUPERADMIN') {
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'Superadmin access required'),
        { status: 403 }
      );
    }

    const { action } = await request.json();

    if (action === 'list') {
      // List all test stores
      const testStores = await prisma.store.findMany({
        where: {
          email: {
            endsWith: '@example.com',
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              orders: true,
            },
          },
        },
      });

      return NextResponse.json(
        successResponse({
          testStores,
          totalCount: testStores.length,
          message: `Found ${testStores.length} test stores`,
        })
      );
    } else if (action === 'cleanup-all') {
      // Delete all test stores
      const testStores = await prisma.store.findMany({
        where: {
          email: {
            endsWith: '@example.com',
          },
        },
      });

      let deletedCount = 0;
      const deletedStores = [];

      for (const store of testStores) {
        try {
          await prisma.store.delete({
            where: { id: store.id },
          });
          deletedCount++;
          deletedStores.push({
            id: store.id,
            name: store.name,
            email: store.email,
          });
          console.log(`✓ Deleted test store: ${store.name}`);
        } catch (error) {
          console.error(`✗ Failed to delete store ${store.id}:`, error);
        }
      }

      return NextResponse.json(
        successResponse({
          deletedCount,
          deletedStores,
          message: `Successfully deleted ${deletedCount} test store(s) and all associated accounts`,
        })
      );
    } else if (action === 'cleanup-by-name') {
      // Delete a specific test store by name
      const { storeName } = await request.json();

      if (!storeName) {
        return NextResponse.json(
          errorResponse('VALIDATION_ERROR', 'Store name is required'),
          { status: 400 }
        );
      }

      const store = await prisma.store.findFirst({
        where: {
          name: {
            contains: storeName,
          },
          email: {
            endsWith: '@example.com',
          },
        },
      });

      if (!store) {
        return NextResponse.json(
          errorResponse('NOT_FOUND', `Test store '${storeName}' not found`),
          { status: 404 }
        );
      }

      await prisma.store.delete({
        where: { id: store.id },
      });

      console.log(`✓ Deleted test store: ${store.name}`);

      return NextResponse.json(
        successResponse({
          deletedStore: {
            id: store.id,
            name: store.name,
            email: store.email,
          },
          message: `Successfully deleted test store '${store.name}'`,
        })
      );
    } else {
      return NextResponse.json(
        errorResponse('INVALID_ACTION', 'Invalid action parameter'),
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error cleaning up test accounts:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to cleanup test accounts'),
      { status: 500 }
    );
  }
}
