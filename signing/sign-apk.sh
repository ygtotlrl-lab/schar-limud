#!/bin/bash
# Re-sign an APK with the PERMANENT schar-limud key (signing/schar.keystore).
# Requires Android build-tools on PATH (zipalign + apksigner). Run wherever those exist.
# Usage: ./sign-apk.sh <unsigned.apk> [output.apk]
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
KS="$HERE/schar.keystore"
IN="${1:?usage: sign-apk.sh <unsigned.apk> [output.apk]}"
OUT="${2:-schar-signed.apk}"
ALIGNED="${OUT%.apk}-aligned.apk"

zipalign -p -f 4 "$IN" "$ALIGNED"
apksigner sign \
  --ks "$KS" --ks-key-alias schar \
  --ks-pass pass:schar123 --key-pass pass:schar123 \
  --out "$OUT" "$ALIGNED"
rm -f "$ALIGNED"
apksigner verify --print-certs "$OUT"
echo "✅ Signed with permanent key -> $OUT"
