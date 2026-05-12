import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { verifyToken } from '@/lib/auth/jwt';
import { errorResponse, successResponse } from '@/lib/utils/response';

// ─── Test-store detection ────────────────────────────────────────────────────
// A store is considered a test/demo/placeholder tenant if any of these match.

const TEST_EMAIL_DOMAINS = [
  '@example.com',
  '@test.com',
  '@demo.com',
  '@sample.com',
  '@fake.com',
  '@placeholder.com',
  '@temp.com',
  '@dummy.com',
];

const TEST_NAME_KEYWORDS = [
  'test',
  'demo',
  'sample',
  'placeholder',
  'temp',
  'temporary',
  'dummy',
  'fake',
  'dev store',
  'development',
  'trial',
  'sandbox',
];

/** Returns the Prisma OR filter that identifies test stores. */
function buildTestStoreFilter() {
  return {
    OR: [
      ...TEST_EMAIL_DOMAINS.map((domain) => ({
        email: { endsWith: domain },
      })),
      ...TEST_NAME_KEYWORDS.map((keyword) => ({
        name: { contains: keyword, mode: 'insensitive' as const },
      })),
    ],
  };
}

/**
 * Derive a human-readable reason why this store was flagged.
 * Returns the first matching reason found.
 */
function flagReason(store: { name: string; email: string }): string {
  for (const domain of TEST_EMAIL_DOMAINS) {
    if (store.email.toLowerCase().endsWith(domain)) {
      return `Test email domain (${domain})`;
    }
  }
  for (const keyword of TEST_NAME_KEYWORDS) {
    if (store.name.toLowerCase().includes(keyword)) {
      return `Test name keyword ("${keyword}")`;
    }
  }
  return 'Flagged as test store';
}

/**
 * POST /api/admin/cleanup/test-accounts
 * Removes all test accounts and test stores.
 * Requires SUPERADMIN role.
 *
 * Actions:
 *   list        — return all test stores (with reason why each was flagged)
 *   cleanup-all — delete all test stores and every piece of related data
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

    const body = await request.json();
    const { action } = body;

    // ── LIST ────────────────────────────────────────────────────────────────
    if (action === 'list') {
      const testStores = await prisma.store.findMany({
        where: buildTestStoreFilter(),
        select: {
          id: true,
          name: true,
          email: true,
          isApproved: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              orders: true,
              inventory: true,
              adverts: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const annotated = testStores.map((s: { name: string; email: string }) => ({
        ...s,
        reason: flagReason(s),
      }));

      return NextResponse.json(
        successResponse({
          testStores: annotated,
          totalCount: annotated.length,
          message: `Found ${annotated.length} test store(s)`,
        })
      );
    }

    // ── CLEANUP-ALL ─────────────────────────────────────────────────────────
    if (action === 'cleanup-all') {
      const testStores = await prisma.store.findMany({
        where: buildTestStoreFilter(),
        select: { id: true, name: true, email: true },
      });

      let deletedCount = 0;
      const deletedStores: { id: string; name: string; email: string }[] = [];
      const failedStores: { id: string; name: string; error: string }[] = [];

      for (const store of testStores) {
        try {
          // Cascade delete: Prisma schema has onDelete: Cascade on all Store
          // relations, so a single store.delete removes users, orders,
          // orderItems, paymentRecords, inventory, adverts, notifications,
          // auditLogs, staffMembers automatically.
          await prisma.store.delete({ where: { id: store.id } });
          deletedCount++;
          deletedStores.push({ id: store.id, name: store.name, email: store.email });
        } catch (err) {
          console.error(`Failed to delete test store ${store.id}:`, err);
          failedStores.push({
            id: store.id,
            name: store.name,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return NextResponse.json(
        successResponse({
          deletedCount,
          deletedStores,
          failedStores,
          message: `Deleted ${deletedCount} test store(s) and all associated data${
            failedStores.length > 0 ? ` (${failedStores.length} failed)` : ''
          }`,
        })
      );
    }

    return NextResponse.json(
      errorResponse('INVALID_ACTION', 'Valid actions: list, cleanup-all'),
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in test-accounts cleanup:', error);
    return NextResponse.json(
      errorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Failed to cleanup test accounts'
      ),
      { status: 500 }
    );
  }
}

