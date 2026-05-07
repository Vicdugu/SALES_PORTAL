const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function updateSuperadminCredentials() {
  try {
    const newEmail = 'victor.medugu@questbridge.co.uk';
    const newPassword = 'Sunshineky20@';

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Find and update the superadmin
    const updatedAdmin = await prisma.user.update({
      where: { email: 'admin@questbridge.com' },
      data: {
        email: newEmail,
        password: hashedPassword,
      },
    });

    console.log('✅ Superadmin credentials updated successfully!');
    console.log('');
    console.log('New Credentials:');
    console.log(`📧 Email: ${newEmail}`);
    console.log(`🔐 Password: ${newPassword}`);
    console.log(`👤 Name: ${updatedAdmin.name}`);
    console.log(`📍 Role: ${updatedAdmin.role}`);
    console.log(`🆔 ID: ${updatedAdmin.id}`);

  } catch (error) {
    console.error('❌ Error updating superadmin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateSuperadminCredentials();
