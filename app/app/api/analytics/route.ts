import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch all products for analysis
    const products = await prisma.product.findMany({
      select: {
        id: true,
        price: true,
        compareAtPrice: true,
        inStock: true,
        inventoryQuantity: true,
        category: true,
        manufacturerId: true,
        manufacturer: {
          select: {
            name: true,
          },
        },
      },
    });

    // Stock Analysis
    const totalProducts = products.length;
    const inStockCount = products.filter((p) => p.inStock).length;
    const outOfStockCount = totalProducts - inStockCount;
    const stockPercentage = totalProducts > 0 ? Math.round((inStockCount / totalProducts) * 100) : 0;

    // Inventory Quantity Breakdown
    const withInventory = products.filter((p) => p.inventoryQuantity !== null);
    const totalInventory = withInventory.reduce((sum, p) => sum + (p.inventoryQuantity || 0), 0);
    const avgInventory = withInventory.length > 0 ? Math.round(totalInventory / withInventory.length) : 0;
    
    // Inventory level buckets
    const inventoryLevels = {
      outOfStock: products.filter((p) => !p.inStock || p.inventoryQuantity === 0).length,
      lowStock: products.filter((p) => p.inventoryQuantity && p.inventoryQuantity > 0 && p.inventoryQuantity <= 5).length,
      mediumStock: products.filter((p) => p.inventoryQuantity && p.inventoryQuantity > 5 && p.inventoryQuantity <= 20).length,
      highStock: products.filter((p) => p.inventoryQuantity && p.inventoryQuantity > 20).length,
    };

    // Price Analysis
    const prices = products.map((p) => p.price).filter((p): p is number => p !== null);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    // Price ranges
    const priceRanges = [
      { range: "$0 - $10", min: 0, max: 10 },
      { range: "$10 - $25", min: 10, max: 25 },
      { range: "$25 - $50", min: 25, max: 50 },
      { range: "$50 - $100", min: 50, max: 100 },
      { range: "$100 - $200", min: 100, max: 200 },
      { range: "$200+", min: 200, max: Infinity },
    ].map((r) => ({
      range: r.range,
      count: prices.filter((p) => p >= r.min && p < r.max).length,
    }));

    // Discount Analysis (compareAtPrice)
    const discountedProducts = products.filter(
      (p) => p.compareAtPrice && p.price && p.compareAtPrice > p.price
    );
    const discountCount = discountedProducts.length;
    const discountPercentage = totalProducts > 0 ? Math.round((discountCount / totalProducts) * 100) : 0;
    
    const avgDiscount = discountedProducts.length > 0
      ? discountedProducts.reduce((sum, p) => {
          const discount = ((p.compareAtPrice! - p.price!) / p.compareAtPrice!) * 100;
          return sum + discount;
        }, 0) / discountedProducts.length
      : 0;

    // Category Distribution
    const categoryMap = new Map<string, number>();
    products.forEach((p) => {
      const cat = p.category || "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    const categoryDistribution = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Manufacturer Distribution
    const manufacturerMap = new Map<string, { count: number; inStock: number; value: number }>();
    products.forEach((p) => {
      const name = p.manufacturer?.name || "Unknown";
      const existing = manufacturerMap.get(name) || { count: 0, inStock: 0, value: 0 };
      manufacturerMap.set(name, {
        count: existing.count + 1,
        inStock: existing.inStock + (p.inStock ? 1 : 0),
        value: existing.value + (p.price || 0),
      });
    });
    const manufacturerDistribution = Array.from(manufacturerMap.entries())
      .map(([name, data]) => ({
        name,
        productCount: data.count,
        inStockCount: data.inStock,
        totalValue: Math.round(data.value * 100) / 100,
        stockRate: data.count > 0 ? Math.round((data.inStock / data.count) * 100) : 0,
      }))
      .sort((a, b) => b.productCount - a.productCount)
      .slice(0, 10);

    // Top discounted products
    const topDiscounts = discountedProducts
      .map((p) => ({
        id: p.id,
        discount: Math.round(((p.compareAtPrice! - p.price!) / p.compareAtPrice!) * 100),
        originalPrice: p.compareAtPrice,
        salePrice: p.price,
      }))
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalProducts,
          inStockCount,
          outOfStockCount,
          stockPercentage,
          totalInventory,
          avgInventory,
        },
        inventoryLevels,
        pricing: {
          avgPrice: Math.round(avgPrice * 100) / 100,
          minPrice,
          maxPrice,
          priceRanges,
        },
        discounts: {
          discountCount,
          discountPercentage,
          avgDiscount: Math.round(avgDiscount * 10) / 10,
          topDiscounts,
        },
        categoryDistribution,
        manufacturerDistribution,
      },
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
