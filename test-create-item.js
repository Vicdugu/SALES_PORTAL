const http = require('http');

const storeId = 'cmostfypy000mlejooieqa5lu';

const postData = JSON.stringify({
  name: 'Chicken Burger',
  category: 'Food',
  unitPrice: 5.99,
  quantity: 25,
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
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(postData);
req.end();
