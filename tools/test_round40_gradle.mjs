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
 *  הבדיקה נכשלת על חמישה סוגי סטייה:
 *    א. **צורה** — `versionCode` אינו מספר שלם חיובי, או `versionName`
 *       חסר; `applicationId` ו-`namespace` אינם תואמים זה לזה.
 *    ב. **זהות** — `applicationId` אינו זה שרשום ב-APP (מזהה החבילה הוא
 *       מה שאנדרואיד מזהה לפיו התקנה קיימת; שינוי שלו יוצר אפליקציה זרה).
 *    ג. **⭐ קידום** — קובץ כלשהו תחת `android/` השתנה מאז **קומיט
 *       הקידום האחרון** ו-`versionCode` **לא עלה**. זו כל הנקודה.
 *    ד. **נסיגה** — `versionCode` ירד מול קומיט הקידום האחרון.
 *    ה. **⭐ תיעוד** (סבב 45ב) — שורת ה-`versionCode` שבטבלת
 *       `android/README.md` אינה תואמת ל-`build.gradle`.
 *
 *  ⚠️ **למה סעיף ה נוסף, ומה הוא מודד** (סבב 45ב): סעיפים א–ד קוראים את
 *  `build.gradle` בלבד, ולכן **המספר שבן-אדם קורא נסחף בשקט**. נמדד
 *  ב-2026-08-24, בארבעת הריפו כאחד: `android/README.md` הצהיר
 *  2 · 2 · 3 · 4 בעוד ש-`build.gradle` נשא 3 · 3 · 4 · 5 — כלומר
 *  **ארבעה מתוך ארבעה פיגרו בדיוק בסבב אחד**, וזה נמשך מסבב 41. ⛔ וזה
 *  בדיוק הכשל שכלל ברזל 8 סעיף 6 אוסר: תיעוד שממשיך לתאר מספר שאינו
 *  נכון עוד. ⭐ מעכשיו קידום `versionCode` שאינו מעדכן את הטבלה **מפיל
 *  את השער**.
 *
 *  ⛔ **ואין כאן מעגליות** (סבב 45ב) — קובץ `.md` תחת `android/` מוחרג
 *  מ**רשימת השינויים שדורשת קידום** (סבב 42ב), ולכן עדכון הטבלה עצמו
 *  אינו יוצר דרישת קידום חדשה. סעיף ג שואל «מה השתנה»; סעיף ה שואל
 *  «מה כתוב» — שתי שאלות שונות על אותו קובץ.
 *
 *  ⚠️ **סעיף ג מדלג ואינו מפיל** כשאין git או כשלא נמצא אף קומיט קידום —
 *  בדיוק כמו סעיף ה של `check-docs.mjs` (סבב 20). ⛔ שער שנופל בסביבה
 *  בלי git היה חוסם דחיפה מסיבה שאינה קשורה לקוד.
 *
 *  ⭐⭐ **הבסיס הוא קומיט הקידום האחרון ולא `origin/main` (סבב 57).**
 *  ⚠️ **הנקודה העיוורת שנמדדה ב-26.8:** עשרת קובצי ה-mipmap של יומן
 *  הועלו **ישירות ל-`main`**, ולכן מול `origin/main` הם היו **הבסיס
 *  ולא שינוי** — השער דיווח «המעטפת לא השתנתה» ועבר, אף שהמעטפת בהחלט
 *  השתנתה מאז ה-APK האחרון. ⛔ `origin/main` אינו מודד מה שהשער בא
 *  למדוד: השאלה היא «מה השתנה מאז ה-APK שבשטח», והמענה היחיד לה הוא
 *  **הקומיט שבו `versionCode` קודם בפעם האחרונה**.
 *
 *  ⛔ **ואין לגזור אותו ב-`git log -S` (סבב 57)** — `-S` סופר **מופעים**
 *  של המחרוזת, וקידום `versionCode 5` → `versionCode 6` אינו משנה את
 *  מספר המופעים של «versionCode». נמדד ב-26.8 ביומן: `-S'versionCode'`
 *  החזיר את קומיט סבב 46ב ו**פספס** את קומיט הקידום של סבב 56. לכן
 *  הגזירה כאן היא השוואת **הערך המפורסר** מול ההורה — מדידה ולא
 *  היוריסטיקת-טקסט.
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

/* ── ג+ד. קידום מאז קומיט הקידום האחרון ───────────────── */
const git = (args) => execFileSync('git', ['-C', ROOT, ...args],
                                   { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

/*  ⭐ קומיט הקידום האחרון — הקומיט האחרון שבו **הערך** של
 *  `versionCode` נבדל מזה שבאביו. ⛔ השוואת ערך ולא פיקסייס
 *  (סבב 57) — הנימוק בראש הקובץ.                                        */
function lastBumpCommit() {
  const commits = git(['log', '--format=%H', '--', GRADLE])
                    .split('\n').map((s) => s.trim()).filter(Boolean);
  for (const c of commits) {
    const here = parseGradle(git(['show', c + ':' + GRADLE])).versionCode;
    let there;
    try {
      there = parseGradle(git(['show', c + '^:' + GRADLE])).versionCode;
    } catch (_) {
      /* ⚠️ שורש ההיסטוריה, או גבול של שכפול רדוד (shallow) —
       *  ⛔ ואז הקומיט הזה הוא הבסיס (סבב 57) — הוא הקידום
       *  הישן ביותר שידוע לנו, והנפילה-חזרה היא לכיוון המחמיר:
       *  עדיף לדרוש קידום מיותר מלהעביר בשקט מעטפת שהשתנתה.  */
      return c;
    }
    if (here !== there) return c;
  }
  return null;
}

let base = null, changed = null, baseRef = null;
try {
  baseRef = lastBumpCommit();
  if (baseRef) {
    base = parseGradle(git(['show', baseRef + ':' + GRADLE]));
    /* ⛔ תיעוד אינו מעטפת (סבב 42ב) — קובץ `.md` תחת `android/` יוצא
     *  מרשימת השינויים. הוא אינו נכנס ל-APK ואינו משנה שום בית
     *  במעטפת, ולכן דרישת קידום עליו הייתה **קידום סרק**:
     *  `versionCode` שקופץ בלי שהמעטפת השתנתה הוא בדיוק אותו רעש
     *  ש-`CACHE_NAME` נבנה נגדו בשכבת ה-web (סבב 26 השלמה), והוא גם
     *  שולח את המשתמשים להתקנה מחדש לשום שינוי.
     *  ⚠️ נמדד בסבב 42ב: יישור `android/README.md` בארבעת הריפו הפיל
     *  את השער הזה בארבעתם, ⛔ בלי ששורה אחת של קוד מעטפת נגעה. */
    changed = git(['diff', '--name-only', baseRef, '--', 'android/'])
                .split('\n').map((s) => s.trim())
                .filter((f) => f && !f.endsWith('.md'));
  }
} catch (_) { base = null; }

if (base === null) {
  skip('אין git או לא נמצא קומיט קידום — בדיקת הקידום מדולגת (ולא מפילה)');
} else {
  const short = baseRef.slice(0, 8);
  const baseVc = Number(base.versionCode);
  if (!Number.isInteger(baseVc)) {
    skip(`versionCode לא נקרא מ-${short} — בדיקת הקידום מדולגת`);
  } else if (vc < baseVc) {
    fail(`versionCode ירד: ${baseVc} → ${vc} מול ${short} — אנדרואיד דוחה התקנה נסוגה`);
  } else if (changed.length === 0) {
    pass(`המעטפת לא השתנתה מאז קומיט הקידום האחרון (${short}) — אין דרישת קידום`);
  } else if (vc === baseVc) {
    fail(`המעטפת השתנתה מאז קומיט הקידום האחרון ${short} (${changed.length} קבצים: ` +
         changed.slice(0, 4).join(', ') + (changed.length > 4 ? ', …' : '') + ') ' +
         `אך versionCode נשאר ${vc} — יש לקדם אותו, אחרת ה-APK החדש לא יותקן מעל הקיים`);
  } else {
    pass(`המעטפת השתנתה (${changed.length} קבצים) ו-versionCode קודם: ${baseVc} → ${vc}`);
  }
}

/* ── ה. תיעוד — המספר שבן-אדם קורא ─────────────────────────────────────
 *  ⛔ אינו קישוט (סבב 45ב) — `android/README.md` הוא הקובץ שסשן חדש
 *  ומנהל קוראים כדי לדעת באיזו גרסה המעטפת נמצאת, והוא **הצהיר מספר
 *  שגוי בארבעת הריפו במשך ארבעה סבבים**. הפורמט זהה בארבעתם, ולכן
 *  שורת הטבלה נגזרת ואינה מוצהרת.                                       */
const README = 'android/README.md';
const rPath = join(ROOT, README);
if (!fs.existsSync(rPath)) {
  fail(`${README} אינו קיים — אין מאין לקרוא את ה-versionCode המתועד`);
} else {
  const m = /^\|\s*\*\*versionCode\*\*\s*\|\s*(\d+)\b/m.exec(fs.readFileSync(rPath, 'utf8'));
  if (!m) {
    fail(`${README}: שורת «| **versionCode** | <N> …» חסרה מהטבלה — ` +
         'בלעדיה אין מה להשוות, והמספר המתועד חופשי להיסחף');
  } else if (Number(m[1]) !== vc) {
    fail(`${README} מצהיר versionCode ${m[1]} בעוד ש-${GRADLE} נושא ${vc} — ` +
         'המספר שבן-אדם קורא נסחף מהמספר שנבנה בפועל');
  } else pass(`התיעוד תואם: ${README} מצהיר versionCode ${vc}`);
}

console.log(failures ? `\n❌ ${APP.app}: ${failures} כשלים בשער ה-versionCode`
                     : `\n✅ ${APP.app}: שער ה-versionCode עבר`);
process.exit(failures ? 1 : 0);
