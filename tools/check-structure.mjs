#!/usr/bin/env node
/*  בדיקת המבנה הקנוני של הריפו — סבב 33.
 *
 *  ⭐ משימת הבודק: סורק את סט התיקיות, הקבצים והשערים שבשורש — ⛔ ומפיל על קובץ
 *  שקיים באחת ואינו בשלוש, בלי חריגה מוכרזת.
 *
 *  «יכולת, שער או מודול שקיים באפליקציה אחת — או שהוא קיים בארבעתן, או
 *  שהוא רשום כחריגה מנומקת. קיים רק באחת, בשקט — אינו מצב חוקי.»
 *  הבדיקה אוכפת את הצד המבני של הכלל, והיא נכשלת על שלושה סוגי סטייה:
 *
 *    א. **תיקיות** — סט התיקיות בשורש אינו הסט הקנוני המשותף: תיקייה
 *       חסרה או תיקייה עודפת מפילות את השער.
 *    ב. **קובצי שורש** — קובץ שאינו ברשימה הסגורה המשותפת ואינו ברשימת
 *       ההיתר הפר-אפליקציתית (שכל שורה בה נושאת נימוק).
 *    ג. **tools/** — הבודקים המשותפים שב-`CHECKERS` חייבים להתקיים; כל קובץ אחר
 *       חייב להיות קובץ שער (test_<נושא>.mjs) או חריגה מנומקת.
 *
 *  ⚠️ הרקע (סבב 33): שער check-js חי ב-gius לבדה עשרה סבבים, קבצים
 *  שרידיים ישבו בשורש של כל ריפו, ואיש לא החליט על אף אחד מהמצבים האלה.
 *  מהסבב הזה אחידות מבנית נאכפת בשער, לא במשמעת.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP. שינוי במבנה הקנוני = עדכון
 *  בארבע האפליקציות ובארבעת עותקי הבדיקה, באותו סבב.
 */
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /* חריגות מנומקות — קובץ/תיקייה שקיימים כאן ולא באחיות, עם הסיבה. */
  rootExtra: {},
  toolsExtra: {
    /* ⭐ נימוקי מטריצת היכולות — עברו לכאן מ-CLAUDE.md בסבב 49 (תקציב
       התיעוד). ⛔ מעבר ולא גיזום: אף שורה לא נמחקה, ואף שער אינו
       קורא אותם — הטבלה עצמה נשארה ב-CLAUDE.md. */
    '_capability-notes.md': 'נימוקי המטריצה שנמחקה בסבב 69 — טקסט היסטורי בלבד; ⛔ אינו נקרא בשום שער והנימוקים החיים עברו לעמודת ההערות שבטבלה',
    /* חילוץ לקחי הסבבים שנגזמו (סבב 48ב) — לא בודק ולא רתמה; נשמר בריפו
       מפני שהפרקים שממנו נשלף נמחקו, וג'יט לבדו אינו מקום שקוראים בו. */
    '_prune-lessons.md': 'לקחי פרקי הסבבים שנגזמו בסבב 48ב (הפרקים עצמם נמחקו)',
  },
  keystore: 'schar.keystore',
  androidExtra: {},
  toolsDirs: {},
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* הסט הקנוני המשותף — זהה בארבעת הריפו. */
const DIRS = ['.github', 'android', 'design', 'icons', 'migrations', 'signing', 'tools'];
const ROOT_FILES = ['.nojekyll', 'CLAUDE.md', 'CONTEXT.md', 'README.md',
                    'index.html', 'manifest.json', 'sw.js'];
const CHECKERS = ['check-js.mjs', 'check-structure.mjs', 'check-status-area.mjs',
                  'check-docs.mjs', 'check-comments.mjs', 'check-capabilities.mjs'];
/*  ⛔ מחולל אינו בודק ואינו שער (סבב 71) — ⚠️ הוא **כותב** נכסים, בעוד
 *  ששער קורא בלבד; ⛔ ולכן קטגוריה שלישית ומוצהרת, ⛔ ולא הרחבה של
 *  `CHECKERS` שהטבלה מונה בה שישה. */
const GENERATORS = ['gen-icons.mjs'];
/*  ⛔ שם השער נגזר מהנושא ולא ממספר הסבב (סבב 67) — 53 שערים
 *  נשאו שם כמו `test_round52_pendflush`, ⚠️ ומי שרצה לדעת מה בודק
 *  את מודול הנעילה לא ידע לחפש. ⛔ מספר הסבב עבר לשורת הכותרת
 *  שבגוף הקובץ, ⛔ ואינו חוזר לשם. */
const TEST_RE = /^test_[a-z][a-z0-9_]*\.mjs$/;
/*  ⛔ והתבנית הישנה נפסלת במפורש (סבב 67) — `test_round99_legacy.mjs`
 *  עובר את התבנית החיובית במקרה, ⚠️ ובלי הפסילה הזו השער היה מאשר
 *  בדיוק את השם שהסבב הזה בא להחליף. */
const OLD_TEST_RE = /^test_round\d/;

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

const entries = fs.readdirSync(ROOT, { withFileTypes: true })
                  .filter((e) => e.name !== '.git');
const dirs  = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
const files = entries.filter((e) => !e.isDirectory()).map((e) => e.name).sort();

/* ── א. סט התיקיות ─────────────────────────────────────────────────────── */
const missingD = DIRS.filter((d) => !dirs.includes(d));
const extraD   = dirs.filter((d) => !DIRS.includes(d));
if (missingD.length) fail(`תיקיות חסרות בשורש: ${missingD.join(', ')} — נמדדו ${DIRS.length - missingD.length} ` +
                          `מתוך ${DIRS.length} התיקיות הקנוניות. מוסיפים את החסרות`);
if (extraD.length)   fail(`תיקיות עודפות בשורש: ${extraD.join(', ')} — נמדדו ${extraD.length} ` +
                          `מעבר ל-${DIRS.length} הקנוניות. מוסיפים אותן למבנה הקנוני ` +
                          `בארבעת עותקי הבדיקה, או מסירים אותן`);
if (!missingD.length && !extraD.length) {
  pass('סט התיקיות הקנוני שלם: ' + DIRS.join(' · '));
}

/* ── ב. קובצי השורש ────────────────────────────────────────────────────── */
const allowed  = new Set([...ROOT_FILES, ...Object.keys(APP.rootExtra)]);
const badF     = files.filter((f) => !allowed.has(f));
const missingF = ROOT_FILES.filter((f) => !files.includes(f));
if (badF.length)     fail(`קבצים בשורש שאינם ברשימה הסגורה: ${badF.join(', ')} — נמדדו ${badF.length} ` +
                          `מעבר לרשימה. מוסיפים לכל אחד שורה מנומקת ברשימת-ההיתר, ` +
                          `בארבעת עותקי הבדיקה, או מסירים אותו`);
if (missingF.length) fail(`קבצים חסרים מהרשימה הסגורה: ${missingF.join(', ')} — נמדדו ` +
                          `${missingF.length} חסרים והצפוי אפס. מוסיפים אותם, או גוזמים ` +
                          `אותם מהרשימה בארבעת עותקי הבדיקה`);
for (const [f, why] of Object.entries(APP.rootExtra)) {
  if (!files.includes(f)) fail(`חריגת שורש רשומה שאינה קיימת בפועל: ${f} — נמדד שהקובץ אינו בעץ ` +
        `והצפוי שיהיה. יש להסיר את השורה מרשימת-ההיתר`);
  else pass(`חריגת שורש מנומקת: ${f} — ${why}`);
}
if (!badF.length && !missingF.length) pass('קובצי השורש בתוך הרשימה הסגורה');

/* ── ג. tools/ ─────────────────────────────────────────────────────────── */
const tEntries = fs.readdirSync(join(ROOT, 'tools'), { withFileTypes: true });
const tFiles = tEntries.filter((e) => e.isFile()).map((e) => e.name).sort();
const tDirs  = tEntries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

const missingC = CHECKERS.filter((c) => !tFiles.includes(c));
if (missingC.length) fail(`בודקים משותפים חסרים ב-tools/: ${missingC.join(', ')} — נמדדו ` +
                      `${CHECKERS.length - missingC.length} מתוך ${CHECKERS.length}. ` +
                      `מוסיפים את החסרים — בודק הוא יכולת משותפת`);
else pass(`${CHECKERS.length} הבודקים המשותפים קיימים ב-tools/`);

const missingG = GENERATORS.filter((g) => !tFiles.includes(g));
if (missingG.length) fail(`מחוללים משותפים חסרים ב-tools/: ${missingG.join(', ')} — נמדדו ` +
                      `${GENERATORS.length - missingG.length} מתוך ${GENERATORS.length}. ` +
                      `מוסיפים את החסרים`);
else pass(`${GENERATORS.length} המחוללים המשותפים קיימים ב-tools/`);

const tAllowed = (f) => CHECKERS.includes(f) || GENERATORS.includes(f) ||
  (TEST_RE.test(f) && !OLD_TEST_RE.test(f)) || (f in APP.toolsExtra);
const badT = tFiles.filter((f) => !tAllowed(f));
if (badT.length) fail(`קבצים לא-רשומים ב-tools/: ${badT.join(', ')} — נמדדו ${badT.length} ` +
                      `מעבר לרשימה והצפוי אפס. בודק חדש הוא יכולת משותפת ונכנס ` +
                      `בארבעתם; לחריגה פרטית מוסיפים שורה מנומקת`);
for (const [f, why] of Object.entries(APP.toolsExtra)) {
  if (!tFiles.includes(f)) fail(`חריגת tools רשומה שאינה קיימת בפועל: ${f} — נמדד שהקובץ אינו ` +
        `בעץ והצפוי שיהיה. מסירים את השורה מרשימת-ההיתר`);
  else pass(`חריגת tools מנומקת: ${f} — ${why}`);
}
const badTD = tDirs.filter((d) => !(d in APP.toolsDirs));
if (badTD.length) fail(`תת-תיקיות לא-רשומות ב-tools/: ${badTD.join(', ')} — נמדדו ` +
                      `${badTD.length} מעבר לרשימה והצפוי אפס. מוסיפים שורה מנומקת ` +
                      `לרשימת-ההיתר, או מסירים את התיקייה`);
for (const [d, why] of Object.entries(APP.toolsDirs)) {
  if (!tDirs.includes(d)) fail(`תת-תיקיית tools רשומה שאינה קיימת בפועל: ${d} — נמדד שהיא ` +
        `אינה בעץ והצפוי שתהיה. מסירים את השורה מרשימת-ההיתר`);
  else pass(`תת-תיקיית tools מנומקת: ${d} — ${why}`);
}

/* ── ד. `icons/` ו-`design/` — היפוך ברירת המחדל (סבב 50) ───────────────────
   ⚠️ עד היום שתי התיקיות היו **בסט הקנוני של השורש** ותו לא: השער דרש
   שהן יתקיימו, ⛔ ולא נגע במה שבתוכן. וזו בדיוק צורת הכשל שנמדדה —
   `icons/favicon-64.png` חי ב-gius לבדו עם שלושה קוראים, ואף שער לא
   ראה אותו (בדיוק כמו ערכי `manifest.json` לפני סבב 44ב, שם נאכף
   **קיום** הקובץ ולא **תוכנו**).
   ⛔ **מה שנאכף הוא הסט, ולא התמונה** — גודל, צבע ותוכן פיקסלים נגזרים
   מהעיצוב הייחודי של כל אפליקציה ואינם ניתנים ליישור.
   ⛔ **ו-`design/` אינו נטען בדף** (סבב 50) — קובץ המאסטר הוא נכס עיצוב
   במגה-בייט, והפניה אליו מ-`index.html` או מ-`sw.js` היא הורדה שהמשתמש
   משלם עליה לשום צורך. הנכסים הנגזרים יושבים ב-`icons/`. */
const ICONS = ['apple-touch-icon.png', 'favicon-16.png', 'favicon-32.png',
               'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
const MASTER_RE = /^icon-master\.(svg|png)$/;

const iFiles = fs.readdirSync(join(ROOT, 'icons'), { withFileTypes: true })
  .filter((e) => e.isFile()).map((e) => e.name).sort();
const iMissing = ICONS.filter((f) => !iFiles.includes(f));
const iExtra   = iFiles.filter((f) => !ICONS.includes(f));
if (iMissing.length) fail(`נכסים חסרים ב-icons/: ${iMissing.join(', ')} — נמדדו ` +
                          `${ICONS.length - iMissing.length} מתוך ${ICONS.length} ` +
                          `הנכסים הקנוניים. מעדכנים בהרצת מחולל האייקונים`);
if (iExtra.length)   fail(`נכסים עודפים ב-icons/: ${iExtra.join(', ')} — נמדדו ` +
                          `${iExtra.length} מעבר ל-${ICONS.length} הקנוניים והצפוי אפס. ` +
                          `מסירים אותם: ⛔ גם שם תמים אינו היתר`);
if (!iMissing.length && !iExtra.length) pass(`icons/ — בדיוק ששת הנכסים הקנוניים`);

const dFiles = fs.readdirSync(join(ROOT, 'design'), { withFileTypes: true })
  .filter((e) => e.isFile()).map((e) => e.name).sort();
if (dFiles.length !== 1) {
  fail(`design/ מחזיקה ${dFiles.length} קבצים (${dFiles.join(', ') || '—'}) — ` +
        `הצפוי אחד בלבד. מסירים את העודפים`);
} else if (!MASTER_RE.test(dFiles[0])) {
  fail(`design/${dFiles[0]} — נמדד שם שאינו icon-master.svg ואינו ` +
        `icon-master.png. מיישרים את שם הקובץ`);
} else {
  pass(`design/ — קובץ מאסטר אחד: ${dFiles[0]}`);
}

const servedRefs = [];
for (const f of ['index.html', 'sw.js']) {
  const body = fs.readFileSync(join(ROOT, f), 'utf8');
  if (body.includes('design/')) servedRefs.push(f);
}
if (servedRefs.length) fail(`הפניה ל-design/ מתוך ${servedRefs.join(' ו-')} — נמדדו ` +
                            `${servedRefs.length} הפניות והצפוי אפס. מסירים אותן: ` +
                            `קובץ המאסטר הוא נכס עיצוב ואינו נטען בדף`);
else pass('⛔ אף קובץ מוגש אינו מפנה ל-design/');

/* ── ה. תוכן ארבע התיקיות שלא נבדקו (סבב 65) ────────────────────────────────
   ⚠️ **הפער שנמדד:** השער בדק **קיום** של שבע התיקיות, ⛔ ותוכן של ארבע
   בלבד (שורש · `tools` · `icons` · `design`). כלומר קובץ שהתווסף
   ל-`android/`, ל-`migrations/`, ל-`signing/` או ל-`.github/` בריפו אחד
   בשקט לא נראה לאף שער — ⛔ וזו בדיוק צורת הכשל שהשער הזה תופס.
   ⛔ **הסט נאכף, לא התוכן** — מה שיושב בתוך כל קובץ נאכף בשערים הייעודיים
   (`test_android` · `test_build`).
   ══════════════════════════════════════════════════════════════════════ */
const WORKFLOWS = ['build-apk.yml', 'cleanup-merged-branches.yml'];
/*  ⚠️ `<pkg>` — נתיב חבילת ה-Java נבדל לפי מזהה החבילה, וזה הדבר היחיד
 *  שמותר לו להיבדל בעץ הזה. */
const ANDROID = [
  'README.md', 'build.gradle', 'gradle.properties', 'settings.gradle',
  'app/build.gradle',
  'app/src/main/AndroidManifest.xml',
  'app/src/main/java/<pkg>/MainActivity.java',
  'app/src/main/java/<pkg>/ShellActivity.java',
  'app/src/main/res/drawable/ic_launcher_background.xml',
  'app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
  ...['hdpi', 'mdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'].flatMap((d) => [
    `app/src/main/res/mipmap-${d}/ic_launcher.png`,
    `app/src/main/res/mipmap-${d}/ic_launcher_foreground.png`]),
];
const MIG_RE = /^\d{3}_[a-z0-9_]+\.sql$/;

function walk(dir, base) {
  const out = [];
  for (const e of fs.readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...walk(join(dir, e.name), rel));
    else out.push(rel);
  }
  return out.sort();
}

/* ה1 — `.github/workflows` */
{
  const got = walk('.github', '');
  const want = WORKFLOWS.map((w) => 'workflows/' + w);
  const miss = want.filter((w) => !got.includes(w));
  const extra = got.filter((w) => !want.includes(w));
  if (miss.length)  fail(`workflows חסרים: ${miss.join(', ')} — נמדדו ` +
                         `${WORKFLOWS.length - miss.length} מתוך ${WORKFLOWS.length}. ` +
                         `מוסיפים את החסרים מריפו אחות`);
  if (extra.length) fail(`קבצים לא-רשומים תחת .github/: ${extra.join(', ')} — נמדדו ` +
                         `${extra.length} מעבר ל-${WORKFLOWS.length} הקנוניים והצפוי אפס. ` +
                         `מוסיפים אותם לרשימה הקנונית בארבעת עותקי הבדיקה, או מסירים אותם`);
  if (!miss.length && !extra.length) pass('.github/ — שני ה-workflows הקנוניים בלבד');
}

/* ה2 — `signing/` */
{
  const got = walk('signing', '');
  const keys = got.filter((f) => f.endsWith('.keystore'));
  const rest = got.filter((f) => !f.endsWith('.keystore'));
  if (keys.length !== 1) fail(`signing/ מחזיקה ${keys.length} קובצי keystore והצפוי בדיוק אחד. ` +
        `מסירים את העודפים — ⛔ ולעולם לא keystore חדש`);
  else if (keys[0] !== APP.keystore) fail(`signing/: נמדד keystore בשם ${keys[0]} והצפוי ${APP.keystore} ` +
        `שבבלוק APP. מיישרים את השם — ⛔ ולא מחליפים מפתח`);
  const bad = rest.filter((f) => f !== 'sign-apk.sh');
  if (bad.length) fail(`קבצים לא-רשומים ב-signing/: ${bad.join(', ')} — נמדדו ` +
        `${bad.length} מעבר לרשימה והצפוי אפס. מסירים אותם`);
  if (!rest.includes('sign-apk.sh')) fail('signing/sign-apk.sh חסר — נמדד שאינו בעץ והצפוי שיהיה. ' +
        'מוסיפים אותו מריפו אחות, עם חמשת הערכים הפרטיים');
  if (keys.length === 1 && keys[0] === APP.keystore && !bad.length && rest.includes('sign-apk.sh'))
    pass(`signing/ — ${APP.keystore} + sign-apk.sh`);
}

/* ה3 — `migrations/` */
{
  const got = walk('migrations', '');
  const bad = got.filter((f) => !MIG_RE.test(f));
  if (bad.length) fail('שמות מיגרציה שאינם בתבנית `NNN_שם.sql`: ' + bad.join(', ') +
                       ` — נמדדו ${bad.length} חורגים והצפוי אפס. מיישרים לשלוש ספרות`);
  const nums = got.filter((f) => MIG_RE.test(f)).map((f) => +f.slice(0, 3));
  const dup = nums.filter((x, i) => nums.indexOf(x) !== i);
  if (dup.length) fail('מספרי מיגרציה כפולים: ' + [...new Set(dup)].join(', ') +
                       ' — הצפוי מספור ייחודי. מעדכנים את הקובץ החדש למספר הבא בתור');
  const gaps = nums.slice(1).map((x, i) => x - nums[i]).filter((d) => d !== 1);
  if (gaps.length) fail(`migrations/: המספור אינו רציף — נמדדו ${nums.length} קבצים ` +
                       `והצפוי הרצף 000..${nums.length - 1}. מעדכנים את המספר הבא בתור`);
  if (!bad.length && !dup.length && !gaps.length)
    pass(`migrations/ — ${nums.length} קבצים, מספור רציף בשלוש ספרות`);
}

/* ה4 — `android/` */
{
  const got = walk('android', '').map((f) => f.replace(/java\/com\/[a-z]+\/[a-z]+\//, 'java/<pkg>/'));
  const allow = new Set([...ANDROID, ...Object.keys(APP.androidExtra || {})]);
  const miss = ANDROID.filter((f) => !got.includes(f));
  const extra = got.filter((f) => !allow.has(f));
  if (miss.length)  fail(`קבצים חסרים מעץ האנדרואיד הקנוני: ${miss.join(', ')} — נמדדו ` +
                         `${miss.length} חסרים והצפוי אפס. מוסיפים אותם מריפו אחות`);
  if (extra.length) fail(`קבצים לא-רשומים תחת android/: ${extra.join(', ')} — נמדדו ` +
                         `${extra.length} מעבר לעץ הקנוני והצפוי אפס. מוסיפים לכל אחד ` +
                         `שורה מנומקת ב-APP.androidExtra, או מסירים אותו`);
  for (const [f, why] of Object.entries(APP.androidExtra || {})) {
    if (!got.includes(f)) fail(`חריגת android רשומה שאינה קיימת בפועל: ${f} — נמדד שהקובץ ` +
        `אינו בעץ והצפוי שיהיה. מסירים את השורה מ-APP.androidExtra`);
    else pass(`חריגת android מנומקת: ${f} — ${why}`);
  }
  if (!miss.length && !extra.length) pass(`android/ — ${ANDROID.length} קבצים קנוניים`);
}

console.log(failures ? `\n❌ בדיקת המבנה נכשלה (${failures})`
                     : '\n✅ בדיקת המבנה עברה');
process.exit(failures ? 1 : 0);
