const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function getCode() {
  const store = await db.store.findUnique({
    where: { email: 'testinv@test.com' }
  });
  console.log(store?.verificationCode);
  await db.$disconnect();
}

getCode();
