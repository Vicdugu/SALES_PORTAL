import { NextRequest, NextResponse } from 'next/server';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { getStoreFeatures } from '@/lib/features/service';
import { errorResponse, successResponse } from '@/lib/utils/response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/features
 * Returns all feature flags for the current store.
 * Used by till, kitchen, and admin UIs.
 */
export async function GET(_request: NextRequest) {
  try {
    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(errorResponse('UNAUTHORIZED', 'Store not identified'), { status: 401 });
    }

    const features = await getStoreFeatures(storeId);
    return NextResponse.json(successResponse({ features }));
  } catch (error) {
    console.error('[GET /api/features]', error);
    return NextResponse.json(errorResponse('SERVER_ERROR', 'Failed to fetch features'), { status: 500 });
  }
}
