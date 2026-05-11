#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    const email = 'victor.medugu@questbridge.co.uk';
    const password = 'Sunshineky20@';

    console.log(`Creating superadmin: ${email}`);
    
    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { email },
    });

    if (existing) {
      console.log('✓ User already exists:', existing.role);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create superadmin
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Victor Medugu',
        role: 'SUPERADMIN',
        storeId: null,
        isActive: true,
      },
    });

    console.log('✅ Superadmin created successfully!');
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  ID: ${user.id}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
