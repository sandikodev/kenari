#!/usr/bin/env bash
# kenari logs — tail service logs
# Usage: ./scripts/logs.sh [container-name|--all] [env-file]
#   --all: tail all services via docker compose
set -e

if [ "$1" = "--all" ]; then
  cd "$(dirname "$0")/.."
  ENV_FILE="${2:-.env.production}"
  docker compose --env-file "$ENV_FILE" logs -f --tail=100
  exit 0
fi

# Auto-detect container
if [ -n "$1" ]; then
  CONTAINER="$1"
else
  CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'kenari|gateway' | head -1)
fi

[ -z "$CONTAINER" ] && echo "✗ No container found. Pass container name or use --all" && exit 1

echo "🐦 Tailing logs for: $CONTAINER  (Ctrl+C to stop)"
docker logs "$CONTAINER" -f --tail=100
