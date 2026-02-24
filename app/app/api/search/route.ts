
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { query, searchType } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial processing status
          const progressData = JSON.stringify({
            status: 'processing',
            message: 'Searching manufacturer database...'
          });
          controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));

          let manufacturers;
          
          if (searchType === 'ai') {
            // AI-powered search (more sophisticated)
            manufacturers = await prisma.manufacturer.findMany({
              where: {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                  { location: { contains: query, mode: 'insensitive' } },
                  {
                    products: {
                      some: {
                        OR: [
                          { name: { contains: query, mode: 'insensitive' } },
                          { description: { contains: query, mode: 'insensitive' } },
                          { category: { contains: query, mode: 'insensitive' } },
                          { tags: { has: query } }
                        ]
                      }
                    }
                  }
                ]
              },
              include: {
                products: {
                  take: 5,
                  select: {
                    id: true,
                    name: true,
                    category: true
                  }
                },
                categories: {
                  include: {
                    category: true
                  }
                }
              },
              take: 20,
              orderBy: [
                { rating: 'desc' },
                { verified: 'desc' },
                { updatedAt: 'desc' }
              ]
            });
          } else {
            // Basic search
            manufacturers = await prisma.manufacturer.findMany({
              where: {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } }
                ]
              },
              include: {
                products: {
                  take: 5,
                  select: {
                    id: true,
                    name: true,
                    category: true
                  }
                },
                categories: {
                  include: {
                    category: true
                  }
                }
              },
              take: 10,
              orderBy: [
                { name: 'asc' }
              ]
            });
          }

          // Transform data for frontend
          const transformedManufacturers = manufacturers.map(manufacturer => ({
            id: manufacturer.id,
            name: manufacturer.name,
            description: manufacturer.description || 'No description available',
            website: manufacturer.website,
            rating: manufacturer.rating,
            category: manufacturer.categories[0]?.category?.name,
            location: manufacturer.location,
            products: manufacturer.products.map(p => p.category).filter(Boolean)
          }));

          // Send completion status
          const completedData = JSON.stringify({
            status: 'completed',
            result: {
              manufacturers: transformedManufacturers,
              total: transformedManufacturers.length,
              searchQuery: query
            }
          });
          controller.enqueue(encoder.encode(`data: ${completedData}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
        } catch (error) {
          console.error('Search error:', error);
          const errorData = JSON.stringify({
            status: 'error',
            message: error instanceof Error ? error.message : 'Search failed'
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
