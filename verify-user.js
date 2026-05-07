process.env.DATABASE_URL = 'file:C:\\\\Users\\\\vicdu\\\\OneDrive\\\\Desktop\\\\Projects\\\\Sales Portal\\\\sales-till\\\\prisma\\\\dev.db';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const user = await prisma.user.findUnique({
    where: { email: 'test@quest.com' },
    select: { id: true, email: true, name: true, role: true, storeId: true },
  });
  console.log('User:', JSON.stringify(user, null, 2));
  await prisma.$disconnect();
})();
