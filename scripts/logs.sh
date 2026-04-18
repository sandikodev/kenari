#!/usr/bin/env bash
# kenari logs — tail service logs
# Usage: ./scripts/logs.sh [--all]
if [ "$1" = "--all" ]; then
  cd "$(dirname "$0")/.."
  docker compose logs -f --tail=100
else
  docker logs kenari-gateway -f --tail=100
fi
