#!/usr/bin/env bash
# kenari db:migrate:prod — apply schema migrations inside running gateway container
# Usage: ./scripts/db-migrate-prod.sh [container-name] [db-path]
#   container-name: default = auto-detect from running containers
#   db-path:        default = file:/app/data/monitor.db
set -e

# Auto-detect container: prefer arg, then look for running container with 'kenari' or 'gateway' in name
if [ -n "$1" ]; then
  CONTAINER="$1"
else
  CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'kenari|gateway' | head -1)
fi

DB_PATH="${2:-file:/app/data/monitor.db}"

[ -z "$CONTAINER" ] && echo "✗ No running container found. Pass container name as first argument." && exit 1

docker inspect "$CONTAINER" &>/dev/null || { echo "✗ Container '$CONTAINER' not found or not running"; exit 1; }

echo "🐦 Kenari DB Migration"
echo "   Container : $CONTAINER"
echo "   Database  : $DB_PATH"
echo ""

docker exec "$CONTAINER" node -e "
const {createClient} = require('@libsql/client');
const db = createClient({url:'${DB_PATH}'});
const migrations = [
  'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT, github_id TEXT UNIQUE, avatar_url TEXT, role TEXT NOT NULL DEFAULT \"viewer\", created_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT REFERENCES users(id), action TEXT NOT NULL, detail TEXT, ip TEXT, user_agent TEXT, created_at INTEGER NOT NULL, hash TEXT)',
  'CREATE TABLE IF NOT EXISTS failed_logins (id INTEGER PRIMARY KEY AUTOINCREMENT, ip TEXT NOT NULL, email TEXT, created_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, name TEXT NOT NULL, token TEXT NOT NULL UNIQUE, last_seen INTEGER, created_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS agent_metrics (id INTEGER PRIMARY KEY AUTOINCREMENT, agent_id TEXT NOT NULL REFERENCES agents(id), cpu_percent REAL NOT NULL, memory_used_mb REAL NOT NULL, memory_total_mb REAL NOT NULL, disk_used_gb REAL NOT NULL, disk_total_gb REAL NOT NULL, uptime_secs INTEGER NOT NULL, created_at INTEGER NOT NULL)',
];
const alters = [
  'ALTER TABLE users ADD COLUMN avatar_url TEXT',
  'ALTER TABLE audit_log ADD COLUMN user_agent TEXT',
];
async function run() {
  for (const sql of migrations) await db.execute(sql).catch(()=>{});
  for (const sql of alters) await db.execute(sql).catch(()=>{});
  console.log('✓ Migrations applied');
}
run().catch(e => { console.error(e.message); process.exit(1); });
"
