#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    const email = 'admin@questbridge.com';
    
    // Check if superadmin exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log(`✓ Superadmin already exists: ${email}`);
      console.log(`  ID: ${existingAdmin.id}`);
      console.log(`  Role: ${existingAdmin.role}`);
      console.log(`  StoreId: ${existingAdmin.storeId}`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create superadmin
    const superadmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'System Administrator',
        role: 'SUPERADMIN',
        storeId: null, // No store association for superadmin
        isActive: true,
      },
    });

    console.log('✅ Superadmin created successfully!');
    console.log(`  Email: ${superadmin.email}`);
    console.log(`  Password: admin123`);
    console.log(`  Role: ${superadmin.role}`);
    console.log(`  ID: ${superadmin.id}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
