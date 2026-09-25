#!/bin/bash
T="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$T/.." && pwd)"
APP="$ROOT/apps/tac-log"
export TL_WORK="${TL_WORK:-/tmp/tl-test}"
export TL_VERSION="${TL_VERSION:-$(node -p "require('$APP/package.json').version")}"
NEXT="$(node -p "'$TL_VERSION'.replace(/(\d+)$/, (m) => String(Number(m) + 1))")"
U="$TL_WORK/upd"
rm -rf "$U" "$TL_WORK/devhome" && mkdir -p "$U" "$TL_WORK/devhome"
printf '#!/bin/sh\necho "installed $@" > %s/installed.txt\n' "$U" > "$U/TAC-LOG-Setup-$NEXT.exe"
(cd "$U" && sha256sum "TAC-LOG-Setup-$NEXT.exe" > SHA256SUMS.txt)
: > "$U/requests.log"
S="$APP/.next/standalone/apps/tac-log"
[ -f "$S/server.js" ] || { echo "Run npm run electron:prepare in apps/tac-log first."; exit 1; }
rm -rf "$S/.next/static" && mkdir -p "$S/.next" && cp -r "$APP/.next/static" "$S/.next/static" && cp -r "$APP/public" "$S/" 2>/dev/null
node "$T/updater/mock-github.mjs" > "$U/mock.log" 2>&1 & MOCK=$!
launch() {
  (cd "$APP" && HOME="$TL_WORK/devhome" TACLOG_UPDATE_API=http://127.0.0.1:4777 TACLOG_UPDATE_TEST_INSTALL=1 setsid nohup \
    xvfb-run -a ../../node_modules/.bin/electron . --no-sandbox --remote-debugging-port=9334 > "$U/electron.log" 2>&1 &)
  for i in $(seq 1 60); do curl -s http://127.0.0.1:9334/json/version >/dev/null && break; sleep 0.5; done
  sleep 10
}
stop() { pkill -f "remote-debugging-port=933[4]" || true; sleep 2; }
cd "$T"
launch; timeout 120 node updater/check-install.mjs; stop
rm -f "$U/installed.txt"; rm -rf "$TL_WORK/devhome/.config/TAC-LOG/updates"
launch; timeout 120 node updater/missing-installer.mjs; stop
kill $MOCK 2>/dev/null || true
