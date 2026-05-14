import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getTokenFromHeader, verifyToken } from '@/lib/auth/jwt';
import { errorResponse } from '@/lib/utils/response';

/**
 * GET /api/users/[id]/export
 *
 * GDPR Article 20 — Right to Data Portability.
 *
 * Returns all personal data held for the user as a JSON download.
 * Covers: profile, orders, and audit log entries attributed to this user.
 *
 * A user may export their own data. ADMIN (same store) and SUPERADMIN may
 * export any user within their scope.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params;

  const token =
    getTokenFromHeader(request.headers.get('authorization') ?? '') ??
    request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json(errorResponse('UNAUTHORIZED', 'Authentication required'), { status: 401 });
  }

  const caller = verifyToken(token);
  if (!caller) {
    return NextResponse.json(errorResponse('UNAUTHORIZED', 'Invalid token'), { status: 401 });
  }

  // Fetch target user (verify existence + storeId for tenancy check)
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, storeId: true },
  });

  if (!targetUser) {
    return NextResponse.json(errorResponse('NOT_FOUND', 'User not found'), { status: 404 });
  }

  const isSelf = caller.userId === targetUserId;
  const isAdmin = caller.role === 'ADMIN' && caller.storeId === targetUser.storeId;
  const isSuperadmin = caller.role === 'SUPERADMIN';

  if (!isSelf && !isAdmin && !isSuperadmin) {
    return NextResponse.json(errorResponse('FORBIDDEN', 'Insufficient permissions'), { status: 403 });
  }

  // Collect all personal data
  const [profile, orders, auditLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storeId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Exclude password, refreshTokenHash
      },
    }),
    prisma.order.findMany({
      where: { staffId: targetUserId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        paymentMethod: true,
        createdAt: true,
        completedAt: true,
        items: {
          select: { name: true, quantity: true, unitPrice: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      where: { userId: targetUserId },
      select: {
        id: true,
        action: true,
        resource: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    dataSubject: targetUserId,
    profile,
    orders,
    auditActivity: auditLogs,
  };

  const json = JSON.stringify(exportData, null, 2);

  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="user-data-${targetUserId}.json"`,
    },
  });
}
