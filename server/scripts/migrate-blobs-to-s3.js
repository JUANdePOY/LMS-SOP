#!/usr/bin/env node
/**
 * migrate-blobs-to-s3.js
 *
 * Migrates existing uploads from mysql_blob / local disk to S3/R2.
 *
 * Usage:
 *   # Dry run (no changes, just reports what would happen)
 *   MIGRATE_DRY_RUN=true node server/scripts/migrate-blobs-to-s3.js
 *
 *   # Live migration
 *   node server/scripts/migrate-blobs-to-s3.js
 *
 * Required env vars for live run:
 *   STORAGE_DRIVER=s3 (auto-set by this script)
 *   S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 *   S3_REGION or S3_ENDPOINT
 *
 * Optional:
 *   MIGRATE_BATCH_SIZE (default 200)
 */

require('dotenv').config();

const DRY_RUN = process.env.MIGRATE_DRY_RUN === 'true';

if (!DRY_RUN) {
  process.env.STORAGE_DRIVER = 's3';
}

const storage = require('../config/storage');
const db = require('../config/database');
const fs = require('fs/promises');
const path = require('path');

async function main() {
  if (storage.isS3()) {
    try {
      storage.validateS3Config();
      console.log('S3 config validated');
    } catch (err) {
      console.error('S3 config error:', err.message);
      process.exit(1);
    }
  } else if (!DRY_RUN) {
    console.error('Set MIGRATE_DRY_RUN=true to preview, or run without it to enable S3 mode');
    process.exit(1);
  }

  console.log('=== Migration: mysql_blob/disk -> S3 ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);

  await migrateFileBlobs();
  await migrateDiskFiles();
  await migrateInlineBlobs();

  console.log('\n=== Migration finished ===');
}

async function query(sql, params) {
  const [rows] = await db.query(sql, params);
  return rows;
}

async function execute(sql, params) {
  const [result] = await db.query(sql, params);
  return result;
}

async function migrateFileBlobs() {
  console.log('\n[1/3] Migrating file_blobs table...');

  const BATCH = parseInt(process.env.MIGRATE_BATCH_SIZE || '200', 10);
  let offset = 0;
  let totalProcessed = 0;
  let totalErrors = 0;
  const urlMap = new Map();

  while (true) {
    const [rows] = await query(
      'SELECT id, path, content_type, size_bytes, file_data FROM file_blobs WHERE file_data IS NOT NULL LIMIT ? OFFSET ?',
      [BATCH, offset]
    );
    if (!rows.length) break;

    for (const row of rows) {
      try {
        const relativePath = row.path;
        const dir = path.posix.dirname(relativePath);
        const filename = path.posix.basename(relativePath);
        const localUrl = `/uploads/${relativePath}`;

        if (DRY_RUN) {
          urlMap.set(localUrl, `[DRY RUN] ${localUrl}`);
          totalProcessed++;
          continue;
        }

        const [blobRow] = await query('SELECT file_data FROM file_blobs WHERE id = ?', [row.id]);
        const buffer = blobRow.file_data;
        if (!buffer) continue;

        const s3Url = await storage.saveFile({
          buffer,
          dir,
          filename,
          contentType: row.content_type,
        });

        urlMap.set(localUrl, s3Url);
        await execute('DELETE FROM file_blobs WHERE id = ?', [row.id]);
        totalProcessed++;

        if (totalProcessed % 50 === 0) {
          console.log(`  Uploaded ${totalProcessed} blobs...`);
        }
      } catch (err) {
        totalErrors++;
        console.error(`  Error migrating blob id=${row.id}:`, err.message);
      }
    }

    offset += BATCH;
    if (rows.length < BATCH) break;
  }

  console.log(`  Blobs processed: ${totalProcessed}, errors: ${totalErrors}`);

  if (!urlMap.size) return;

  // Update entity tables that reference local /uploads/... URLs
  const entityUpdates = [
    { table: 'users', column: 'avatar_url' },
    { table: 'courses', column: 'thumbnail_url' },
    { table: 'module_content', column: 'thumbnail_url' },
    { table: 'certificate_templates', column: 'frame_storage_path' },
    { table: 'certificate_signatures', column: 'storage_path' },
    { table: 'certificate_issuances', column: 'pdf_storage_path' },
    { table: 'submissions', column: 'file_path' },
    { table: 'internal_training_attachments', column: 'relative_path' },
    { table: 'external_training_attachments', column: 'relative_path' },
  ];

  for (const entity of entityUpdates) {
    try {
      const [urlRows] = await query(
        `SELECT DISTINCT ${entity.column} as url FROM ${entity.table} WHERE ${entity.column} LIKE '/uploads/%'`
      );
      let updated = 0;
      for (const row of urlRows) {
        const s3Url = urlMap.get(row.url);
        if (s3Url) {
          if (DRY_RUN) {
            console.log(`  [DRY RUN] Would update ${entity.table}.${entity.column}: ${row.url} -> ${s3Url}`);
          } else {
            await execute(`UPDATE ${entity.table} SET ${entity.column} = ? WHERE ${entity.column} = ?`, [s3Url, row.url]);
          }
          updated++;
        }
      }
      if (updated > 0) {
        console.log(`    ${entity.table}.${entity.column}: ${updated} rows ${DRY_RUN ? '(dry run)' : 'updated'}`);
      }
    } catch (err) {
      // Table or column may not exist in this schema version
      console.error(`    Skipping ${entity.table}.${entity.column}: ${err.message}`);
    }
  }
}

async function migrateDiskFiles() {
  console.log('\n[2/3] Migrating disk-based files...');

  const uploadsConfig = require('../config/uploads');
  const root = path.resolve(uploadsConfig.getUploadRoot());
  let total = 0;
  let errors = 0;

  async function migrateRelativePathRows(table, pathColumn, idColumn) {
    const [rows] = await query(
      `SELECT ${idColumn}, ${pathColumn} FROM ${table} WHERE ${pathColumn} IS NOT NULL AND ${pathColumn} != '' AND ${pathColumn} NOT LIKE 'http%'`
    );
    console.log(`  ${table}: ${rows.length} rows`);

    for (const row of rows) {
      try {
        const rel = row[pathColumn];
        if (!rel) continue;

        const absPath = path.resolve(root, rel);
        const relFromRoot = path.relative(root, absPath);
        if (relFromRoot.startsWith('..') || path.isAbsolute(relFromRoot)) {
          console.error(`    Skipping invalid path: ${rel}`);
          continue;
        }

        const buffer = await fs.readFile(absPath);
        const s3Url = await storage.saveFile({
          buffer,
          dir: path.posix.dirname(rel),
          filename: path.posix.basename(rel),
          contentType: undefined,
        });

        if (!DRY_RUN) {
          await execute(`UPDATE ${table} SET ${pathColumn} = ? WHERE ${idColumn} = ?`, [s3Url, row[idColumn]]);
          await fs.unlink(absPath).catch(() => {});
        }

        total++;
        if (total % 20 === 0) console.log(`  Migrated ${total} disk files...`);
      } catch (err) {
        errors++;
        console.error(`    Error ${table} id=${row[idColumn]}:`, err.message);
      }
    }
  }

  const diskTables = [
    { table: 'internal_training_attachments', pathColumn: 'relative_path', idColumn: 'id' },
    { table: 'external_training_attachments', pathColumn: 'relative_path', idColumn: 'id' },
    { table: 'certificate_issuances', pathColumn: 'pdf_storage_path', idColumn: 'id' },
    { table: 'submissions', pathColumn: 'file_path', idColumn: 'id' },
  ];

  for (const cfg of diskTables) {
    try {
      await migrateRelativePathRows(cfg.table, cfg.pathColumn, cfg.idColumn);
    } catch (err) {
      console.error(`  Skipping ${cfg.table}: ${err.message}`);
    }
  }

  console.log(`  Disk files processed: ${total}, errors: ${errors}`);
}

async function migrateInlineBlobs() {
  console.log('\n[3/3] Migrating inline BLOBs (optional)...');
  console.log('  Note: This migrates BLOB columns that already survive deploys.');
  console.log('  Doing this reduces MySQL DB size. Skip if you prefer to keep them in DB.');

  let total = 0;
  let errors = 0;

  // Helper: migrate a single-row BLOB and update a URL column
  async function migrateBlobRow(table, id, dataColumn, urlColumn, dir, filename, contentType) {
    if (!dataColumn || !urlColumn) return;
    const s3Url = await storage.saveFile({
      buffer: dataColumn,
      dir,
      filename,
      contentType,
    });
    if (!DRY_RUN) {
      await execute(`UPDATE ${table} SET ${urlColumn} = ?, ${dataColumn} = NULL WHERE id = ?`, [s3Url, id]);
    }
  }

  // --- Businesses ---
  try {
    const [rows] = await query('SELECT id, logo_data, logo_name, logo_mime_type FROM businesses WHERE logo_data IS NOT NULL');
    console.log(`  businesses: ${rows.length} logos`);
    for (const row of rows) {
      try {
        if (!DRY_RUN) {
          const s3Url = await storage.saveFile({
            buffer: row.logo_data,
            dir: 'businesses',
            filename: row.logo_name || `business-${row.id}.bin`,
            contentType: row.logo_mime_type,
          });
          await execute('UPDATE businesses SET logo_url = ?, logo_data = NULL, logo_name = NULL, logo_mime_type = NULL, logo_size = NULL WHERE id = ?', [s3Url, row.id]);
        }
        total++;
      } catch (e) {
        errors++;
        console.error(`    Error business ${row.id}:`, e.message);
      }
    }
  } catch (err) {
    console.error('  businesses migration failed:', err.message);
  }

  // --- Certificate Templates ---
  try {
    const [rows] = await query('SELECT id, frame_data, frame_storage_path, frame_filename, frame_mime_type FROM certificate_templates WHERE frame_data IS NOT NULL');
    console.log(`  certificate_templates: ${rows.length} frames`);
    for (const row of rows) {
      try {
        const filename = row.frame_filename || path.basename(row.frame_storage_path || `frame-${row.id}.bin`);
        const rel = row.frame_storage_path || path.posix.join('certificates', 'templates', row.id, filename);
        if (!DRY_RUN) {
          const s3Url = await storage.saveFile({
            buffer: row.frame_data,
            dir: path.posix.dirname(rel),
            filename: path.posix.basename(rel),
            contentType: row.frame_mime_type,
          });
          await execute('UPDATE certificate_templates SET frame_storage_path = ?, frame_data = NULL WHERE id = ?', [s3Url, row.id]);
        }
        total++;
      } catch (e) {
        errors++;
        console.error(`    Error template ${row.id}:`, e.message);
      }
    }
  } catch (err) {
    console.error('  certificate_templates migration failed:', err.message);
  }

  // --- Certificate Signatures ---
  try {
    const [rows] = await query('SELECT id, signature_data, storage_path, filename, signature_mime_type FROM certificate_signatures WHERE signature_data IS NOT NULL');
    console.log(`  certificate_signatures: ${rows.length} signatures`);
    for (const row of rows) {
      try {
        const filename = row.filename || path.basename(row.storage_path || `signature-${row.id}.png`);
        const rel = row.storage_path || path.posix.join('certificates', 'signatures', filename);
        if (!DRY_RUN) {
          const s3Url = await storage.saveFile({
            buffer: row.signature_data,
            dir: path.posix.dirname(rel),
            filename: path.posix.basename(rel),
            contentType: row.signature_mime_type,
          });
          await execute('UPDATE certificate_signatures SET storage_path = ?, signature_data = NULL WHERE id = ?', [s3Url, row.id]);
        }
        total++;
      } catch (e) {
        errors++;
        console.error(`    Error signature ${row.id}:`, e.message);
      }
    }
  } catch (err) {
    console.error('  certificate_signatures migration failed:', err.message);
  }

  // --- Task Attachments ---
  try {
    const [rows] = await query('SELECT id, file_data, original_name, mime_type FROM task_attachments WHERE file_data IS NOT NULL');
    console.log(`  task_attachments: ${rows.length} files`);
    for (const row of rows) {
      try {
        const ext = path.extname(row.original_name || '').toLowerCase() || '.bin';
        const filename = `${row.id}${ext}`;
        if (!DRY_RUN) {
          const s3Url = await storage.saveFile({
            buffer: row.file_data,
            dir: 'task-attachments',
            filename,
            contentType: row.mime_type,
          });
          // Add file_url column if missing
          await execute('ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS file_url VARCHAR(500) DEFAULT NULL').catch(() => {});
          await execute('UPDATE task_attachments SET file_url = ? WHERE id = ?', [s3Url, row.id]);
        }
        total++;
      } catch (e) {
        errors++;
        console.error(`    Error task attachment ${row.id}:`, e.message);
      }
    }
  } catch (err) {
    console.error('  task_attachments migration failed:', err.message);
  }

  // --- SOP Module Attachments ---
  try {
    const [rows] = await query('SELECT id, file_data, original_name, mime_type FROM sop_module_attachments WHERE file_data IS NOT NULL');
    console.log(`  sop_module_attachments: ${rows.length} files`);
    for (const row of rows) {
      try {
        const ext = path.extname(row.original_name || '').toLowerCase() || '.bin';
        const filename = `${row.id}${ext}`;
        if (!DRY_RUN) {
          const s3Url = await storage.saveFile({
            buffer: row.file_data,
            dir: 'sop-attachments',
            filename,
            contentType: row.mime_type,
          });
          await execute('ALTER TABLE sop_module_attachments ADD COLUMN IF NOT EXISTS file_url VARCHAR(500) DEFAULT NULL').catch(() => {});
          await execute('UPDATE sop_module_attachments SET file_url = ? WHERE id = ?', [s3Url, row.id]);
        }
        total++;
      } catch (e) {
        errors++;
        console.error(`    Error SOP attachment ${row.id}:`, e.message);
      }
    }
  } catch (err) {
    console.error('  sop_module_attachments migration failed:', err.message);
  }

  console.log(`  Inline BLOBs processed: ${total}, errors: ${errors}`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
