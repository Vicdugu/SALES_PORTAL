const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const db = new Database('./prisma/dev.db');

const email = 'admin@koko.com';
const password = 'kokopass123';
const storeId = 'cmosshgfl0002lejop6o4ht4r'; // Koko store ID

// Generate a simple ID (first 20 chars of random hex)
const id = crypto.randomBytes(10).toString('hex');

// Generate hash
const hash = bcrypt.hashSync(password, 10);

// Create user
try {
  db.prepare(`
    INSERT INTO User (id, name, email, password, role, storeId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    'Koko Admin',
    email,
    hash,
    'ADMIN',
    storeId,
    new Date().toISOString(),
    new Date().toISOString()
  );
  
  console.log('✅ Admin created for Koko!');
  console.log('  Email: ' + email);
  console.log('  Password: ' + password);
} catch (error) {
  console.error('❌ Error:', error.message);
}

db.close();
