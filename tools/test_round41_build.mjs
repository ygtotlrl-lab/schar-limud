#!/usr/bin/env node
/*  שער הבנייה והחתימה של המעטפת — סבב 41, כלל ברזל 14.
 *
 *  ⚠️ **הפער שנמדד (סבב 41):** gius קיבלה בסבב 39 workflow שקורא
 *  ל-`signing/sign-apk.sh`, ובסקריפט יושב **שער טביעת אצבע** — לפני
 *  החתימה ואחריה. בשלושת הריפו האחרים ה-workflow **לא קרא לסקריפט
 *  כלל**: לוגיקת `apksigner` הייתה משוכפלת בתוך ה-YAML, בלי שום שער.
 *
 *  ⛔ **וזה מסלול חתימה שני, בלי בדיקה** (סבב 41) — חתימה במפתח שגוי
 *  מייצרת אפליקציה **זרה**, וכל משתמש מותקן נתקל ב-
 *  `INSTALL_FAILED_UPDATE_INCOMPATIBLE` בלי שום דרך חזרה. מסלול שאין בו
 *  שער הוא זה שייסחף, בדיוק כפי שסבב 39 מדד על `sign-apk.bat`.
 *
 *  הבדיקה נכשלת על שבעה סוגי סטייה:
 *    א. **שם ה-workflow** אינו `Build APK` (⛔ בלי «Signed» — הקונבנציה
 *       הקנונית ×4; שם שנבדל הופך כל הוראה תפעולית לשגויה בשלושה ריפו).
 *    ב. **שם ה-artifact** אינו `<repo>-apk`.
 *    ג. **שם קובץ הפלט** אינו `<repo>.apk`, או שאינו בשורש הריפו.
 *    ד. **⭐ ה-YAML מכיל `apksigner`** — כלומר לוגיקת חתימה שנייה חזרה.
 *       זו הנקודה של הסבב הזה.
 *    ה. ה-workflow אינו קורא ל-`./signing/sign-apk.sh`, או שחסרים
 *       `set -euo pipefail` / `if-no-files-found: error`.
 *    ו. **⭐ `EXPECTED_SHA256` ריק, מציין-מקום, או בפורמט שאינו של
 *       keytool** — שער שלא מולא הוא שער שאינו נועל דבר, והוא גרוע
 *       משער שאינו קיים: הוא נראה כאילו הוא מגן.
 *    ז. הסקריפט אינו בר-הרצה (mode 100755) — ה-workflow קורא לו ישירות,
 *       וקובץ 100644 מפיל את הבנייה בשלב החתימה.
 *
 *  ⚠️ **מה השער אינו בודק, ובכוונה:** את ערך הטביעה עצמו. ⛔ הוא פרטי
 *  לכל ריפו (כלל ברזל 8 סעיף 5 — «חתימת APK» הוא פרק פרטי בהגדרה),
 *  ואיחודו יהיה שגוי ומסוכן. השער דורש **שהיא קיימת ותקינה בצורתה**.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /* שם הריפו המלא הוא גם שם ה-artifact וגם שם קובץ הפלט.
     ⛔ לא שם הקיצור של ה-keystore (סבב 41) — «schar.apk» היה שם המפתח
     ולא שם התוצר, וזה בדיוק סוג ההיסט ששני שמות לאותו דבר מייצרים. */
  repo: 'schar-limud',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const ROOT  = join(dirname(fileURLToPath(import.meta.url)), '..');
const YML   = '.github/workflows/build-apk.yml';
const SH    = 'signing/sign-apk.sh';

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

for (const p of [YML, SH]) {
  if (!fs.existsSync(join(ROOT, p))) { fail(`${p} אינו קיים`); }
}
if (failures) process.exit(1);

const ymlSrc = fs.readFileSync(join(ROOT, YML), 'utf8');
const shSrc  = fs.readFileSync(join(ROOT, SH),  'utf8');

/*  ⚠️ ה-YAML נקרא **בלי הערות** בכל הטענות שמדברות על תוכן שרץ.
 *  ⛔ בלי זה, המילה `apksigner` שבתוך הערה הסברתית הייתה מפילה את סעיף
 *  ד — כלומר השער היה נכשל על תיעוד ועובר על קוד, וזה גרוע משער שאינו
 *  קיים. (הלקח של `check-comments`: קוראים קוד, לא טקסט.)              */
const stripComments = (t) => t.split('\n')
  .map((l) => (/^\s*#/.test(l) ? '' : l.replace(/\s#(?![{}]).*$/, '')))
  .join('\n');

/*  אוסף הטענות — פונקציה אחת, כדי שהמוטציות יריצו **בדיוק** את מה
 *  שהריצה האמיתית מריצה. ⛔ שתי רשימות טענות היו שתי הזדמנויות לסחוף. */
function assertions(yml, sh, mode) {
  const out = [];              /* [ok, msg] */
  const code = stripComments(yml);
  const add  = (ok, msg) => out.push([ok, msg]);

  /* א. שם ה-workflow */
  const nm = /^name:\s*(.+?)\s*$/m.exec(code);
  add(!!nm && nm[1] === 'Build APK',
      `שם ה-workflow הוא «Build APK» (נמצא: ${nm ? nm[1] : 'חסר'})`);

  /* ב. שם ה-artifact */
  add(new RegExp(`^\\s+name:\\s*${APP.repo}-apk\\s*$`, 'm').test(code),
      `שם ה-artifact הוא «${APP.repo}-apk»`);

  /* ג. שם קובץ הפלט, ובשורש — ⛔ `path:` בלי לוכסן */
  const pth = /^\s+path:\s*(.+?)\s*$/m.exec(code);
  add(!!pth && pth[1] === `${APP.repo}.apk`,
      `קובץ הפלט הוא «${APP.repo}.apk» בשורש (נמצא: ${pth ? pth[1] : 'חסר'})`);
  add(!!pth && pth[1].indexOf('/') < 0,
      'קובץ הפלט אינו בתת-תיקייה');
  add(new RegExp(`\\b${APP.repo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.apk\\b`)
        .test(code.split('Sign with the permanent key')[1] || code),
      `שלב החתימה מייצר «${APP.repo}.apk»`);

  /* ד. ⭐ הליבה — אין לוגיקת חתימה שנייה ב-YAML */
  add(!/apksigner/.test(code),
      '⛔ ה-YAML אינו מכיל apksigner — החתימה עוברת דרך הסקריפט בלבד');
  add(!/zipalign/.test(code),
      '⛔ ה-YAML אינו מכיל zipalign');
  add(!/--ks-pass|--key-pass|--ks-key-alias/.test(code),
      '⛔ ה-YAML אינו מכיל דגלי keystore');

  /* ה. חיווט וקשיחות */
  add(/\.\/signing\/sign-apk\.sh/.test(code),
      'ה-workflow קורא ל-./signing/sign-apk.sh');
  add(/if-no-files-found:\s*error/.test(code),
      'if-no-files-found: error — artifact ריק מפיל את הריצה');
  add(/set -euo pipefail/.test(code),
      'set -euo pipefail בשלבי ה-run');

  /* ו. ⭐ שער הטביעה מולא ותקין בצורתו */
  const m = /^EXPECTED_SHA256='([^']*)'/m.exec(sh);
  const sha = m ? m[1] : null;
  add(!!sha, 'EXPECTED_SHA256 מוגדר בסקריפט');
  add(!!sha && sha.trim() !== '' && !/FILL_ME|TODO|XXX|CHANGEME/i.test(sha),
      '⛔ EXPECTED_SHA256 אינו ריק ואינו מציין-מקום');
  add(!!sha && /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(sha),
      'EXPECTED_SHA256 בפורמט keytool המקורי (32 בתים, נקודתיים, אותיות גדולות)');
  add(/set -euo pipefail/.test(sh), 'הסקריפט נושא set -euo pipefail');
  add(new RegExp(`grep -qF "SHA256: \\$EXPECTED_SHA256"`).test(sh),
      'שער טביעה **לפני** החתימה — מסרב לחתום במפתח שאינו הצפוי');
  add(/apksigner verify --print-certs "\$OUT"[\s\S]*WANT.*!=.*GOT|\$WANT" != "\$GOT/.test(sh),
      'אימות התעודה שנחתמה **בפועל**, אחרי החתימה');

  if (mode === 'count') return out.filter(([ok]) => !ok).length;
  return out;
}

/* ── הריצה האמיתית ─────────────────────────────────────────────────────── */
for (const [ok, msg] of assertions(ymlSrc, shSrc)) (ok ? pass : fail)(msg);

/* ז. הרשאת הרצה — נקראת מה-index של git, לא ממצב הדיסק, כי זה מה
 *    שנדחף בפועל. ⚠️ מדלגת ואינה מפילה כשאין git. */
try {
  const mode = execFileSync('git', ['-C', ROOT, 'ls-files', '-s', SH],
                            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
                 .trim().split(/\s+/)[0];
  if (mode === '100755') pass('signing/sign-apk.sh בר-הרצה (100755)');
  else fail(`signing/sign-apk.sh במצב ${mode} ולא 100755 — ה-workflow קורא לו ישירות`);
} catch (_) { console.log('⏭️  אין git — בדיקת הרשאת ההרצה מדולגת'); }

/* ── מוטציות — כל אחת חייבת להפיל טענה שהריצה האמיתית מעבירה ──────────── */
const base = assertions(ymlSrc, shSrc, 'count');
if (base !== 0) fail(`קו-הבסיס אינו נקי (${base} כשלים) — המוטציות אינן משמעותיות`);

const MUTATIONS = [
  ['שם ה-workflow חזר ל-«Build Signed APK»',
   (y, s) => [y.replace(/^name: Build APK$/m, 'name: Build Signed APK'), s]],
  ['שם ה-artifact חזר ל-«-signed-apk»',
   (y, s) => [y.replace(`name: ${APP.repo}-apk`, `name: ${APP.repo}-signed-apk`), s]],
  ['קובץ הפלט הועבר לתת-תיקייה',
   (y, s) => [y.replace(`path: ${APP.repo}.apk`, `path: android/${APP.repo}.apk`), s]],
  ['⭐ לוגיקת apksigner הוחזרה ל-YAML',
   (y, s) => [y.replace('./signing/sign-apk.sh',
                        '"$BT/apksigner" sign --ks signing/x.keystore #'), s]],
  ['if-no-files-found הוסר',
   (y, s) => [y.replace(/\n\s+if-no-files-found:\s*error/, ''), s]],
  ['⭐ EXPECTED_SHA256 הוחלף במציין-מקום',
   (y, s) => [y, s.replace(/^EXPECTED_SHA256='[^']*'/m, "EXPECTED_SHA256='__FILL_ME__'")]],
  ['⭐ EXPECTED_SHA256 רוקן',
   (y, s) => [y, s.replace(/^EXPECTED_SHA256='[^']*'/m, "EXPECTED_SHA256=''")]],
  ['שער הטביעה שלפני החתימה הוסר',
   (y, s) => [y, s.replace(/grep -qF "SHA256: \$EXPECTED_SHA256"/, 'grep -q .')]],
];

console.log('  — מוטציות —');
for (const [label, mut] of MUTATIONS) {
  const [y, s] = mut(ymlSrc, shSrc);
  const n = assertions(y, s, 'count');
  if (n > 0) pass(`מוטציה: ${label} → ${n} טענות נופלות`);
  else fail(`מוטציה: ${label} — ⛔ לא הפילה דבר, השער אינו נועל אותה`);
}

console.log(failures ? `\n❌ ${APP.app}: ${failures} כשלים בשער הבנייה והחתימה`
                     : `\n✅ ${APP.app}: שער הבנייה והחתימה עבר`);
process.exit(failures ? 1 : 0);
