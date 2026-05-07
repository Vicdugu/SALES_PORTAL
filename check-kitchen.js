const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKitchenUser() {
  const users = await prisma.user.findMany({
    where: { role: 'KITCHEN' },
    select: { id: true, email: true, name: true, role: true, storeId: true }
  });
  console.log('Kitchen users:', users);
  
  if (users.length === 0) {
    console.log('\nNo kitchen staff users found. Creating one...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('Kitchen123456', 10);
    
    const storeId = 'cmosxkxm8000ilenwf5jaik87'; // Quest Foods store ID
    
    const kitchen = await prisma.user.create({
      data: {
        email: 'kitchen@quest.com',
        password: hashedPassword,
        name: 'Kitchen Staff',
        role: 'KITCHEN',
        storeId: storeId
      }
    });
    console.log('Created kitchen user:', kitchen);
  }
}

checkKitchenUser().finally(() => prisma.$disconnect());
