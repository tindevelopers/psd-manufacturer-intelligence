import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id },
      include: {
        products: {
          take: 20,
          orderBy: { updatedAt: 'desc' },
        },
        knowledge: true,
        catalogProducts: {
          take: 50,
          orderBy: { scrapedAt: 'desc' },
        },
        scrapeJobs: {
          take: 5,
          orderBy: { startedAt: 'desc' },
        },
        _count: {
          select: {
            products: true,
            catalogProducts: true,
          },
        },
      },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { success: false, error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: manufacturer });
  } catch (error) {
    console.error('Error fetching manufacturer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch manufacturer' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const manufacturer = await prisma.manufacturer.update({
      where: { id },
      data: {
        website: body.website,
        email: body.email,
        phone: body.phone,
        address: body.address,
        description: body.description,
      },
    });

    return NextResponse.json({ success: true, data: manufacturer });
  } catch (error) {
    console.error('Error updating manufacturer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update manufacturer' },
      { status: 500 }
    );
  }
}
