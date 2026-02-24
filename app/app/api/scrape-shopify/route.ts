
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ShopifyClient } from '@/lib/shopify-client';
import { decrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

// Sanitize HTML description by removing promotional links
function sanitizeDescriptionHtml(html: string | null): string | null {
  if (!html) return null;
  
  // Remove "Click HERE" promotional links and their containing elements
  let sanitized = html
    // Remove anchor tags containing "Click HERE" (case insensitive)
    .replace(/<a[^>]*>[\s\S]*?Click\s+HERE[\s\S]*?<\/a>/gi, '')
    // Remove standalone "Click HERE to see all..." text patterns
    .replace(/Click\s+HERE\s+to\s+see\s+all[^<]*/gi, '')
    // Remove empty paragraphs that might be left over
    .replace(/<p>\s*<\/p>/gi, '')
    // Remove multiple consecutive line breaks
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
    // Trim whitespace
    .trim();
  
  return sanitized || null;
}

export async function POST(request: NextRequest) {
  try {
    // Get Shopify settings directly from database (avoid internal fetch which causes SSL issues)
    const shopifySettings = await prisma.setting.findMany({
      where: { category: 'shopify', isActive: true }
    });
    
    if (!shopifySettings || shopifySettings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Shopify credentials not configured' },
        { status: 400 }
      );
    }

    const settings: Record<string, string> = {};
    shopifySettings.forEach((setting) => {
      const key = setting.key.replace('shopify_', '');
      // Decrypt if encrypted
      settings[key] = setting.isEncrypted && setting.value ? decrypt(setting.value) : (setting.value || '');
    });

    if (!settings.shop_name || !settings.access_token) {
      return NextResponse.json(
        { success: false, error: 'Missing required Shopify credentials. Please reconnect to Shopify in Settings.' },
        { status: 400 }
      );
    }

    // Create scraping job
    const job = await prisma.scrapingJob.create({
      data: {
        status: 'running',
        jobType: 'shopify_sync',
        targetUrl: `https://${settings.shop_name}.myshopify.com`,
        startedAt: new Date(),
      },
    });

    // Initialize Shopify client
    const shopifyClient = new ShopifyClient({
      shopName: settings.shop_name,
      apiKey: settings.api_key,
      apiSecret: settings.api_secret,
      accessToken: settings.access_token,
    });

    let manufacturersFound = 0;
    let productsFound = 0;
    let error: string | null = null;

    try {
      // Test connection first
      const connectionTest = await shopifyClient.testConnection();
      if (!connectionTest.success) {
        throw new Error(connectionTest.error || 'Failed to connect to Shopify');
      }

      // Get all vendors (manufacturers)
      const vendors = await shopifyClient.getVendors();
      
      for (const vendorName of vendors) {
        try {
          // Create or update manufacturer
          const manufacturer = await prisma.manufacturer.upsert({
            where: { name: vendorName },
            update: {
              lastScraped: new Date(),
              updatedAt: new Date(),
            },
            create: {
              name: vendorName,
              description: `Manufacturer sourced from Shopify store: ${settings.shop_name}`,
              website: `https://${settings.shop_name}.myshopify.com`,
              verified: true,
              lastScraped: new Date(),
            },
          });

          manufacturersFound++;

          // Get products for this vendor
          const vendorProducts = await shopifyClient.getProductsByVendor(vendorName);
          
          for (const shopifyProduct of vendorProducts) {
            try {
              // Prepare images array
              const images = shopifyProduct.images?.map(img => ({
                src: img.src,
                alt: img.alt || shopifyProduct.title,
                width: img.width,
                height: img.height,
                position: img.position,
              })) || [];

              // Get primary variant data
              const primaryVariant = shopifyProduct.variants?.[0];
              const compareAtPrice = primaryVariant?.compare_at_price ? parseFloat(primaryVariant.compare_at_price) : null;
              const inventoryQuantity = primaryVariant?.inventory_quantity || 0;
              
              // Build Shopify product URL
              const shopifyProductUrl = `https://${settings.shop_name}.myshopify.com/products/${shopifyProduct.handle}`;

              // Sanitize the HTML description to remove promotional links
              const cleanHtml = sanitizeDescriptionHtml(shopifyProduct.body_html);
              
              // Common product data
              const productData = {
                name: shopifyProduct.title,
                description: cleanHtml?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null,
                descriptionHtml: cleanHtml,
                price: primaryVariant?.price ? parseFloat(primaryVariant.price) : null,
                compareAtPrice: compareAtPrice,
                currency: 'USD',
                imageUrl: images[0]?.src || null,
                images: images.length > 0 ? images : undefined,
                sku: primaryVariant?.sku || null,
                inStock: inventoryQuantity > 0,
                inventoryQuantity: inventoryQuantity,
                shopifyId: String(shopifyProduct.id),
                shopifyHandle: shopifyProduct.handle,
                shopifyProductUrl: shopifyProductUrl,
                category: shopifyProduct.product_type || null,
                tags: shopifyProduct.tags ? shopifyProduct.tags.split(',').map(tag => tag.trim()) : [],
                weight: primaryVariant?.weight || null,
                weightUnit: primaryVariant?.weight_unit || null,
                specifications: {
                  variants: shopifyProduct.variants?.length || 0,
                  status: shopifyProduct.status,
                  options: shopifyProduct.options?.map(o => ({ name: o.name, values: o.values })) || [],
                  createdAt: shopifyProduct.created_at,
                  updatedAt: shopifyProduct.updated_at,
                },
                updatedAt: new Date(),
              };

              // Use upsert with shopifyId for more reliable deduplication
              await prisma.product.upsert({
                where: { shopifyId: String(shopifyProduct.id) },
                update: productData,
                create: {
                  ...productData,
                  manufacturerId: manufacturer.id,
                },
              });

              productsFound++;
            } catch (productError) {
              console.error(`Error processing product ${shopifyProduct.title}:`, productError);
            }
          }
        } catch (vendorError) {
          console.error(`Error processing vendor ${vendorName}:`, vendorError);
        }
      }

      // Update job as completed
      await prisma.scrapingJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          manufacturersFound,
          productsFound,
          progress: 100,
          totalItems: vendors.length,
        },
      });

    } catch (scrapingError) {
      error = scrapingError instanceof Error ? scrapingError.message : 'Unknown scraping error';
      
      // Update job as failed
      await prisma.scrapingJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error,
          manufacturersFound,
          productsFound,
        },
      });
    }

    return NextResponse.json({
      success: error === null,
      data: {
        jobId: job.id,
        manufacturersFound,
        productsFound,
        error,
      },
    });

  } catch (error) {
    console.error('Error in Shopify scraping:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
