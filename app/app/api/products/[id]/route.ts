import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        manufacturer: {
          select: {
            id: true,
            name: true,
            verified: true,
            website: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get related products from the same manufacturer
    const relatedProducts = await prisma.product.findMany({
      where: {
        manufacturerId: product.manufacturerId,
        id: { not: product.id },
      },
      take: 6,
      select: {
        id: true,
        name: true,
        price: true,
        compareAtPrice: true,
        imageUrl: true,
        inStock: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        relatedProducts,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
