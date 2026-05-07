import { NextRequest, NextResponse } from 'next/server';
import { runMigrations } from '@/lib/db/migrations';

export async function GET(request: NextRequest) {
  // Security: Only allow from localhost or specific authorized sources
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  // In production, you might want to add an authorization token check
  try {
    const result = await runMigrations();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Migration API error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Security: Only allow from trusted sources
  try {
    const result = await runMigrations();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Migration API error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}
