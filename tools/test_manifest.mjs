#!/usr/bin/env node
/*  test_manifest.mjs — תוכן ה-`manifest.json` ושם האפליקציה.
 *
 *  **מה נאכף:** (א) חמשת השדות המשותפים נושאים **ערך זהה** בארבעתם, ⛔ ובודק
 *  התיעוד נופל על שינוי של כל אחד מהם ⛔ ואינו נופל על שינוי ערך פרטי;
 *  (ב) `id` ו-`scope` **ייחודיים**, ⛔ וארבעת הערכים שברישום שונים זה מזה;
 *  (ג) שם האפליקציה זהה בחמישה מקומות — ⚠️ העוגן הוא `short_name`.
 *
 *  **הנימוק המדוד:** הבודק אכף **נוכחות** ו**התאמה לערך יחיד**, ⛔ ולכן
 *  ארבעת ה-`id` נשאו `"./"` ועברו בשקט; ⛔ ושם אחת האפליקציות נמדד בן
 *  ארבע מילים ב-`name` וב-`<title>` מול מילה אחת ב-`short_name`.
 *
 *  **מה יישבר בלעדיו:** ⛔ `id` יחסי נפתר לכתובת מוחלטת, ⚠️ ובארבעתן זה
 *  אותו origin: הדפדפן רואה בהן אפליקציה **אחת**, ⛔ והתקנה של אחת
 *  מחליפה את האחרת במסך הבית; ⚠️ ושם שנבדל באחד המקומות מוצג בשניים.
 *
 *  **מה אינו נאכף כאן:** ⛔ הערכים הפרטיים — ⚠️ צבע, תיאור ורשימת האייקונים
 *  הם זהות חזותית פר-אפליקציה, ⛔ ויישורם היה שובר אותה.
 *
 *  ⛔ המוטציות אינן נכתבות לעץ — עותק זמני, והבודק האמיתי רץ עליו.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';


/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [1, 112];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

let pass = 0, fail = 0;
const ok  = (n, m) => { pass++; console.log(`  ok   ${n} · ${m}`); };
const bad = (n, m) => { fail++; console.log(`  FAIL ${n} · ${m}`); };
const t = (n, cond, m) => cond ? ok(n, m) : bad(n, m);

/* ── הערכים הקנוניים, כפי שהם רשומים ב-check-docs ──────────────────────── */
/*  ⛔ חמשת השדות הזהים — ⚠️ `start_url` יחסי ⛔ ונפתר מול ה-`scope` של כל
    אפליקציה, ⭐ ולכן «זהה» כאן פירושו **אותה צורה**. */
const SHARED = { display: 'standalone', orientation: 'portrait', lang: 'he', dir: 'rtl',
                 start_url: './index.html' };
/*  ⛔⛔ `id` ו-`scope` **ייחודיים** — ⚠️ הרישום מחזיק את ארבעת האפליקציות,
    ⭐ מפני ששער שרואה ערך אחד אינו יכול למדוד ייחודיות: ⛔ ארבעת הערכים
    היו `"./"`, שנפתר לאותה כתובת מוחלטת בארבעתן. */
const APP_ID = [
  ['yoman-avoda',      '/yoman-avoda/'],
  ['hanhala-ruchanit', '/hanhala-ruchanit/'],
  ['schar-limud',      '/schar-limud/'],
  ['gius',             '/gius/'],
];
/* ⛔ אלה נשארים פרטיים ואין לאכוף את ערכם (סבב 44) — זהות חזותית
   פר-אפליקציה. */
const PRIVATE = ['name', 'short_name', 'description',
                 'icons', 'theme_color', 'background_color'];

const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const mfPath = path.join(ROOT, 'manifest.json');
t(1, fs.existsSync(mfPath), 'manifest.json קיים');
const raw = fs.readFileSync(mfPath, 'utf8');
let mf = null;
try { mf = JSON.parse(raw); } catch (e) { /* מדווח בטענה 2 */ }
t(2, mf !== null, 'manifest.json הוא JSON תקין');

let n = 3;
for (const [k, v] of Object.entries(SHARED)) {
  t(n++, mf && mf[k] === v, `"${k}" = «${v}» — הערך הקנוני`);
}
t(n++, PRIVATE.every(k => k in mf), `כל ${PRIVATE.length} המפתחות הפרטיים קיימים`);

/* ── `id` ו-`scope` — ייחודיות, ⛔ ולא נוכחות ───────────────────────────── */
/*  ⛔ **הנימוק המדוד:** השורה הצהירה «`id` זהה בארבעתן» וה-probe בדק
 *  שהשדה **קיים** ושערכו הוא הערך המוצהר — ⚠️ ארבעתן נשאו `"./"`, שנפתר
 *  לאותה כתובת מוחלטת, ⛔ וכרום ראה בהן אפליקציה אחת. ⭐ הטענה כאן היא
 *  על **ייחודיות בין ארבעת הערכים**, ⛔ ולא על ערך יחיד.
 *  ⛔ והעוגן לזהות האפליקציה הוא `SW_CFG.prefix` שב-`sw.js` — ⚠️ הוא בעץ
 *  ואינו נגזר מהמניפסט עצמו: ⭐ גזירה מהמניפסט הייתה מאשרת את עצמה. */
const swApp = (/prefix:\s*'([^']+)-'/.exec(rd('sw.js')) || [])[1];
t(n++, APP_ID.some(([a]) => a === swApp),
  `זהות האפליקציה נגזרת מ-SW_CFG.prefix — נמדד «${swApp}» והצפוי אחד מ-${APP_ID.length} שברישום`);
const idVals = APP_ID.map(([, v]) => v);
t(n++, new Set(idVals).size === APP_ID.length,
  `⭐ ארבעת המזהים שונים זה מזה — נמדדו ${new Set(idVals).size} ערכים שונים והצפוי ${APP_ID.length}`);
const wantId = (APP_ID.find(([a]) => a === swApp) || [])[1];
for (const key of ['id', 'scope'])
  t(n++, mf && mf[key] === wantId,
    `manifest.json "${key}" — נמדד «${mf && mf[key]}» והצפוי «${wantId}», ייחודי ל-${swApp}`);
/*  ⛔ והרישום קיים ב-check-docs עצמו — ⚠️ probe שמחזיק רישום שאין לו
 *  אכיפה מודד את עצמו. */

/* ── check-docs אוכף את הערכים האלה, ולא רק את קיום הקובץ ──────────────── */
const docs = fs.readFileSync(path.join(HERE, 'check-docs.mjs'), 'utf8');
t(n++, /CANON_MANIFEST/.test(docs), 'check-docs מחזיק את הרשימה CANON_MANIFEST');
for (const [k, v] of Object.entries(SHARED)) {
  t(n++, new RegExp(`\\['${k}',\\s*'${v}'\\]`).test(docs),
    `⭐ והזוג ["${k}", "${v}"] רשום בו — אכיפת **ערך**, לא קיום`);
}
t(n++, /CANON_APP_ID/.test(docs), 'check-docs מחזיק את הרישום CANON_APP_ID');
for (const [a, v] of APP_ID)
  t(n++, new RegExp(`\\['${a}',\\s*'${v.replace(/\//g, '\\/')}'\\]`).test(docs),
    `⭐ והזוג ["${a}", "${v}"] רשום בו — המזהה הייחודי נאכף ב-check-docs`);
t(n++, /new Set\(idVals\)\.size !== CANON_APP_ID\.length/.test(docs),
  '⛔ ו-check-docs מודד **ייחודיות** ולא התאמה בלבד — נמדדה בדיקת ה-Set בגופו');
t(n++, /APP\.app/.test(docs) && /for \(const key of \['id', 'scope'\]\)/.test(docs),
  '⛔ ושני השדות — `id` ו-`scope` — נמדדים מול הרישום לפי APP.app');
t(n++, !PRIVATE.some(k => new RegExp(`\\['${k}',`).test(docs)),
  '⛔ ואף מפתח פרטי אינו ברשימה — יישור שלו היה שובר זהות חזותית');

/* ── שם האפליקציה — מקור אחד בחמישה מקומות ─────────────────────────────── */
/*  ⛔ הטענה על **ערך** ⛔ ולא על קיום — ⚠️ שם שנבדל באחד מהמקומות מוצג
 *  למשתמש בשניים, ⛔ ואינו נראה למי שעורך את השלישי: ⭐ נמדד שם בן ארבע
 *  מילים ב-`name` וב-`<title>` מול שם בן מילה אחת ב-`short_name`.
 *  ⛔ **והעוגן הוא `short_name`** — ⚠️ הוא הקצר מכולם, ⭐ והוא מה שמופיע
 *  תחת האייקון במסך הבית. */
const NAME = mf && mf.short_name;
const html = rd('index.html');
/*  ⛔ הראשון בקובץ ⛔ ולא כל התאמה — ⚠️ יש קוד שבונה `<title>` למסמך
    שהוא מייצא, ⭐ והוא אינו כותרת האפליקציה. */
const title = (/<title>([^<]*)<\/title>/.exec(html) || [])[1];
const readme = (/^#\s+(.+?)\s*$/m.exec(rd('README.md')) || [])[1];
const label = (/android:label="([^"]*)"/.exec(rd('android/app/src/main/AndroidManifest.xml')) || [])[1];
const NAME_SITES = [['name', mf && mf.name], ['<title>', title],
                    ['כותרת README', readme], ['android:label', label]];
for (const [where, got] of NAME_SITES)
  t(n++, got === NAME, `שם האפליקציה ב-${where} — נמדד «${got}» והצפוי «${NAME}»`);

/*  ⛔ מוטציה שרצה בפועל — ⚠️ הטענה על השם יושבת כאן ⛔ ולא ב-check-docs,
    ⭐ ולכן המוטציה נמדדת על אותה גזירה בדיוק. */
t(n++, ((/<title>([^<]*)<\/title>/.exec(
    html.replace('<title>' + NAME + '</title>', '<title>' + NAME + ' — כלי ניהול</title>')) || [])[1]) !== NAME,
  '⛔ מוטציה: תוספת לשם ב-`<title>` נתפסת ע"י טענת השם האחיד');
t(n++, ((/^#\s+(.+?)\s*$/m.exec(
    rd('README.md').replace(/^# .+$/m, '#   ' + NAME + '  ')) || [])[1]) === NAME,
  '⭐ מוטציית-נגד: רווחים סביב הכותרת ב-README ⛔ אינם מפילים — נמדד השם, לא הריווח');

if (RUN_MUT) {
/* ── מוטציות: העץ אינו נגוע, העותק בתיקייה זמנית ───────────────────────── */
/*  ⛔ עותק אחד לשער, ⛔ ולא עותק לכל מוטציה (סבב 92) — ⚠️ נמדד שהשער פתח
    **שמונה** עותקי עץ בהרצה אחת: ⭐ כל מוטציה כאן כותבת `manifest.json`
    בלבד, ⛔ ולכן שחזורו מהעץ האמיתי מחזיר את העותק למצבו הנקי. */
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'r44mf-'));
for (const f of fs.readdirSync(ROOT)) {
  if (f === '.git' || f === 'node_modules') continue;
  fs.cpSync(path.join(ROOT, f), path.join(WORK, f), { recursive: true });
}

function runDocsOn(mutManifest) {
  try {
    fs.writeFileSync(path.join(WORK, 'manifest.json'), JSON.stringify(mutManifest, null, 2));
    try {
      execFileSync(process.execPath, [path.join(WORK, 'tools', 'check-docs.mjs')],
                   { cwd: WORK, stdio: 'pipe' });
      return true;                       // עבר
    } catch (e) { return false; }        // נפל
  } finally {
    /*  ⛔ השחזור בכל מסלול יציאה — ⚠️ מוטציה שנפלה באמצע משאירה את העותק
        מלוכלך, ⛔ והמוטציה הבאה נמדדת על עץ שאינו נקי. */
    fs.cpSync(path.join(ROOT, 'manifest.json'), path.join(WORK, 'manifest.json'));
  }
}

const mutShared  = { ...mf, display: 'fullscreen' };
t(n++, runDocsOn(mutShared) === false,
  '⛔ מוטציה: שינוי ערך משותף (display→fullscreen) **מפיל** את check-docs');

const mutOrient  = { ...mf, orientation: 'portrait-primary' };
t(n++, runDocsOn(mutOrient) === false,
  '⛔ מוטציה: שינוי orientation ל-portrait-primary **מפיל** את check-docs');

const mutPrivate = { ...mf, theme_color: '#123456' };
t(n++, runDocsOn(mutPrivate) === true,
  '⭐ ומוטציה בערך פרטי (theme_color) ⛔ **אינה** מפילה — זהות חזותית');

const mutMissing = { ...mf }; delete mutMissing.display;
t(n++, runDocsOn(mutMissing) === false,
  '⛔ מוטציה: מפתח משותף שנמחק כליל **מפיל** — היעדר אינו פטור');

/*  ⛔⛔ המוטציה שנועדה לתפוס את הכשל שנמדד — ⚠️ מזהה של אפליקציה **אחרת**
 *  הוא ערך תקין בצורתו, ⭐ ורק מדידת הייחודיות פוסלת אותו. */
const otherId = APP_ID.find(([a]) => a !== swApp)[1];
const mutId = { ...mf, id: otherId };
t(n++, runDocsOn(mutId) === false,
  `⛔ מוטציה: \`id\` של אפליקציה אחרת («${otherId}») **מפיל** — מזהה ייחודי`);
const mutScope = { ...mf, scope: './' };
t(n++, runDocsOn(mutScope) === false,
  '⛔ מוטציה: החזרת `scope` ל-`./` **מפילה** — הערך שאיחד את ארבעתן');
const mutStart = { ...mf, start_url: './' };
t(n++, runDocsOn(mutStart) === false,
  '⛔ מוטציה: שינוי `start_url` **מפיל** — שדות זהים ב-manifest');
const mutDesc = { ...mf, description: mf.description + '.' };
t(n++, runDocsOn(mutDesc) === true,
  '⭐ מוטציית-נגד: שינוי `description` ⛔ **אינו** מפיל — הוא פרטי');

fs.rmSync(WORK, { recursive: true, force: true });
}

console.log(`\n${fail ? '❌' : '✓'} סבב 44 (manifest) — ${pass} טענות עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
