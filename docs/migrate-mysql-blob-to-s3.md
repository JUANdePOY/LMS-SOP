# Migrating Uploads from `mysql_blob` to S3 / Cloudflare R2

## Overview

This guide explains how to migrate existing uploaded assets from MySQL BLOB storage (`STORAGE_DRIVER=mysql_blob`) to S3-compatible object storage, including AWS S3 and Cloudflare R2.

The codebase already supports three storage backends:

| Driver | Where files live | Survives redeploy? |
|---|---|---|
| `local` | `server/uploads/` on disk | Only if mounted on a persistent volume |
| `mysql_blob` | `file_blobs` table + inline `LONGBLOB` columns | Yes, because it is in the database |
| `s3` | S3-compatible bucket | Yes, by design |

Switching from `mysql_blob` to `s3` is therefore a data-migration problem, not a code rewrite. All upload/download/delete paths already go through `server/config/storage.js`.

---

## Prerequisites

### 1. Provision an S3-compatible bucket

You need a bucket and credentials that the Node.js backend can reach from your Hostinger server.

#### AWS S3

```env
STORAGE_DRIVER=s3
S3_BUCKET=your-bucket
S3_REGION=auto
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC=true
# Optional: S3_KEY_PREFIX=lms-sop
```

#### Cloudflare R2

R2 is S3-compatible but does **not** support ACLs. Do **not** set `S3_ACL`.

```env
STORAGE_DRIVER=s3
S3_BUCKET=your-r2-bucket
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_PUBLIC_ENDPOINT=https://<account>.r2.dev
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=your-r2-access-key
S3_SECRET_ACCESS_KEY=your-r2-secret-key
S3_PUBLIC=true
# Do NOT set S3_ACL for R2
```

#### Private bucket / Cloudflare Worker proxy

If your bucket is **not** public, set:

```env
S3_PUBLIC=false
```

The app then stores relative URLs like `/uploads/s3/<key>` and serves them through the built-in proxy route at `GET /uploads/s3/:key(*)` in `server/server.js`. You can front this with a Cloudflare Worker for production caching.

### 2. Network access

Your Hostinger server must be able to reach the S3 endpoint. If you use Hostinger's remote MySQL, the same outbound internet access usually covers S3 endpoints too. Test connectivity with:

```bash
curl -I https://s3.amazonaws.com
# or for R2
curl -I https://<account>.r2.cloudflarestorage.com
```

### 3. Verify current storage mode

On your current Hostinger server, confirm you are on `mysql_blob`:

```bash
cd C:\wamp64\www\LMS-SOP\server
node -e "console.log(require('dotenv').config().parsed.STORAGE_DRIVER)"
```

---

## How files are currently stored

Understanding the data layout helps you estimate migration time and risk.

### `file_blobs` table

Used by the `mysql_blob` driver for generic uploads through `storage.saveFile()`. This covers:

- `users.avatar_url`
- `courses.thumbnail_url`
- `module_content.thumbnail_url`
- Course builder module images
- Some other uploads that go through the storage abstraction

Schema:

```sql
CREATE TABLE IF NOT EXISTS file_blobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  path VARCHAR(500) NOT NULL,
  content_type VARCHAR(100) DEFAULT NULL,
  size_bytes BIGINT DEFAULT NULL,
  file_data LONGBLOB DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_file_blobs_path (path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Inline BLOB columns

Some entities store binary data directly in their own tables, not through `file_blobs`:

| Table | BLOB column(s) | URL column(s) |
|---|---|---|
| `businesses` | `logo_data` | `logo_url` |
| `certificate_templates` | `frame_data` | `frame_storage_path` |
| `certificate_signatures` | `signature_data` | `storage_path` |
| `task_attachments` | `file_data` | none currently |
| `sop_module_attachments` | `file_data` | none currently |

These BLOB columns already survive Hostinger redeploys because they are in MySQL. The migration script can optionally move them to S3 and add URL columns.

### Disk-based files

Even with `STORAGE_DRIVER=mysql_blob`, some features still write directly to disk under `server/uploads/`:

- Training letter-order documents (`internal_training_attachments.relative_path`)
- External training attachments (`external_training_attachments.relative_path`)
- Certificate issuance PDFs (`certificate_issuances.pdf_storage_path`)
- Submission file uploads (`submissions.file_path`)

If your Hostinger instance redeploys with a fresh container layer, these disk files are the ones most likely to be lost.

---

## Migration script

A ready-to-use migration script is included in the repo:

```
server/scripts/migrate-blobs-to-s3.js
```

### Usage

**1. Dry run first** (no changes, just a report):

```bash
cd C:\wamp64\www\LMS-SOP\server
MIGRATE_DRY_RUN=true node scripts/migrate-blobs-to-s3.js
```

This prints what would be migrated without writing to S3 or modifying the database.

**2. Live migration**:

```bash
# Make sure these are set in server/.env or the environment:
# STORAGE_DRIVER=s3
# S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
# S3_REGION or S3_ENDPOINT

node scripts/migrate-blobs-to-s3.js
```

**Optional tuning**:

```bash
MIGRATE_BATCH_SIZE=100 node scripts/migrate-blobs-to-s3.js
```

### What the script does

The script runs three phases:

#### Phase 1: `file_blobs` table

- Reads `file_blobs` in batches.
- Uploads each BLOB to S3 via `storage.saveFile()`.
- Deletes the row from `file_blobs`.
- Updates URL columns in entity tables that still point at `/uploads/...`:
  - `users.avatar_url`
  - `courses.thumbnail_url`
  - `module_content.thumbnail_url`
  - `certificate_templates.frame_storage_path`
  - `certificate_signatures.storage_path`
  - `certificate_issuances.pdf_storage_path`
  - `submissions.file_path`
  - `internal_training_attachments.relative_path`
  - `external_training_attachments.relative_path`

#### Phase 2: Disk-based files

- Scans `server/uploads/` for files referenced from the database.
- Uploads each to S3.
- Updates the DB path column to the new S3 URL.
- Deletes the local file from disk.

This is the phase that prevents data loss on future redeploys.

#### Phase 3: Inline BLOBs (optional)

- Migrates `businesses.logo_data`, `certificate_templates.frame_data`, `certificate_signatures.signature_data`, `task_attachments.file_data`, and `sop_module_attachments.file_data` to S3.
- Adds `file_url` columns to `task_attachments` and `sop_module_attachments` if missing.
- Nulls out the old BLOB columns to shrink MySQL.

You can skip this phase if you prefer to keep those BLOBs in MySQL. They already survive redeploys.

---

## Post-migration code changes

After migration, if you performed Phase 3 (inline BLOBs), update the read paths so the app fetches from S3 instead of the now-empty DB columns.

### Business logos

`server/models/businessModel.js`

```js
const storage = require('../config/storage');

async function getLogo(id) {
  const [rows] = await db.query(
    'SELECT logo_data, logo_mime_type, logo_name, logo_size, logo_url FROM businesses WHERE id = ?',
    [id]
  );
  const row = rows[0] || null;
  if (!row) return null;

  if (row.logo_url && storage.isS3()) {
    const buffer = await storage.readFile(row.logo_url);
    if (buffer) {
      return { buffer, mime: row.logo_mime_type, name: row.logo_name, size: row.logo_size, url: row.logo_url };
    }
  }

  if (row.logo_data) {
    return { buffer: row.logo_data, mime: row.logo_mime_type, name: row.logo_name, size: row.logo_size };
  }

  return null;
}
```

### Task attachments

`server/services/taskAttachmentPublicFile.js`

```js
const storage = require('../config/storage');

router.get('/:attachmentId/file', async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const { token } = req.query;
    if (!Number.isInteger(attachmentId)) return res.status(404).end();
    if (!verifyAttachmentToken(attachmentId, token)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
    }

    const attachment = await taskAttachmentModel.findById(attachmentId);
    if (!attachment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });

    let buffer, mime;
    if (attachment.file_url && storage.isS3()) {
      buffer = await storage.readFile(attachment.file_url);
      mime = attachment.mime_type;
    } else {
      buffer = attachment.file_data;
      mime = attachment.mime_type;
    }

    if (!buffer) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });

    res.setHeader('Content-Type', mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.original_name || attachment.file_name || 'file')}"`);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    return res.send(buffer);
  } catch (error) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
  }
});
```

### SOP attachments

`server/services/sopAttachmentPublicFile.js`

```js
const storage = require('../config/storage');

router.get('/:attachmentId/file', async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const { token } = req.query;

    const attachment = await sopAttachmentService.getAttachmentFileForView(attachmentId, token);

    let buffer, mime;
    if (attachment.file_url && storage.isS3()) {
      buffer = await storage.readFile(attachment.file_url);
      mime = attachment.mime_type;
    } else {
      buffer = attachment.file_data;
      mime = attachment.mime_type;
    }

    if (!buffer) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
    }

    res.setHeader('Content-Type', mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.original_name || attachment.file_name || 'file')}"`);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    return res.send(buffer);
  } catch (error) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
  }
});
```

> **Note**: If you skipped Phase 3 of the migration, these code changes are unnecessary. The BLOB data stays in MySQL and continues to work unchanged.

---

## Switching the app to S3

Once migration is complete and verified:

1. Set `STORAGE_DRIVER=s3` in `server/.env` on Hostinger.
2. Ensure all `S3_*` env vars are present.
3. Restart the Node.js server.

All new uploads will go directly to S3. Existing files are already in S3 with updated DB URLs, so nothing else needs to change.

---

## Rollback plan

If something goes wrong during migration:

1. **Dry run first**: Always run `MIGRATE_DRY_RUN=true` before touching data.
2. **Database backup**: Take a MySQL dump before starting:

   ```bash
   mysqldump -u <user> -p <db_name> > backup_before_s3_migration.sql
   ```

3. **Partial rollback**: The script only deletes `file_blobs` rows after a successful S3 upload. If the script crashes mid-run, remaining `file_blobs` rows are untouched and can be re-migrated.
4. **Full rollback**: Restore the MySQL dump and redeploy the old code.

---

## Verification checklist

After migration and before switching to `STORAGE_DRIVER=s3` in production:

- [ ] `MIGRATE_DRY_RUN=true` output looks correct.
- [ ] Spot-check a sample of migrated URLs in the database: they should be absolute S3 URLs (public bucket) or `/uploads/s3/...` paths (private bucket).
- [ ] Open a few avatars, thumbnails, and certificate PDFs in the browser. They should load without 404s.
- [ ] Upload a new avatar/thumbnail and confirm it goes to S3.
- [ ] Monitor the server logs for S3 errors on first deploy.
- [ ] Confirm `file_blobs` table size is stable or shrinking.
- [ ] Confirm `server/uploads/` contains only files you expect (ideally none, unless you skipped disk migration).

---

## Troubleshooting

### Migration script fails with `S3 config error`

Make sure `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and either `S3_REGION` or `S3_ENDPOINT` are set in `server/.env`.

### Migrated files return 404 in the browser

- Public bucket: verify the S3 object ACL or bucket policy allows public reads.
- Private bucket: verify `S3_PUBLIC=false` is set and the `/uploads/s3/:key(*)` route is reachable.
- Check the object key in the S3 console matches the `path` stored in the database.

### Migration is too slow

Increase `MIGRATE_BATCH_SIZE` or run the script in stages by table. For very large datasets, consider adding a `WHERE id > ?` pagination instead of `OFFSET`.

### R2 objects fail to upload

Do not set `S3_ACL` for R2. R2 rejects requests that include the `ACL` parameter.

---

## Related files

| File | Role |
|---|---|
| `server/config/storage.js` | Storage abstraction: `saveFile`, `readFile`, `deleteFile`, `streamFile`, S3/R2 support |
| `server/config/uploads.js` | Upload root, directory helpers, MIME/extension allowlists |
| `server/server.js` | S3 proxy route at `GET /uploads/s3/:key(*)` when `STORAGE_DRIVER=s3` |
| `server/.env.example` | Documented S3 and R2 environment variables |
| `server/scripts/migrate-blobs-to-s3.js` | Migration script |
