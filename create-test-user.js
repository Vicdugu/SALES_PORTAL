process.env.DATABASE_URL = 'file:C:\\\\Users\\\\vicdu\\\\OneDrive\\\\Desktop\\\\Projects\\\\Sales Portal\\\\sales-till\\\\prisma\\\\dev.db';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  try {
    // Get the Quest Foods store
    const store = await prisma.store.findUnique({
      where: { id: 'cmosxkxm8000ilenwf5jaik87' },
    });

    if (!store) {
      console.log('Store not found');
      return;
    }

    // Create a test admin user
    const hashedPassword = bcrypt.hashSync('Test123456', 10);
    
    const user = await prisma.user.upsert({
      where: { email: 'test@quest.com' },
      update: { password: hashedPassword },
      create: {
        email: 'test@quest.com',
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        storeId: store.id,
      },
    });

    console.log('✅ Test user created/updated successfully!');
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: Test123456`);
    console.log(`  Store: ${store.name}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
