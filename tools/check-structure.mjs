#!/usr/bin/env node
/*  בדיקת המבנה הקנוני של הריפו — סבב 33, כלל ברזל 14.
 *
 *  «יכולת, שער או מודול שקיים באפליקציה אחת — או שהוא קיים בארבעתן, או
 *  שהוא רשום כחריגה מנומקת. קיים רק באחת, בשקט — אינו מצב חוקי.»
 *  הבדיקה אוכפת את הצד המבני של הכלל, והיא נכשלת על שלושה סוגי סטייה:
 *
 *    א. **תיקיות** — סט התיקיות בשורש אינו הסט הקנוני המשותף: תיקייה
 *       חסרה או תיקייה עודפת מפילות את השער.
 *    ב. **קובצי שורש** — קובץ שאינו ברשימה הסגורה המשותפת ואינו ברשימת
 *       ההיתר הפר-אפליקציתית (שכל שורה בה נושאת נימוק).
 *    ג. **tools/** — שבעת הבודקים המשותפים חייבים להתקיים; כל קובץ אחר
 *       חייב להיות קובץ בדיקת-סבב (test_round*) או חריגה מנומקת.
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
    /* ⭐ נימוקי מטריצת היכולות — עברו לכאן מ-CLAUDE.md בסבב 49 (כלל ברזל 18,
       תקציב התיעוד). ⛔ מעבר ולא גיזום: אף שורה לא נמחקה, ואף שער אינו
       קורא אותם — הטבלה עצמה נשארה ב-CLAUDE.md. */
    '_capability-notes.md': 'נימוקי מטריצת היכולות, שעברו מ-CLAUDE.md בסבב 49 (תקציב התיעוד — כלל ברזל 18)',
    /* חילוץ לקחי הסבבים שנגזמו (סבב 48ב) — לא בודק ולא רתמה; נשמר בריפו
       מפני שהפרקים שממנו נשלף נמחקו, וג'יט לבדו אינו מקום שקוראים בו. */
    '_prune-lessons.md': 'לקחי פרקי הסבבים שנגזמו בסבב 48ב (הפרקים עצמם נמחקו)',
  },
  toolsDirs: {},
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* הסט הקנוני המשותף — זהה בארבעת הריפו. */
const DIRS = ['.github', 'android', 'design', 'icons', 'migrations', 'signing', 'tools'];
const ROOT_FILES = ['.nojekyll', 'CLAUDE.md', 'CONTEXT.md', 'README.md',
                    'index.html', 'manifest.json', 'sw.js'];
const CHECKERS = ['check-js.mjs', 'check-structure.mjs', 'check-status-area.mjs',
                  'check-docs.mjs', 'check-comments.mjs', 'check-capabilities.mjs',
                  // ⭐ סבב 39 — אכיפת פרק «פערים פתוחים» (כלל ברזל 15).
                  'check-gaps.mjs'];
const TEST_RE = /^test_round\d+[\w-]*\.mjs$/;

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
if (missingD.length) fail('תיקיות חסרות בשורש: ' + missingD.join(', '));
if (extraD.length)   fail('תיקיות עודפות בשורש: ' + extraD.join(', ') +
                          ' — תיקייה חדשה מחייבת עדכון המבנה הקנוני בארבעת עותקי הבדיקה');
if (!missingD.length && !extraD.length) {
  pass('סט התיקיות הקנוני שלם: ' + DIRS.join(' · '));
}

/* ── ב. קובצי השורש ────────────────────────────────────────────────────── */
const allowed  = new Set([...ROOT_FILES, ...Object.keys(APP.rootExtra)]);
const badF     = files.filter((f) => !allowed.has(f));
const missingF = ROOT_FILES.filter((f) => !files.includes(f));
if (badF.length)     fail('קבצים בשורש שאינם ברשימה הסגורה: ' + badF.join(', ') +
                          ' — קובץ שורש חדש מחייב שורה מנומקת ברשימת-ההיתר, בארבעת עותקי הבדיקה');
if (missingF.length) fail('קבצים חסרים מהרשימה הסגורה: ' + missingF.join(', '));
for (const [f, why] of Object.entries(APP.rootExtra)) {
  if (!files.includes(f)) fail(`חריגת שורש רשומה שאינה קיימת בפועל: ${f} — יש להסיר מרשימת-ההיתר`);
  else pass(`חריגת שורש מנומקת: ${f} — ${why}`);
}
if (!badF.length && !missingF.length) pass('קובצי השורש בתוך הרשימה הסגורה');

/* ── ג. tools/ ─────────────────────────────────────────────────────────── */
const tEntries = fs.readdirSync(join(ROOT, 'tools'), { withFileTypes: true });
const tFiles = tEntries.filter((e) => e.isFile()).map((e) => e.name).sort();
const tDirs  = tEntries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

const missingC = CHECKERS.filter((c) => !tFiles.includes(c));
if (missingC.length) fail('בודקים משותפים חסרים ב-tools/: ' + missingC.join(', '));
else pass('שבעת הבודקים המשותפים קיימים ב-tools/');

const tAllowed = (f) => CHECKERS.includes(f) || TEST_RE.test(f) || (f in APP.toolsExtra);
const badT = tFiles.filter((f) => !tAllowed(f));
if (badT.length) fail('קבצים לא-רשומים ב-tools/: ' + badT.join(', ') +
                      ' — בודק חדש הוא יכולת משותפת (כלל ברזל 14); חריגה פרטית מחייבת נימוק');
for (const [f, why] of Object.entries(APP.toolsExtra)) {
  if (!tFiles.includes(f)) fail(`חריגת tools רשומה שאינה קיימת בפועל: ${f}`);
  else pass(`חריגת tools מנומקת: ${f} — ${why}`);
}
const badTD = tDirs.filter((d) => !(d in APP.toolsDirs));
if (badTD.length) fail('תת-תיקיות לא-רשומות ב-tools/: ' + badTD.join(', '));
for (const [d, why] of Object.entries(APP.toolsDirs)) {
  if (!tDirs.includes(d)) fail(`תת-תיקיית tools רשומה שאינה קיימת בפועל: ${d}`);
  else pass(`תת-תיקיית tools מנומקת: ${d} — ${why}`);
}

/* ── ד. `icons/` ו-`design/` — היפוך ברירת המחדל (סבב 50) ──────────────
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
if (iMissing.length) fail('נכסים חסרים ב-icons/: ' + iMissing.join(', ') +
                          ' — ⛔ ששת הנכסים קנוניים בארבעת הריפו');
if (iExtra.length)   fail('נכסים עודפים ב-icons/: ' + iExtra.join(', ') +
                          ' — ⛔ גם שם תמים אינו היתר: נכס שביעי הוא «קיים רק כאן, בשקט»');
if (!iMissing.length && !iExtra.length) pass(`icons/ — בדיוק ששת הנכסים הקנוניים`);

const dFiles = fs.readdirSync(join(ROOT, 'design'), { withFileTypes: true })
  .filter((e) => e.isFile()).map((e) => e.name).sort();
if (dFiles.length !== 1) {
  fail(`design/ מחזיקה ${dFiles.length} קבצים (${dFiles.join(', ') || '—'}) — ⛔ קובץ מאסטר אחד בלבד`);
} else if (!MASTER_RE.test(dFiles[0])) {
  fail(`design/${dFiles[0]} — ⛔ שם המאסטר הוא icon-master.svg או icon-master.png בלבד`);
} else {
  pass(`design/ — קובץ מאסטר אחד: ${dFiles[0]}`);
}

const servedRefs = [];
for (const f of ['index.html', 'sw.js']) {
  const body = fs.readFileSync(join(ROOT, f), 'utf8');
  if (body.includes('design/')) servedRefs.push(f);
}
if (servedRefs.length) fail('הפניה ל-design/ מתוך ' + servedRefs.join(' ו-') +
                            ' — ⛔ קובץ המאסטר הוא נכס עיצוב ואינו נטען בדף (סבב 50)');
else pass('⛔ אף קובץ מוגש אינו מפנה ל-design/');

console.log(failures ? `\n❌ בדיקת המבנה נכשלה (${failures})`
                     : '\n✅ בדיקת המבנה עברה');
process.exit(failures ? 1 : 0);
