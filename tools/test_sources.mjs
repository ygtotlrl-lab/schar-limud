/* ══════════════════════════════════════════════════════════════════════════
   test_sources.mjs — שער מקורות הגיבוי: ⛔ מקור שאינו קיים מפיל
   ══════════════════════════════════════════════════════════════════════════
   **מה נאכף:** כל מקור `kind:'table'` שאינו מאחורי דגל חייב להופיע ברשימת
   הטבלאות המוכרזות של האפליקציה — ⛔ ומקור שאינו שם מפיל את הדחיפה.

   **הנימוק המדוד:** רשימת המקורות של אחת האפליקציות הכריזה שתי טבלאות
   ש**מעולם לא נוצרו** — ⚠️ המיגרציות נכתבו ולא הורצו, ונמדד מול המסד החי:
   אפס טבלאות.

   **מה יישבר בלעדיו:** ⛔ שרשרת הכשל שקטה לחלוטין — מקור שאינו קיים מחזיר
   שגיאה ⇒ הדגל היומי לעולם אינו נכתב ⇒ חותמת הגיבוי אינה מתקדמת ⇒ הפינוי
   אינו רץ ⇒ הלולאה רצה **בכל עלייה** במקום פעם ביום. ⚠️ נמדד 66 גיבויים
   ביום במקום ~13, ⭐ וזה שורש מצבור 503 השורות ו-72MB שנוקו.

   **מה אינו נאכף כאן:** ⛔ הבודק קורא **קבצים** ⛔ ואינו רואה את המסד החי —
   ⚠️ הרשימה היא **הצהרה** שאדם מתחזק ⛔ ולא מדידה. ⭐ מה שהשער קונה הוא
   שאי אפשר להוסיף מקור-טבלה **בשקט**. ⚠️ ורשימת ה-`migrations` אינה תחליף —
   ⛔ נמדד: הטבלה החסרה **כן** מופיעה ב-`create table` שבתיקיית ה-`migrations`,
   ⭐ ושער שנשען עליה היה מאשר בדיוק את הבאג. «נכתב» אינו «רץ».
   ══════════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';


/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [104];
/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
  /* ⛔ ארבע טבלאות הליבה. ⚠️ נמדדו מול `information_schema.tables`
     ב-26.8.2026, ⛔ ולא הועתקו מהקוד — רשימה שנגזרת מהקוד מאשרת את עצמה. */
  tables: ['sl_students', 'sl_transactions', 'sl_settings', 'sl_lists'],
  /* דגלים שמותר להם לשער מקור — ⛔ מקור מאחורי דגל אינו נדרש להיות
     ב-`tables`, מפני שהוא אינו נשלף עד שהדגל יידלק. ⚠️ ריק כאן: אין
     באפליקציה הזו מקור מגודר. */
  gates: []
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

/* ── חילוץ גוף `sources()` ומיפוי כל מקור למצב השִעוּר שלו ─────────────── */
const stripComments = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

/* מוצא את הטווח של כל משפט `if (...) <statement>` בגוף — כדי לדעת אילו
   מקורות מגודרים. ⛔ התאמת סוגריים אמיתית ולא regex (סבב 62) — גוף שמכיל
   `if` אחד עם `return` ואחד עם `push` היה נקרא בטעות כטווח אחד ארוך. */
function gatedRanges(body) {
  const out = [];
  const re = /\bif\s*\(/g;
  let m;
  while ((m = re.exec(body))) {
    let i = m.index + m[0].length, depth = 1;
    while (i < body.length && depth > 0) {           // סוגרי התנאי
      if (body[i] === '(') depth++;
      else if (body[i] === ')') depth--;
      i++;
    }
    const cond = body.slice(m.index + m[0].length, i - 1).trim();
    while (i < body.length && /\s/.test(body[i])) i++;
    let end = i;
    if (body[end] === '{') {                          // בלוק
      let d = 1; end++;
      while (end < body.length && d > 0) {
        if (body[end] === '{') d++;
        else if (body[end] === '}') d--;
        end++;
      }
    } else {                                          // משפט יחיד עד `;` בעומק 0
      let d = 0;
      while (end < body.length) {
        const ch = body[end];
        if (ch === '(' || ch === '[' || ch === '{') d++;
        else if (ch === ')' || ch === ']' || ch === '}') d--;
        else if (ch === ';' && d <= 0) { end++; break; }
        end++;
      }
    }
    out.push({ cond, from: m.index, to: end });
  }
  return out;
}

function tableSources(src) {
  const m = /sources: function \(\) \{([\s\S]*?)\n  \}\n\};/.exec(src);
  if (!m) return null;
  const body = stripComments(m[1]);
  const ranges = gatedRanges(body);
  const out = [];
  /* ⚠️ שתי צורות, ושתיהן קיימות בפועל (נמדד בסבב 62): שם כמחרוזת
     (`name: 'ys_sessions'`) ושם כמשתנה של `.map` על מערך מחרוזות
     (`['sl_students', …].map(t => ({ kind:'table', name: t }))`).
     ⛔ שער שקורא רק את הראשונה היה מחזיר «אפס מקורות» ל-schar ועובר
     בשקט — כלומר שער שנראה ירוק ואינו בודק דבר. */
  const re = /kind:\s*'table'\s*,\s*name:\s*(?:'([^']+)'|([A-Za-z_$][\w$]*))/g;
  let x;
  while ((x = re.exec(body))) {
    const r = ranges.find((g) => x.index > g.from && x.index < g.to);
    const gate = r ? r.cond : null;
    if (x[1]) { out.push({ name: x[1], gate }); continue; }
    /* שם כמשתנה — המקור הוא מערך המחרוזות הקרוב ביותר שלפניו. */
    const before = body.slice(0, x.index);
    const arr = before.match(/\[\s*'[^\]]*'\s*\](?=\s*\.map)/g);
    if (!arr) { out.push({ name: null, gate }); continue; }
    const names = arr[arr.length - 1].match(/'([^']+)'/g) || [];
    names.forEach((n) => out.push({ name: n.slice(1, -1), gate }));
  }
  return out;
}

console.log('\n— סבב 62: מקורות הגיבוי (' + APP.name + ') —');

const found = tableSources(SRC);
ok(found !== null, '1 · `BK_CFG.sources()` נקראת מ-index.html');
/* ⛔ שם שלא ניתן לגזור הוא כישלון ולא «אין מקורות» (סבב 62) — צורת כתיבה
   חדשה שהשער אינו מבין הייתה הופכת אותו לשער ריק שעובר תמיד. */
ok((found || []).every((s) => !!s.name),
   '1ב · כל שם מקור נגזר בפועל — אין צורת כתיבה שהשער אינו מבין');

const live = found.filter((s) => !s.gate);
const gated = found.filter((s) => s.gate);

/* ⛔ א. כל מקור-טבלה שאינו מגודר חייב להיות ברשימת הטבלאות המוכרזות —
   טבלה שהוכרזה כמקור ומעולם לא נוצרה משתקת את הגיבוי כולו. */
const missing = live.map((s) => s.name).filter((n) => APP.tables.indexOf(n) === -1);
ok(missing.length === 0,
   '2 · כל מקור `kind:\'table\'` פעיל מוכרז ב-APP.tables' +
   (missing.length ? ' — חסרים: ' + missing.join(', ') : ''));

/* ⛔ ב. דגל שמשער מקור חייב להיות מוכרז — אחרת «מגודר» הופך לדרך לעקוף. */
const badGate = gated.map((s) => s.gate).filter((g) => APP.gates.indexOf(g) === -1);
ok(badGate.length === 0,
   '3 · כל דגל שמשער מקור מוכרז ב-APP.gates' +
   (badGate.length ? ' — לא מוכרזים: ' + badGate.join(', ') : ''));

/* ⚠️ ג. רשימה שהתיישנה מפילה גם היא — טבלה מוכרזת שאיש אינו מגבה היא
   בדיוק השריד שכלל ברזל 14 אוסר ברשימות-היתר. */
const usedNames = found.map((s) => s.name);
const stale = APP.tables.filter((t) => usedNames.indexOf(t) === -1);
ok(stale.length === 0,
   '4 · אין ב-APP.tables טבלה שאינה מקור גיבוי' +
   (stale.length ? ' — שרידים: ' + stale.join(', ') : ''));

/* ⚠️ ד. הדגלים המוכרזים קיימים בקוד — דגל שנמחק משאיר שער שאינו משער דבר. */
const deadGate = APP.gates.filter((g) => !new RegExp('var\\s+' + g + '\\s*=').test(SRC));
ok(deadGate.length === 0,
   '5 · כל דגל ב-APP.gates מוגדר ב-index.html' +
   (deadGate.length ? ' — חסרים: ' + deadGate.join(', ') : ''));

console.log('  ⓘ פעילים: ' + (live.map((s) => s.name).join(', ') || '—') +
            ' · מגודרים: ' + (gated.map((s) => s.name + '@' + s.gate).join(', ') || '—'));

/* ── מוטציות ───────────────────────────────────────────────────────────── */
console.log('  — מוטציות —');

/* ⛔ המוטציות אינן נכתבות לעץ (הלקח של סבב 42ג) — הן רצות על מחרוזת.
   ⚠️ והן מזריקות מקור-רפאים בראש גוף `sources()` ולא נשענות על עוגן
   פר-אפליקציה (סבב 62) — ⛔ ארבע צורות הגוף נבדלות (מערך, `concat`,
   `push`), ומוטציה שמצטטת אחת מהן הייתה קובץ שאינו זהה בית-לבית. */
const OPEN = 'sources: function () {';
const GHOST = "{ kind: 'table', name: 'zz_ghost_table' }";
const inject = (stmt) => SRC.replace(OPEN, OPEN + '\n    ' + stmt);
const activeMissing = (text) => {
  const f = tableSources(text) || [];
  return f.filter((s) => !s.gate).map((s) => s.name).filter((n) => APP.tables.indexOf(n) === -1);
};

/* מוטציה 1 — מקור-טבלה פעיל שאינו מוכרז. */
{
  const miss = activeMissing(inject('var _zz = ' + GHOST + ';'));
  ok(miss.length === 1 && miss[0] === 'zz_ghost_table',
     '6 · מוטציה: מקור-טבלה שאינו ב-APP.tables — טענה 2 נופלת');
}

/* מוטציה 2 — ⭐ הרגרסיה עצמה, בשני צעדים: מקור מגודר **אינו** נחשב פעיל,
   ⛔ והסרת הדגל מסביבו הופכת אותו לפעיל ומפילה. זו בדיוק הצורה שהשביתה
   את הגיבוי — מקור שנשלף בפועל מטבלה שאינה קיימת. */
{
  const gatedTxt   = inject('if (ZZ_GATE) { var _zz = ' + GHOST + '; }');
  const ungatedTxt = inject('var _zz = ' + GHOST + ';');
  ok(activeMissing(gatedTxt).length === 0 && activeMissing(ungatedTxt).length === 1,
     '7 · ⛔ מוטציה: מקור מגודר אינו פעיל — והסרת הדגל מפילה את טענה 2');
}

/* מוטציה 3 — דגל שאינו מוכרז ב-APP.gates. */
{
  const f = tableSources(inject('if (ZZ_GATE) { var _zz = ' + GHOST + '; }')) || [];
  const bad = f.filter((s) => s.gate).map((s) => s.gate).filter((g) => APP.gates.indexOf(g) === -1);
  ok(bad.indexOf('ZZ_GATE') !== -1,
     '8 · מוטציה: דגל שאינו ב-APP.gates — טענה 3 נופלת');
}

/* ⭐ מוטציית-נגד — מקור `kv` אינו נוגע לשער הזה כלל.
   ⛔ בלעדיה השער היה יכול להיות רגיש לכל עריכה, וזה שער שנופל על רעש. */
{
  const txt = inject("var _zz = { kind: 'kv', table: 'kv', name: 'zz_ghost_key' };");
  const f = tableSources(txt) || [];
  ok(activeMissing(txt).length === 0 && f.length === found.length,
     '9 · ⭐ מוטציית-נגד: מקור `kv` אינו מפיל דבר ואינו נספר');
}

console.log((fail ? '✗' : '✓') + ' סבב 62 (מקורות הגיבוי) — ' + pass + ' טענות עברו, ' + fail + ' נכשלו\n');
process.exit(fail ? 1 : 0);
