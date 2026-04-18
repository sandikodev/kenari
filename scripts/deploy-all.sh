#!/usr/bin/env bash
# kenari deploy:all — rebuild and redeploy all services
set -e
cd "$(dirname "$0")/.."

[ ! -f .env.production ] && echo "✗ .env.production not found" && exit 1

echo "→ Building image..."
docker build -t kenari:latest .

echo "→ Starting all services..."
docker compose --env-file .env.production up -d --force-recreate

docker compose ps --format "table {{.Name}}\t{{.Status}}"
echo "✓ Done"
