# Apply Rate Limiter to Login Page

## Objective
Prevent brute-force attacks on the login endpoint via server-side rate limiting AND fix the existing client-side "page refresh on failed login" bug.

---

## Step 1: Add Server-Side Rate Limiter

**Files to modify/create:**
- `server/package.json` — add `express-rate-limit` dependency
- `server/middleware/rateLimiter.js` — new file; configure limiter for `/auth/login` only (5 attempts per 15 min per IP)
- `server/index.js` — import and apply the limiter to auth routes

**Verification:**
- `npm install` succeeds
- Server starts without errors
- 6th POST to `/api/auth/login` from same IP within 15 min returns HTTP 429 with JSON body `{ status: 'error', message: 'Too many login attempts...', code: 'RATE_LIMITED' }`

---

## Step 2: Fix Client-Side Login Refresh Bug

**Files to modify:**
- `client/src/services/api.js`

**Change:**
```js
// BEFORE
export const login = (credentials) => api.post('/auth/login', credentials);

// AFTER
export const login = (credentials) => api.post('/auth/login', credentials, { skipAuthRedirect: true });
```

**Why:** The Axios response interceptor in `api.js:30-34` does `window.location.href = '/login'` on any HTTP 401. When a stale token exists in localStorage, the login POST is sent with `Authorization: Bearer <old_token>`, the server rejects it with 401, and the interceptor triggers a full page refresh. `skipAuthRedirect: true` mirrors the existing pattern used by `updateProfile` on line 47.

**Verification:**
- Submitting wrong credentials displays inline error without refreshing the page
- Successful login still redirects correctly via `Login.jsx` `useEffect`

---

## Step 3: Add Client-Side UX Feedback for Rate Limits

**Files to modify:**
- `client/src/pages/Login.jsx`

**Changes:**
1. Add state: `attemptsRemaining`, `cooldownEndsAt`, `cooldownSeconds`
2. In `handleSubmit`, if login throws an error:
   - Read `X-RateLimit-Remaining` and `Retry-After` from `error.response.headers`
   - Set `attemptsRemaining` and `cooldownEndsAt` accordingly
3. `useEffect` to tick the countdown when `cooldownEndsAt` is set
4. Disable the submit button when `attemptsRemaining === 0 || loading`
5. Show inline message:
   - Warning when `attemptsRemaining` is 1 or 2: `"1 attempt remaining before temporary lockout"`
   - Cooldown: `"Too many attempts. Try again in Xs"`

**Verification:**
- After 5 failed attempts client receives 429, button disables, countdown shows
- Countdown updates every second and re-enables button when timer hits 0
- Warning messages appear before hitting the hard limit

---

## Risks & Mitigations

- **Risk:** Legitimate users locked out after typos.
  - **Mitigation:** 5 attempts / 15 minutes is standard. Clear messaging explains the lockout. Additionally, the refresh bug is fixed, so users no longer lose their input on bad attempts.
- **Risk:** Rate limiter bypassed via IP rotation.
  - **Mitigation:** Acceptable for an internal military app. Future: tie limit to user ID after first partial-match attempt.
- **Regression risk:** `skipAuthRedirect` could mask other real 401s on login.
  - **Mitigation:** Login.jsx already inspects `result.success` vs `result.error` and handles both paths correctly per code review.

---

## Success Criteria

- [ ] Server returns HTTP 429 after 5 failed login POSTs from same IP within 15 minutes
- [ ] Failed login does NOT refresh the page
- [ ] Client shows inline error + rate-limit warnings + countdown timer
- [ ] Submit button disables during cooldown
- [ ] Successful login still works normally
- [ ] No new lint or syntax errors
