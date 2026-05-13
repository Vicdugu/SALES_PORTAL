/**
 * Notification service — creates a DB record and broadcasts via SSE.
 * Non-fatal: a failure here must never block the main operation.
 */
import { prisma } from '@/lib/db/client';
import { notificationBroadcaster } from '@/lib/realtime/NotificationBroadcaster';

export type NotificationType =
  | 'LOW_STOCK'
  | 'ORDER_READY'
  | 'ORDER_PENDING'
  | 'ORDER_IN_PROGRESS'
  | 'ORDER_COMPLETED'
  | 'SYSTEM_ALERT'
  | 'PAYMENT_ERROR';

function categoryFor(type: NotificationType): string {
  switch (type) {
    case 'LOW_STOCK':
      return 'inventory';
    case 'PAYMENT_ERROR':
      return 'payment';
    case 'SYSTEM_ALERT':
      return 'system';
    default:
      return 'order';
  }
}

export async function createNotification({
  storeId,
  type,
  title,
  message,
  link,
}: {
  storeId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  try {
    const category = categoryFor(type);

    // Use `any` cast because the Prisma client is generated from the pre-migration
    // schema on the developer's machine. After `prisma generate` runs at build time
    // with the updated schema the new enum values and columns will be fully typed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notification = await (prisma.notification.create as (args: any) => Promise<any>)({
      data: {
        storeId,
        type,
        title,
        message,
        link: link ?? null,
        category,
      },
    });

    notificationBroadcaster.broadcast({
      id: notification.id,
      storeId: notification.storeId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      category: notification.category,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('[createNotification] failed (non-fatal):', err);
  }
}
