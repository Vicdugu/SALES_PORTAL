-- AlterEnum: add ORDER_PENDING, ORDER_IN_PROGRESS, ORDER_COMPLETED
-- Prisma-safe approach: rename → recreate → migrate data → drop old

ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";

CREATE TYPE "NotificationType" AS ENUM (
  'LOW_STOCK',
  'ORDER_READY',
  'SYSTEM_ALERT',
  'PAYMENT_ERROR',
  'ORDER_PENDING',
  'ORDER_IN_PROGRESS',
  'ORDER_COMPLETED'
);

ALTER TABLE "Notification"
  ALTER COLUMN "type" TYPE "NotificationType"
  USING ("type"::text::"NotificationType");

DROP TYPE "NotificationType_old";

-- AlterTable: add link and category columns
ALTER TABLE "Notification" ADD COLUMN "link" TEXT;
ALTER TABLE "Notification" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'order';
