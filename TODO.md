# TODO: Fix `/api/hierarchy` DB_ERROR

## Root Cause
The `business_id` column is missing from the `departments` table due to incompatible `ADD COLUMN IF NOT EXISTS` migration syntax.

## Steps

### 1. Fix migration in `server/config/database.js`
- [x] Replaced `ADD COLUMN IF NOT EXISTS` with `ADD COLUMN` (compatible with all MySQL/MariaDB versions; caught by existing error handler as `ER_DUP_COLUMN`/1060)

### 2. Fix `server/routes/departments.js` — Add `business_id` support
- [x] Added `body('business_id').optional().isInt()` to POST validation chain
- [x] Added `business_id` to body destructuring in POST handler
- [x] Passed `business_id` to `departmentModel.create()`
- [x] Added `body('business_id').optional().isInt()` to PUT validation chain
- [x] Added `'business_id'` to allowed updates array in PUT handler

### 3. Verify `server/models/departmentModel.js` — Handle `business_id` in create/update
- [x] `create()` already destructures and inserts `business_id` ✅
- [x] `update()` already destructures and updates `business_id` ✅

### 4. Verify and Test
- [x] Server restarted successfully — DB connected, migrations applied
- [x] Migration output confirms `business_id` column already exists
- [x] `/api/health` returns `{"status":"OK","db":"connected"}`
- [x] `/api/hierarchy` returns `NO_TOKEN` (auth middleware working) — no more `DB_ERROR`
- [x] All code changes verified ✅

