const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}`));

  // Login via API to get token
  const loginRes = await page.evaluate(async () => {
    const r = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@lms.local', password: 'Password123!' })
    });
    return r.json();
  }).catch(() => null);

  // If that fails, try a known seed admin
  let auth = loginRes;
  if (!auth || !auth.data || !auth.data.token) {
    const tries = ['admin@lms.local','superadmin@lms.local','admin@example.com'];
    for (const email of tries) {
      const r = await page.evaluate(async (email) => {
        const res = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'Password123!' })
        });
        return res.json();
      }, email).catch(() => null);
      if (r && r.data && r.data.token) { auth = r; break; }
    }
  }

  if (!auth || !auth.data || !auth.data.token) {
    console.log('LOGIN_FAILED', JSON.stringify(auth));
    console.log(logs.join('\n'));
    await browser.close();
    process.exit(0);
  }

  const { token, user } = auth.data;
  console.log('LOGGED_IN_AS', user.email, user.role, 'id=', user.id);

  // Seed session in localStorage the way the app expects
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate((token, user) => {
    const tabId = `tab_test_${Date.now()}`;
    sessionStorage.setItem('lms_tab_id', tabId);
    localStorage.setItem(`lms_session_${tabId}`, JSON.stringify({ tabId, token, user, createdAt: Date.now() }));
    sessionStorage.setItem('lms_active_session', tabId);
    const reg = {}; reg[tabId] = { tabId, userId: user.id, email: user.email, role: user.role, fullName: user.full_name, createdAt: Date.now() };
    localStorage.setItem('lms_sessions', JSON.stringify(reg));
  }, token, user);

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // Perform a global search
  const inputSel = 'input[aria-label="Global search"]';
  await page.waitForSelector(inputSel, { timeout: 5000 });
  await page.type(inputSel, 'a', { delay: 50 });
  await new Promise(r => setTimeout(r, 1200));

  // Find a user result row and click it
  const clicked = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('button'));
    const userRow = rows.find(b => /@/.test(b.textContent) && b.textContent.toLowerCase().includes('users'));
    if (userRow) { userRow.click(); return userRow.textContent.trim().slice(0, 60); }
    return null;
  });
  console.log('CLICKED_USER_ROW', clicked);

  await new Promise(r => setTimeout(r, 2000));
  console.log('URL_AFTER_CLICK', page.url());

  // Inspect rendered profile content
  const profileInfo = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const cards = document.querySelectorAll('.fb-card');
    const img = document.querySelector('img');
    return {
      h1: h1 ? h1.textContent : null,
      fbCardCount: cards.length,
      firstImgSrc: img ? img.getAttribute('src')?.slice(0, 80) : null,
      bodyText: document.body.innerText.slice(0, 400)
    };
  });
  console.log('PROFILE_INFO', JSON.stringify(profileInfo, null, 2));
  console.log('--- CONSOLE LOGS ---');
  console.log(logs.join('\n'));

  await browser.close();
})();
