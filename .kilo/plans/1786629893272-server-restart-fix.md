# Fix Server Restart Loop on Deployment

## Root Cause

The server restarts repeatedly because:

1. **Hostinger/Passenger auto-restart**: The hosting environment restarts the Node.js process on deployment or when it detects the app has exited.
2. **Stale lock file**: `server/.tmp/db-init.lock` is never cleaned up on normal exit. When a new process starts, it may read a stale PID.
3. **PID reuse race**: If the OS reuses the old PID for an unrelated process, the new server instance incorrectly detects a "duplicate" and exits.
4. **Seed script breaks the lock**: `server/seed-sops.js` unconditionally deletes `db-init.lock`, so running seed while the server is live breaks duplicate detection.
5. **Async lock check**: `ensureStartupLock()` runs asynchronously inside `initDatabase()`, but `server.js` does not await it before calling `app.listen()`. A new instance can begin serving before the duplicate check completes.

## Plan

### 1. Make lock acquisition synchronous and move it before `app.listen()`

In `server/config/database.js`:
- Extract a synchronous `ensureStartupLock()` that only does the PID file check/write.
- Call it synchronously at the top of `server.js`, before any async DB init or `app.listen()`.
- If a duplicate is detected, log clearly and exit immediately.

### 2. Clean up the lock file on graceful shutdown

In `server/config/database.js` (or a small cleanup helper):
- Register `process.on('exit')`, `process.on('SIGTERM')`, and `process.on('SIGINT')` handlers to delete `db-init.lock`.
- This prevents stale locks after a clean stop.

### 3. Add a port-based duplicate check as a fallback

In `server/server.js`:
- Before `app.listen()`, try to bind to `PORT` using `net.createServer()`.
- If binding fails with `EADDRINUSE`, another instance is already serving — log and exit cleanly.
- This is more reliable than PID checking because it doesn't depend on process liveness.

### 4. Add a short retry/backoff when a duplicate is detected

In `server/config/database.js`:
- If `ensureStartupLock()` finds a running PID, wait up to ~2 seconds, re-check the PID, and only then exit.
- This handles the case where the old process is in the middle of shutting down.

### 5. Fix `seed-sops.js`

In `server/seed-sops.js`:
- Remove the unconditional `fs.unlinkSync(lockFile)` at startup.
- Seed scripts should not touch the server's startup lock file.

## Files to Modify

- `server/server.js`
- `server/config/database.js`
- `server/seed-sops.js`

## Validation

1. Start the server once → confirm it serves on port 5000.
2. Start a second instance → confirm it detects the duplicate and exits cleanly within a couple seconds.
3. Stop the server (Ctrl+C / SIGTERM) → confirm `db-init.lock` is removed.
4. Restart → confirm no stale-lock false positives.
5. Run `node server/seed-sops.js` while the server is running → confirm it no longer deletes the lock file.
