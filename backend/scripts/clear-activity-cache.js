import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearActivityCache() {
  try {
    console.log('🗑️ Clearing all cached activity content...');
    
    const result = await prisma.activityContent.deleteMany({});
    
    console.log(`✅ Cleared ${result.count} cached activities`);
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearActivityCache();
