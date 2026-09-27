#!/bin/bash
# signing/sign-apk.sh — חתימת ה-APK במפתח הקבוע
set -euo pipefail

# שני המשתנים נופלים ברעש כשהם חסרים — ברירת מחדל הייתה מחפשת מפתח שאיש לא התכוון אליו.
KS="${SIGN_KEYSTORE:?SIGN_KEYSTORE is unset — the keystore lives in GitHub Secrets, not in the repo}"
PASS="${SIGN_PASS:?SIGN_PASS is unset — the store password lives in GitHub Secrets, not in the repo}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
command -v node >/dev/null || { echo "❌ node not on PATH — the fingerprint is read from app.config.js" >&2; exit 1; }
EXPECTED_SHA256="$(node "$ROOT/tools/gen-app.mjs" --get signSha256)"
printf '%s' "$EXPECTED_SHA256" | grep -qE '^([0-9A-F]{2}:){31}[0-9A-F]{2}$' || {
  echo "❌ app.config.js carries no valid signSha256 — refusing to sign" >&2; exit 1; }

IN="${1:?usage: sign-apk.sh <unsigned.apk> [output.apk]}"
OUT="${2:-app-signed.apk}"
ALIGNED="${OUT%.apk}-aligned.apk"

for tool in zipalign apksigner keytool; do
  command -v "$tool" >/dev/null || { echo "❌ $tool not on PATH (Android build-tools / JDK)" >&2; exit 1; }
done
[ -f "$KS" ] || { echo "❌ missing keystore: $KS" >&2; exit 1; }

# קריאה אחת למפתח, ושתי המדידות ממנה — קריאה שנייה היא הזדמנות שנייה לסטות.
KSINFO="$(keytool -list -v -keystore "$KS" -storepass "$PASS" 2>/dev/null)" || {
  echo "❌ cannot read the keystore — wrong SIGN_PASS, or the file is not a keystore" >&2
  exit 1
}

# נכשל לפני שנוגעים ב-APK — מפתח שגוי אינו ניתן לתיקון בשום התקנה קיימת.
if ! printf '%s\n' "$KSINFO" | grep -qF "SHA256: $EXPECTED_SHA256"; then
  echo "❌ keystore fingerprint does NOT match the expected key. Refusing to sign." >&2
  echo "   expected SHA256: $EXPECTED_SHA256" >&2
  exit 1
fi

# ה-alias נגזר מהמפתח — הוא נבדל בין האפליקציות, וערך מוקלד היה ערך אפליקציה מחוץ לתצורה.
# מפתח שאין בו בדיוק מפתח פרטי אחד נופל כאן, כשההודעה עוד אומרת מה חסר.
ALIAS="$(printf '%s\n' "$KSINFO" | sed -n 's/^Alias name: //p')"
if [ "$(printf '%s\n' "$ALIAS" | grep -c . || true)" != '1' ]; then
  echo "❌ the keystore does not carry exactly one alias. Refusing to sign." >&2
  exit 1
fi

# zipalign לפני apksigner — zipalign אחרי החתימה פוסל את חתימת v2/v3.
zipalign -p -f 4 "$IN" "$ALIGNED"
apksigner sign \
  --ks "$KS" --ks-key-alias "$ALIAS" \
  --ks-pass "pass:$PASS" --key-pass "pass:$PASS" \
  --out "$OUT" "$ALIGNED"
rm -f "$ALIGNED"

apksigner verify --print-certs "$OUT"

# מאמתים את מה שנחת ב-APK בפועל — apksigner מדפיס את הטביעה בקטנות בלי נקודתיים, ו-keytool בגדולות עם נקודתיים,
# ולכן שני הצדדים מנורמלים לפני ההשוואה.
normalise() { tr -d ':' | tr 'A-Z' 'a-z'; }
WANT="$(printf '%s' "$EXPECTED_SHA256" | normalise)"
GOT="$(apksigner verify --print-certs "$OUT" \
       | grep -i 'SHA-256 digest' | head -1 | awk '{print $NF}' | normalise)"
if [ "$WANT" != "$GOT" ]; then
  echo "❌ signed APK does not carry the expected certificate!" >&2
  echo "   expected: $WANT" >&2
  echo "   actual:   $GOT" >&2
  exit 1
fi

echo "✅ Signed with the permanent key -> $OUT"
echo "   SHA256 $EXPECTED_SHA256"
