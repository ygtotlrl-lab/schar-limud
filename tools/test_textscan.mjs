#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
   test_textscan.mjs — מחרוזת למשתמש היא קבוע (סבב 141)

   **מה נאכף:** ⛔ **אפס ליטרל עברי בשלושת אתרי ההודעה** — `toast` · `ask` ·
   `openModal`: ⚠️ מה שהאפליקציה אומרת למשתמש הוא **שם**, ⭐ והשם מוגדר פעם
   אחת · ⛔ **והודעה שיותר מאפליקציה אחת אומרת יושבת בבלוק החתום**, ⚠️ ולא
   פעמיים באותו נוסח בשני ריפו · ⛔ **וקבוע פר-אפליקציה שאין לו קורא מפיל**.

   **הנימוק המדוד:** ⚠️ **הערה** הצהירה «מילה במילה זהות בשלושת הפרויקטים»,
   ⛔ ואיש לא מדד: ⭐ `MSG_OFFLINE` ו-`MSG_BAD_LOGIN` נשאו טקסט אחר בגיוס,
   ⚠️ ואחת-עשרה הודעות נוספות נכתבו כליטרל בשניים ובשלושה ריפו בלי שם כלל —
   ⛔ ואותה הודעה עצמה נכתבה פעם כאמוג׳י ופעם כבריחת יוניקוד.

   **מה יישבר בלעדיו:** ⛔ הודעה שנוסחה מחדש במסך אחד ולא בשני מתארת אותו
   מצב בשתי לשונות — ⚠️ והמשתמש קורא אותן כשני מצבים; ⭐ ומי שמתקן ניסוח
   מתקן את המופע שמצא ⛔ ולא את השאר.

   **מה אינו נאכף כאן:** ⛔ **סימון** — ⚠️ מחרוזת שיש בה תגית היא בניית
   רכיב, ⭐ והשורות שמודדות אותה הן אחרות · ⛔ **ופריט בטבלת נתונים** —
   ⚠️ שם חודש או אות גימטריה אינם הודעה · ⛔ **ומה שבתוך בלוק חתום** —
   ⭐ הזהות שם נמדדת ב-`sha256`, ⚠️ וקבוע היה מנגנון שני לאותה הבטחה ·
   ⛔ **ולא ניסוחה של ההודעה** — ⭐ זו קריאת משמעות.
   ──────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { whiten } from './whiten.mjs';
import { PEERS } from './peers.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
/*  ⛔ אתר תצוגה שליטרל עברי בו מוצהר — ⚠️ **מה נכנס**: גוף המחרוזת ⟵
 *  נימוק; ⛔ **ומה מפיל**: הצהרה שאין לה אתר בפועל, ⛔ ואתר שאין לו
 *  הצהרה. ⭐ **ולמה המבנה קיים**: יש טקסט שאין לו שם — ⚠️ והרשימה היא
 *  המקום שבו אומרים למה, ⛔ ולא שקט. */
/*  ⛔ הודעה שאחות אומרת באותו נוסח ונשארת פר-אפליקציה — ⚠️ **מה נכנס**:
 *  שם הקבוע ⟵ נימוק; ⛔ **ומה מפיל**: שם שאין לו הצהרה פרטית כאן,
 *  ⛔ שם שאין לו מקבילה באחות, ⛔ ונימוק קצר משלוש מילים. ⭐ **ולמה
 *  המבנה קיים**: יש נוסח שנבדל בהחלטת מנהל, ⚠️ והרשימה היא המקום
 *  שבו אומרים למה ⛔ ולא שקט. */
const APP = {
  app: 'schar-limud',
  textAllow: {},
  sharedExempt: {
    MSG_OFFLINE: 'נוסחו נבדל בגיוס בהחלטת מנהל — ⚠️ שם הכתיבה מקומית-תחילה ' +
                 'והפעולה תסתנכרן, ⛔ וכאן היא לא בוצעה',
    MSG_BAD_LOGIN: 'נוסחו נבדל בגיוס בהחלטת מנהל — ⚠️ שם הוא נושא סימן ' +
                   'שגיאה, ⛔ וכאן הוא בלעדיו',
    MSG_PASS_SIX: 'צמודה לאתר האימות שבמסלול היצירה — ⚠️ ושורה אחרת מודדת ' +
                  'שקבוע מוצהר בלי אתר אימות יורד: ⛔ ובאפליקציה בלי כניסה ' +
                  'אין לו אתר',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [93];

/*  ⛔ המרשם שהסורק מכריז — ⚠️ **מה נכנס**: שם הדפוס שהשער אוכף;
 *  ⛔ **ומה מפיל**: דפוס שאין לו מוטציה, ומוטציה שנוקבת בדפוס שאינו כאן.
 *  ⭐ **ולמה המבנה קיים**: בלעדיו דפוס נשחק בשקט — ⚠️ השער ממשיך להכריז
 *  עליו, ⛔ והוא כבר אינו נמדד. */
export const PATTERNS = ['literal', 'block', 'no-reader', 'orphan', 'dup-decl', 'shared-drift'];
export const MUTS = ['literal', 'literal', 'literal', 'block', 'no-reader', 'orphan',
                     'dup-decl', 'shared-drift'];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ מדידה בזיכרון,
 *  ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIBS = path.resolve(ROOT, '..');
/*  ⛔ שמות הריפו נקראים מהמרשם ⛔ ואינם מוקלדים כאן — ⚠️ רשימה שהוקלדה
 *  בכל שער בנפרד היא אותה הכרעה בהרבה מקומות, ⭐ ומי ששוכח אחד מהם
 *  משאיר שער שמודד פחות ממה שיש. */


let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה.
 *  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ המדידה זהה בכולן: ⭐ אותם אתרי
 *  תצוגה, אותו בלוק חתום, ואותן שתי טענות על הריפו האחיות. */
const FLOOR = { shared: 11, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
const SUBRUN = !!process.env.GATE_SUBRUN;
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  if (!process.argv[1] || !process.argv[1].endsWith(GATE_ID)) return;
  if (SUBRUN) return;
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
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — עדכן את \`FLOOR\`.`);
    process.exitCode = 1;
  }
});
const t = (c, m) => { RAN++; if (c) { pass++; console.log('  ok   ' + m); }
                      else { fail++; console.error('  FAIL ' + m); } };

/* ── הליבה — מקבלת מקור כארגומנט ⛔ ואינה קוראת מהדיסק ──────────────────── */
/*  ⛔ **הסריקה כאן גולמית בכוונה** — ⚠️ הנמדד הוא **גוף המחרוזת**, ⭐ ומקור
 *  מולבן היה מחזיר רווחים במקומו: ⛔ ולכן ההלבנה משמשת לסימון הטווחים בלבד —
 *  ⚠️ טווח שהולבן ונפתח בגרש הוא מחרוזת, ⭐ וטווח שנפתח בלוכסן הוא הערה,
 *  ⛔ והסריקה מדלגת עליו ואינה סופרת את מה שבתוכו. */
const HEB = /[֐-׿]/;
export function lex(src) {
  const W = whiten(src);
  const strs = [];
  const code = src.split('');
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (!(W[i] === ' ' && c !== ' ' && c !== '\n' && c !== '\t' && c !== '\r')) { i++; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c, s0 = i; i++;
      while (i < n) { if (src[i] === '\\') { i += 2; continue; } if (src[i] === q) { i++; break; } i++; }
      strs.push({ start: s0, end: i, body: src.slice(s0 + 1, i - 1) });
      continue;
    }
    let k = n;
    if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); k = e < 0 ? n : e; }
    else if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); k = e < 0 ? n : e + 2; }
    else if (c === '<' && src.startsWith('<!--', i)) { const e = src.indexOf('-->', i); k = e < 0 ? n : e + 3; }
    else { i++; continue; }
    for (let j = i; j < k; j++) if (code[j] !== '\n') code[j] = ' ';
    i = k;
  }
  return { strs, W, noCom: code.join('') };
}

/*  ⛔ טווחי הבלוקים נגזרים מ-`check-capabilities` ⛔ ואינם מוקלדים כאן —
 *  ⚠️ רשימה שנייה של סמנים הייתה מקור אמת שני, ⭐ ובלוק שנוסף שם היה
 *  נשאר בלתי-נראה כאן. */
export function signedRanges(src, capsSrc) {
  const re = /block:\s*\{[\s\S]*?start:\s*'([^']+)',[\s\S]*?end:\s*'([^']+)'/g;
  const out = []; let m;
  while ((m = re.exec(capsSrc)) !== null) {
    const i = src.indexOf(m[1]); if (i < 0) continue;
    const j = src.indexOf(m[2], i); if (j < 0) continue;
    const k = src.indexOf('*/', j); if (k < 0) continue;
    out.push([i, k + 2]);
  }
  return out;
}

/*  ⛔ שלושת אתרי ההודעה — ⚠️ הם מסלולי התצוגה המוצהרים: ⭐ הטוסט להודעה,
 *  ⛔ ו-`ask`/`openModal` לדיאלוג. */
const ROUTE_HEAD = /(?:^|[^\w$.])(?:toast|ask|openModal)\s*\($/;
const RE_OK_BEFORE = /[({[,;:!&|?+\-*%~^<=>]$/;
const RE_KW_BEFORE = /\b(return|typeof|instanceof|case|in|of|new|delete|void|do|else|yield|await)$/;
function skipRe(W, j) {
  j++; let cls = false;
  while (j < W.length) {
    if (W[j] === '\\') { j += 2; continue; }
    if (W[j] === '[') cls = true;
    else if (W[j] === ']') cls = false;
    else if (W[j] === '/' && !cls) { j++; break; }
    else if (W[j] === '\n') break;
    j++;
  }
  while (j < W.length && /[a-z]/.test(W[j])) j++;
  return j;
}
/*  ⛔ סוף הקריאה בהתאמת סוגריים ⛔ ולא בחלון תווים — ⚠️ קריאה ארוכה מחלון
 *  קבוע נחתכת באמצע, ⭐ והליטרל שאחרי החיתוך אינו נמדד כלל. */
function callEnd(W, from) {
  let d = 1, j = from, last = '';
  while (j < W.length) {
    const ch = W[j];
    if (ch === '/') {
      const p = last.replace(/\s+$/, '');
      if (p === '' || RE_OK_BEFORE.test(p) || RE_KW_BEFORE.test(p)) { j = skipRe(W, j); last = 'x'; continue; }
    }
    if (ch === '(' || ch === '[' || ch === '{') d++;
    else if (ch === ')' || ch === ']' || ch === '}') { d--; if (!d) break; }
    last = (last + ch).slice(-40);
    j++;
  }
  return j;
}
export function routeSpans(W) {
  const out = [];
  for (let i = 0; i < W.length; i++)
    if (W[i] === '(' && ROUTE_HEAD.test(W.slice(Math.max(0, i - 40), i + 1)))
      out.push([i + 1, callEnd(W, i + 1)]);
  return out;
}
/*  ⛔ הסוגר הפתוח הקרוב — ⚠️ פריט במערך הוא **נתון בטבלה** ⛔ ולא הודעה:
 *  ⭐ שם חודש ואות גימטריה חיים בטבלה מוצהרת, ⛔ ושם לכל פריט הוא מפקד. */
function enclosing(W, at) {
  let d = 0;
  for (let i = at - 1; i >= 0; i--) {
    const c = W[i];
    if (c === ')' || c === ']' || c === '}') d++;
    else if (c === '(' || c === '[' || c === '{') { if (!d) return c; d--; }
  }
  return '';
}

/*  ⛔ הליטרלים העבריים שיושבים באתר הודעה — ⚠️ **מה נכנס**: מחרוזת שיש בה
 *  עברית, שאין בה תגית, שאינה פריט במערך, ושאינה בבלוק חתום; ⛔ **ומה
 *  מפיל**: כל אחת כזו שאינה מוצהרת. ⭐ **ולמה המבנה קיים**: הוא ההגדרה
 *  התפעולית של «הודעה», ⛔ והשורה נשענת עליה. */
export function routeLiterals(src, capsSrc) {
  const { strs, W } = lex(src);
  const ranges = signedRanges(src, capsSrc);
  const spans = routeSpans(W);
  const inB = (at) => ranges.some(([a, b]) => at >= a && at < b);
  const inS = (at) => spans.some(([a, b]) => at >= a && at < b);
  const out = { msg: [], markup: 0, table: 0, sealed: 0, spans: spans.length };
  for (const s of strs) {
    if (!HEB.test(s.body)) continue;
    if (!inS(s.start)) continue;
    if (inB(s.start)) { out.sealed++; continue; }
    if (s.body.indexOf('<') >= 0) { out.markup++; continue; }
    if (enclosing(W, s.start) === '[') { out.table++; continue; }
    out.msg.push(s);
  }
  return out;
}

/*  ⛔ הצהרות ההודעה — ⚠️ **מה נכנס**: שורת `var MSG_… = '…';` כלשונה;
 *  ⛔ **ומה מפיל**: שם שהוצהר פעמיים, וטקסט שנכתב גם מחוץ להצהרה.
 *  ⭐ **ולמה המבנה קיים**: הוא מה שמבדיל בין קבוע משותף לפרטי. */
const DECL_RE = /^var +(MSG_[A-Z_0-9]*) *= *'((?:[^'\\]|\\.)*)';$/gm;
export function declared(src, blockStart, blockEnd, ranges) {
  /*  ⛔ סמן שאינו קיים אינו «נמצא בתחילת הקובץ» — ⚠️ `indexOf(null)` מחזיר
   *  אפס, ⭐ וכל ההצהרות היו נספרות כמשותפות. */
  const a = blockStart ? src.indexOf(blockStart) : -1;
  const b = blockEnd ? src.indexOf(blockEnd) : -1;
  const seal = ranges || [];
  const out = [];
  let m; DECL_RE.lastIndex = 0;
  while ((m = DECL_RE.exec(src)) !== null)
    out.push({ name: m[1], body: m[2], at: m.index,
               shared: a >= 0 && b > a && m.index > a && m.index < b,
               /*  ⛔ קבוע שיושב בבלוק חתום **אחר** אינו פרטי — ⚠️ זהותו
                *  נמדדת שם ב-`sha256`, ⭐ ושורה זו אינה מנגנון שני לה. */
               sealed: seal.some(([x, y]) => m.index >= x && m.index < y) });
  return out;
}

/*  ⛔ ההכרעה על הבלוק בפונקציה אחת — ⚠️ הטענה החיה והמוטציה קוראות לה
 *  שתיהן, ⭐ ומוטציה שמודדת בעצמה אינה מודדת את מה שהשער מודד. */
export function blockOk(src, marks) {
  if (!marks) return false;
  const i = src.indexOf(marks.start);
  return i >= 0 && src.indexOf(marks.end) > i;
}

/*  ⛔ סמני הבלוק נגזרים מ-`check-capabilities` אף הם ⛔ ואינם מוקלדים
 *  כאן — ⭐ בלוק שהשתנה שם משנה גם את מה שנמדד כאן. */
export function msgsBlockMarks(capsSrc) {
  const m = /msgs:\s*\{[\s\S]*?start:\s*'([^']+)',[\s\S]*?end:\s*'([^']+)'/.exec(capsSrc);
  return m ? { start: m[1], end: m[2] } : null;
}

const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = rd('index.html');
const CAPS = rd('tools/check-capabilities.mjs');
const MARKS = msgsBlockMarks(CAPS);

/* ── 1. אפס ליטרל עברי בשלושת אתרי ההודעה ──────────────────────────────── */
const R = routeLiterals(SRC, CAPS);
const allowed = Object.keys(APP.textAllow);
const bad = R.msg.filter((s) => allowed.indexOf(s.body) < 0);
t(R.spans > 0,
  `אתרי ההודעה — נמדדו ${R.spans} קריאות toast/ask/openModal והצפוי לפחות אחת. ` +
  'מה עושים: אם המסלול הוסר, מסירים גם את השורה מהטבלה');
t(bad.length === 0,
  `ליטרל עברי באתר הודעה — נמדדו ${bad.length} והצפוי אפס` +
  (bad.length ? ' (' + bad.slice(0, 3).map((s) => JSON.stringify(s.body.slice(0, 30))).join(' · ') + ')' : '') +
  '. מה עושים: מגדירים קבוע MSG_ ומעבירים אליו את הליטרל, או מצהירים ' +
  'ב-APP.textAllow עם נימוקו');

/* ── 2. ההחרגה נמדדת משני צדדיה ────────────────────────────────────────── */
{
  const live = new Set(R.msg.map((s) => s.body));
  const dead = allowed.filter((k) => !live.has(k));
  const noWhy = allowed.filter((k) => String(APP.textAllow[k] || '').trim().split(/\s+/).length < 3);
  t(dead.length === 0 && noWhy.length === 0,
    `APP.textAllow — נמדדו ${allowed.length} הצהרות, מהן ${dead.length} בלי אתר ` +
    `ו-${noWhy.length} בלי נימוק, והצפוי אפס בשתיהן. ` +
    'מה עושים: מסירים הצהרה שאין לה אתר, ומוסיפים נימוק להצהרה שאין לה');
}

/* ── 3. הבלוק החתום קיים, וההודעות המשותפות בתוכו ──────────────────────── */
t(blockOk(SRC, MARKS),
  'בלוק ההודעות המשותפות — נמדדו ' + (MARKS ? 'סמנים מוצהרים' : '0 סמנים') +
  ' והצפוי פתיחה וסגירה בקובץ. ' +
  'מה עושים: מוסיפים את הבלוק, או מצהירים את סמניו ב-check-capabilities');
const RANGES = signedRanges(SRC, CAPS);
const DECLS = MARKS ? declared(SRC, MARKS.start, MARKS.end, RANGES) : [];
const SHARED = DECLS.filter((d) => d.shared);
const PRIVATE = DECLS.filter((d) => !d.shared && !d.sealed);
t(SHARED.length > 0,
  `הודעות בבלוק — נמדדו ${SHARED.length} הצהרות בתוכו והצפוי לפחות אחת. ` +
  'מה עושים: מעבירים לבלוק את ההודעות שיותר מאפליקציה אחת אומרת');

/* ── 4. כל קבוע פר-אפליקציה נקרא, וכל טקסט נכתב פעם אחת ────────────────── */
{
  /*  ⛔ הקורא נמדד בקוד שהערותיו הולבנו ⛔ ולא בטקסט הגולמי — ⚠️ שם בהערה
   *  אינו קורא, ⭐ והמדידה עליו הייתה מאשרת קבוע מת. */
  const { noCom, strs } = lex(SRC);
  const noReader = PRIVATE.filter((d) =>
    (noCom.match(new RegExp('\\b' + d.name + '\\b', 'g')) || []).length < 2);
  t(noReader.length === 0,
    `קבוע פר-אפליקציה בלי קורא — נמדדו ${noReader.length} והצפוי אפס` +
    (noReader.length ? ' (' + noReader.slice(0, 4).map((d) => d.name).join(' · ') + ')' : '') +
    '. מה עושים: מוחקים את הקבוע, או מחווטים אותו לאתר התצוגה שלו');
  const dup = DECLS.map((d) => d.name).filter((n, i, a) => a.indexOf(n) !== i);
  t(dup.length === 0,
    `הצהרה כפולה — נמדדו ${dup.length} שמות שהוצהרו פעמיים והצפוי אפס` +
    (dup.length ? ' (' + dup.join(' · ') + ')' : '') +
    '. מה עושים: מוחקים את ההצהרה השנייה');
  /*  ⛔ והטקסט עצמו יחיד — ⚠️ ליטרל שנשאר לצד הקבוע הוא בדיוק השארית
   *  שהשורה באה לסלק: ⭐ מי שמתקן ניסוח מתקן את המופע שמצא ⛔ ולא את השני. */
  /*  ⛔ מופע שיושב בבלוק חתום אינו נספר — ⚠️ זהותו נמדדת שם ב-`sha256`,
   *  ⭐ וברירת מחדל של דיאלוג משותף אינה ההודעה שהמסך אומר. */
  const free = strs.filter((s) => !RANGES.some(([x, y]) => s.start >= x && s.start < y));
  const twice = DECLS.filter((d) => free.filter((s) => s.body === d.body).length > 1);
  t(twice.length === 0,
    `טקסט הודעה שנכתב פעמיים — נמדדו ${twice.length} והצפוי אפס` +
    (twice.length ? ' (' + twice.slice(0, 4).map((d) => d.name).join(' · ') + ')' : '') +
    '. מה עושים: מוחקים את הליטרל היתום ומשאירים את השם');
}

/*  ⛔ טקסטים שהאחיות אומרות — ⚠️ **מה נכנס**: ליטרל באתר הודעה אצל אחות,
 *  והצהרה פרטית שלה; ⛔ **ומה מפיל**: כלום — הוא מחזיר מדידה. ⭐ **ולמה
 *  המבנה קיים**: הטענה והמוטציה קוראות לו שתיהן, ⚠️ ושני מימושים לאותה
 *  קריאה הם שתי הכרעות על אותה ראיה. */
function peerTextSet() {
  const missing = [], peerTexts = new Set();
  for (const p of PEERS) {
    if (p === APP.app) continue;
    const f = path.join(SIBS, p, 'index.html');
    const c = path.join(SIBS, p, 'tools', 'check-capabilities.mjs');
    if (!fs.existsSync(f) || !fs.existsSync(c)) { missing.push(p); continue; }
    const ps = fs.readFileSync(f, 'utf8');
    const pc = fs.readFileSync(c, 'utf8');
    for (const s of routeLiterals(ps, pc).msg) peerTexts.add(s.body);
    for (const d of declared(ps, MARKS && MARKS.start, MARKS && MARKS.end, signedRanges(ps, pc)))
      if (!d.shared && !d.sealed) peerTexts.add(d.body);
  }
  return { missing, peerTexts };
}

/* ── 5. הודעה שיותר מריפו אחד אומר — בבלוק החתום ───────────────────────── */
{
  /*  ⛔ הריפו האחיות נקראות מהדיסק — ⚠️ **וכשהן חסרות השער מדווח** ⛔ ואינו
   *  מדלג בשתיקה: ⭐ «לא נמדד» אינו «נמדד ואין». */
  const { missing, peerTexts } = peerTextSet();
  /*  ⛔ **אפס אחיות אינו «אחות חסרה»** — ⚠️ הוא עותק בודד של הריפו: ⭐ שער
   *  הקריאה-בלבד מריץ את הסט על עותק בתיקייה זמנית, ⛔ ואין שם ולא אמורות
   *  להיות אחיות. ⚠️ ודרישת הריפו האחיות על הדיסק נאכפת בשער הבלוקים המשותפים,
   *  ⛔ ולכן אין כאן דילוג שקט: ⭐ **חלקן** על הדיסק הוא המקרה המסוכן. */
  const lone = missing.length === PEERS.length - 1;
  if (lone) console.log(`  ⚠️  ההשוואה בין הריפו לא רצה — ${missing.join(' · ')} ` +
                        `אינם על הדיסק לצד ${APP.app}; מריצים את הסבב עם כל הריפו זה לצד זה`);
  t(lone || missing.length === 0,
    `הריפו האחיות — נמדדו ${PEERS.length - 1 - missing.length} מתוך ${PEERS.length - 1} ` +
    'על הדיסק והצפוי כולן' + (missing.length ? ' (חסרות: ' + missing.join(' · ') + ')' : '') +
    '. מה עושים: מעמידים את כל הריפו באותה תיקיית-אב — ההשוואה נשענת על כך');
  /*  ⛔ הודעה שנאמרת גם אצל אחות ואינה בבלוק — ⚠️ היא הסחיפה עצמה:
   *  ⭐ שני נוסחים לאותו מצב, ⛔ ומי שמתקן אחד אינו רואה את השני. */
  const exempt = APP.sharedExempt || {};
  const drift = PRIVATE.filter((d) => peerTexts.has(d.body) && !exempt[d.name]);
  const names = Object.keys(exempt);
  const dead = names.filter((n) => !PRIVATE.some((d) => d.name === n && peerTexts.has(d.body)));
  const thin = names.filter((n) => String(exempt[n] || '').trim().split(/\s+/).length < 3);
  t(missing.length > 0 || (dead.length === 0 && thin.length === 0),
    `APP.sharedExempt — נמדדו ${names.length} הצהרות, מהן ${dead.length} בלי מקרה ` +
    `ו-${thin.length} בלי נימוק, והצפוי אפס בשתיהן. ` +
    'מה עושים: מסירים הצהרה שאין לה מקרה, ומוסיפים נימוק להצהרה שאין לה');
  t(missing.length > 0 || drift.length === 0,
    `הודעה משותפת מחוץ לבלוק — נמדדו ${drift.length} והצפוי אפס` +
    (drift.length ? ' (' + drift.slice(0, 4).map((d) => d.name).join(' · ') + ')' : '') +
    '. מה עושים: מעבירים אותה לבלוק החתום בכל הריפו באותו סבב');
}

mutStage();
if (RUN_MUT) {
/* ── המוטציות — ⛔ בזיכרון, ⛔ ואינן נוגעות בעץ ──────────────────────────── */
const B = MARKS || { start: null, end: null };
/*  ⛔ מרשם המוטציות — ⚠️ **מה נכנס**: העריכה על המקור ⟵ הטענה שאמורה
 *  ליפול עליה; ⛔ **ומה מפיל**: עריכה שהטענה לא נפלה עליה. ⭐ **ולמה
 *  המבנה קיים**: טענה שאין לה מוטציה נשחקת לבדיקת נוכחות, ⚠️ והתא
 *  נשאר ✅ בלי שנמדד דבר. */
/*  ⛔ המוטציה נשתלת **מחוץ** לכל בלוק חתום — ⚠️ מה שנשתל בתוך בלוק אינו
 *  נמדד כאן לפי ההגדרה, ⭐ והמוטציה הייתה עוברת בלי שנמדד דבר. */
const at = (() => {
  let i = -1;
  while ((i = SRC.indexOf('\nfunction ', i + 1)) >= 0)
    if (!RANGES.some(([x, y]) => i + 1 >= x && i + 1 < y)) return i + 1;
  return -1;
})();
const MUT = [
  { m: 'מ1', key: 'literal', lbl: 'ליטרל עברי חוזר לאתר הודעה',
    edit: () => SRC.slice(0, at) + "toast('שלום למשתמש');\n" + SRC.slice(at),
    claim: (s) => routeLiterals(s, CAPS).msg.length > 0 },
  { m: 'מ2', key: 'literal', lbl: 'ליטרל עברי בקריאה שקודמים לה ארגומנטים',
    edit: () => SRC.slice(0, at) + "toast(pick(a, b), 'נעלם מהמדידה');\n" + SRC.slice(at),
    claim: (s) => routeLiterals(s, CAPS).msg.length > 0 },
  { m: 'מ3', key: 'literal', lbl: 'ליטרל עברי בכותרת דיאלוג',
    edit: () => SRC.slice(0, at) + "openModal('כותרת חדשה', body, '');\n" + SRC.slice(at),
    claim: (s) => routeLiterals(s, CAPS).msg.length > 0 },
  { m: 'מ4', key: 'block', lbl: 'סמן הבלוק החתום נעלם',
    edit: () => B.start ? SRC.replace(B.start, '/* ═══ הודעות ═══') : null,
    claim: (s) => !blockOk(s, MARKS) },
  { m: 'מ5', key: 'no-reader', lbl: 'קבוע MSG_ בלי קורא',
    edit: () => SRC.slice(0, at) + "var MSG_NO_READER_PROBE = 'הודעה שאיש אינו אומר';\n" + SRC.slice(at),
    claim: (s) => { const { noCom } = lex(s);
                    return declared(s, B.start, B.end, signedRanges(s, CAPS))
                      .filter((d) => !d.shared && !d.sealed)
                      .some((d) => (noCom.match(new RegExp('\\b' + d.name + '\\b', 'g')) || []).length < 2); } },
  { m: 'מ6', key: 'orphan', lbl: 'ליטרל יתום נשאר לצד הקבוע',
    edit: () => { const d = (declared(SRC, B.start, B.end, RANGES).filter((x) => x.shared)[0] || null);
                  return d ? SRC.slice(0, at) + 'var _probe = \'' + d.body + '\';\n' + SRC.slice(at) : null; },
    claim: (s) => { const { strs } = lex(s);
                    return declared(s, B.start, B.end, signedRanges(s, CAPS))
                      .some((d) => strs.filter((x) => x.body === d.body).length > 1); } },
  { m: 'מ7', key: 'dup-decl', lbl: 'שם שהוצהר פעמיים',
    edit: () => { const d = declared(SRC, B.start, B.end, RANGES)[0] || null;
                  return d ? SRC.slice(0, at) + 'var ' + d.name + " = 'הצהרה שנייה לאותו שם';\n" + SRC.slice(at) : null; },
    claim: (s) => { const names = declared(s, B.start, B.end, signedRanges(s, CAPS)).map((d) => d.name);
                    return names.length !== new Set(names).size; } },
  { m: 'מ8', key: 'shared-drift', lbl: 'טקסט שאחות אומרת, מחוץ לבלוק',
    edit: () => { const body = [...peerTextSet().peerTexts][0];
                  return body && body.indexOf("'") < 0
                    ? SRC.slice(0, at) + "var MSG_DRIFT_PROBE = '" + body + "';\n" + SRC.slice(at) : null; },
    claim: (s) => { const { peerTexts } = peerTextSet();
                    return declared(s, B.start, B.end, signedRanges(s, CAPS))
                      .filter((d) => !d.shared && !d.sealed)
                      .some((d) => peerTexts.has(d.body) && !(APP.sharedExempt || {})[d.name]); } },
];
for (const r of MUT) {
  const body = at < 0 ? null : r.edit();
  if (body === null || body === SRC) { t(true, `${r.m} · ⭕ ${r.lbl} — ⛔ אין כאן מה למוטט`); continue; }
  t(r.claim(body), `${r.m} · ${r.lbl} **מפיל**`);
}
/*  ⭐ מוטציית-נגד: קריאה שכולה בהערה ⛔ אינה מפילה — ⚠️ ההערה מולבנת
 *  לפני המדידה, ⭐ וליטרל שבתוכה אינו אתר תצוגה. */
{
  const body = SRC.slice(0, at) + "// toast('הודעה בהערה בלבד');\n" + SRC.slice(at);
  t(routeLiterals(body, CAPS).msg.length === 0,
    'נ1 · ⭐ קריאה שכולה בהערה ⛔ **אינה** מפילה');
}
/*  ⭐ מוטציית-נגד: קבוע חדש שנוסף **ונקרא** ⛔ אינו מפיל — ⚠️ הנמדד הוא
 *  הליטרל באתר התצוגה, ⛔ ולא מספר הקבועים שבקובץ. */
{
  const body = SRC.slice(0, at) +
    "var MSG_COUNTER_PROBE = 'הודעה חדשה תקינה';\nfunction _cp() { toast(MSG_COUNTER_PROBE); }\n" +
    SRC.slice(at);
  const { noCom } = lex(body);
  const ok = routeLiterals(body, CAPS).msg.length === 0 &&
             declared(body, B.start, B.end, signedRanges(body, CAPS))
               .filter((d) => !d.shared && !d.sealed)
               .every((d) => (noCom.match(new RegExp('\\b' + d.name + '\\b', 'g')) || []).length >= 2);
  t(ok, 'נ2 · ⭐ קבוע חדש שנוסף ונקרא ⛔ **אינו** מפיל');
}
}

if (fail) { console.error(`❌ ${GATE_ID}: ${fail} טענות נכשלו`); process.exitCode = 1; }
else console.log(`✅ ${GATE_ID} — ${pass} טענות עברו`);
