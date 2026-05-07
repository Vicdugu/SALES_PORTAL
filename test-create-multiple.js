const http = require('http');

const storeId = 'cmostfypy000mlejooieqa5lu';

const items = [
  { name: 'Coca Cola', category: 'Drink', unitPrice: 1.99, quantity: 50 },
  { name: 'Chocolate Cake', category: 'Dessert', unitPrice: 3.99, quantity: 15 },
  { name: 'Beef Burger', category: 'Food', unitPrice: 6.99, quantity: 30 }
];

async function createItem(item) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      name: item.name,
      category: item.category,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      unit: 'pieces'
    });

    const options = {
      hostname: '192.168.1.98',
      port: 3000,
      path: '/api/inventory',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-store-id': storeId,
        'Connection': 'close'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`${item.name}: Status ${res.statusCode}`);
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error(`Error creating ${item.name}:`, error);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function createAll() {
  for (const item of items) {
    await createItem(item);
  }
}

createAll();
