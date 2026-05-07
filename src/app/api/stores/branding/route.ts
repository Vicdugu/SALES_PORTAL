import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { getTokenFromHeader, verifyToken } from '@/lib/auth/jwt';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { brandingBroadcaster } from '@/lib/realtime/BrandingBroadcaster';

/**
 * GET /api/stores/branding - Get store branding information
 */
export async function GET(request: NextRequest) {
  try {
    const storeId = await getStoreId();

    if (!storeId) {
      return NextResponse.json(
        errorResponse('BAD_REQUEST', 'Store ID not found'),
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
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
    console.error('Error fetching branding:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch branding'),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stores/branding - Update store branding
 * Only ADMIN users can update branding
 */
export async function PUT(request: NextRequest) {
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

    // Debug logging
    console.log('[Branding PUT] Token payload:', {
      tokenPayload,
      tokenRole: tokenPayload.role,
      tokenStoreId: tokenPayload.storeId,
    });

    // Check authorization - only ADMIN can update branding
    if (tokenPayload.role !== 'ADMIN' && tokenPayload.role !== 'SUPERADMIN') {
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'Only admins can update branding settings'),
        { status: 403 }
      );
    }

    const storeId = await getStoreId();

    console.log('[Branding PUT] Request storeId:', storeId);

    if (!storeId) {
      return NextResponse.json(
        errorResponse('BAD_REQUEST', 'Store ID not found'),
        { status: 400 }
      );
    }

    // Verify the user owns this store
    if (tokenPayload.role === 'ADMIN' && tokenPayload.storeId !== storeId) {
      console.log('[Branding PUT] Store ownership check failed:', {
        tokenStoreId: tokenPayload.storeId,
        requestStoreId: storeId,
      });
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'You can only update your own store branding'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { backgroundImage, primaryColor, secondaryColor, accentColor } = body;

    // Validate color formats (simple check for hex colors)
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const colorsToValidate = [
      { color: primaryColor, name: 'primaryColor' },
      { color: secondaryColor, name: 'secondaryColor' },
      { color: accentColor, name: 'accentColor' },
    ];

    for (const { color, name } of colorsToValidate) {
      if (color && !colorRegex.test(color)) {
        return NextResponse.json(
          errorResponse('VALIDATION_ERROR', `Invalid ${name} format. Use hex color (e.g., #000000)`),
          { status: 400 }
        );
      }
    }

    // Update store branding
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        ...(backgroundImage !== undefined && { backgroundImage }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(accentColor !== undefined && { accentColor }),
      },
      select: {
        id: true,
        name: true,
        backgroundImage: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
      },
    });

    // Determine event type and broadcast update to all connected clients
    let eventType: 'wallpaperUpdate' | 'colorsUpdate' | 'fullUpdate' = 'fullUpdate';
    if (backgroundImage !== undefined && !primaryColor && !secondaryColor && !accentColor) {
      eventType = 'wallpaperUpdate';
    } else if ((primaryColor || secondaryColor || accentColor) && backgroundImage === undefined) {
      eventType = 'colorsUpdate';
    }

    // Broadcast the update to all connected staff members
    brandingBroadcaster.broadcast({
      type: eventType,
      storeId,
      backgroundImage: updatedStore.backgroundImage,
      primaryColor: updatedStore.primaryColor,
      secondaryColor: updatedStore.secondaryColor,
      accentColor: updatedStore.accentColor,
      timestamp: Date.now(),
    });

    return NextResponse.json(
      successResponse({
        ...updatedStore,
        message: 'Branding updated successfully',
      })
    );
  } catch (error) {
    console.error('Error updating branding:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to update branding'),
      { status: 500 }
    );
  }
}
