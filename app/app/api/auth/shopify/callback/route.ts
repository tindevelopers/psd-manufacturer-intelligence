import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const shop = searchParams.get('shop');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle errors from Shopify
    if (errorParam) {
      console.error('Shopify OAuth error:', errorParam, errorDescription);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=${encodeURIComponent(errorDescription || errorParam)}`
      );
    }

    if (!code || !state || !shop) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=${encodeURIComponent('Missing required OAuth parameters')}`
      );
    }

    // Verify state to prevent CSRF
    const storedState = await prisma.setting.findUnique({
      where: { key: 'shopify_oauth_state' },
    });

    if (!storedState || storedState.value !== state) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=${encodeURIComponent('Invalid OAuth state. Please try again.')}`
      );
    }

    // Get Client ID and Client Secret
    const settings = await prisma.setting.findMany({
      where: {
        category: 'shopify',
        key: {
          in: ['shopify_api_key', 'shopify_api_secret'],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      const key = s.key.replace('shopify_', '');
      settingsMap[key] = s.isEncrypted && s.value ? decrypt(s.value) : s.value || '';
    });

    const clientId = settingsMap.api_key;
    const clientSecret = settingsMap.api_secret;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=${encodeURIComponent('Client credentials not found')}`
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to exchange code for token:', errorText);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=${encodeURIComponent('Failed to obtain access token')}`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=${encodeURIComponent('No access token received')}`
      );
    }

    // Store the access token
    await prisma.setting.upsert({
      where: { key: 'shopify_access_token' },
      update: {
        value: encrypt(accessToken),
        isEncrypted: true,
        updatedAt: new Date(),
      },
      create: {
        key: 'shopify_access_token',
        value: encrypt(accessToken),
        category: 'shopify',
        description: 'Shopify OAuth access token',
        isEncrypted: true,
      },
    });

    // Update shop name from the callback (in case it's different)
    const shopName = shop.replace('.myshopify.com', '');
    await prisma.setting.upsert({
      where: { key: 'shopify_shop_name' },
      update: {
        value: shopName,
        updatedAt: new Date(),
      },
      create: {
        key: 'shopify_shop_name',
        value: shopName,
        category: 'shopify',
        description: 'Shopify store name',
        isEncrypted: false,
      },
    });

    // Clean up the state
    await prisma.setting.delete({
      where: { key: 'shopify_oauth_state' },
    }).catch(() => {}); // Ignore if doesn't exist

    // Redirect back to settings with success
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings?success=${encodeURIComponent('Successfully connected to Shopify!')}`
    );
  } catch (error) {
    console.error('Error in Shopify OAuth callback:', error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings?error=${encodeURIComponent('An error occurred during authentication')}`
    );
  }
}
