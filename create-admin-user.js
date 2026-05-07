const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const db = new Database('./prisma/dev.db');

const questFoodsStoreId = 'cmosxkxm8000ilenwf5jaik87';
const email = 'admin@questfoods.com';
const password = 'password123';
const hashedPassword = bcrypt.hashSync(password, 10);

// Generate a simple ID (Prisma Cuid-like format - lowercase alphanumeric)
const id = 'c' + crypto.randomBytes(12).toString('hex').substring(0, 23);

try {
  const sql = `
    INSERT INTO User (id, email, name, password, role, storeId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const now = new Date().toISOString();
  db.prepare(sql).run(
    id,
    email,
    'Quest Foods Admin',
    hashedPassword,
    'ADMIN',
    questFoodsStoreId,
    now,
    now
  );
  
  console.log('✅ Admin created successfully!');
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role: ADMIN`);
  console.log(`  Store: Quest Foods`);
  console.log(`  ID: ${id}`);
} catch (error) {
  console.error('❌ Error:', error.message);
}
