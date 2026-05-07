const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');
const admins = db.prepare("SELECT id, email, name, storeId, role FROM User WHERE role = 'ADMIN' ORDER BY email").all();
console.log('All ADMIN users:');
admins.forEach(u => {
  console.log(`  ${u.email} -> storeId: ${u.storeId}`);
});
db.close();
