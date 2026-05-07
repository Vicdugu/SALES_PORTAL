import { NextRequest, NextResponse } from 'next/server';
import { runMigrations } from '@/lib/db/migrations';

export async function GET(request: NextRequest) {
  try {
    console.log('[FULLMIG] Starting full migration with runMigrations()');
    
    const result = await runMigrations();
    
    console.log('[FULLMIG] Migration result:', result);
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[FULLMIG] Error:', error?.message);
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      code: error?.code,
      meta: error?.meta,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
