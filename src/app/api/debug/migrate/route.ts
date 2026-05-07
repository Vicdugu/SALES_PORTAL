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
  `;
}

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Detailed migration test');
    
    const prismaClient = getPrisma();
    const sql = await getMigrationSQL();
    
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--'));
    
    console.log(`[DEBUG] Found ${statements.length} statements`);
    
    const results = [];
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
      
      try {
        console.log(`[DEBUG] Executing statement ${i + 1}: ${preview}`);
        await prismaClient.$executeRawUnsafe(stmt);
        results.push({
          index: i + 1,
          status: 'success',
          preview,
          fullStatement: stmt.substring(0, 200),
        });
        console.log(`[DEBUG] ✓ Statement ${i + 1} succeeded`);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        results.push({
          index: i + 1,
          status: 'error',
          preview,
          error: errorMsg,
          fullStatement: stmt.substring(0, 200),
        });
        console.error(`[DEBUG] ✗ Statement ${i + 1} failed:`, errorMsg);
        
        // Continue with next statement
        if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate')) {
          console.log('[DEBUG] Stopping due to error (not "already exists")');
          break;
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      totalStatements: statements.length,
      executedStatements: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
