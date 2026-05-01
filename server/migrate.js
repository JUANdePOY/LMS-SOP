/**
 * migrate.js
 * ─────────────────────────────────────────────────────────────
 * Runs all pending SQL migration files in order.
 * Tracks executed migrations in the `migrations` table.
 *
 * Usage:
 *   node migrate.js          — run all pending migrations
 *   node migrate.js --seed   — run migrations + seed file
 *   node migrate.js --fresh  — DROP all tables and re-run everything
 *
 * Place this file in: server/
 */

const mysql  = require("mysql2/promise");
const fs     = require("fs");
const path   = require("path");
require("dotenv").config();

// ── DB config from your .env ──────────────────────────────────
const DB_CONFIG = {
  host:     process.env.DB_HOST     || "localhost",
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "airforce_db",
  multipleStatements: true,   // required to run multi-statement SQL files
};

// ── Migrations folder ─────────────────────────────────────────
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

// ── Helpers ───────────────────────────────────────────────────
const log  = (msg)  => console.log(`\x1b[36m[migrate]\x1b[0m ${msg}`);
const ok   = (msg)  => console.log(`\x1b[32m[  OK   ]\x1b[0m ${msg}`);
const warn = (msg)  => console.log(`\x1b[33m[ SKIP  ]\x1b[0m ${msg}`);
const err  = (msg)  => console.error(`\x1b[31m[ ERROR ]\x1b[0m ${msg}`);

async function run() {
  const args  = process.argv.slice(2);
  const fresh = args.includes("--fresh");
  const seed  = args.includes("--seed") || fresh;

  let conn;

  try {
    // ── Connect ───────────────────────────────────────────────
    log(`Connecting to ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}…`);
    conn = await mysql.createConnection(DB_CONFIG);
    ok("Connected.");

    // ── Fresh mode: drop all tracked tables ───────────────────
    if (fresh) {
      warn("--fresh flag detected. Dropping all tables…");
      await conn.query("SET FOREIGN_KEY_CHECKS = 0");
      await conn.query("DROP TABLE IF EXISTS reservists, squadrons, `groups`, arcens, migrations");
      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
      warn("All tables dropped.");
    }

    // ── Ensure migrations tracker table exists ────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL UNIQUE,
        run_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // ── Get already-run migrations ────────────────────────────
    const [rows] = await conn.query("SELECT filename FROM migrations");
    const done   = new Set(rows.map((r) => r.filename));

    // ── Read migration files in order ─────────────────────────
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .filter((f) => seed ? true : !f.includes("seed"))  // skip seed unless --seed
      .sort();                                             // 000, 001, 002 … order

    if (files.length === 0) {
      warn("No migration files found in /migrations folder.");
      return;
    }

    let ran = 0;

    for (const file of files) {
      // Skip tracker file — already handled above
      if (file === "000_create_migrations_tracker.sql") continue;

      if (done.has(file)) {
        warn(`${file} — already run, skipping.`);
        continue;
      }

      const filepath = path.join(MIGRATIONS_DIR, file);
      const sql      = fs.readFileSync(filepath, "utf8");

      log(`Running ${file}…`);
      await conn.query(sql);
      await conn.query("INSERT INTO migrations (filename) VALUES (?)", [file]);
      ok(`${file} — done.`);
      ran++;
    }

    if (ran === 0) {
      log("Nothing to migrate — all files already applied.");
    } else {
      ok(`${ran} migration(s) applied successfully.`);
    }

  } catch (e) {
    err(e.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
