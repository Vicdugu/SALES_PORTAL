import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBranding() {
  try {
    // Get all stores with their branding data
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        backgroundImage: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
      },
    });

    console.log('Stores with branding data:');
    console.log(JSON.stringify(stores, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBranding();
