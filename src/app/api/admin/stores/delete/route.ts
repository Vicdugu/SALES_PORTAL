import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    
    if (!payload || payload.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { storeId } = await request.json();

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    // Delete all related data (cascade delete is configured in schema)
    const deletedStore = await prisma.store.delete({
      where: { id: storeId },
    });

    return NextResponse.json({
      success: true,
      message: `Store "${deletedStore.name}" and all associated data have been deleted.`,
      storeId: deletedStore.id,
    });
  } catch (error: any) {
    console.error('Error deleting store:', error);
    
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to delete store' },
      { status: 500 }
    );
  }
}
