import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * GET /api/auth/me
 * Returns the currently authenticated user and their store, reading from the
 * httpOnly auth_token cookie (or Authorization header for API clients).
 */
export async function GET(request: NextRequest) {
  // Prefer cookie; fall back to Authorization header
  const cookieToken = request.cookies.get('auth_token')?.value;
  const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const token = cookieToken ?? headerToken;

  if (!token) {
    return NextResponse.json(null, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(null, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { store: true },
    });

    if (!user) {
      return NextResponse.json(null, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        storeId: user.storeId,
      },
      store: user.store,
    });
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
