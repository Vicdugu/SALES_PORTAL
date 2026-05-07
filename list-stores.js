const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');
const stores = db.prepare('SELECT id, name FROM Store').all();
console.log('Stores in database:');
stores.forEach(s => {
  console.log(`  - ${s.name}: ${s.id}`);
});
