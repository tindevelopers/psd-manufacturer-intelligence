
interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;  // URL slug for the product
  created_at: string;
  updated_at: string;
  published_at: string;
  template_suffix: string;
  status: string;
  published_scope: string;
  tags: string;
  admin_graphql_api_id: string;
  variants: Array<{
    id: number;
    product_id: number;
    title: string;
    price: string;
    sku: string;
    position: number;
    inventory_policy: string;
    compare_at_price: string;
    fulfillment_service: string;
    inventory_management: string;
    option1: string;
    option2: string;
    option3: string;
    created_at: string;
    updated_at: string;
    taxable: boolean;
    barcode: string;
    grams: number;
    image_id: number;
    weight: number;
    weight_unit: string;
    inventory_item_id: number;
    inventory_quantity: number;
    old_inventory_quantity: number;
    requires_shipping: boolean;
    admin_graphql_api_id: string;
  }>;
  options: Array<{
    id: number;
    product_id: number;
    name: string;
    position: number;
    values: string[];
  }>;
  images: Array<{
    id: number;
    product_id: number;
    position: number;
    created_at: string;
    updated_at: string;
    alt: string;
    width: number;
    height: number;
    src: string;
    variant_ids: number[];
  }>;
}

interface ShopifySettings {
  shopName: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
}

export class ShopifyClient {
  private shopName: string;
  private accessToken: string;
  private baseUrl: string;

  constructor(settings: ShopifySettings) {
    this.shopName = settings.shopName;
    this.accessToken = settings.accessToken;
    this.baseUrl = `https://${settings.shopName}.myshopify.com/admin/api/2024-01`;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} - ${await response.text()}`);
    }

    return response.json();
  }

  async getProducts(limit = 250, pageInfo?: string): Promise<{ products: ShopifyProduct[]; nextPageInfo?: string }> {
    let endpoint: string;
    
    if (pageInfo) {
      // When using page_info, only limit can be included - no other parameters
      endpoint = `/products.json?limit=${limit}&page_info=${pageInfo}`;
    } else {
      endpoint = `/products.json?limit=${limit}&status=active`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    
    // Parse Link header for cursor-based pagination
    const linkHeader = response.headers.get('Link');
    let nextPageInfo: string | undefined;
    
    if (linkHeader) {
      // Link header format: <url>; rel="next", <url>; rel="previous"
      const links = linkHeader.split(',');
      for (const link of links) {
        if (link.includes('rel="next"')) {
          const match = link.match(/page_info=([^>&]+)/);
          if (match) {
            nextPageInfo = match[1];
          }
        }
      }
    }
    
    return {
      products: data.products || [],
      nextPageInfo,
    };
  }

  async getAllProducts(): Promise<ShopifyProduct[]> {
    const allProducts: ShopifyProduct[] = [];
    let pageInfo: string | undefined;
    let hasNextPage = true;
    let pageCount = 0;
    const maxPages = 100; // Safety limit to prevent infinite loops

    console.log('Starting to fetch all products from Shopify...');

    while (hasNextPage && pageCount < maxPages) {
      try {
        const result = await this.getProducts(250, pageInfo);
        allProducts.push(...result.products);
        pageCount++;
        
        console.log(`Fetched page ${pageCount}: ${result.products.length} products (total: ${allProducts.length})`);
        
        // Check if there are more pages using cursor-based pagination
        if (result.nextPageInfo) {
          pageInfo = result.nextPageInfo;
          hasNextPage = true;
        } else {
          hasNextPage = false;
        }
        
        // Rate limiting - Shopify allows 2 requests per second
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error fetching products:', error);
        break;
      }
    }

    console.log(`Finished fetching products. Total: ${allProducts.length} products from ${pageCount} pages`);
    return allProducts;
  }

  // Cache products to avoid re-fetching for each vendor
  private cachedProducts: ShopifyProduct[] | null = null;

  async getAllProductsCached(): Promise<ShopifyProduct[]> {
    if (!this.cachedProducts) {
      this.cachedProducts = await this.getAllProducts();
    }
    return this.cachedProducts;
  }

  clearCache(): void {
    this.cachedProducts = null;
  }

  async getVendors(): Promise<string[]> {
    try {
      const products = await this.getAllProductsCached();
      const vendors = new Set<string>();
      
      products.forEach(product => {
        if (product.vendor && product.vendor.trim()) {
          vendors.add(product.vendor.trim());
        }
      });
      
      console.log(`Found ${vendors.size} unique vendors from ${products.length} products`);
      return Array.from(vendors).sort();
    } catch (error) {
      console.error('Error getting vendors:', error);
      return [];
    }
  }

  async getProductsByVendor(vendorName: string): Promise<ShopifyProduct[]> {
    try {
      const products = await this.getAllProductsCached();
      return products.filter(product => 
        product.vendor && product.vendor.trim().toLowerCase() === vendorName.trim().toLowerCase()
      );
    } catch (error) {
      console.error('Error getting products by vendor:', error);
      return [];
    }
  }

  async testConnection(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const data = await this.makeRequest('/shop.json');
      return {
        success: true,
        data: {
          shop: data.shop?.name,
          domain: data.shop?.domain,
          plan: data.shop?.plan_name,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export async function createShopifyClient(): Promise<ShopifyClient | null> {
  try {
    // This would typically fetch from your settings API
    const response = await fetch('/api/settings?category=shopify');
    const result = await response.json();
    
    if (!result.success || !result.data || result.data.length === 0) {
      return null;
    }

    const settings: Record<string, string> = {};
    result.data.forEach((setting: any) => {
      const key = setting.key.replace('shopify_', '');
      settings[key] = setting.value || '';
    });

    if (!settings.shop_name || !settings.access_token) {
      return null;
    }

    return new ShopifyClient({
      shopName: settings.shop_name,
      apiKey: settings.api_key,
      apiSecret: settings.api_secret,
      accessToken: settings.access_token,
    });
  } catch (error) {
    console.error('Error creating Shopify client:', error);
    return null;
  }
}
