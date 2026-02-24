import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Basic counts
    const [totalManufacturers, verifiedManufacturers, totalProducts, inStockProducts, completedJobs] = await Promise.all([
      prisma.manufacturer.count(),
      prisma.manufacturer.count({ where: { verified: true } }),
      prisma.product.count(),
      prisma.product.count({ where: { inStock: true } }),
      prisma.scrapingJob.count({ where: { status: 'completed' } }),
    ]);

    // Top manufacturers by product count
    const topManufacturers = await prisma.manufacturer.findMany({
      take: 6,
      orderBy: {
        products: {
          _count: 'desc'
        }
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    // Recent products (last synced)
    const recentProducts = await prisma.product.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        manufacturer: {
          select: { name: true }
        }
      }
    });

    // Last sync job
    const lastSync = await prisma.scrapingJob.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' },
    });

    // Products by category distribution
    const productsByCategory = await prisma.product.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 6,
    });

    // Stock status breakdown
    const outOfStockProducts = totalProducts - inStockProducts;
    const stockPercentage = totalProducts > 0 ? Math.round((inStockProducts / totalProducts) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        // Core stats
        totalManufacturers,
        verifiedManufacturers,
        totalProducts,
        inStockProducts,
        outOfStockProducts,
        stockPercentage,
        completedSyncJobs: completedJobs,
        
        // Chart data
        topManufacturers: topManufacturers.map(m => ({
          id: m.id,
          name: m.name,
          productCount: m._count.products,
          verified: m.verified,
        })),
        
        productsByCategory: productsByCategory.map(c => ({
          category: c.category || 'Uncategorized',
          count: c._count.id,
        })),
        
        // Recent activity
        recentProducts: recentProducts.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          inStock: p.inStock,
          manufacturer: p.manufacturer?.name || 'Unknown',
          imageUrl: p.imageUrl,
          updatedAt: p.updatedAt,
        })),
        
        // Last sync info
        lastSync: lastSync ? {
          completedAt: lastSync.completedAt,
          productsScraped: lastSync.productsFound,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
