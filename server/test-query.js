const http = require('http');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3001';
const JWT_SECRET = 'your-secret-key-change-in-production';

const token = jwt.sign(
  { userId: 1, id_number: 'ADMIN-001' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

function request(method, path, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function test() {
  try {
    const result = await request('GET', '/api/reservists', token);
    console.log('Reservists status:', result.status);
    if (result.status === 200) {
      console.log('SUCCESS! Count:', result.body.data?.length);
    } else {
      console.log('Error:', result.body);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();