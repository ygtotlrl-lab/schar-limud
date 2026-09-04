#!/usr/bin/env node
/*  test_ids.mjs — מודול מזהי הרשומות.
 *
 *  **מה נאכף:** ⛔ הליבה האמיתית נחתכת מ-`index.html` ורצה, ⛔ והבודק
 *  האמיתי רץ על עותק מוטנטי של העץ — ⚠️ כלומר שני הכיוונים: שהמודול עובד,
 *  ⛔ ושהשער מפיל כשהוא נשבר.
 *
 *  **הנימוק המדוד:** אותה יכולת בדיוק חיה ב**חמישה שמות** בארבע
 *  האפליקציות — ⛔ ואף שער לא אכף אף אחת מהן.
 *
 *  **מה יישבר בלעדיו:** ⛔ רשומה שנוצרה במכשיר חסרת זהות עד שהיא מגיעה
 *  לשרת — ⚠️ ניסיון חוזר אחרי תשובה שאבדה ברשת מקבל מזהה שני, ⭐ כלומר
 *  שתי רשומות לאותו דבר.
 *
 *  **מה אינו נאכף כאן:** ⛔ מפתח המיזוג שנגזר מהמזהה — ⚠️ הוא נאכף בשערי
 *  המיזוג, ⭐ וכאן נמדדת **יצירת** המזהה בלבד.
 *
 *  ⛔ אין להחליף את הרצת-הבודק-האמיתי בסימולציה — ⚠️ בדיקה שאינה מריצה את
 *  השער עצמו אינה מוכיחה עליו דבר.
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
/*  `wired` — האם קוד האפליקציה כאן באמת קורא למודול. ⭐ הוא `true` בארבעתן
 *  מסבב 38 — ⚠️ ביומן עברו שני אתרי היצירה ל-`newClientId()` יחד עם שלושת
 *  הממדים שחסמו את ההמרה: המיון, הציטוט וההשוואה. כך במטריצה.            */
const APP = { app: 'schar-limud', wired: true };
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו 70% מזמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

if (process.env.R33_INNER || process.env.R37_INNER) {
  console.log('test_ids: ריצה פנימית — מדלג (מניעת רקורסיה)');
  process.exit(0);
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

const START = '/* ═══ מזהי רשומות — מודול משותף (סבב 37א)';
const END = '/* ═══════════════ סוף מודול מזהי הרשומות';

let passed = 0, failed = 0;
const ok = (msg, cond) => {
  if (cond) { passed++; console.log('  ok   ' + msg); }
  else      { failed++; console.error('  FAIL ' + msg); }
};

/* ── חיתוך הבלוק המשותף, באותה סמנטיקה של check-capabilities ───────────── */
function blockOf(src) {
  const lines = src.split('\n');
  let a = -1, b = -1;
  for (let i = 0; i < lines.length; i++) {
    if (a < 0 && lines[i].includes(START)) a = i;
    else if (a >= 0 && lines[i].includes(END)) { b = i; break; }
  }
  if (a < 0 || b < 0) throw new Error('בלוק מודול המזהים לא נמצא ב-index.html');
  return { a, b, text: lines.slice(a, b + 1).join('\n') };
}

/*  רתמה: מריצה את `newClientId` האמיתית, עם שליטה במה שזמין בסביבה —
 *  כך שלושת המסלולים (randomUUID · getRandomValues · Math.random) נבדקים
 *  בנפרד, ולא רק זה שהריצה במקרה נפלה עליו.                              */
function gen(src, mode, n) {
  const sandbox = { Math, Array, Number, String, Uint8Array, Error };
  if (mode === 'uuid') {
    let i = 0;
    sandbox.crypto = { randomUUID: () => 'ru-' + (++i), getRandomValues: () => { throw new Error('x'); } };
  } else if (mode === 'bytes') {
    sandbox.crypto = { getRandomValues: (b) => { for (let j = 0; j < b.length; j++) b[j] = Math.floor(Math.random() * 256); } };
  } // mode === 'none' — אין crypto כלל
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(blockOf(src).text, sandbox, { filename: 'ids.js' });
  const out = [];
  for (let k = 0; k < n; k++) out.push(sandbox.newClientId());
  return out;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

console.log('· ' + APP.app + ' — סבב 37א: מודול מזהי הרשומות');

/* ── 1 · הליבה עצמה ────────────────────────────────────────────────────── */
const B = blockOf(SRC);
ok('1 · הבלוק המשותף קיים ב-index.html (' + (B.b - B.a + 1) + ' שורות)', B.b > B.a);
ok('2 · ⛔ הפונקציה נקראת `newClientId` — שם אחד לארבעתן',
  /function\s+newClientId\s*\(/.test(B.text));

const uuidPath = gen(SRC, 'uuid', 5);
ok('3 · `crypto.randomUUID` מנוצל כשהוא קיים — ⛔ ולא נעקף',
  uuidPath.length > 0 && uuidPath.every((x) => /^ru-\d+$/.test(x)));

for (const [mode, label] of [['bytes', 'getRandomValues'], ['none', 'Math.random']]) {
  const ids = gen(SRC, mode, 500);
  ok('4' + (mode === 'bytes' ? 'א' : 'ב') + ' · נפילה-חזרה `' + label +
     '`: 500 מזהים, כולם uuid v4 תקין', ids.length > 0 && ids.every((x) => UUID_RE.test(x)));
  ok('5' + (mode === 'bytes' ? 'א' : 'ב') + ' · ⭐ וכולם שונים זה מזה (' +
     new Set(ids).size + '/500)', new Set(ids).size === 500);
}

/*  ⭐ הלב של השורה במטריצה: שני «מכשירים» שיוצרים רשומות במקביל אינם
 *  מקצים אף מזהה משותף. זה בדיוק מה ש-`maxId++` לא קיים.                 */
{
  const devA = new Set(gen(SRC, 'none', 300));
  const devB = gen(SRC, 'none', 300);
  ok('6 · ⛔ שני מכשירים שיוצרים 300 רשומות כל אחד — אפס מזהים משותפים',
    devB.length > 0 && devB.every((x) => !devA.has(x)));
}

/* ── 2 · החיווט, לפי מה שהמטריצה מצהירה ────────────────────────────────── */
{
  const callsOutside = SRC.slice(0, SRC.indexOf(START)) + SRC.slice(SRC.indexOf(END));
  const wired = /\bnewClientId\s*\(/.test(callsOutside.replace(/function\s+newClientId\s*\(/g, ''));
  ok('7 · ' + (APP.wired ? 'קוד האפליקציה קורא למודול (התא בטבלה = ✅)'
                         : '⚠️ קוד האפליקציה אינו קורא למודול — פער מתועד עם טריגר (התא בטבלה = ❌)'),
    wired === APP.wired);
}

if (RUN_MUT) {
/* ── 3 · מוטציות ───────────────────────────────────────────────────────── */
function copyRepo() {
  /*  ⛔ עותק לכל מוטציה, ⛔ ובכוונה (סבב 92) — ⚠️ נמדדו **שלושה** בהרצה
      אחת: ⭐ המוטציה עורכת את `index.html` **ומריצה עליו שער אמיתי**,
      ⛔ ושתי מוטציות על אותו עותק היו נמדדות זו על גבי זו. */
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), APP.app + '-r37a-'));
  fs.cpSync(ROOT, dst, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(ROOT, src);
      return !rel.split(path.sep).includes('.git') &&
             !rel.split(path.sep).includes('node_modules');
    },
  });
  return dst;
}
function checkerFails(mutatedSrc) {
  const dir = copyRepo();
  try {
    fs.writeFileSync(path.join(dir, 'index.html'), mutatedSrc);
    const r = spawnSync(process.execPath, [path.join(dir, 'tools', 'check-capabilities.mjs')], {
      cwd: dir, env: { ...process.env, R37_INNER: '1' }, encoding: 'utf8',
    });
    return r.status !== 0;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/*  א. שינוי **בית אחד** בליבה — החתימה חייבת ליפול. זו ההגנה היחידה מפני
 *  סחיפה שקטה בין ארבעת הריפו.                                           */
{
  const mut = SRC.replace('b[6]=(b[6]&0x0f)|0x40;', 'b[6]=(b[6]&0x0f)|0x41;');
  ok('8 · המוטציה אכן משנה בית בליבה', mut !== SRC);
  ok('9 · ⛔ שינוי בית במודול המזהים מפיל את חתימת `check-capabilities`',
    checkerFails(mut));
}

/*  ב. החלפת הליבה במונה רץ — uuid הופך למספר עוקב. ⛔ זו בדיוק התקלה
 *  שהמודול בא למנוע: שני מכשירים מקצים את אותם מזהים לרשומות שונות.     */
{
  const counter = B.text.replace(
    /function newClientId\(\)\{[\s\S]*?\n\}/,
    'function newClientId(){ return String((newClientId._n = (newClientId._n||0) + 1)); }');
  ok('10 · המוטציה אכן מחליפה את הליבה במונה רץ', counter !== B.text);
  const mutSrc = SRC.replace(B.text, counter);
  const devA = new Set(gen(mutSrc, 'none', 50));
  const devB = gen(mutSrc, 'none', 50);
  ok('11 · ⛔ במוטנט שני מכשירים מקצים את אותם מזהים — טענה 6 הייתה נכשלת',
    devB.some((x) => devA.has(x)));
  ok('12 · ⛔ והחתימה נופלת גם עליה', checkerFails(mutSrc));
}

/*  ⭐ מוטציית-נגד: **קוד שנוסף מחוץ לבלוק** ⛔ אינו מפיל — ⚠️ החתימה מודדת
 *  את הליבה המשותפת בלבד: ⛔ שער שהיה נופל על כל שינוי בקובץ היה הופך כל
 *  עבודה באפליקציה להפרה, ⚠️ והחתימה הייתה מפסיקה לומר משהו על השיתוף. */
{
  const added = SRC.replace(B.text, B.text +
    '\nfunction _ncPing(){ return 1; }\nvar _ncSeen = _ncPing();\n');
  ok('13 · המוטציית-נגד אכן מוסיפה קוד מחוץ לבלוק', added !== SRC && added.includes(B.text));
  ok('14 · ⭐ קוד שנוסף מחוץ לבלוק ⛔ אינו מפיל את החתימה', !checkerFails(added));
}

}

console.log(failed ? `\n✗ סבב 37א (מזהים) — ${failed} טענות נכשלו`
                   : `\n✓ סבב 37א (מזהים) — ${passed} טענות עברו`);
process.exit(failed ? 1 : 0);
