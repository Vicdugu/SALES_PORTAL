import { prisma } from '@/lib/db/client';
import { verifyToken } from '@/lib/auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: { message: 'Invalid token' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeIdParam = searchParams.get('storeId');

    let storeId = decoded.storeId;
    if (decoded.role === 'SUPERADMIN') {
      // SuperAdmin can request specific store or get all universal adverts
      if (storeIdParam) {
        storeId = storeIdParam;
      } else {
        // If no storeId specified, return only universal adverts for SuperAdmin
        storeId = null;
      }
    }

    // For regular staff/admin, storeId is required
    if (decoded.role !== 'SUPERADMIN' && !storeId) {
      return NextResponse.json({ error: { message: 'Store context required' } }, { status: 400 });
    }

    // Get adverts based on role and context
    let where: any = { isActive: true };
    
    if (decoded.role === 'SUPERADMIN') {
      // SuperAdmin viewing all adverts (both universal and store-specific)
      if (storeId === null) {
        // No specific store: show only universal adverts
        where.storeId = null;
      } else {
        // Specific store: show universal + store-specific adverts
        where.OR = [
          { storeId: null },
          { storeId: storeId },
        ];
      }
    } else {
      // Regular staff/admin: show universal + store-specific adverts for their store
      where.OR = [
        { storeId: null },
        { storeId: storeId },
      ];
    }

    const adverts = await prisma.advert.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ data: adverts });
  } catch (error) {
    console.error('Error fetching adverts:', error);
    return NextResponse.json({ error: { message: 'Failed to fetch adverts' } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.error('[Adverts API] No token provided');
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const decoded = verifyToken(token);
    console.log('[Adverts API] Token decoded:', {
      hasDecoded: !!decoded,
      role: decoded?.role,
      email: decoded?.email,
      isValid: !!decoded && decoded.role === 'SUPERADMIN',
    });

    if (!decoded) {
      console.error('[Adverts API] Token verification failed');
      return NextResponse.json({ error: { message: 'Invalid token' } }, { status: 401 });
    }

    if (decoded.role !== 'SUPERADMIN') {
      console.error('[Adverts API] User role is not SUPERADMIN, got:', decoded.role);
      return NextResponse.json({
        error: {
          message: `Only SuperAdmin can create adverts. Your role: ${decoded.role}`,
        },
      }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: { message: 'Invalid request body. Image may be too large (max 500KB)' } }, { status: 400 });
    }

    const { title, description, imageUrl, link, caption, storeId } = body;

    if (!title || !imageUrl) {
      return NextResponse.json({ error: { message: 'Title and image URL are required' } }, { status: 400 });
    }

    // If storeId provided, validate it exists
    if (storeId) {
      const store = await prisma.store.findUnique({ where: { id: storeId } });
      if (!store) {
        return NextResponse.json({ error: { message: 'Store not found' } }, { status: 404 });
      }
    }

    const advert = await prisma.advert.create({
      data: {
        title,
        description: description || null,
        imageUrl,
        link: link || null,
        caption: caption || null,
        storeId: storeId || null,
        isActive: true,
      },
    });

    return NextResponse.json({ data: advert }, { status: 201 });
  } catch (error) {
    console.error('Error creating advert:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: { message: `Failed to create advert: ${errorMessage}` } }, { status: 500 });
  }
}
