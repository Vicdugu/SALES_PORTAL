const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function getStore() {
  try {
    const store = await db.store.findUnique({
      where: { email: 'testinv@test.com' },
      select: { id: true, name: true }
    });
    console.log('Store:', store);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.$disconnect();
  }
}

getStore();
