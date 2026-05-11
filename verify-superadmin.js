#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function verifySuperAdmin() {
  try {
    const email = 'victor.medugu@questbridge.co.uk';
    const password = 'Sunshineky20@';

    console.log(`Looking up user: ${email}`);
    
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      console.log('❌ User not found in database');
      return;
    }

    console.log('✓ User found:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  StoreId: ${user.storeId}`);
    console.log(`  IsActive: ${user.isActive}`);

    // Verify password
    console.log('\nVerifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (isPasswordValid) {
      console.log('✓ Password is CORRECT');
    } else {
      console.log('❌ Password is INCORRECT');
      console.log(`  Provided: ${password}`);
      console.log(`  Hashed stored: ${user.password.substring(0, 20)}...`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifySuperAdmin();
