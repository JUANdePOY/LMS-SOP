const http = require('http');

const BASE_URL = 'http://localhost:3001';

// Test hierarchy endpoint
async function testHierarchy() {
  console.log('Testing hierarchy endpoint...');

  // First login to get token
  const loginResponse = await request('POST', '/api/auth/login', {
    id_number: 'ADMIN-001', // Admin user
    password: 'AdminPass123!'
  });

  console.log('Login response:', loginResponse.status);
  console.log('Login body:', loginResponse.body);

  if (loginResponse.status === 200 && loginResponse.body.data?.token) {
    const token = loginResponse.body.data.token;
    console.log('Got token, testing hierarchy...');
    console.log('Token:', token.substring(0, 50) + '...');

    // Now test hierarchy endpoint
    console.log('Making request to: http://localhost:3001/api/hierarchy?hierarchical=true');
    console.log('With Authorization header: Bearer ' + token.substring(0, 20) + '...');
    const hierarchyResponse = await request('GET', '/api/hierarchy?hierarchical=true', null, {
      'Authorization': `Bearer ${token}`
    });

    console.log('Hierarchy response:', hierarchyResponse.status);
    if (hierarchyResponse.status !== 200) {
      console.log('Error body:', hierarchyResponse.body);
    } else {
      console.log('Success! Hierarchy data received');
      console.log('Data keys:', Object.keys(hierarchyResponse.body.data || {}));
    }
  } else {
    console.log('Login failed, testing without auth...');

    // Test without auth (should fail)
    const hierarchyResponse = await request('GET', '/api/hierarchy?hierarchical=true');
    console.log('Hierarchy response (no auth):', hierarchyResponse.status);
    console.log('Hierarchy body:', hierarchyResponse.body);
  }
}

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

testHierarchy().catch(console.error);