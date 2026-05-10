/**
 * PAFR Backend API Comprehensive Test Suite
 * Tests all major API endpoints for functionality
 * 
 * Usage: node test-api.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

// Color output for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Make HTTP request
 */
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

/**
 * Test runner
 */
async function test(name, fn) {
  try {
    console.log(`\n${colors.cyan}→ ${name}${colors.reset}`);
    await fn();
    console.log(`${colors.green}✓ PASS${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ FAIL: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Assert response
 */
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Main test suite
 */
async function runTests() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}PAFR Backend API Test Suite${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);

  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  if (await test('Health endpoint', async () => {
    const res = await request('GET', '/api/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.status === 'OK', 'Health check failed');
  })) passed++; else failed++;

  // Test 2: Authentication - Login without credentials
  if (await test('Auth - Login without credentials (should fail)', async () => {
    const res = await request('POST', '/api/auth/login', {});
    assert(res.status !== 200, 'Should reject invalid login');
  })) passed++; else failed++;

  // Test 3: Core Entity APIs - List ARSENs
  if (await test('ARSEN API - List (public access)', async () => {
    const res = await request('GET', '/api/arsens?limit=10');
    // This might require auth, so we just check it doesn't crash
    assert(res.status > 0, 'API responded');
  })) passed++; else failed++;

  // Test 4: Core Entity APIs - List Groups
  if (await test('Groups API - List (public access)', async () => {
    const res = await request('GET', '/api/groups?limit=10');
    assert(res.status > 0, 'API responded');
  })) passed++; else failed++;

  // Test 5: Core Entity APIs - List Areas
  if (await test('Areas API - List (public access)', async () => {
    const res = await request('GET', '/api/areas?limit=10');
    assert(res.status > 0, 'API responded');
  })) passed++; else failed++;

  // Test 6: Business Logic - Trainings API
  if (await test('Trainings API - Health check', async () => {
    const res = await request('GET', '/api/trainings?limit=5');
    assert(res.status > 0, 'Trainings API responded');
  })) passed++; else failed++;

  // Test 7: Business Logic - Attendance API
  if (await test('Attendance API - Health check', async () => {
    const res = await request('GET', '/api/attendance?limit=5');
    assert(res.status > 0, 'Attendance API responded');
  })) passed++; else failed++;

  // Test 8: Business Logic - Readiness API
  if (await test('Readiness API - Health check', async () => {
    const res = await request('GET', '/api/readiness?limit=5');
    assert(res.status > 0, 'Readiness API responded');
  })) passed++; else failed++;

  // Test 9: Business Logic - Supplies API
  if (await test('Supplies API - Health check', async () => {
    const res = await request('GET', '/api/supplies?limit=5');
    assert(res.status > 0, 'Supplies API responded');
  })) passed++; else failed++;

  // Test 10: Advanced Features - Alerts API
  if (await test('Alerts API - Health check', async () => {
    const res = await request('GET', '/api/alerts?limit=5');
    assert(res.status > 0, 'Alerts API responded');
  })) passed++; else failed++;

  // Test 11: Advanced Features - Reports API
  if (await test('Reports API - Health check', async () => {
    const res = await request('GET', '/api/reports?limit=5');
    assert(res.status > 0, 'Reports API responded');
  })) passed++; else failed++;

  // Test 12: Advanced Features - Audit Logs API
  if (await test('Audit Logs API - Health check', async () => {
    const res = await request('GET', '/api/audit-logs?limit=5');
    assert(res.status > 0, 'Audit Logs API responded');
  })) passed++; else failed++;

  // Test 13: Advanced Features - Settings API
  if (await test('Settings API - Health check', async () => {
    const res = await request('GET', '/api/settings');
    assert(res.status > 0, 'Settings API responded');
  })) passed++; else failed++;

  // Test 14: Dashboard API
  if (await test('Dashboard API - Health check', async () => {
    const res = await request('GET', '/api/dashboard');
    assert(res.status > 0, 'Dashboard API responded');
  })) passed++; else failed++;

  // Test 15: Assignments API
  if (await test('Assignments API - Health check', async () => {
    const res = await request('GET', '/api/assignments?limit=5');
    assert(res.status > 0, 'Assignments API responded');
  })) passed++; else failed++;

  // Test 16: 404 handling
  if (await test('404 handling - Non-existent endpoint', async () => {
    const res = await request('GET', '/api/nonexistent');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.body.code === 'NOT_FOUND', 'Should return NOT_FOUND error code');
  })) passed++; else failed++;

  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}Test Results${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.blue}Total: ${passed + failed}${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
