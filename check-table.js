const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkTable() {
  try {
    const result = await db.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='InventoryItem'`;
    console.log('InventoryItem table exists:', result.length > 0);
    if (result.length === 0) {
      console.log('Table does not exist!');
    }
  } catch (error) {
    console.error('Error checking table:', error.message);
  } finally {
    await db.$disconnect();
  }
}

checkTable();
