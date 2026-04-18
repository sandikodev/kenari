#!/usr/bin/env bash
# kenari deploy — rebuild and redeploy gateway
# Usage: ./scripts/deploy.sh [container-name] [env-file]
#   container-name: default = first service in docker-compose.yml
#   env-file:       default = .env.production
set -e
cd "$(dirname "$0")/.."

ENV_FILE="${2:-.env.production}"
[ ! -f "$ENV_FILE" ] && echo "✗ $ENV_FILE not found" && exit 1

# Auto-detect gateway container name from compose if not provided
if [ -n "$1" ]; then
  CONTAINER="$1"
else
  CONTAINER=$(docker compose --env-file "$ENV_FILE" ps --format json 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['Name'])" 2>/dev/null \
    || docker compose --env-file "$ENV_FILE" config --services 2>/dev/null | head -1)
fi

echo "🐦 Kenari Deploy"
echo "   Container : $CONTAINER"
echo "   Env file  : $ENV_FILE"
echo ""

echo "→ Building image..."
docker build -t kenari:latest .

echo "→ Recreating $CONTAINER..."
docker compose --env-file "$ENV_FILE" up -d --force-recreate --no-deps "$CONTAINER"

sleep 3
STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "not found")
[ "$STATUS" = "running" ] && echo "✓ $CONTAINER is running" || { echo "✗ Failed — check: docker logs $CONTAINER"; exit 1; }
