import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    const prismaClient = getPrisma();
    
    // Check which tables exist
    const tableCheckSQL = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name NOT LIKE 'pg_%'
      ORDER BY table_name
    `;
    
    const tables = await prismaClient.$queryRawUnsafe(tableCheckSQL) as Array<{table_name: string}>;
    const tableNames = tables.map(t => t.table_name);
    
    return NextResponse.json({
      success: true,
      tableCount: tableNames.length,
      tables: tableNames,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
