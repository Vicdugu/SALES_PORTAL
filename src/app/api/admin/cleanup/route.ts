import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getTokenFromHeader, verifyToken } from '@/lib/auth/jwt';
import { errorResponse, successResponse } from '@/lib/utils/response';

/**
 * POST /api/admin/cleanup
 * SUPERADMIN-only endpoint that removes stale records per the data retention policy:
 *   - VerificationAttempt rows older than 90 days
 *   - AuditLog rows older than 1 year
 *   - CANCELLED orders older than 7 years
 *
 * Can be triggered manually or via Vercel cron (see vercel.json).
 */
export async function POST(request: NextRequest) {
  // Authenticate — SUPERADMIN only
  const authHeader = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-cron-secret');

  let isSuperadmin = false;

  // Allow Vercel cron calls authenticated with CRON_SECRET
  if (cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET) {
    isSuperadmin = true;
  } else {
    const token = getTokenFromHeader(authHeader ?? '') ?? request.cookies.get('auth_token')?.value;
    if (token) {
      const payload = verifyToken(token);
      if (payload?.role === 'SUPERADMIN') isSuperadmin = true;
    }
  }

  if (!isSuperadmin) {
    return NextResponse.json(errorResponse('FORBIDDEN', 'Access denied'), { status: 403 });
  }

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const sevenYearsAgo = new Date(now.getTime() - 7 * 365 * 24 * 60 * 60 * 1000);

  const [deletedAttempts, deletedAuditLogs, deletedOrders] = await Promise.all([
    prisma.verificationAttempt.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } },
    }),
    prisma.auditLog.deleteMany({
      where: { createdAt: { lt: oneYearAgo } },
    }),
    prisma.order.deleteMany({
      where: {
        status: 'CANCELLED',
        createdAt: { lt: sevenYearsAgo },
      },
    }),
  ]);

  return NextResponse.json(
    successResponse({
      deletedVerificationAttempts: deletedAttempts.count,
      deletedAuditLogs: deletedAuditLogs.count,
      deletedOldCancelledOrders: deletedOrders.count,
    })
  );
}
