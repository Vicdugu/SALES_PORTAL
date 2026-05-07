const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function updateKitchenPassword() {
  const hashedPassword = await bcrypt.hash('Kitchen123456', 10);
  
  const updated = await prisma.user.update({
    where: { email: 'tim@quest.com' },
    data: { password: hashedPassword }
  });
  
  console.log('Updated kitchen user password:', updated.email);
}

updateKitchenPassword().finally(() => prisma.$disconnect());
