#!/bin/bash
T="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$T/.." && pwd)"
export TL_WORK="${TL_WORK:-/tmp/tl-test}"
R="$TL_WORK/relocated/TAC LOG moved"; H="$TL_WORK/pkghome"
rm -rf "$TL_WORK/relocated" "$H" && mkdir -p "$TL_WORK/relocated"
cp -r "$ROOT/apps/tac-log/release/linux-unpacked" "$R"
go() {
  (cd "$R" && HOME="$H" setsid nohup timeout 60 xvfb-run -a ./tac-log --no-sandbox --remote-debugging-port=9335 > "$TL_WORK/pkg.log" 2>&1 &)
  sleep 15; (cd "$T" && timeout 40 node package/smoke.mjs)
  pkill -f "remote-debugging-port=933[5]"; sleep 2
}
echo "== fresh install"; go
echo "== upgrade from 0.8.0 data"
rm -rf "$H/.config/TAC-LOG/data" && mkdir -p "$H/.config/TAC-LOG/data" && cp "$T/fixtures/v80/"* "$H/.config/TAC-LOG/data/"
go
ls "$H/.config/TAC-LOG/data/pre-upgrade"
