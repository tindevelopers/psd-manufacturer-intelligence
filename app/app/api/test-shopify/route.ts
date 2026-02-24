
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { shopName, accessToken, url } = body;

    // If no direct credentials provided, load from settings
    if (!accessToken) {
      const settings = await prisma.setting.findMany({
        where: {
          category: 'shopify',
          key: {
            in: ['shopify_shop_name', 'shopify_access_token'],
          },
        },
      });

      const settingsMap: Record<string, string> = {};
      settings.forEach((s) => {
        const key = s.key.replace('shopify_', '');
        settingsMap[key] = s.isEncrypted && s.value ? decrypt(s.value) : s.value || '';
      });

      shopName = shopName || settingsMap.shop_name;
      accessToken = settingsMap.access_token;
    }

    if (!shopName || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Shop name and access token are required' },
        { status: 400 }
      );
    }

    // Build URL if not provided
    const testUrl = url || `https://${shopName}.myshopify.com/admin/api/2024-01/shop.json`;

    // Test connection to Shopify API
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        data: {
          shop: data.shop?.name || 'Connected',
          domain: data.shop?.domain,
          plan: data.shop?.plan_name,
        },
      });
    } else {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `Shopify API error: ${response.status} - ${errorText}`,
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Error testing Shopify connection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test connection' },
      { status: 500 }
    );
  }
}
