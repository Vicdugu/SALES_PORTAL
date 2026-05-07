const crypto = require('crypto');
const { jwtVerify } = require('jose');

// Get JWT token from database
const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');

const kokoAdmin = db.prepare('SELECT id FROM User WHERE email = ?').get('admin@koko.com');
if (!kokoAdmin) {
  console.error('Koko admin not found');
  process.exit(1);
}

// Get JWT secret from env or use default
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

// For testing, we'll get the existing user and manually check what storeId they should have
const kokoUser = db.prepare('SELECT id, email, role, storeId FROM User WHERE email = ?').get('admin@koko.com');
console.log('Koko Admin in DB:', kokoUser);

// Now test the API call with different storeId values
const axios = require('axios');

async function testAPI() {
  console.log('\n=== Testing API with different storeId values ===\n');
  
  // Test 1: With Koko's storeId header
  console.log('Test 1: Sending x-store-id header with Koko storeId');
  try {
    const response = await axios.get('http://localhost:3000/api/users', {
      headers: {
        'x-store-id': kokoUser.storeId,
        'authorization': `Bearer fake-token-for-test`, // This will likely fail but we want to see the storeId used
      }
    });
    console.log('Response data length:', response.data.data.length);
    console.log('First user:', response.data.data[0]);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('401 error (expected due to fake token)');
    } else {
      console.log('Error:', error.message);
    }
  }
}

testAPI().catch(console.error).finally(() => db.close());
