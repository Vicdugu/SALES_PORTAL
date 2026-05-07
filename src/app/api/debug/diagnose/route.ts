import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db/client';

async function getMigrationSQL(): Promise<string> {
  return `
    CREATE TYPE "Role" AS ENUM ('STAFF', 'KITCHEN', 'ADMIN', 'SUPERADMIN');
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED');
    CREATE TYPE "NotificationType" AS ENUM ('LOW_STOCK', 'ORDER_READY', 'SYSTEM_ALERT', 'PAYMENT_ERROR');
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
    CREATE TABLE IF NOT EXISTS "OrderItem" (
        "id" TEXT NOT NULL,
        "orderId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unitPrice" DOUBLE PRECISION NOT NULL,
        "notes" TEXT,
        CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
    );
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
    CREATE TABLE IF NOT EXISTS "InventoryUsage" (
        "id" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "quantity" DOUBLE PRECISION NOT NULL,
        "reason" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "InventoryUsage_pkey" PRIMARY KEY ("id")
    );
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
  `;
}

export async function GET(request: NextRequest) {
  try {
    const prismaClient = getPrisma();
    const sql = await getMigrationSQL();
    
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--'));
    
    console.log(`[DIAGNOSE] Total statements: ${statements.length}`);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const stmtType = stmt.split(' ').slice(0, 3).join(' ');
      
      try {
        console.log(`[DIAGNOSE] Executing [${i + 1}/${statements.length}] ${stmtType}`);
        await prismaClient.$executeRawUnsafe(stmt);
        results.push({
          index: i + 1,
          type: stmtType,
          status: 'success',
        });
        successCount++;
        console.log(`[DIAGNOSE] ✓ Success`);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        const code = error?.code || 'UNKNOWN';
        
        // Check if idempotent error
        const isIdempotent = errorMsg.includes('already exists') ||
                            errorMsg.includes('duplicate') ||
                            errorMsg.includes('42P07') ||
                            errorMsg.includes('42723') ||
                            errorMsg.includes('42710');
        
        results.push({
          index: i + 1,
          type: stmtType,
          status: isIdempotent ? 'skipped' : 'error',
          error: errorMsg.substring(0, 100),
          code,
        });
        
        if (!isIdempotent) {
          errorCount++;
        }
        
        console.error(`[DIAGNOSE] ✗ ${isIdempotent ? 'Skipped' : 'ERROR'}: ${errorMsg.substring(0, 80)}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      totalStatements: statements.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message,
    }, { status: 500 });
  }
}
