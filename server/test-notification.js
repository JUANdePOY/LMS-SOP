const BASE = process.env.BASE_URL || 'http://localhost:5000/api';

async function request(method, path, body, token) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return { status: res.status, data: await res.json() };
}

async function login(email, password) {
  const res = await request('POST', '/auth/login', { email, password });
  if (res.data?.data?.token) return res.data.data.token;
  throw new Error('Login failed: ' + JSON.stringify(res.data));
}

async function run() {
  try {
    console.log('Logging in as super_admin...');
    const token = await login('john.d@organization.com', 'password123');
    console.log('Login successful\n');

    console.log('Creating test notification for current user...');
    const createResult = await request('POST', '/notifications', {
      title: 'Test Notification ' + new Date().toLocaleString(),
      body: 'This is a test notification',
      type: 'info',
      link: '/notifications',
      entity_type: 'test',
      entity_id: Date.now(),
    }, token);
    console.log('Create status:', createResult.status);
    console.log('Create result:', createResult.data);
    console.log('');

    console.log('Fetching notifications...');
    const notifResult = await request('GET', '/notifications?limit=10', null, token);
    console.log('Fetch status:', notifResult.status);
    const count = Array.isArray(notifResult.data?.notifications) ? notifResult.data.notifications.length : 0;
    console.log(`Found ${count} notifications`);
    console.log('Unread count:', notifResult.data?.unread_count);
    console.log('');

    console.log('Triggering broadcast...');
    const broadcastResult = await request('POST', '/notifications/broadcast', {
      title: 'Broadcast Test ' + new Date().toLocaleString(),
      body: 'This is a broadcast test',
      type: 'info',
      link: '/notifications',
      entity_type: 'test',
      entity_id: Date.now(),
    }, token);
    console.log('Broadcast status:', broadcastResult.status);
    console.log('Broadcast result:', broadcastResult.data);
    console.log('');

    console.log('Test complete. Check the frontend to see if notifications appeared in real-time.');
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

run();
