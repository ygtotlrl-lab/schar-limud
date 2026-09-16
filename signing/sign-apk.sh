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
# Requires Android build-tools on PATH (zipalign + apksigner).
# Usage: SIGN_KEYSTORE=<path> SIGN_PASS=<store-pass> \
#          ./sign-apk.sh <unsigned.apk> [output.apk]
set -euo pipefail

# ⛔ שני המשתנים נופלים ברעש כשהם חסרים — ⚠️ ברירת מחדל כאן הייתה מחפשת
# מפתח שאיש לא התכוון אליו, והכשל היה מתגלה רק אצל משתמש מותקן.
KS="${SIGN_KEYSTORE:?SIGN_KEYSTORE is unset — the keystore lives in GitHub Secrets, not in the repo}"
PASS="${SIGN_PASS:?SIGN_PASS is unset — the store password lives in GitHub Secrets, not in the repo}"
EXPECTED_SHA256='0D:1F:DD:8B:5A:3E:9C:65:75:D8:71:80:EC:FF:62:45:CB:F1:14:E0:93:0B:5A:F5:AE:90:02:44:0D:A1:B6:4C'

IN="${1:?usage: sign-apk.sh <unsigned.apk> [output.apk]}"
OUT="${2:-schar-limud.apk}"
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

# ⭐ הבדל מכוון: ה-alias נגזר מהמפתח ⛔ ואינו מוקלד — ⚠️ בשאר הדפוס ערך
# פר-אפליקציה נכתב כערך פרטי בראש הקובץ, ⭐ וכאן הוא נקרא מהמפתח עצמו.
# שלושה נימוקים, וכל אחד מהם לבדו מספיק:
#   1. ⛔ ה-alias נבדל בין הריפו — ⚠️ והוא ערך פרטי שלישי: ⭐ השורה אומרת
#      **שניים**, ומספר שגדל הוא מספר שאיש כבר אינו סופר.
#   2. ⛔ ה-workflow זהה בית-לבית בחמישה — ⚠️ ולכן אי אפשר להעביר אותו
#      משם: ⭐ סוד שלישי היה ידית שלישית שהמנהל צריך לתחזק.
#   3. ⛔ וה-workflow אינו רשאי להריץ `keytool` — ⚠️ שער הבנייה אוסר
#      לוגיקת חתימה בגוף ה-YAML: ⭐ מסלול חתימה שני הוא מה שנסחף.
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
