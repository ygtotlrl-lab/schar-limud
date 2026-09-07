#!/usr/bin/env node
/*  test_icons.mjs — שכבת האייקונים: תוכן `icons/` ו-`design/`.
 *
 *  **מה נאכף:** ⛔ תוכן שתי התיקיות ⛔ ולא רק קיומן — ⚠️ הבדיקה מריצה את
 *  בודק המבנה **האמיתי** על עותק מוטב בתיקייה זמנית.
 *
 *  **הנימוק המדוד:** שתי התיקיות היו בסט הקנוני של השורש ותו לא — ⛔ השער
 *  דרש שהן יתקיימו ⛔ ולא נגע במה שבתוכן: ⚠️ נכס עם שלושה קוראים חי באחת
 *  מהן לבדה, ואף שער לא ראה אותו.
 *
 *  **מה יישבר בלעדיו:** ⛔ קיום נאכף ותוכן לא — ⚠️ בדיוק צורת הכשל של
 *  ה-`manifest.json` לפני שתוכנו נאכף.
 *
 *  **מה אינו נאכף כאן:** ⛔ הפיקסלים עצמם — ⚠️ שוליים, מסגרת ומרכוז נמדדים
 *  בשער שכבת האייקונים, ⭐ וכאן נמדד **סט הקבצים**.
 *
 *  ⛔ המוטציות אינן נכתבות לעץ.
 *  ⛔ הקובץ זהה בית-לבית בארבעת הריפו — אין בו בלוק `APP`.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';


/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

let pass = 0, fail = 0;
const t = (n, cond, m) => { if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

const ICONS = ['apple-touch-icon.png', 'favicon-16.png', 'favicon-32.png',
               'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
const MASTER_RE = /^icon-master\.(svg|png)$/;

const iFiles = fs.readdirSync(path.join(ROOT, 'icons')).sort();
const dFiles = fs.readdirSync(path.join(ROOT, 'design')).sort();

let n = 1;
t(n++, iFiles.length === 6 && ICONS.every(f => iFiles.includes(f)),
  `icons/ — בדיוק ששת הנכסים הקנוניים (${iFiles.length})`);
t(n++, dFiles.length === 1 && MASTER_RE.test(dFiles[0]),
  `design/ — קובץ מאסטר אחד: ${dFiles.join(', ')}`);

/* ⛔ אין הפניה ל-design/ מקובץ מוגש (סבב 50) — זו הורדה במגה-בייט שהמשתמש
   משלם עליה לשום צורך. */
for (const f of ['index.html', 'sw.js']) {
  t(n++, !fs.readFileSync(path.join(ROOT, f), 'utf8').includes('design/'),
    `⛔ ${f} אינו מפנה ל-design/`);
}

const struct = fs.readFileSync(path.join(HERE, 'check-structure.mjs'), 'utf8');
t(n++, /const ICONS = \[/.test(struct) && ICONS.every(f => struct.includes(`'${f}'`)),
  'check-structure מחזיק את ששת הנכסים הקנוניים');
t(n++, /icon-master\\\.\(svg\|png\)/.test(struct),
  'check-structure מחזיק את תבנית שם המאסטר');

/*  ⛔ מכאן ולמטה מוטציות ובדיקות שלמות (סבב 92) — ⚠️ הן רצות ברמה
 *  המלאה בלבד: ⛔ הרמה המהירה עוצרת כאן עם קוד היציאה של הטענות
 *  שכבר רצו, ⭐ והכיסוי שלהן אינו יורד. */
if (!RUN_MUT) {
  console.log('\n⏭ test_icons: המוטציות רצות ברמה המלאה (--full)');
  process.exit(fail ? 1 : 0);
}
/* ⛔ מוטציה על עותק, לעולם לא על העץ (הלקח של סבב 42ג) — קובץ שנכתב
   לעץ ומוחזר ב-finally מותיר ריפו שבור אם התהליך נהרג באמצע. */
function runStructOn(mutate) {
  /*  ⛔ עותק לכל מוטציה, ⛔ ובכוונה (סבב 92) — ⚠️ נמדדו **שבעה** בהרצה
      אחת, ⭐ והמוטציות כאן משנות את **סט הקבצים**: קובץ זר בשורש, תיקייה
      קנונית חסרה, בודק שנמחק. ⛔ שחזור סט קבצים הוא בעצמו העתקת עץ,
      ⚠️ ולכן «עותק אחד ושחזור» אינו חוסך דבר כאן. */
  /*  ⛔ כותב על עותק — ⚠️ המוטציה משנה את סט נכסי האייקון, ⛔ ו-`check-structure` קורא אותו מהדיסק. */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r50-'));
  try {
    for (const f of fs.readdirSync(ROOT)) {
      if (f === '.git' || f === 'node_modules') continue;
      fs.cpSync(path.join(ROOT, f), path.join(tmp, f), { recursive: true });
    }
    mutate(tmp);
    try {
      execFileSync(process.execPath, [path.join(tmp, 'tools', 'check-structure.mjs')],
                   { cwd: tmp, stdio: 'pipe' });
      return true;                       // עבר
    } catch { return false; }            // נפל
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

t(n++, runStructOn(() => {}) === true, '⭐ קו הבסיס — check-structure עובר על העץ כפי שהוא');

t(n++, runStructOn(d => fs.rmSync(path.join(d, 'icons', 'favicon-16.png'))) === false,
  '⛔ מוטציה: נכס חסר ב-icons/ **מפיל**');

t(n++, runStructOn(d => fs.copyFileSync(path.join(d, 'icons', 'favicon-32.png'),
                                        path.join(d, 'icons', 'favicon-64.png'))) === false,
  '⛔ מוטציה: נכס עודף ב-icons/ **מפיל** — גם כששמו תמים');

t(n++, runStructOn(d => fs.copyFileSync(path.join(d, 'design', fs.readdirSync(path.join(d, 'design'))[0]),
                                        path.join(d, 'design', 'icon-master-v2.png'))) === false,
  '⛔ מוטציה: שני קבצים ב-design/ **מפילים**');

t(n++, runStructOn(d => {
  const dir = path.join(d, 'design');
  const cur = fs.readdirSync(dir)[0];
  fs.renameSync(path.join(dir, cur), path.join(dir, 'master' + path.extname(cur)));
}) === false, '⛔ מוטציה: שם שאינו icon-master **מפיל**');

t(n++, runStructOn(d => {
  const p = path.join(d, 'index.html');
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8') +
    '\n<img src="design/icon-master.png" alt="">\n');
}) === false, '⛔ מוטציה: הפניה ל-design/ מ-index.html **מפילה**');

/* ⭐ ומוטציית-נגד: שינוי **תוכן** של נכס אינו מפיל — ⛔ הגודל, הצבע
   והפיקסלים נגזרים מהעיצוב הייחודי ואינם ניתנים ליישור (סבב 50). */
t(n++, runStructOn(d => fs.writeFileSync(path.join(d, 'icons', 'favicon-16.png'),
                                         Buffer.from([1, 2, 3]))) === true,
  'נ1 · ⭐ מוטציית-נגד: שינוי תוכן הנכס ⛔ אינו מפיל — הסט נאכף, לא התמונה');

console.log(fail ? `\n✗ סבב 50 (שכבת האייקונים) — ${fail} נכשלו, ${pass} עברו`
                 : `\n✓ סבב 50 (שכבת האייקונים) — ${pass} טענות עברו`);
process.exit(fail ? 1 : 0);
