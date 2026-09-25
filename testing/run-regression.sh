#!/bin/bash
T="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$T/.." && pwd)"
export TL_WORK="${TL_WORK:-/tmp/tl-test}"
export TL_VERSION="${TL_VERSION:-$(node -p "require('$ROOT/apps/tac-log/package.json').version")}"
mkdir -p "$TL_WORK"
[ -d "$ROOT/apps/tac-log/electron/resources/server" ] || { echo "Run npm run electron:prepare in apps/tac-log first."; exit 1; }
total_fail=0
run() {
  local suite=$1 fixture=$2 pin=$3 db="$TL_WORK/db"
  rm -rf "$db" && cp -r "$T/fixtures/$fixture" "$db"
  [ "$pin" = pin ] && node "$T/lib/mkpin.cjs" "$db" >/dev/null
  bash "$T/lib/start-server.sh" "$db"
  local out; out=$(cd "$T" && timeout 600 node "e2e/$suite.mjs" "$db" 2>&1); local rc=$?
  local pass fail; pass=$(grep -c '^PASS' <<<"$out"); fail=$(grep -c '^FAIL' <<<"$out")
  grep -q "ALL PASS" <<<"$out" && [ "$fail" = 0 ] && pass="all"
  if [ $rc -ne 0 ] && [ "$fail" = 0 ]; then fail=1; fi
  printf "%-22s %-4s pass=%-4s fail=%s\n" "$suite" "$fixture" "$pass" "$fail"
  [ "$fail" != 0 ] && { grep -v '^PASS' <<<"$out" | grep -v '^\s*at ' | head -15 | sed 's/^/    /'; total_fail=$((total_fail + fail)); }
}
run security v5 pin
run v051-armory v5
run v060-courses-nav v5
run v070-counts v5
run v070-range-day v5
run v071-settings v5
run v080-sessions-ammo v71
run v080-ammo-lines v71
for p in $(pgrep -f "^next-server|^node server.js"); do kill $p; done
echo "TOTAL FAILURES: $total_fail"
[ "$total_fail" = 0 ]
