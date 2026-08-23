#!/usr/bin/env node
/*  שער ה-versionCode של המעטפת — סבב 40, כלל ברזל 14.
 *
 *  ⚠️ **הפער שנמדד (סבב 39, סריקת ההמשך סעיף 2):** ארבעת קובצי
 *  `android/app/build.gradle` תואמים זה לזה פרט ל-`applicationId`, לגרסה
 *  ולתלויות — **ואין שום דבר שמוודא ש-`versionCode` עלה כשהמעטפת
 *  השתנתה.** זה בדיוק הכשל שקידום `CACHE_NAME` נבנה נגדו בשכבת ה-web,
 *  באותו ריפו ובאותו סבב-שחרור: קוד שהשתנה ולא קיבל מספר גרסה חדש פשוט
 *  אינו מגיע למכשירים.
 *
 *  ⛔ **וכאן הכשל חמור יותר מאשר ב-web**, ולכן השער הזה קיים: מטמון
 *  service-worker שלא קודם מתוקן בשחרור הבא, ואילו APK עם `versionCode`
 *  שאינו עולה **נדחה ע"י אנדרואיד בזמן ההתקנה** (`INSTALL_FAILED_
 *  VERSION_DOWNGRADE`) — או, גרוע מכך, מותקן בשקט מעל עצמו ומשאיר את
 *  המשתמש עם המעטפת הישנה בלי שום סימן.
 *
 *  הבדיקה נכשלת על ארבעה סוגי סטייה:
 *    א. **צורה** — `versionCode` אינו מספר שלם חיובי, או `versionName`
 *       חסר; `applicationId` ו-`namespace` אינם תואמים זה לזה.
 *    ב. **זהות** — `applicationId` אינו זה שרשום ב-APP (מזהה החבילה הוא
 *       מה שאנדרואיד מזהה לפיו התקנה קיימת; שינוי שלו יוצר אפליקציה זרה).
 *    ג. **⭐ קידום** — קובץ כלשהו תחת `android/` השתנה מול `origin/main`
 *       ו-`versionCode` **לא עלה**. זו כל הנקודה.
 *    ד. **נסיגה** — `versionCode` ירד מול `origin/main`.
 *
 *  ⚠️ **סעיף ג מדלג ואינו מפיל** כשאין git, כשאין `origin/main`, או
 *  כשהקובץ אינו קיים שם — בדיוק כמו סעיף ה של `check-docs.mjs` (סבב 20).
 *  ⛔ שער שנופל בסביבה בלי git היה חוסם דחיפה מסיבה שאינה קשורה לקוד.
 *
 *  ⚠️ **מה השער אינו בודק, ובכוונה:** תוכן ה-`MainActivity`, התלויות
 *  ורשימת ההרשאות. ⛔ אין ליישר את התלויות בין הריפו (סבב 40) — ליומן
 *  לבדה יש `androidx.webkit` ו-`androidx.core`, מפני שרק לה יש גשר
 *  שיתוף; זו חריגה **מנומקת ומדודה**, לא סחיפה.
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
  /* מזהה החבילה — מה שאנדרואיד מזהה לפיו התקנה קיימת. ⛔ אינו משתנה לעולם. */
  applicationId: 'com.schar.limud',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GRADLE = 'android/app/build.gradle';

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);
const skip = (m) => console.log('⏭️  ' + m);

/*  ⚠️ פרסור ולא הרצת Gradle: הסביבה כאן היא node בלבד, ו-Gradle אינו
 *  זמין. שלוש התבניות נגזרו מארבעת הקבצים בפועל ולא הוצהרו.            */
function parseGradle(text) {
  const num  = (re) => { const m = re.exec(text); return m ? m[1] : null; };
  return {
    versionCode:   num(/^\s*versionCode\s+(\d+)\s*$/m),
    versionName:   num(/^\s*versionName\s+["']([^"']+)["']/m),
    applicationId: num(/^\s*applicationId\s+["']([^"']+)["']/m),
    namespace:     num(/^\s*namespace\s+["']([^"']+)["']/m),
  };
}

const path = join(ROOT, GRADLE);
if (!fs.existsSync(path)) { fail(`${GRADLE} אינו קיים — למעטפת אין קובץ בנייה`); process.exit(1); }
const cur = parseGradle(fs.readFileSync(path, 'utf8'));

/* ── א. צורה ───────────────────────────────────────────────────────────── */
const vc = Number(cur.versionCode);
if (!cur.versionCode || !Number.isInteger(vc) || vc < 1) {
  fail(`versionCode אינו מספר שלם חיובי: ${JSON.stringify(cur.versionCode)}`);
} else pass(`versionCode תקין: ${vc}`);

if (!cur.versionName) fail('versionName חסר מ-' + GRADLE);
else pass(`versionName תקין: ${cur.versionName}`);

if (cur.applicationId && cur.namespace && cur.applicationId !== cur.namespace) {
  fail(`applicationId (${cur.applicationId}) ו-namespace (${cur.namespace}) אינם תואמים`);
} else if (cur.applicationId) pass('applicationId ו-namespace תואמים');

/* ── ב. זהות החבילה ────────────────────────────────────────────────────── */
if (cur.applicationId !== APP.applicationId) {
  fail(`applicationId הוא «${cur.applicationId}» ולא «${APP.applicationId}» — ` +
       'מזהה החבילה הוא מה שאנדרואיד מזהה לפיו התקנה קיימת, ושינוי שלו יוצר אפליקציה זרה');
} else pass(`מזהה החבילה נעול: ${APP.applicationId}`);

/* ── ג+ד. קידום מול origin/main ─────────────────────────────────────────── */
const git = (args) => execFileSync('git', ['-C', ROOT, ...args],
                                   { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
let base = null, changed = null;
try {
  git(['rev-parse', '--verify', 'origin/main']);
  base = parseGradle(git(['show', 'origin/main:' + GRADLE]));
  /* ⛔ תיעוד אינו מעטפת (סבב 42ב) — קובץ `.md` תחת `android/` יוצא מרשימת
   *  השינויים. הוא אינו נכנס ל-APK ואינו משנה שום בית במעטפת, ולכן דרישת
   *  קידום עליו הייתה **קידום סרק**: `versionCode` שקופץ בלי שהמעטפת
   *  השתנתה הוא בדיוק אותו רעש ש-`CACHE_NAME` נבנה נגדו בשכבת ה-web
   *  (סבב 26 השלמה), והוא גם שולח את המשתמשים להתקנה מחדש לשום שינוי.
   *  ⚠️ נמדד בסבב 42ב: יישור `android/README.md` בארבעת הריפו הפיל את
   *  השער הזה בארבעתם, ⛔ בלי ששורה אחת של קוד מעטפת נגעה.                */
  changed = git(['diff', '--name-only', 'origin/main', '--', 'android/'])
              .split('\n').map((s) => s.trim())
              .filter((f) => f && !f.endsWith('.md'));
} catch (_) { base = null; }

if (base === null) {
  skip('אין git או אין origin/main — בדיקת הקידום מדולגת (ולא מפילה)');
} else {
  const baseVc = Number(base.versionCode);
  if (!Number.isInteger(baseVc)) {
    skip('versionCode לא נקרא מ-origin/main — בדיקת הקידום מדולגת');
  } else if (vc < baseVc) {
    fail(`versionCode ירד: ${baseVc} → ${vc} מול origin/main — אנדרואיד דוחה התקנה נסוגה`);
  } else if (changed.length === 0) {
    pass('המעטפת לא השתנתה מול origin/main — אין דרישת קידום');
  } else if (vc === baseVc) {
    fail(`המעטפת השתנתה מול origin/main (${changed.length} קבצים: ` +
         changed.slice(0, 4).join(', ') + (changed.length > 4 ? ', …' : '') + ') ' +
         `אך versionCode נשאר ${vc} — יש לקדם אותו, אחרת ה-APK החדש לא יותקן מעל הקיים`);
  } else {
    pass(`המעטפת השתנתה (${changed.length} קבצים) ו-versionCode קודם: ${baseVc} → ${vc}`);
  }
}

console.log(failures ? `\n❌ ${APP.app}: ${failures} כשלים בשער ה-versionCode`
                     : `\n✅ ${APP.app}: שער ה-versionCode עבר`);
process.exit(failures ? 1 : 0);
