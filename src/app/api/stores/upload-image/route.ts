import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromHeader, verifyToken } from '@/lib/auth/jwt';
import { getStoreId } from '@/lib/tenancy/get-store-id';
import { errorResponse, successResponse } from '@/lib/utils/response';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * POST /api/stores/upload-image - Upload store branding image (background/wallpaper)
 * Only ADMIN users can upload images
 * Supports: backgroundImage
 */
export async function POST(request: NextRequest) {
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

    // Check authorization
    if (tokenPayload.role !== 'ADMIN' && tokenPayload.role !== 'SUPERADMIN') {
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'Only admins can upload images'),
        { status: 403 }
      );
    }

    const storeId = await getStoreId();
    if (!storeId) {
      return NextResponse.json(
        errorResponse('BAD_REQUEST', 'Store ID not found'),
        { status: 400 }
      );
    }

    // Verify store ownership for admins
    if (tokenPayload.role === 'ADMIN' && tokenPayload.storeId !== storeId) {
      return NextResponse.json(
        errorResponse('FORBIDDEN', 'You can only upload images for your own store'),
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const imageType = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'No file provided'),
        { status: 400 }
      );
    }

    if (!imageType || !['backgroundImage'].includes(imageType)) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Invalid image type. Use "backgroundImage"'),
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF'),
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`),
        { status: 400 }
      );
    }

    // Convert image to Base64 data URL for storage
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json(
      successResponse({
        message: 'Background image uploaded successfully',
        dataUrl,
        size: file.size,
        type: file.type,
      })
    );
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to upload image'),
      { status: 500 }
    );
  }
}
