const http = require('http');

async function testLogin() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      id_number: 'ADMIN-001',
      password: 'AdminPass123!'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body);
        resolve();
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

testLogin().then(() => process.exit(0));