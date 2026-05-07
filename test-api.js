const http = require('http');

const storeId = 'cmostfypy000mlejooieqa5lu';

const options = {
  hostname: '192.168.1.98',
  port: 3000,
  path: '/api/inventory',
  method: 'GET',
  headers: {
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
    console.log('Headers:', res.headers);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
