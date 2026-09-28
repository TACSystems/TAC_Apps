#!/bin/bash
T="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$T/.." && pwd)"
export TQ_BASE="${TQ_BASE:-http://127.0.0.1:3200}"
export TQ_WORK="${TQ_WORK:-/tmp/tq-test}"
export TQ_VERSION="${TQ_VERSION:-$(node -p "require('$ROOT/apps/tac-qual/package.json').version")}"
export CHROMIUM_PATH="${CHROMIUM_PATH:-/opt/pw-browsers/chromium}"
mkdir -p "$TQ_WORK"
[ -d "$ROOT/apps/tac-qual/electron/resources/server" ] || { echo "Run npm run electron:prepare in apps/tac-qual first."; exit 1; }
total_fail=0
run() {
  local suite=$1 db="$TQ_WORK/db"
  rm -rf "$db" && mkdir -p "$db"
  bash "$T/lib/start-tq.sh" "$db" 3200 >/dev/null
  node "$T/lib/seed-tq.cjs" "$db/tacqual.db" >/dev/null
  local out; out=$(cd "$T" && timeout 600 node "e2e/$suite.mjs" "$db" 2>&1); local rc=$?
  local pass fail; pass=$(grep -c '^PASS' <<<"$out"); fail=$(grep -c '^FAIL' <<<"$out")
  if [ $rc -ne 0 ] && [ "$fail" = 0 ]; then fail=1; fi
  printf "%-28s pass=%-4s fail=%s\n" "$suite" "$pass" "$fail"
  [ "$fail" != 0 ] && { grep -v '^PASS' <<<"$out" | grep -v '^\s*at ' | head -15 | sed 's/^/    /'; total_fail=$((total_fail + fail)); }
}
run tq-v040-dashboard
run tq-v040-help
run tq-v051-certifications
run tq-v051-class-cert
run tq-v051-certificates
run tq-v051-currency
for p in $(pgrep -f "^next-server|^node server.js"); do kill $p; done
echo "TOTAL FAILURES: $total_fail"
[ "$total_fail" = 0 ]
