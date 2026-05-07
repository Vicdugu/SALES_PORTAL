import { NextRequest, NextResponse } from 'next/server';
import { runMigrations } from '@/lib/db/migrations';

export async function GET(request: NextRequest) {
  try {
    console.log('[FULLDEBUG] Running FULL migration with detailed logging');
    
    // Force re-run migration
    const result = await runMigrations();
    
    console.log('[FULLDEBUG] Full migration result:', result);
    
    return NextResponse.json({
      success: true,
      migrationResult: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[FULLDEBUG] Full migration error:', error?.message);
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      code: error?.code,
      details: error?.meta,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
