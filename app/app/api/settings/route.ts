
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const key = searchParams.get('key');

    let settings;
    
    if (key) {
      // Get specific setting
      settings = await prisma.setting.findUnique({
        where: { key },
        select: {
          id: true,
          key: true,
          value: true,
          category: true,
          description: true,
          isEncrypted: true,
          isActive: true,
          updatedAt: true,
        },
      });
      
      if (settings && settings.isEncrypted && settings.value) {
        settings.value = decrypt(settings.value);
      }
    } else if (category) {
      // Get settings by category
      settings = await prisma.setting.findMany({
        where: { category, isActive: true },
        select: {
          id: true,
          key: true,
          value: true,
          category: true,
          description: true,
          isEncrypted: true,
          isActive: true,
          updatedAt: true,
        },
        orderBy: { key: 'asc' },
      });
      
      // Decrypt encrypted values
      settings = settings.map(setting => ({
        ...setting,
        value: setting.isEncrypted && setting.value ? decrypt(setting.value) : setting.value,
      }));
    } else {
      // Get all settings grouped by category
      settings = await prisma.setting.findMany({
        where: { isActive: true },
        select: {
          id: true,
          key: true,
          value: true,
          category: true,
          description: true,
          isEncrypted: true,
          isActive: true,
          updatedAt: true,
        },
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      });
      
      // Decrypt encrypted values and group by category
      const decryptedSettings = settings.map(setting => ({
        ...setting,
        value: setting.isEncrypted && setting.value ? decrypt(setting.value) : setting.value,
      }));
      
      const grouped = decryptedSettings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      }, {} as Record<string, typeof settings>);
      
      return NextResponse.json({ success: true, data: grouped });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, category, description, isEncrypted = false } = body;

    if (!key || !category) {
      return NextResponse.json(
        { success: false, error: 'Key and category are required' },
        { status: 400 }
      );
    }

    const encryptedValue = isEncrypted && value ? encrypt(value) : value;

    const setting = await prisma.setting.upsert({
      where: { key },
      update: {
        value: encryptedValue,
        category,
        description,
        isEncrypted,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: encryptedValue,
        category,
        description,
        isEncrypted,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...setting,
        value: isEncrypted && value ? value : setting.value, // Return decrypted for response
      },
    });
  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save setting' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key is required' },
        { status: 400 }
      );
    }

    await prisma.setting.delete({
      where: { key },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete setting' },
      { status: 500 }
    );
  }
}
