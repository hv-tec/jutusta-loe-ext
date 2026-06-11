#!/bin/bash
# Ehitab Chrome Web Store'i üleslaaditava zip-i (ainult laienduse failid, ilma arendusvaradeta).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p dist
rm -f dist/jutusta-loe-ext.zip
zip -r -q dist/jutusta-loe-ext.zip \
  manifest.json background.js content.js content.css \
  options.html options.js popup.html popup.js \
  icons \
  -x "*.DS_Store" "icons/icon512.png"
echo "✅ dist/jutusta-loe-ext.zip"
unzip -l dist/jutusta-loe-ext.zip
