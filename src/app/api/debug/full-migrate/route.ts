import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db/client';

async function getMigrationSQL(): Promise<string> {
  // This should match exactly what's in src/lib/db/migrations.ts
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
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 100).replace(/\n/g, ' ');
      
      try {
        console.log(`[FULLMIG] Executing [${i + 1}/${statements.length}]: ${preview}`);
        await prismaClient.$executeRawUnsafe(stmt);
        results.push({
          index: i + 1,
          status: 'success',
          preview,
        });
        console.log(`[FULLMIG] ✓ Success`);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        results.push({
          index: i + 1,
          status: 'error',
          preview,
          error: errorMsg.substring(0, 200),
        });
        console.error(`[FULLMIG] ✗ Error:`, errorMsg);
      }
    }
    
    return NextResponse.json({
      success: true,
      totalStatements: statements.length,
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
