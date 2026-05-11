import { PrismaClient } from '@prisma/client';

// Use production database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_R4VEPhKy3fkG@ep-still-waterfall-apzsltud-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    },
  },
});

async function fixMassaStoreCurrency() {
  try {
    // Find the Massa store
    const massaStore = await prisma.store.findFirst({
      where: {
        name: {
          contains: 'Massa',
          mode: 'insensitive',
        },
      },
    });

    if (!massaStore) {
      console.error('❌ Massa store not found');
      return;
    }

    console.log(`Found store: ${massaStore.name} (ID: ${massaStore.id})`);
    console.log(`Current currency: ${massaStore.currency}`);

    // Update to GBP
    const updated = await prisma.store.update({
      where: { id: massaStore.id },
      data: { currency: 'GBP' },
    });

    console.log(`✅ Currency updated to: ${updated.currency}`);
  } catch (error) {
    console.error('Error fixing Massa store currency:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMassaStoreCurrency();
