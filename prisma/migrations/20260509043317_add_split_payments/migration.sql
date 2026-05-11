/*
  Warnings:

  - You are about to drop the column `logo` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_storeId_fkey";

-- AlterTable
ALTER TABLE "Store" DROP COLUMN "logo",
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Transaction";

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advert" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "link" TEXT,
    "caption" TEXT,
    "storeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentRecord_orderId_idx" ON "PaymentRecord"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_orderId_sequence_key" ON "PaymentRecord"("orderId", "sequence");

-- CreateIndex
CREATE INDEX "Advert_storeId_idx" ON "Advert"("storeId");

-- CreateIndex
CREATE INDEX "Advert_isActive_idx" ON "Advert"("isActive");

-- CreateIndex
CREATE INDEX "Advert_order_idx" ON "Advert"("order");

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advert" ADD CONSTRAINT "Advert_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
