/**
 * reset-superadmin-password.js
 * 
 * Resets the password (and optionally email) of the SUPERADMIN user directly
 * in the database. Run locally only — never deployed.
 *
 * Usage:
 *   node scripts/reset-superadmin-password.js
 *
 * Reads DATABASE_URL from .env automatically via dotenv.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
// Also try .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const prisma = new PrismaClient();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log('\n🔐 Superadmin Password Reset\n');

  // Find current superadmin
  const admin = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
  if (!admin) {
    console.error('❌ No SUPERADMIN user found in the database.');
    console.error('   Run the app locally and go to /setup to create one first.');
    process.exit(1);
  }

  console.log(`Found superadmin: ${admin.email} (id: ${admin.id})`);

  const changeEmail = await ask('Change email? (leave blank to keep current): ');
  const newEmail = changeEmail.trim() || admin.email;

  const newPassword = await ask('New password (min 8 chars): ');
  if (!newPassword || newPassword.length < 8) {
    console.error('❌ Password must be at least 8 characters.');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: admin.id },
    data: { email: newEmail, password: hashed },
  });

  // If email changed, also update the associated store
  if (newEmail !== admin.email && admin.storeId) {
    await prisma.store.update({
      where: { id: admin.storeId },
      data: { email: newEmail },
    });
  }

  console.log(`\n✅ Superadmin updated:`);
  console.log(`   Email:    ${newEmail}`);
  console.log(`   Password: ${newPassword}`);
  console.log('\n   You can now log in at /login with these credentials.\n');
}

main()
  .catch((e) => { console.error('Error:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); rl.close(); });
