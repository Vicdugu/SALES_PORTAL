#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

try {
  // Check if superadmin already exists
  const existing = db.prepare('SELECT * FROM "User" WHERE email = ?').get('admin@questbridge.com');

  if (existing) {
    console.log('✓ Superadmin already exists');
    console.log(`  Email: ${existing.email}`);
    console.log(`  ID: ${existing.id}`);
    console.log(`  Role: ${existing.role}`);
    console.log(`  StoreId: ${existing.storeId}`);
  } else {
    // Insert the superadmin user
    const hash = '$2b$10$MiValoj5Gi7YmeIk.y5b.OP8ANUMvzdzttuVZdlQh1GgsFK90ml.q';
    const id = 'clvpmosuvjaxbae8ccabee214573';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO "User" (id, email, password, name, role, storeId, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, 'admin@questbridge.com', hash, 'System Administrator', 'SUPERADMIN', null, 1, now, now);

    console.log('✅ Superadmin created successfully!');
    console.log(`  Email: admin@questbridge.com`);
    console.log(`  Password: admin123`);
    console.log(`  Role: SUPERADMIN`);
    console.log(`  ID: ${id}`);
  }

  db.close();
} catch (error) {
  console.error('❌ Error:', error.message);
  db.close();
  process.exit(1);
}
