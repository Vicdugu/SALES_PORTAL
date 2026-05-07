process.env.DATABASE_URL = 'file:C:\\\\Users\\\\vicdu\\\\OneDrive\\\\Desktop\\\\Projects\\\\Sales Portal\\\\sales-till\\\\prisma\\\\dev.db';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      storeId: true,
    },
  });
  console.log('Users:');
  console.log(JSON.stringify(users, null, 2));

  const stores = await prisma.store.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
  console.log('\nStores:');
  console.log(JSON.stringify(stores, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
