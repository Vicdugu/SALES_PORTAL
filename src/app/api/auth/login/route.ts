import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { verifyPassword } from '@/lib/auth/hash';
import { generateToken } from '@/lib/auth/jwt';
import { checkLoginRateLimit, logLoginAttempt } from '@/lib/auth/rate-limit';
import { LoginSchema } from '@/lib/validation/schemas';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { ValidationError, UnauthorizedError } from '@/lib/utils/errors';
import { generateVerificationToken } from '@/lib/auth/verification-token';

function getClientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    undefined
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; ')),
        { status: 400 }
      );
    }
    const { email, password, storeId } = parsed.data;

    // Rate limit: max 5 failed attempts per 15 minutes per email
    const rateLimit = await checkLoginRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        errorResponse('RATE_LIMITED', 'Too many failed login attempts. Try again in 15 minutes.'),
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email,
        ...(storeId && { storeId }),
      },
      include: { store: true },
    });

    if (!user) {
      await logLoginAttempt(email, false, ip);
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check store approval
    if (user.role !== 'SUPERADMIN' && user.store && !user.store.isApproved) {
      throw new UnauthorizedError('Your store is pending approval. Please wait for superadmin approval.');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      await logLoginAttempt(email, false, ip);
      throw new UnauthorizedError('Invalid credentials');
    }

    await logLoginAttempt(email, true, ip);

    // Generate access token
    const token = generateToken({
      userId: user.id,
      storeId: user.storeId,
      email: user.email,
      role: user.role,
    });

    // Generate refresh token (opaque, stored as SHA-256 hash)
    const { rawToken: refreshToken, tokenHash: refreshTokenHash } = generateVerificationToken();
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash, refreshTokenExpiry: refreshExpiry },
    });

    const responseBody = successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        storeId: user.storeId,
      },
      token,
      store: user.store,
    });

    const response = NextResponse.json(responseBody);

    // Access token cookie (2h)
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 2,
      path: '/',
    });

    // Refresh token cookie (7 days, scoped to the refresh endpoint only)
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/api/auth/refresh',
    });

    return response;
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