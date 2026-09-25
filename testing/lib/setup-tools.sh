#!/bin/bash
set -e
need=()
command -v xvfb-run >/dev/null || need+=(xvfb)
command -v zip >/dev/null || need+=(zip)
command -v wine >/dev/null || need+=(wine wine32:i386)
if [ ${#need[@]} -gt 0 ]; then
  dpkg --print-foreign-architectures | grep -q i386 || dpkg --add-architecture i386
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${need[@]}"
fi
if ! command -v rcodesign >/dev/null; then
  V=0.29.0
  curl -sSL "https://github.com/indygreg/apple-platform-rs/releases/download/apple-codesign%2F$V/apple-codesign-$V-x86_64-unknown-linux-musl.tar.gz" | tar -xz -C /tmp
  install -m 755 /tmp/apple-codesign-$V-x86_64-unknown-linux-musl/rcodesign /usr/local/bin/rcodesign
fi
(cd "$(dirname "$0")/.." && npm install --no-audit --no-fund >/dev/null)
echo "tools ready: $(wine --version), $(rcodesign --version 2>/dev/null | head -1)"
