import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { hashPassword } from '@/lib/auth/hash';
import { generateVerificationCode, getVerificationCodeExpiry } from '@/lib/auth/verification';
import { sendVerificationEmail } from '@/lib/email/client';
import { getTokenFromHeader, verifyToken } from '@/lib/auth/jwt';
import { runMigrations } from '@/lib/db/migrations';

let migrationAttempted = false;

/**
 * GET /api/stores - Get stores based on user role
 * - SUPERADMIN: Get all stores
 * - ADMIN: Get only their own store
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize database on first request (if needed)
    if (!migrationAttempted) {
      migrationAttempted = true;
      try {
        await runMigrations();
      } catch (migrationError) {
        console.warn('Migration check failed:', migrationError);
        // Continue anyway - schema might already exist
      }
    }

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

    const { role, storeId } = tokenPayload;

    // Build query based on user role
    const whereClause = role === 'SUPERADMIN' 
      ? {} 
      : storeId 
      ? { id: storeId }
      : { id: 'invalid-no-store-id' }; // Return no results if storeId is null

    try {
      const stores = await prisma.store.findMany({
        where: whereClause,
        select: {
        id: true,
        name: true,
        email: true,
        address: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            orders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(successResponse(stores));
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      
      // Check if this is a schema missing error
      if (error.message?.includes('does not exist') || error.code === 'P1001') {
        // Try to run migrations and retry
        try {
          await runMigrations();
          // Retry the query after migration
          const stores = await prisma.store.findMany({
            where: whereClause,
            select: {
              id: true,
              name: true,
              email: true,
              address: true,
              phone: true,
              isActive: true,
              createdAt: true,
              _count: {
                select: {
                  users: true,
                  orders: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });
          return NextResponse.json(successResponse(stores));
        } catch (migrationError) {
          console.error('Migration failed:', migrationError);
          return NextResponse.json(
            errorResponse('DATABASE_ERROR', 'Database initialization failed'),
            { status: 503 }
          );
        }
      }
      
      return NextResponse.json(
        errorResponse('INTERNAL_ERROR', 'Failed to fetch stores'),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch stores'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/stores - Create a new store
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize database on first request (if needed)
    if (!migrationAttempted) {
      migrationAttempted = true;
      try {
        await runMigrations();
      } catch (migrationError) {
        console.warn('Migration check failed:', migrationError);
        // Continue anyway - schema might already exist
      }
    }

    const body = await request.json();
    const { name, email, password, address, phone, currency } = body;

    if (!name || !email) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Name and email are required'),
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Password is required'),
        { status: 400 }
      );
    }

    // Check if store already exists
    const existing = await prisma.store.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        errorResponse('CONFLICT', 'Store with this email already exists'),
        { status: 409 }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiry = getVerificationCodeExpiry();

    // Create store and admin user together
    const store = await prisma.store.create({
      data: {
        name,
        email,
        address,
        phone,
        currency: currency || 'USD',
        verificationCode,
        verificationCodeExpiry,
        // Create the admin user for this store
        users: {
          create: {
            email,
            name,
            password: await hashPassword(password),
            role: 'ADMIN',
          },
        },
      },
      include: {
        users: true,
      },
    });

    // Send verification email with code
    const emailSent = await sendVerificationEmail(name, email, verificationCode);

    if (!emailSent) {
      console.warn(`Failed to send verification email to ${email}`);
    }

    return NextResponse.json(
      successResponse({
        ...store,
        message: 'Store created successfully! Please check your email for your verification code.',
        emailSent,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating store:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create store';
    console.error('Detailed error:', errorMessage);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', errorMessage || 'Failed to create store'),
      { status: 500 }
    );
  }
}