import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db/client';

async function getMigrationSQL(): Promise<string> {
  return `
    -- CreateEnum
    CREATE TYPE IF NOT EXISTS "Role" AS ENUM ('STAFF', 'KITCHEN', 'ADMIN', 'SUPERADMIN');

    -- CreateEnum
    CREATE TYPE IF NOT EXISTS "OrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED');

    -- CreateEnum
    CREATE TYPE IF NOT EXISTS "NotificationType" AS ENUM ('LOW_STOCK', 'ORDER_READY', 'SYSTEM_ALERT', 'PAYMENT_ERROR');

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

    -- CreateIndex
    CREATE UNIQUE INDEX IF NOT EXISTS "Store_email_key" ON "Store"("email");
  `;
}

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Migration test endpoint called');
    
    const prismaClient = getPrisma();
    const migrationSQL = await getMigrationSQL();
    
    const statements = migrationSQL
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt && !stmt.startsWith('--'));
    
    console.log(`[DEBUG] Found ${statements.length} statements to execute`);
    
    const results = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 100).replace(/\n/g, ' ');
      
      try {
        await prismaClient.$executeRawUnsafe(statement);
        results.push({
          index: i + 1,
          status: 'success',
          preview,
        });
        console.log(`[DEBUG] ✓ Statement ${i + 1}: ${preview}`);
      } catch (error: any) {
        results.push({
          index: i + 1,
          status: 'error',
          preview,
          error: error?.message || String(error),
        });
        console.error(`[DEBUG] ✗ Statement ${i + 1} failed:`, error?.message);
      }
    }
    
    return NextResponse.json({
      success: true,
      totalStatements: statements.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DEBUG] Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
