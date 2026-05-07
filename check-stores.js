const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');
const stores = db.prepare('SELECT id, name, email FROM Store ORDER BY name').all();
console.log('All Stores:');
stores.forEach(s => {
  console.log(`  {${s.id}}: ${s.name} (${s.email})`);
});
db.close();
