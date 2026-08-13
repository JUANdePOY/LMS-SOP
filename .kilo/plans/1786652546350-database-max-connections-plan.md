# Fix: MySQL `max_connections_per_hour` exhaustion (`ER_USER_LIMIT_REACHED`)

## Root Cause

`max_connections_per_hour` is a **MySQL per-user counter of connection *attempts* per hour** (limit 500), not concurrent connections.

- The DB pool is a **singleton per process** (`server/config/database.js` `getPool()`), so a single instance cannot itself hit 500 connects/hour — it lazily opens ≤ `connectionLimit` (10) connections and reuses them.
- The runtime log shows **multiple Node processes running simultaneously** (6× "Server starting…", the *"Another Node process… already running"* warning, 2× "Database connected successfully"). Each process owns its **own** pool → N instances × N×10 connections. Every deploy/restart creates a fresh pool that re-opens connections, so connect attempts accumulate past 500/hour.
- The **startup lock is advisory only** (`server.js:16-19`, `database.js:143-166`): detects a live peer, logs *"Will attempt to bind anyway"*, and **continues**, spawning a second pool.
- **`listenWithRetry` keeps the duplicate alive** (`server.js:375-388`): on `EADDRINUSE` it retries instead of exiting → two processes persist → ~20 live connections.
- **No `pool.end()` on shutdown** (only in throwaway `check_*.js` scripts). Killed/restarted processes orphan connections, forcing reconnects that burn the hourly quota.
- **No circuit breaker**: once at the limit, every request (`routes/auth.js:65`) re-attempts a doomed `connect()` that still counts against the quota — no cooldown, so the system stays locked out for the rest of the hour. (Good: `withRetry` already does **not** retry quota errors at `database.js:62`.)

Compounding: `connectionLimit: 10` is high for a shared Hostinger DB.

### Secondary defect (separate fix, same log)
`Cannot find module './services/sopOnboardingService'` during user creation — missing module breaks onboarding.

## Plan

### 1. Enforce a single instance (stops duplicate pools)
- In `server/config/database.js` `ensureStartupLock()`: when a live peer PID is found, the caller must **exit** instead of continuing. Change `server.js:16-19` so a detected duplicate calls `process.exit(1)` (the supervisor will not spawn a parallel pool).
- Make the lockfile path robust under Hostinger version builds (`hbuilds/versions/<id>/nodejs/...`): write the lock next to the server entry, not a possibly-ephemeral `.tmp`. Use `fs.rmSync(lock, {force:true})` on a clean exit.

### 2. Make `listenWithRetry` exit on `EADDRINUSE`
- `server.js:375-388`: on `EADDRINUSE`, log and `process.exit(1)` immediately (do **not** retry-keep-alive the duplicate). This guarantees only one process holds the port/pool.

### 3. Tune the connection pool (`database.js:6-21`)
- Lower `connectionLimit` to `5` (shared-host safe; app is low-concurrency).
- Set `queueLimit: 0` (unbounded queue) so bursts queue instead of erroring.
- Add idle-connection reclamation: `maxIdle: 2`, `idleTimeout: 60000` (mysql2 v3 supports these) to release idle connections and reduce persistent connect count.
- Keep `waitForConnections: true`, `enableKeepAlive`, `keepAliveInitialDelay`.

### 4. Add a quota circuit breaker (`database.js`)
- Add a module-level `quotaBlockedUntil` timestamp. On `ER_USER_LIMIT_REACHED` (`isQuotaOrLimitError`), set `quotaBlockedUntil = Date.now() + COOLDOWN_MS` (≈ 60 min, since the MySQL counter resets hourly).
- In the patched `query`/`getConnection`/`execute` (and `withRetry`), if `Date.now() < quotaBlockedUntil`, **fail fast without contacting MySQL** (throw a typed `QuotaExceededError`). This stops doomed `connect()` attempts from burning the remaining quota and lets the hourly counter reset.
- `initDatabase()` should also respect the breaker (skip `SELECT 1` while blocked).

### 5. Graceful shutdown releases the pool
- In `registerLockCleanup` (`database.js:168-175`), also call `pool.end()` (via `db.rawPool.end()`) on `SIGTERM`/`SIGINT`/`exit` so connections are closed cleanly and the next boot doesn't inherit orphans.

### 6. Fix the missing onboarding module (separate, low-risk)
- In `models/authModel.js:36`, guard the optional `require('./services/sopOnboardingService')` in try/catch so a missing module logs a warning and continues user creation instead of throwing. (Should also actually create/restore the module — track separately.)

## Affected files
- `server/config/database.js` (pool config, lock, circuit breaker, shutdown)
- `server/server.js` (single-instance enforcement, listen retry)
- `server/models/authModel.js` (guard missing module)

## Validation
- Deploy to Hostinger; confirm **only one** "LMS-SOP Server starting…" + "Database connected successfully" per boot (no duplicate-process warning).
- `GET /api/health` returns `db: "connected"`; under load, connection count stays ≤ `connectionLimit`.
- Simulate `ER_USER_LIMIT_REACHED` (or temporarily set pool `connectionLimit` very high + restart loop): confirm subsequent queries fail fast with no new MySQL `connect()` attempts until cooldown expires, then recover automatically after the hour.
- Verify clean `SIGTERM` closes the pool (no orphaned connections) and a fresh boot reconnects successfully.
- Confirm user creation no longer throws on the missing `sopOnboardingService` (logs warning, proceeds).
