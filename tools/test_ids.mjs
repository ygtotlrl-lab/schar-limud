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
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

if (process.env.R33_INNER) {
  console.log('test_ids: ריצה פנימית — מדלג (מניעת רקורסיה)');
  process.exit(0);
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

const START = '/* ═══ מזהי רשומות — מודול משותף (סבב 37א)';
const END = '/* ═══════════════ סוף מודול מזהי הרשומות';

let passed = 0, failed = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בארבעת הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 9, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות (סבב 119) — ⚠️ `null` הוא תהליך
 *  שלא הגיע לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה
 *  שמבדיל ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
const SUBRUN = !!process.env.GATE_SUBRUN;
/*  ⛔ הריצפה נמדדת בשני הכיוונים (סבב 118) — ⚠️ **מה נכנס**: מספר הטענות
 *  שרצו עד שלב המוטציות; ⛔ **ומה מפיל**: פחות מהמוצהר — ריצה חלקית —
 *  ⛔ ויותר ממנו — ריצפה מיושנת. ⭐ **ולמה שני הכיוונים**: ריצפה שאינה
 *  מתעדכנת מפסיקה למדוד את מה שנוסף. ⛔ **וההשהיה על שלב המוטציות בלבד
 *  (סבב 119)** — ⚠️ `mutStage` לוכדת את המונה בכניסה אליו, ⭐ ומה שהוא
 *  מוסיף אינו נספר בתקרה: ⛔ השהיה על הרמה המלאה כולה השאירה תשעה שערים
 *  בלי מדידה באף כיוון. ⚠️ ושער שמספרו משתנה גם בלי המוטציות מוכרז
 *  ב-`APP.floorRange` ומקבל את הטווח ב-`GATE_FLOOR_RANGE`. */
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  /*  ⚠️ שער שיובא לתהליך של שער אחר אינו סוגר — ⛔ הספירה שלו לא רצה.
   *  ⛔ וגם ריצת-משנה מוצהרת אינה סוגרת — ⚠️ שער שמריץ את עצמו בעץ
   *  סינתטי מגיע לחלק מטענותיו בכוונה, ⭐ והרצפה נמדדת על עץ אמיתי. */
  if (!process.argv[1] || !process.argv[1].endsWith(GATE_ID)) return;
  if (SUBRUN) return;
  /*  ⛔ אפס שנמדד בכניסה לשלב המוטציות הוא דילוג מוצהר (סבב 119) —
   *  ⚠️ שער שכל גופו מוטציות אינו רץ ברמה המהירה, ⭐ ואפס כזה אינו
   *  ריצה חלקית: ⛔ ו-`null` — תהליך שלא הגיע לשם — כן. */
  if (PRE_MUT === 0 && process.env.GATE_MUT !== '1') {
    console.log(`⏭ ${GATE_ID}: כל גופו רץ ברמה המלאה — לא נמדד כאן`);
    return;
  }
  const N = PRE_MUT || RAN;
  console.log(`רצו ${N} מתוך ${EXPECTED}`);
  if (N < EXPECTED) {
    console.error(`❌ ${GATE_ID}: רצו ${N} טענות מתוך ${EXPECTED} מוצהרות — ` +
      'מה עושים: ודא `await` בקריאה הראשית, ⛔ ויציאה שאינה קודמת להמתנה.');
    process.exitCode = 1;
  } else if (N > FLOOR_MAX) {
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — ` +
      'עדכן את `FLOOR`.');
    process.exitCode = 1;
  }
});
const ok = (msg, cond) => { RAN++;
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
  mutStage();
/* ── 3 · מוטציות ───────────────────────────────────────────────────────── */
/*  ⛔ הבודק מיובא ⛔ ואינו מורץ כתהליך (סבב 108) — ⚠️ הטענה כאן היא על
 *  **טקסט**: ⭐ `index.html` המוטט נמסר ל-`run` כארגומנט, ⛔ ואין עותק עץ
 *  ואין תהליך — ⚠️ הנימוק המדוד: שלושה עותקי עץ ושלושה תהליכי `node`
 *  בהרצה אחת, ⭐ וכולם כדי לקרוא את אותה חתימה מאותו קובץ.
 *  ⛔ **ו-`CAP_INPROC` מבטל את `process.exit` שבסוף הבודק** — ⚠️ בלעדיו
 *  הייבוא היה עוצר את השער הזה עצמו.
 *  ⛔ **והפלט נבלע** — ⚠️ הבודק מדפיס מאות שורות, ⭐ ומונה הכשלים שהוא
 *  מחזיר הוא מה שנמדד. */
process.env.CAP_INPROC = '1';
const capRun = (await import(
  pathToFileURL(path.join(ROOT, 'tools', 'check-capabilities.mjs')).href)).run;
function checkerFails(mutatedSrc) {
  const lg = console.log, er = console.error;
  console.log = () => {}; console.error = () => {};
  try { return capRun({ 'index.html': mutatedSrc }) !== 0; }
  catch (e) { return true; }
  finally { console.log = lg; console.error = er; }
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
