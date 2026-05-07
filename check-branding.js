process.env.DATABASE_URL = 'file:C:\\\\Users\\\\vicdu\\\\OneDrive\\\\Desktop\\\\Projects\\\\Sales Portal\\\\sales-till\\\\prisma\\\\dev.db';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const store = await prisma.store.findUnique({
    where: { id: 'cmosxkxm8000ilenwf5jaik87' },
    select: {
      id: true,
      name: true,
      logo: true,
      backgroundImage: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
    },
  });
  console.log('Store Branding:', JSON.stringify(store, null, 2));
  await prisma.$disconnect();
})();
