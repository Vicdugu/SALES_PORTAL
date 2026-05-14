import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { verifyToken } from '@/lib/auth/jwt';
import { KNOWN_FLAGS, setFeature } from '@/lib/features/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/features
 * Superadmin only. Returns all stores with their feature flags.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyToken(authHeader.slice(7));
    if (!payload || payload.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all stores with their existing feature rows
    const stores = await (prisma as any).store.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        features: {
          select: { flagKey: true, enabled: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Normalise: each store gets every known flag (default false)
    const result = (stores as any[]).map((store) => {
      const flagMap: Record<string, boolean> = {};
      for (const flag of KNOWN_FLAGS) {
        flagMap[flag] = false;
      }
      for (const row of (store as any).features) {
        flagMap[row.flagKey] = row.enabled;
      }
      return {
        id: store.id,
        name: store.name,
        email: store.email,
        isActive: store.isActive,
        features: flagMap,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[GET /api/admin/features]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/features
 * Body: { storeId, flagKey, enabled }
 * Superadmin only. Upserts a feature flag for a store.
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyToken(authHeader.slice(7));
    if (!payload || payload.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { storeId, flagKey, enabled } = body as {
      storeId: string;
      flagKey: string;
      enabled: boolean;
    };

    if (!storeId || !flagKey || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Verify store exists
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const updated = await setFeature(storeId, flagKey, enabled, payload.userId);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PATCH /api/admin/features]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
