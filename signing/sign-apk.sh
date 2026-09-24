#!/bin/bash
# Sign an APK with the project's PERMANENT key.
#
# ⛔ זה המפתח היחיד: חתימה בכל מפתח אחר מייצרת אפליקציה זרה, וכל המשתמשים
# ייתקלו ב-INSTALL_FAILED_UPDATE_INCOMPATIBLE בלי שום דרך חזרה.
#
# ⛔ המפתח והסיסמה אינם בעץ — הריפו פומבי, וקובץ מחויב הוא קובץ ציבורי:
# מי שמחזיק את שניהם חותם APK שאנדרואיד מקבל כעדכון לגיטימי. הם חיים
# ב-GitHub Secrets, נמשכים בזמן בנייה, ומגיעים לכאן דרך הסביבה.
#
# ⛔ טביעת המפתח נקראת מהתצורה — ⚠️ `signSha256` שב-`app.config.js`, ⭐ והקובץ
# הזה אינו נושא ערך של אפליקציה.
#
# Requires Android build-tools on PATH (zipalign + apksigner) and node.
# Usage: SIGN_KEYSTORE=<path> SIGN_PASS=<store-pass> \
#          ./sign-apk.sh <unsigned.apk> [output.apk]
set -euo pipefail

# ⛔ שני המשתנים נופלים ברעש כשהם חסרים — ⚠️ ברירת מחדל כאן הייתה מחפשת
# מפתח שאיש לא התכוון אליו, והכשל היה מתגלה רק אצל משתמש מותקן.
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

# ⛔ קריאה אחת למפתח, ושתי המדידות ממנה — ⚠️ קריאה שנייה היא הזדמנות
# שנייה לסטות, ⭐ ושתי התשובות חייבות לתאר את אותו קובץ בדיוק.
KSINFO="$(keytool -list -v -keystore "$KS" -storepass "$PASS" 2>/dev/null)" || {
  echo "❌ cannot read the keystore — wrong SIGN_PASS, or the file is not a keystore" >&2
  exit 1
}

# Fail before touching the APK if the keystore is not the key we expect. A wrong
# key here is unrecoverable for every existing install, so this is a hard gate.
if ! printf '%s\n' "$KSINFO" | grep -qF "SHA256: $EXPECTED_SHA256"; then
  echo "❌ keystore fingerprint does NOT match the expected key. Refusing to sign." >&2
  echo "   expected SHA256: $EXPECTED_SHA256" >&2
  exit 1
fi

# ⛔ ה-alias נגזר מהמפתח ⛔ ואינו מוקלד — ⚠️ הוא נבדל בין האפליקציות, ⭐ והמפתח
# עצמו הוא המקור היחיד שאינו יכול לסטות ממנו: ⛔ ערך מוקלד היה עוד ערך
# אפליקציה מחוץ לתצורה, ⚠️ וסוד נוסף היה ידית שהמנהל צריך לתחזק.
# ⛔ ומפתח שאין בו בדיוק מפתח פרטי אחד נופל כאן ולא בשלב החתימה, שבו
# ההודעה כבר אינה אומרת מה חסר.
ALIAS="$(printf '%s\n' "$KSINFO" | sed -n 's/^Alias name: //p')"
if [ "$(printf '%s\n' "$ALIAS" | grep -c . || true)" != '1' ]; then
  echo "❌ the keystore does not carry exactly one alias. Refusing to sign." >&2
  exit 1
fi

# zipalign must run before apksigner — apksigner preserves alignment, zipalign
# after signing would invalidate the v2/v3 signature.
zipalign -p -f 4 "$IN" "$ALIGNED"
apksigner sign \
  --ks "$KS" --ks-key-alias "$ALIAS" \
  --ks-pass "pass:$PASS" --key-pass "pass:$PASS" \
  --out "$OUT" "$ALIGNED"
rm -f "$ALIGNED"

apksigner verify --print-certs "$OUT"

# Verify what actually landed in the APK, not just what we asked for.
# apksigner prints the digest lowercase and WITHOUT colons, while keytool prints
# it uppercase WITH colons — so both sides get normalised before comparing.
# Matching the colon form against apksigner output never succeeds.
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
