#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VER="${TL_VERSION:-$(node -p "require('$ROOT/apps/tac-log/package.json').version")}"
cd "$ROOT/apps/tac-log/electron/resources/server/apps/tac-log" || exit 1
for p in $(pgrep -f "^next-server|^node server.js"); do kill $p; done
sleep 0.5
FIREARMS_DB_DIR=$1 PORT=${2:-3100} HOSTNAME=127.0.0.1 TAC_LOG_VERSION=$VER TAC_LOG_LAUNCH_SECRET=$3 NODE_ENV=production setsid nohup node server.js > "${TL_WORK:-/tmp/tl-test}/server.log" 2>&1 &
for i in $(seq 1 40); do curl -s -o /dev/null http://127.0.0.1:${2:-3100}/ && break; sleep 0.5; done
