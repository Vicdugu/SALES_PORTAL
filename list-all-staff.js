const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');

const users = db.prepare('SELECT id, name, email, role, storeId FROM User ORDER BY storeId, role').all();

console.log('\n=== All Users in Database ===\n');
const usersByStore = {};
users.forEach(user => {
  const key = user.storeId || 'SUPERADMIN';
  if (!usersByStore[key]) {
    usersByStore[key] = [];
  }
  usersByStore[key].push(user);
});

Object.entries(usersByStore).forEach(([storeId, storeUsers]) => {
  console.log(`\nStore: ${storeId === 'SUPERADMIN' ? 'SUPERADMIN' : storeId}`);
  storeUsers.forEach(u => {
    console.log(`  ${u.name} (${u.email}) - ${u.role}`);
  });
});

console.log('\n');
db.close();
