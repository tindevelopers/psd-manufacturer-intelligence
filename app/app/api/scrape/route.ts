
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ScrapedManufacturer {
  name: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  location?: string;
  category?: string;
  petstoreId?: string;
  sourceUrl?: string;
}

// Simulate scraping petstore.direct (replace with actual scraping logic)
async function scrapePetstoreDirect(): Promise<ScrapedManufacturer[]> {
  // This is a mock implementation. In reality, you would:
  // 1. Make HTTP requests to petstore.direct
  // 2. Parse HTML/JSON responses
  // 3. Extract manufacturer data
  // 4. Handle pagination
  // 5. Respect rate limits
  
  // Mock data for demonstration
  const mockData: ScrapedManufacturer[] = [
    {
      name: "Premium Pet Foods Inc.",
      description: "Leading manufacturer of premium dog and cat food products with organic and natural ingredients.",
      website: "https://premiumpetfoods.com",
      email: "info@premiumpetfoods.com",
      phone: "+1-555-0123",
      location: "California, USA",
      category: "Pet Food",
      petstoreId: "ppf-001",
      sourceUrl: "https://petstore.direct/manufacturers/premium-pet-foods"
    },
    {
      name: "ToyMaster Pet Supplies",
      description: "Innovative pet toy manufacturer specializing in interactive and educational toys for dogs and cats.",
      website: "https://toymaster-pets.com",
      email: "contact@toymaster-pets.com",
      phone: "+1-555-0124",
      location: "Texas, USA",
      category: "Pet Toys",
      petstoreId: "tms-001",
      sourceUrl: "https://petstore.direct/manufacturers/toymaster-supplies"
    },
    {
      name: "Healthy Paws Nutrition",
      description: "Veterinarian-approved pet supplements and health products for optimal pet wellness.",
      website: "https://healthypaws-nutrition.com",
      email: "support@healthypaws-nutrition.com",
      phone: "+1-555-0125",
      location: "New York, USA",
      category: "Pet Health",
      petstoreId: "hpn-001",
      sourceUrl: "https://petstore.direct/manufacturers/healthy-paws"
    },
    {
      name: "Comfort Care Pet Bedding",
      description: "Luxury pet bedding and comfort products made from sustainable and eco-friendly materials.",
      website: "https://comfortcare-pets.com",
      email: "hello@comfortcare-pets.com",
      phone: "+1-555-0126",
      location: "Oregon, USA",
      category: "Pet Accessories",
      petstoreId: "ccp-001",
      sourceUrl: "https://petstore.direct/manufacturers/comfort-care"
    },
    {
      name: "Adventure Gear Pets",
      description: "Outdoor and adventure gear for active pets including harnesses, leashes, and travel accessories.",
      website: "https://adventuregear-pets.com",
      email: "info@adventuregear-pets.com",
      phone: "+1-555-0127",
      location: "Colorado, USA",
      category: "Pet Accessories",
      petstoreId: "agp-001",
      sourceUrl: "https://petstore.direct/manufacturers/adventure-gear"
    }
  ];

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return mockData;
}

export async function POST(request: NextRequest) {
  try {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create scraping job record
          const job = await prisma.scrapingJob.create({
            data: {
              status: 'running',
              jobType: 'full_scrape',
              targetUrl: 'https://petstore.direct',
              progress: 0,
              totalItems: 0
            }
          });

          // Send initial status
          const startData = JSON.stringify({
            status: 'started',
            jobId: job.id,
            message: 'Starting scrape of petstore.direct...'
          });
          controller.enqueue(encoder.encode(`data: ${startData}\n\n`));

          // Scrape data
          const scrapedData = await scrapePetstoreDirect();
          
          // Update progress
          await prisma.scrapingJob.update({
            where: { id: job.id },
            data: { 
              progress: 50,
              totalItems: scrapedData.length 
            }
          });

          const progressData = JSON.stringify({
            status: 'processing',
            progress: 50,
            message: `Found ${scrapedData.length} manufacturers. Saving to database...`
          });
          controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));

          let savedCount = 0;
          let updatedCount = 0;

          // Save manufacturers to database
          for (const manufacturerData of scrapedData) {
            try {
              const existingManufacturer = await prisma.manufacturer.findUnique({
                where: { name: manufacturerData.name }
              });

              if (existingManufacturer) {
                // Update existing manufacturer
                await prisma.manufacturer.update({
                  where: { id: existingManufacturer.id },
                  data: {
                    ...manufacturerData,
                    lastScraped: new Date(),
                    updatedAt: new Date()
                  }
                });
                updatedCount++;
              } else {
                // Create new manufacturer
                await prisma.manufacturer.create({
                  data: {
                    ...manufacturerData,
                    rating: Math.random() * 2 + 3, // Random rating between 3-5
                    verified: Math.random() > 0.3, // 70% chance of being verified
                    lastScraped: new Date()
                  }
                });
                savedCount++;
              }
            } catch (error) {
              console.error(`Error saving manufacturer ${manufacturerData.name}:`, error);
            }
          }

          // Update job completion
          await prisma.scrapingJob.update({
            where: { id: job.id },
            data: {
              status: 'completed',
              progress: 100,
              completedAt: new Date(),
              manufacturersFound: savedCount + updatedCount
            }
          });

          // Send completion status
          const completedData = JSON.stringify({
            status: 'completed',
            jobId: job.id,
            result: {
              totalFound: scrapedData.length,
              newManufacturers: savedCount,
              updatedManufacturers: updatedCount,
              message: `Successfully processed ${savedCount + updatedCount} manufacturers`
            }
          });
          controller.enqueue(encoder.encode(`data: ${completedData}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

        } catch (error) {
          console.error('Scraping error:', error);
          const errorData = JSON.stringify({
            status: 'error',
            message: error instanceof Error ? error.message : 'Scraping failed'
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
    console.error('Scrape API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get scraping jobs status
    const jobs = await prisma.scrapingJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10
    });

    const stats = await prisma.manufacturer.aggregate({
      _count: { id: true },
      _avg: { rating: true }
    });

    return NextResponse.json({
      jobs: jobs.map(job => ({
        id: job.id,
        status: job.status,
        jobType: job.jobType,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        progress: job.progress,
        manufacturersFound: job.manufacturersFound,
        error: job.error
      })),
      stats: {
        totalManufacturers: stats._count.id,
        averageRating: stats._avg.rating
      }
    });

  } catch (error) {
    console.error('Get scrape status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
