-- Migration: per-user notification read/dismiss tracking
-- Replaces the global isRead/readAt columns with a NotificationRead join table.

-- Step 1: Drop the old global read columns from Notification
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "isRead";
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "readAt";

-- Step 2: Drop the old isRead index (column no longer exists)
DROP INDEX IF EXISTS "Notification_isRead_idx";

-- Step 3: Add createdAt index (improves polling queries)
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

-- Step 4: Create per-user read/dismiss table
CREATE TABLE "NotificationRead" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "readAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt"    TIMESTAMP(3),

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- Step 5: Unique constraint — one row per (user, notification)
CREATE UNIQUE INDEX "NotificationRead_userId_notificationId_key"
    ON "NotificationRead"("userId", "notificationId");

-- Step 6: Lookup indexes
CREATE INDEX "NotificationRead_userId_idx"         ON "NotificationRead"("userId");
CREATE INDEX "NotificationRead_notificationId_idx" ON "NotificationRead"("notificationId");

-- Step 7: Foreign key to Notification (cascade delete when notification is removed)
ALTER TABLE "NotificationRead"
    ADD CONSTRAINT "NotificationRead_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
