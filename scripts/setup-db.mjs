// scripts/setup-db.mjs
// Creates the Event table in the Turso database directly via @libsql/client.
// Run once locally, or add to Vercel build command.
// Usage: node scripts/setup-db.mjs

import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url) {
  console.error('❌  DATABASE_URL is not set in .env');
  process.exit(1);
}

const client = createClient({ url, ...(authToken ? { authToken } : {}) });

const SQL = [
  // Main events table
  `CREATE TABLE IF NOT EXISTS "Event" (
    "id"        TEXT    NOT NULL PRIMARY KEY,
    "city"      TEXT    NOT NULL,
    "country"   TEXT    NOT NULL,
    "lat"       REAL    NOT NULL,
    "lng"       REAL    NOT NULL,
    "name"      TEXT    NOT NULL,
    "type"      TEXT    NOT NULL DEFAULT 'LIVE EVENT',
    "users"     TEXT    NOT NULL,
    "category"  TEXT    NOT NULL,
    "duration"  TEXT    NOT NULL,
    "color"     TEXT    NOT NULL DEFAULT '#00FFFF',
    "isActive"  INTEGER NOT NULL DEFAULT 1,
    "createdAt" TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    "updatedAt" TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  // Trigger to auto-update updatedAt on row changes
  `CREATE TRIGGER IF NOT EXISTS "Event_updatedAt"
    AFTER UPDATE ON "Event"
    BEGIN
      UPDATE "Event" SET "updatedAt" = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE "id" = NEW."id";
    END`,
];

async function main() {
  console.log(`🔗  Connecting to: ${url.replace(/\?.*/, '')}`);
  for (const sql of SQL) {
    await client.execute(sql);
    const label = sql.trim().split('\n')[0].slice(0, 60);
    console.log(`✅  ${label}...`);
  }
  console.log('\n🎉  Database schema ready!');
}

main().catch((err) => {
  console.error('❌  Setup failed:', err.message);
  process.exit(1);
});
