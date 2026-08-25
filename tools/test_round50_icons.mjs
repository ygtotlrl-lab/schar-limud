#!/usr/bin/env node
/* סבב 50 — שכבת האייקונים: `icons/` ו-`design/` (כלל ברזל 14).
 *
 * ⚠️ **מה שנמדד:** שתי התיקיות היו בסט הקנוני של השורש ותו לא — השער
 * דרש שהן יתקיימו, ⛔ ולא נגע במה שבתוכן. `icons/favicon-64.png` חי
 * ב-gius לבדו עם שלושה קוראים, ואף שער לא ראה אותו. ⛔ וזו בדיוק צורת
 * הכשל של `manifest.json` לפני סבב 44ב: קיום נאכף, תוכן לא.
 *
 * ⛔ הבדיקה מריצה את `check-structure` **האמיתי** על עותק מוטב בתיקייה
 * זמנית, ⛔ והמוטציות אינן נכתבות לעץ (הלקח של סבב 42ג).
 *
 * ⛔ הקובץ זהה בית-לבית בארבעת הריפו — אין בו בלוק `APP`.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

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

/* ⛔ הפניה ל-design/ מקובץ מוגש היא הורדה שהמשתמש משלם עליה לשום צורך. */
for (const f of ['index.html', 'sw.js']) {
  t(n++, !fs.readFileSync(path.join(ROOT, f), 'utf8').includes('design/'),
    `⛔ ${f} אינו מפנה ל-design/`);
}

const struct = fs.readFileSync(path.join(HERE, 'check-structure.mjs'), 'utf8');
t(n++, /const ICONS = \[/.test(struct) && ICONS.every(f => struct.includes(`'${f}'`)),
  'check-structure מחזיק את ששת הנכסים הקנוניים');
t(n++, /icon-master\\\.\(svg\|png\)/.test(struct),
  'check-structure מחזיק את תבנית שם המאסטר');

/* ⛔ מוטציה על עותק, לעולם לא על העץ (הלקח של סבב 42ג) — קובץ שנכתב
   לעץ ומוחזר ב-finally מותיר ריפו שבור אם התהליך נהרג באמצע. */
function runStructOn(mutate) {
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
  '⭐ ומוטציה שמשנה את **תוכן** הנכס ⛔ **אינה** מפילה — הסט נאכף, לא התמונה');

console.log(fail ? `\n✗ סבב 50 (שכבת האייקונים) — ${fail} נכשלו, ${pass} עברו`
                 : `\n✓ סבב 50 (שכבת האייקונים) — ${pass} טענות עברו`);
process.exit(fail ? 1 : 0);
