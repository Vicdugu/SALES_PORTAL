import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
