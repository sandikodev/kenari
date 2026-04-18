#!/usr/bin/env bash
# kenari deploy — rebuild and redeploy gateway only
set -e
cd "$(dirname "$0")/.."

[ ! -f .env.production ] && echo "✗ .env.production not found" && exit 1

echo "→ Building image..."
docker build -t kenari:latest .

echo "→ Recreating gateway..."
docker compose --env-file .env.production up -d --force-recreate --no-deps gateway

sleep 3
STATUS=$(docker inspect --format='{{.State.Status}}' kenari-gateway 2>/dev/null)
[ "$STATUS" = "running" ] && echo "✓ Gateway running" || { echo "✗ Failed — check: docker logs kenari-gateway"; exit 1; }
