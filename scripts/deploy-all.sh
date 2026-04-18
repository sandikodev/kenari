#!/usr/bin/env bash
# kenari deploy:all — rebuild and redeploy all services
# Usage: ./scripts/deploy-all.sh [env-file]
set -e
cd "$(dirname "$0")/.."

ENV_FILE="${1:-.env.production}"
[ ! -f "$ENV_FILE" ] && echo "✗ $ENV_FILE not found" && exit 1

echo "🐦 Kenari Deploy All"
echo "   Env file: $ENV_FILE"
echo ""

echo "→ Building image..."
docker build -t kenari:latest .

echo "→ Starting all services..."
docker compose --env-file "$ENV_FILE" up -d --force-recreate

echo ""
docker compose --env-file "$ENV_FILE" ps
echo "✓ Done"
