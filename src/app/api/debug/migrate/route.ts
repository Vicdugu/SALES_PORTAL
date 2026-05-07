import { NextRequest, NextResponse } from 'next/server';
import { runMigrations } from '@/lib/db/migrations';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Running full migration test');
    
    const result = await runMigrations();
    
    console.log('[DEBUG] Migration result:', result);
    
    return NextResponse.json({
      success: true,
      migrationResult: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DEBUG] Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      code: error?.code,
      meta: error?.meta,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
