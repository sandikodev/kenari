#!/usr/bin/env bash
# kenari deploy — rebuild and redeploy gateway
# Usage: ./scripts/deploy.sh [container-name] [env-file]
#   container-name: default = first service in docker-compose.yml
#   env-file:       default = .env.production
set -e
cd "$(dirname "$0")/.."

SERVICE="${1:-gateway}"
ENV_FILE="${2:-.env.production}"
CONTAINER="kenari-${SERVICE}"

echo "🐦 Kenari Deploy"
echo "   Service   : $SERVICE"
echo "   Container : $CONTAINER"
echo "   Env file  : $ENV_FILE"
echo ""

[ ! -f "$ENV_FILE" ] && echo "✗ $ENV_FILE not found" && exit 1

echo "→ Building image..."
docker build -t kenari:latest .

echo "→ Recreating $SERVICE..."
docker compose --env-file "$ENV_FILE" up -d --force-recreate --no-deps "$SERVICE"

sleep 3
STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "not found")
[ "$STATUS" = "running" ] && echo "✓ $CONTAINER is running" || { echo "✗ Failed — check: docker logs $CONTAINER"; exit 1; }
