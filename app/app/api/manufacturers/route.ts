import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper to check if a website URL is valid (not null, not empty, not Shopify/PetStore placeholder)
function isValidWebsite(website: string | null): boolean {
  if (!website || website.trim() === '') return false;
  const lower = website.toLowerCase();
  return !lower.includes('myshopify.com') && 
         !lower.includes('petstore.direct') && 
         !lower.includes('petstoredirect');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const verified = searchParams.get('verified');
    const websiteStatus = searchParams.get('websiteStatus'); // 'valid', 'invalid', or null for all
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (verified === 'true') {
      where.verified = true;
    } else if (verified === 'false') {
      where.verified = false;
    }
    
    // Website status filter - we need to handle this in application layer
    // since Prisma doesn't support complex string pattern matching easily
    if (websiteStatus === 'valid') {
      where.AND = [
        { website: { not: null } },
        { website: { not: '' } },
        { NOT: { website: { contains: 'myshopify.com' } } },
        { NOT: { website: { contains: 'petstore.direct' } } },
        { NOT: { website: { contains: 'petstoredirect' } } },
      ];
    } else if (websiteStatus === 'invalid') {
      where.OR = where.OR || [];
      // Override OR to filter for invalid websites
      where.AND = [
        {
          OR: [
            { website: null },
            { website: '' },
            { website: { contains: 'myshopify.com' } },
            { website: { contains: 'petstore.direct' } },
            { website: { contains: 'petstoredirect' } },
          ]
        }
      ];
      // Preserve search if it exists
      if (search) {
        where.AND.push({
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        });
        delete where.OR;
      }
    }
    
    const [manufacturers, total] = await Promise.all([
      prisma.manufacturer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { products: true }
          }
        }
      }),
      prisma.manufacturer.count({ where })
    ]);
    
    return NextResponse.json({
      success: true,
      data: manufacturers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch manufacturers' },
      { status: 500 }
    );
  }
}
