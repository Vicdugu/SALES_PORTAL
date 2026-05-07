const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkInventory() {
  const item = await prisma.inventoryItem.findFirst({
    where: {
      name: 'Burger',
      store: { name: 'Koko' }
    }
  });

  console.log('Current Burger quantity:', item?.quantity);

  const usageHistory = await prisma.inventoryUsage.findMany({
    where: { item: { name: 'Burger' } },
    orderBy: { createdAt: 'desc' },
    take: 2
  });

  console.log('Latest inventory deductions:');
  usageHistory.forEach((u, idx) => {
    console.log(`  #${idx + 1}: ${u.quantity} units on ${u.createdAt}`);
  });

  process.exit(0);
}

checkInventory();
