import { NextRequest, NextResponse } from 'next/server';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { headers, cookies } from 'next/headers';
import { successResponse } from '@/lib/utils/response';

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const cookiesList = await cookies();
    
    const storeIdHeader = headersList.get('x-store-id');
    const storeIdCookie = cookiesList.get('storeId')?.value;
    const storeIdFromFunc = await getStoreId();
    
    return NextResponse.json(successResponse({
      'x-store-id header': storeIdHeader,
      'storeId cookie': storeIdCookie,
      'storeIdFromFunc (getStoreId)': storeIdFromFunc,
      'host': headersList.get('host'),
      'all cookies': cookiesList.getAll().map(c => ({ name: c.name, value: c.value })),
    }));
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
