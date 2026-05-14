-- AlterTable
ALTER TABLE "InventoryItem" ALTER COLUMN "unit" SET DEFAULT 'pieces',
ALTER COLUMN "currentStock" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "passwordResetExpiry" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT;

-- CreateTable
CREATE TABLE "VerificationAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationAttempt_email_idx" ON "VerificationAttempt"("email");

-- CreateIndex
CREATE INDEX "VerificationAttempt_createdAt_idx" ON "VerificationAttempt"("createdAt");
