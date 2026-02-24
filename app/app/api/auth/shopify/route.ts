import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

// POST: Client Credentials Grant (Shopify Dev Dashboard - Jan 2026+)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, clientSecret, shopName } = body;

    if (!clientId || !clientSecret || !shopName) {
      return NextResponse.json(
        { error: 'Missing required credentials: clientId, clientSecret, and shopName are all required' },
        { status: 400 }
      );
    }

    // Clean shop name (remove .myshopify.com and protocols if present)
    const cleanShopName = shopName
      .replace('.myshopify.com', '')
      .replace('https://', '')
      .replace('http://', '')
      .trim();

    // Exchange credentials for access token using Client Credentials Grant
    const tokenResponse = await fetch(
      `https://${cleanShopName}.myshopify.com/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials'
        })
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Shopify token exchange failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to authenticate with Shopify. Verify your Client ID and Client Secret are correct.' },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 86400; // Default 24 hours

    // Verify the token by making a test API call
    const shopResponse = await fetch(
      `https://${cleanShopName}.myshopify.com/admin/api/2024-01/shop.json`,
      {
        headers: { 'X-Shopify-Access-Token': accessToken }
      }
    );

    if (!shopResponse.ok) {
      return NextResponse.json(
        { error: 'Token obtained but verification failed. Check that your app has the required API scopes.' },
        { status: 401 }
      );
    }

    const shopData = await shopResponse.json();
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Store all credentials securely
    await Promise.all([
      prisma.setting.upsert({
        where: { key: 'shopify_shop_name' },
        update: { value: cleanShopName, updatedAt: new Date() },
        create: { key: 'shopify_shop_name', value: cleanShopName, category: 'shopify', isEncrypted: false }
      }),
      prisma.setting.upsert({
        where: { key: 'shopify_api_key' },
        update: { value: encrypt(clientId), updatedAt: new Date() },
        create: { key: 'shopify_api_key', value: encrypt(clientId), category: 'shopify', isEncrypted: true }
      }),
      prisma.setting.upsert({
        where: { key: 'shopify_api_secret' },
        update: { value: encrypt(clientSecret), updatedAt: new Date() },
        create: { key: 'shopify_api_secret', value: encrypt(clientSecret), category: 'shopify', isEncrypted: true }
      }),
      prisma.setting.upsert({
        where: { key: 'shopify_access_token' },
        update: { value: encrypt(accessToken), updatedAt: new Date() },
        create: { key: 'shopify_access_token', value: encrypt(accessToken), category: 'shopify', isEncrypted: true }
      }),
      prisma.setting.upsert({
        where: { key: 'shopify_token_expires_at' },
        update: { value: expiresAt, updatedAt: new Date() },
        create: { key: 'shopify_token_expires_at', value: expiresAt, category: 'shopify', isEncrypted: false }
      }),
      prisma.setting.upsert({
        where: { key: 'shopify_connected' },
        update: { value: 'true', updatedAt: new Date() },
        create: { key: 'shopify_connected', value: 'true', category: 'shopify', isEncrypted: false }
      })
    ]);

    return NextResponse.json({
      success: true,
      shop: {
        name: shopData.shop.name,
        domain: shopData.shop.myshopify_domain,
        plan: shopData.shop.plan_display_name,
        owner: shopData.shop.shop_owner
      },
      tokenExpiresAt: expiresAt,
      message: `Successfully connected to ${shopData.shop.name}. Token expires in ~24 hours and will auto-refresh.`
    });

  } catch (error) {
    console.error('Shopify auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// GET: Return info about current connection status
export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        category: 'shopify',
        key: { in: ['shopify_connected', 'shopify_shop_name', 'shopify_token_expires_at'] }
      }
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value || '';
    });

    return NextResponse.json({
      connected: settingsMap.shopify_connected === 'true',
      shopName: settingsMap.shopify_shop_name || null,
      tokenExpiresAt: settingsMap.shopify_token_expires_at || null
    });
  } catch (error) {
    return NextResponse.json({ connected: false, error: 'Failed to check status' }, { status: 500 });
  }
}
