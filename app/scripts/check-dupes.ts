import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  const total = await prisma.product.count();
  console.log('Total products:', total);
  
  const withShopifyId = await prisma.product.count({ where: { shopifyId: { not: null } } });
  console.log('Products with shopifyId:', withShopifyId);
  
  const withoutShopifyId = await prisma.product.count({ where: { shopifyId: null } });
  console.log('Products WITHOUT shopifyId (old duplicates):', withoutShopifyId);
  
  await prisma.$disconnect();
}

checkDuplicates();
