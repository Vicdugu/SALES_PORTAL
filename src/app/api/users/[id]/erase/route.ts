import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getTokenFromHeader, verifyToken } from '@/lib/auth/jwt';
import { errorResponse, successResponse } from '@/lib/utils/response';

/**
 * DELETE /api/users/[id]/erase
 *
 * GDPR Article 17 — Right to Erasure ("right to be forgotten").
 *
 * Pseudonymises the user record rather than hard-deleting, so that
 * referential integrity with orders and audit logs is preserved.
 * The following personal data is removed:
 *   - email → replaced with a non-reversible hash placeholder
 *   - name  → "Deleted User"
 *   - password → invalidated random hash
 *   - refreshTokenHash / refreshTokenExpiry → cleared
 *   - isActive → false
 *
 * Requires ADMIN (same store) or SUPERADMIN.
 * A user may also erase their own account.
 */
export async function DELETE(
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

  // Fetch the target user
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, storeId: true, email: true },
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

  // Pseudonymise — replace PII with non-reversible placeholders
  const erasedEmail = `erased_${targetUserId}@deleted.invalid`;
  const erasedPassword = `erased:${crypto.randomUUID()}`;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: {
        email: erasedEmail,
        name: 'Deleted User',
        password: erasedPassword,
        isActive: false,
        refreshTokenHash: null,
        refreshTokenExpiry: null,
      },
    }),
    prisma.auditLog.create({
      data: {
        storeId: targetUser.storeId ?? caller.storeId ?? '',
        userId: caller.userId,
        action: 'USER_ERASED',
        resource: `USER:${targetUserId}`,
        details: JSON.stringify({
          erasedBy: caller.userId,
          requestedBySelf: isSelf,
          originalEmail: targetUser.email,
        }),
      },
    }),
  ]);

  return NextResponse.json(successResponse({ message: 'User data erased successfully' }));
}
