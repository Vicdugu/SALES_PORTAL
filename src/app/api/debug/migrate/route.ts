import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Connection test endpoint called');
    
    // Try importing Prisma
    try {
      const { getPrisma } = await import('@/lib/db/client');
      console.log('[DEBUG] ✓ Prisma client imported successfully');
      
      // Try getting the Prisma instance
      const prismaClient = getPrisma();
      console.log('[DEBUG] ✓ Prisma client instantiated');
      
      // Try a basic SQL query that doesn't reference any tables
      await prismaClient.$executeRawUnsafe('SELECT 1');
      console.log('[DEBUG] ✓ Basic SQL query executed');
      
      return NextResponse.json({
        success: true,
        message: 'Prisma connection working',
        timestamp: new Date().toISOString(),
      });
    } catch (prismaError: any) {
      console.error('[DEBUG] Prisma error:', prismaError?.message);
      return NextResponse.json({
        success: false,
        error: 'Prisma error: ' + (prismaError?.message || String(prismaError)),
        stack: prismaError?.stack,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[DEBUG] Endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
