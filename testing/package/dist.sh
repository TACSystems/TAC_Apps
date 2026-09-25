#!/bin/bash
set -e
T="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$T/.." && pwd)"
APP="$ROOT/apps/tac-log"
V="$(node -p "require('$APP/package.json').version")"
OUT="${1:-${TL_WORK:-/tmp/tl-test}/dist-$V}"
LOG="${TL_WORK:-/tmp/tl-test}"
mkdir -p "$LOG"
cd "$APP"
[ -n "$SKIPBUILD" ] || npm run electron:prepare > "$LOG/build.log" 2>&1
rm -rf release
export CSC_IDENTITY_AUTO_DISCOVERY=false WINEDEBUG=-all
../../node_modules/.bin/electron-builder --win nsis --x64 > "$LOG/win.log" 2>&1
../../node_modules/.bin/electron-builder --mac dir --arm64 > "$LOG/mac.log" 2>&1
../../node_modules/.bin/electron-builder --linux dir --x64 > "$LOG/linux.log" 2>&1
(cd release/mac-arm64 && rcodesign sign TAC-LOG.app > "$LOG/sign.log" 2>&1)
EXE="TAC-LOG-Setup-$V.exe"; ZIP="TAC-LOG-$V-mac-arm64.zip"
rm -rf "$OUT" && mkdir -p "$OUT/full" "$OUT/tac-log-$V-win" "$OUT/tac-log-$V-mac" "$OUT/tac-log-$V-release"
(cd release/mac-arm64 && zip -qry "$OUT/full/$ZIP" TAC-LOG.app)
cp "release/$EXE" "$OUT/full/"
(cd "$OUT/full" && sha256sum "$EXE" "$ZIP" > SHA256SUMS.txt)
H="$(sha256sum "$OUT/full/$EXE" | cut -d' ' -f1)"
split -b 18m -d -a 1 "$OUT/full/$EXE" "$OUT/tac-log-$V-win/TAC-LOG-Setup-$V.part"
split -b 25m -d -a 1 "$OUT/full/$ZIP" "$OUT/tac-log-$V-mac/$ZIP.part"
P="$(cd "$OUT/tac-log-$V-win" && ls TAC-LOG-Setup-$V.part* | sort | paste -sd+)"
printf '@echo off\r\ncd /d "%%~dp0"\r\ncopy /b %s "%s" >nul\r\ncertutil -hashfile "%s" SHA256 | findstr /i /c:"%s" >nul && (echo Installer rebuilt and verified. Starting setup... & start "" "%s") || (echo Verification FAILED - one of the part files is missing or damaged. & pause)\r\n' "$P" "$EXE" "$EXE" "$H" "$EXE" > "$OUT/tac-log-$V-win/BUILD-INSTALLER.bat"
cp "$OUT/full/SHA256SUMS.txt" "$OUT/tac-log-$V-release/"
awk -v v="$V" '$0 ~ "^## \\[" v "\\]" {f=1; next} /^## \[/ {f=0} f' "$APP/CHANGELOG.md" | sed '/./,$!d' > "$OUT/tac-log-$V-release/RELEASE-NOTES.md"
echo "$OUT"
