#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

try {
  // List all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();

  console.log('Tables in database:');
  tables.forEach(t => {
    console.log(`  - ${t.name}`);
  });

  db.close();
} catch (error) {
  console.error('❌ Error:', error.message);
  db.close();
  process.exit(1);
}
