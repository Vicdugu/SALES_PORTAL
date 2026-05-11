import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { verifyPassword } from '@/lib/auth/hash';
import { generateToken } from '@/lib/auth/jwt';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { ValidationError, UnauthorizedError } from '@/lib/utils/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, storeId } = body;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email,
        ...(storeId && { storeId }),
      },
      include: {
        store: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if store is approved for non-superadmin users
    if (user.role !== 'SUPERADMIN' && user.store && !user.store.isApproved) {
      throw new UnauthorizedError('Your store is pending approval. Please wait for superadmin approval.');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      storeId: user.storeId,
      email: user.email,
      role: user.role,
    });

    // Debug: Log store data being returned
    console.log('[Login] Store data being returned:', {
      storeId: user.store?.id,
      storeName: user.store?.name,
      backgroundImage: user.store?.backgroundImage ? 'present' : 'null',
      primaryColor: user.store?.primaryColor,
      secondaryColor: user.store?.secondaryColor,
      accentColor: user.store?.accentColor,
    });

    const response = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        storeId: user.storeId,
      },
      token,
      store: user.store,
    };

    return NextResponse.json(successResponse(response));
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof ValidationError || error instanceof UnauthorizedError) {
      return NextResponse.json(
        errorResponse(error.code!, error.message),
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'An error occurred during login'),
      { status: 500 }
    );
  }
}