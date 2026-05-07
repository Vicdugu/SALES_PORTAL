import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db/client';

// EXACT copy of getMigrationSQL from migrations.ts
async function getMigrationSQL(): Promise<string> {
  return `
    -- CreateEnum
    CREATE TYPE "Role" AS ENUM ('STAFF', 'KITCHEN', 'ADMIN', 'SUPERADMIN');

    -- CreateEnum
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED');

    -- CreateEnum
    CREATE TYPE "NotificationType" AS ENUM ('LOW_STOCK', 'ORDER_READY', 'SYSTEM_ALERT', 'PAYMENT_ERROR');

    -- CreateTable Store
    CREATE TABLE IF NOT EXISTS "Store" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "address" TEXT,
        "phone" TEXT,
        "logo" TEXT,
        "backgroundImage" TEXT,
        "primaryColor" TEXT NOT NULL DEFAULT '#000000',
        "secondaryColor" TEXT NOT NULL DEFAULT '#ffffff',
        "accentColor" TEXT NOT NULL DEFAULT '#0066cc',
        "currency" TEXT NOT NULL DEFAULT 'USD',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        "verificationCode" TEXT,
        "verificationCodeExpiry" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable User
    CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'STAFF',
        "storeId" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable StaffMember
    CREATE TABLE IF NOT EXISTS "StaffMember" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "phone" TEXT,
        "address" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable "Order"
    CREATE TABLE IF NOT EXISTS "Order" (
        "id" TEXT NOT NULL,
        "orderNumber" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "staffId" TEXT,
        "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
        "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "paymentMethod" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "completedAt" TIMESTAMP(3),

        CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable OrderItem
    CREATE TABLE IF NOT EXISTS "OrderItem" (
        "id" TEXT NOT NULL,
        "orderId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unitPrice" DOUBLE PRECISION NOT NULL,
        "notes" TEXT,

        CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable InventoryItem
    CREATE TABLE IF NOT EXISTS "InventoryItem" (
        "id" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "unitPrice" DOUBLE PRECISION NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unit" TEXT NOT NULL,
        "currentStock" DOUBLE PRECISION NOT NULL,
        "minimumStock" DOUBLE PRECISION NOT NULL DEFAULT 10,
        "lastRestocked" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable InventoryUsage
    CREATE TABLE IF NOT EXISTS "InventoryUsage" (
        "id" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "quantity" DOUBLE PRECISION NOT NULL,
        "reason" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "InventoryUsage_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable Notification
    CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "type" "NotificationType" NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "readAt" TIMESTAMP(3),

        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable AuditLog
    CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "resource" TEXT NOT NULL,
        "details" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable "Transaction"
    CREATE TABLE IF NOT EXISTS "Transaction" (
        "id" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "orderId" TEXT,
        "amount" DOUBLE PRECISION NOT NULL,
        "currency" TEXT NOT NULL,
        "paymentMethod" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "reference" TEXT,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
    );

    -- CreateIndex
    CREATE UNIQUE INDEX "Store_email_key" ON "Store"("email");
    CREATE INDEX "Store_email_idx" ON "Store"("email");
    CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
    CREATE INDEX "User_storeId_idx" ON "User"("storeId");
    CREATE UNIQUE INDEX "StaffMember_userId_storeId_key" ON "StaffMember"("userId", "storeId");
    CREATE INDEX "StaffMember_storeId_idx" ON "StaffMember"("storeId");
    CREATE INDEX "Order_storeId_idx" ON "Order"("storeId");
    CREATE INDEX "Order_staffId_idx" ON "Order"("staffId");
    CREATE INDEX "Order_status_idx" ON "Order"("status");
    CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
    CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
    CREATE UNIQUE INDEX "InventoryItem_name_storeId_key" ON "InventoryItem"("name", "storeId");
    CREATE INDEX "InventoryItem_storeId_idx" ON "InventoryItem"("storeId");
    CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");
    CREATE INDEX "InventoryUsage_itemId_idx" ON "InventoryUsage"("itemId");
    CREATE INDEX "Notification_storeId_idx" ON "Notification"("storeId");
    CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
    CREATE INDEX "AuditLog_storeId_idx" ON "AuditLog"("storeId");
    CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
    CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
    CREATE INDEX "Transaction_storeId_idx" ON "Transaction"("storeId");

    -- AddForeignKey
    ALTER TABLE "User" ADD CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Order" ADD CONSTRAINT "Order_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `;
}

export async function GET(request: NextRequest) {
  try {
    console.log('[FULLMIG] Starting full migration test');
    
    const prismaClient = getPrisma();
    const sql = await getMigrationSQL();
    
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--'));
    
    console.log(`[FULLMIG] Found ${statements.length} statements`);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 100).replace(/\n/g, ' ');
      
      try {
        console.log(`[FULLMIG] [${i + 1}/${statements.length}]: ${preview}...`);
        await prismaClient.$executeRawUnsafe(stmt);
        results.push({
          index: i + 1,
          status: 'success',
          preview,
        });
        successCount++;
        console.log(`[FULLMIG] ✓ Success`);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        
        // Check if error should be skipped (idempotent)
        const shouldSkip = errorMsg.includes('already exists') || 
                          errorMsg.includes('duplicate') ||
                          errorMsg.includes('42P07') ||
                          errorMsg.includes('42723') ||
                          errorMsg.includes('42710') ||
                          errorMsg.includes('does not exist');
        
        results.push({
          index: i + 1,
          status: shouldSkip ? 'skipped' : 'error',
          preview,
          error: errorMsg.substring(0, 150),
        });
        errorCount++;
        console.error(`[FULLMIG] ✗ ${shouldSkip ? 'Skipped' : 'Error'}: ${errorMsg.substring(0, 100)}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      totalStatements: statements.length,
      successCount,
      errorCount,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[FULLMIG] Error:', error?.message);
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
