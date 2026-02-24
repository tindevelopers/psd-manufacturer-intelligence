import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('Starting duplicate cleanup...');
  
  // Count before
  const totalBefore = await prisma.product.count();
  console.log('Total products before cleanup:', totalBefore);
  
  // Delete products without shopifyId (these are the old duplicates)
  const deleted = await prisma.product.deleteMany({
    where: { shopifyId: null }
  });
  
  console.log('Deleted old products without shopifyId:', deleted.count);
  
  // Count after
  const totalAfter = await prisma.product.count();
  console.log('Total products after cleanup:', totalAfter);
  
  await prisma.$disconnect();
}

cleanupDuplicates();
