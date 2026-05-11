import { prisma } from '@/lib/db/client';
import { verifyToken } from '@/lib/auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: { message: 'Only SuperAdmin can edit adverts' } }, { status: 403 });
    }

    const { id } = await params;
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ error: { message: 'Invalid request body. Image may be too large (max 500KB)' } }, { status: 400 });
    }

    const { title, description, imageUrl, link, caption, isActive } = body;

    const existingAdvert = await prisma.advert.findUnique({ where: { id } });
    if (!existingAdvert) {
      return NextResponse.json({ error: { message: 'Advert not found' } }, { status: 404 });
    }

    const updatedAdvert = await prisma.advert.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(imageUrl && { imageUrl }),
        ...(link !== undefined && { link: link || null }),
        ...(caption !== undefined && { caption: caption || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ data: updatedAdvert });
  } catch (error) {
    console.error('Error updating advert:', error);
    return NextResponse.json({ error: { message: 'Failed to update advert' } }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: { message: 'Only SuperAdmin can delete adverts' } }, { status: 403 });
    }

    const { id } = await params;

    const existingAdvert = await prisma.advert.findUnique({ where: { id } });
    if (!existingAdvert) {
      return NextResponse.json({ error: { message: 'Advert not found' } }, { status: 404 });
    }

    await prisma.advert.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting advert:', error);
    return NextResponse.json({ error: { message: 'Failed to delete advert' } }, { status: 500 });
  }
}
