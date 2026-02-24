import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Export products and manufacturers in a format optimized for chatbot RAG
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json"; // json, markdown, or csv

    // Fetch all products with manufacturer info
    const products = await prisma.product.findMany({
      where: {
        inStock: true, // Only include in-stock products for recommendations
      },
      include: {
        manufacturer: {
          select: {
            id: true,
            name: true,
            website: true,
            verified: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Fetch all manufacturers with product counts
    const manufacturers = await prisma.manufacturer.findMany({
      include: {
        _count: {
          select: { products: true },
        },
        knowledge: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Get categories
    const categories = await prisma.product.groupBy({
      by: ["category"],
      where: {
        category: { not: null },
      },
      _count: true,
    });

    if (format === "markdown") {
      const markdown = generateMarkdown(products, manufacturers, categories);
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": "attachment; filename=psd-product-catalog.md",
        },
      });
    }

    if (format === "csv") {
      const csv = generateCSV(products);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=psd-products.csv",
        },
      });
    }

    // Default: JSON format
    const jsonData = {
      exportDate: new Date().toISOString(),
      summary: {
        totalProducts: products.length,
        totalManufacturers: manufacturers.length,
        totalCategories: categories.length,
      },
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        category: p.category,
        description: cleanDescription(p.description),
        inStock: p.inStock,
        inventoryQuantity: p.inventoryQuantity,
        manufacturer: p.manufacturer?.name || "Unknown",
        manufacturerVerified: p.manufacturer?.verified || false,
        tags: p.tags,
        shopifyUrl: p.shopifyProductUrl,
      })),
      manufacturers: manufacturers.map((m) => ({
        id: m.id,
        name: m.name,
        website: m.website,
        verified: m.verified,
        productCount: m._count.products,
        description: m.knowledge?.companyOverview || m.description,
        certifications: m.knowledge?.certifications,
        productCategories: m.knowledge?.productCategories,
      })),
      categories: categories.map((c) => ({
        name: c.category,
        productCount: c._count,
      })),
    };

    return NextResponse.json(jsonData);
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}

function cleanDescription(desc: string | null): string {
  if (!desc) return "";
  // Remove HTML tags and clean up
  return desc
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 500); // Limit length for chatbot context
}

function generateMarkdown(
  products: any[],
  manufacturers: any[],
  categories: any[]
): string {
  let md = `# PetStore.Direct Product Catalog\n\n`;
  md += `*Last updated: ${new Date().toLocaleDateString()}*\n\n`;
  md += `This catalog contains ${products.length} products from ${manufacturers.length} trusted manufacturers.\n\n`;

  // Categories overview
  md += `## Product Categories\n\n`;
  categories.forEach((c) => {
    md += `- **${c.category}**: ${c._count} products\n`;
  });
  md += `\n`;

  // Manufacturers
  md += `## Our Manufacturers\n\n`;
  manufacturers.forEach((m) => {
    md += `### ${m.name}${m.verified ? " ✓" : ""}\n`;
    if (m.knowledge?.companyOverview) {
      md += `${m.knowledge.companyOverview}\n`;
    } else if (m.description) {
      md += `${m.description}\n`;
    }
    md += `- Products available: ${m._count.products}\n`;
    if (m.website) md += `- Website: ${m.website}\n`;
    if (m.knowledge?.certifications?.length) {
      md += `- Certifications: ${m.knowledge.certifications.join(", ")}\n`;
    }
    md += `\n`;
  });

  // Products by category
  md += `## Products\n\n`;
  const productsByCategory = products.reduce((acc, p) => {
    const cat = p.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  Object.entries(productsByCategory).forEach(([category, prods]) => {
    md += `### ${category}\n\n`;
    (prods as any[]).forEach((p) => {
      md += `#### ${p.name}\n`;
      md += `- **Price**: $${p.price?.toFixed(2) || "N/A"}`;
      if (p.compareAtPrice && p.compareAtPrice > p.price) {
        md += ` (was $${p.compareAtPrice.toFixed(2)})`;
      }
      md += `\n`;
      md += `- **SKU**: ${p.sku || "N/A"}\n`;
      md += `- **Brand**: ${p.manufacturer?.name || "Unknown"}\n`;
      md += `- **In Stock**: ${p.inStock ? "Yes" : "No"}`;
      if (p.inventoryQuantity) md += ` (${p.inventoryQuantity} available)`;
      md += `\n`;
      if (p.description) {
        md += `- **Description**: ${cleanDescription(p.description)}\n`;
      }
      if (p.tags) {
        md += `- **Tags**: ${p.tags}\n`;
      }
      md += `\n`;
    });
  });

  return md;
}

function generateCSV(products: any[]): string {
  const headers = [
    "Name",
    "SKU",
    "Price",
    "Compare At Price",
    "Category",
    "Manufacturer",
    "In Stock",
    "Inventory",
    "Description",
    "Tags",
  ];

  const rows = products.map((p) => [
    `"${(p.name || "").replace(/"/g, '""')}"`,
    `"${p.sku || ""}"`,
    p.price || "",
    p.compareAtPrice || "",
    `"${p.category || ""}"`,
    `"${p.manufacturer?.name || ""}"`,
    p.inStock ? "Yes" : "No",
    p.inventoryQuantity || "",
    `"${cleanDescription(p.description).replace(/"/g, '""')}"`,
    `"${p.tags || ""}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
