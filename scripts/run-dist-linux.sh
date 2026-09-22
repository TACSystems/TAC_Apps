#!/bin/bash
set -e
cd "$(dirname "$0")/.."
rm -rf release
CSC_IDENTITY_AUTO_DISCOVERY=false node_modules/.bin/electron-builder --linux dir > /tmp/eb.log 2>&1
echo DONE >> /tmp/eb.log
