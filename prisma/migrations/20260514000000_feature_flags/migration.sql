-- AlterTable: add printedForKitchen column to Order
ALTER TABLE "Order" ADD COLUMN "printedForKitchen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: StoreFeature (per-store feature flags)
CREATE TABLE "StoreFeature" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreFeature_storeId_flagKey_key" ON "StoreFeature"("storeId", "flagKey");
CREATE INDEX "StoreFeature_storeId_idx" ON "StoreFeature"("storeId");

-- AddForeignKey
ALTER TABLE "StoreFeature" ADD CONSTRAINT "StoreFeature_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
