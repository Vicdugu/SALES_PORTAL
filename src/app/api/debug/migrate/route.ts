import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Simple migration test endpoint called');
    
    const prismaClient = getPrisma();
    
    // Test 1: Try to create a simple enum type
    const testStatements = [
      `CREATE TYPE IF NOT EXISTS "TestRole" AS ENUM ('ADMIN', 'USER');`,
      `DROP TYPE IF EXISTS "TestRole";`,
      `CREATE TABLE IF NOT EXISTS "TestTable" (id TEXT NOT NULL PRIMARY KEY);`,
      `DROP TABLE IF EXISTS "TestTable";`,
    ];
    
    console.log('[DEBUG] Running test statements...');
    const results = [];
    
    for (let i = 0; i < testStatements.length; i++) {
      const stmt = testStatements[i];
      try {
        await prismaClient.$executeRawUnsafe(stmt);
        results.push({ index: i + 1, stmt: stmt.substring(0, 50), status: 'success' });
        console.log(`[DEBUG] ✓ Test ${i + 1}: ${stmt.substring(0, 50)}`);
      } catch (error: any) {
        results.push({ 
          index: i + 1, 
          stmt: stmt.substring(0, 50), 
          status: 'error',
          error: error?.message 
        });
        console.error(`[DEBUG] ✗ Test ${i + 1} failed:`, error?.message);
      }
    }
    
    return NextResponse.json({
      success: true,
      totalTests: testStatements.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DEBUG] Test error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
