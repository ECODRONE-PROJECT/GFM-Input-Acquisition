#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-10000}"
WORKERS="${WEB_CONCURRENCY:-1}"

exec uvicorn main:app \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --workers "${WORKERS}" \
  --proxy-headers \
  --forwarded-allow-ips="*"
