#!/bin/bash
set -euo pipefail

APP_DIR="${1:-}"
[ -n "$APP_DIR" ] || { echo "usage: scripts/package-mac.sh apps/<app> [arm64|x64]" >&2; exit 2; }
ARCH="${2:-arm64}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/$APP_DIR"

command -v rcodesign >/dev/null || {
  echo "rcodesign not found. Install the apple-codesign release binary before packaging a mac build." >&2
  exit 3
}

NAME="$(node -p "require('./package.json').productName")"
VERSION="$(node -p "require('./package.json').version")"
OUT="release/mac-$ARCH"
ZIP="release/$NAME-$VERSION-mac-$ARCH.zip"

node scripts/prepare-electron.js
rm -rf "$OUT" "$ZIP"
npx electron-builder --mac --"$ARCH" --dir

rcodesign sign "$OUT/$NAME.app"
rcodesign print-signature-info "$OUT/$NAME.app/Contents/MacOS/$NAME" | grep -q "CodeSignatureFlags(ADHOC)"

(cd "$OUT" && zip -qry9 "../../$ZIP" "$NAME.app")

python3 - "$ZIP" <<'PY'
import stat, sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
links = [i for i in z.infolist() if stat.S_ISLNK(i.external_attr >> 16)]
if not links:
    raise SystemExit("no symlinks in the zip: the framework bundle would be broken")
print(f"{len(links)} symlinks preserved")
PY

sha256sum "$ZIP"
