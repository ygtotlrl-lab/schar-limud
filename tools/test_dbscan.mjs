#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
   test_dbscan.mjs — כל שאילתה מול הסכימה המוצהרת (סבב 142)

   **מה נאכף:** ⛔ כל `.from(…)` שבמקור, וכל תנאי שאחריו — `select` · `order` ·
   `eq` · `neq` · `gt` · `gte` · `lt` · `lte` · `in` · `insert` · `update` ·
   `upsert` — ⚠️ **נפתר לשם טבלה ולשם עמודה**, ⭐ **ומוצלב מול `APP.dbSchema`**:
   ⛔ שם שהוא קבוע נפתר לערכו לפני ההצלבה, ⛔ ושם שאינו נפתר ואינו מוצהר מפיל.

   **הנימוק המדוד:** ⛔ `from('ya_archive')` חי בקוד ⛔ וטבלה בשם הזה אינה במסד —
   ⚠️ והוא שרד מפני שההצלבה היחידה הייתה מול המסד החי: ⭐ והסביבה שבה רץ הסט
   חסומה מול Supabase (`403 CONNECT`), ⛔ ולכן ההצלבה ההיא לא רצה מעולם.

   **מה יישבר בלעדיו:** ⛔ `order` על עמודה שאינה קיימת מחזיר `42703` — ⚠️ הקוד
   קורא אותו «סכימה מיושנת» ⛔ ומציג באנר עדכון שאינו קשור לגרסה: ⭐ המשתמש
   מתבקש לעדכן, והעדכון אינו מתקן דבר.

   **מה אינו נאכף כאן:** ⛔ **הסכימה עצמה אינה נקראת מהמסד** — ⚠️ היא קבוע
   מוצהר שמתעדכן ביד בכל סבב שנוגע במסד, ⭐ ומיגרציה שמוסיפה עמודה מעדכנת
   אותו באותו קומיט: ⛔ ולכן עמודה שנוספה לקבוע ואינה במסד **אינה נתפסת כאן**
   · ⚠️ **וההערות מוחרגות** — ⛔ הסריקה רצה על מקור מולבן, ⭐ ו-`password` בשכר
   ו-`password_hash` בהנהלה חיים בהערות בלבד ומתעדים מה שהיה · ⛔ ותוכן העמודה
   אינו נמדד כאן, ⚠️ רק שמה.
   ──────────────────────────────────────────────────────────────────────── */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { whiten } from './whiten.mjs';
import { DB_SCHEMA } from './db-schema.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
  /*  ⛔ הפרויקט שהריפו הזה שואל — ⚠️ **מה נכנס**: המפתח שמסנן את
   *  `dbSchema`; ⛔ **ומה מפיל**: שם שאין לו אף טבלה בסכימה. ⭐ **ולמה
   *  המבנה קיים**: שני פרויקטים חיים בסכימה אחת, ⛔ וריפו ששואל טבלה
   *  של הפרויקט השני היה עובר על סכימה מאוחדת. */
  project: 'shared',
  /*  ⛔ סכימת שני הפרויקטים, מהמודול המשותף — ⚠️ **מה נכנס**: `p` הפרויקט · `t` שם הטבלה ·
   *  `c` עמודותיה מופרדות בפסיק; ⛔ **ומה מפיל**: טבלה כפולה באותו
   *  פרויקט, רשומה בלי עמודות, ושם שהקוד שואל ואינו כאן. ⭐ **ולמה המבנה
   *  קיים**: הסביבה חסומה מול המסד, ⚠️ ובלי קבוע מוצהר אין מול מה להצליב.
   *  ⛔ **והגוף זהה בית-לבית בכל הריפו** — ⚠️ כל העותקים של סכימה
   *  אחת, ⭐ וסחיפה באחד מהם הופכת «עבר כאן» לעדות שאינה מעידה. */
  dbSchema: DB_SCHEMA,
  /*  ⛔ טבלה שאינה מסונכרנת — ⚠️ **מה נכנס**: השם ⟵ למה חמש עמודות
   *  הסנכרון אינן שייכות לה; ⛔ **ומה מפיל**: טבלה שחסרה עמודה ואינה
   *  כאן, ⛔ והכרזה לטבלה שנושאת את חמשתן. ⭐ **ולמה המבנה קיים**:
   *  טבלה שחסרה עמודה אינה ניתנת למיזוג ואינה ניתנת לשחזור. */
  syncColsExempt: {
    sl_users: 'טבלת משתמשים — ⛔ ההשבתה היא `active` ואין בה מחיקה רכה',
    hr_users: 'טבלת משתמשים — ⛔ ההשבתה היא `active` ואין בה מחיקה רכה',
    g_users: 'טבלת משתמשים — ⛔ ההשבתה היא `active` ואין בה מחיקה רכה',
    sh_backup: 'תוספת-בלבד — ⛔ הגיבוי נכתב פעם אחת ואינו נערך ואינו נמחק',
    sh_sync_log: 'תוספת-בלבד — ⛔ היומן נכתב פעם אחת ואינו נערך ואינו נמחק',
  },
  /*  ⛔ הטבלאות שהקוד שואל — ⚠️ **מה נכנס**: כל שם שמגיע ל-`from`, גם
   *  משותפת; ⛔ **ומה מפיל**: שם שנשאל ואינו כאן, ⛔ ושם שכאן ואין לו
   *  אתר שאילתה. ⭐ **ולמה המבנה קיים**: הצלבה מול הסכימה דורשת רשימה
   *  סגורה, ⚠️ ורשימה שאינה נמדדת משני צדדיה מתיישנת בשקט. */
  dbTables: ['sh_backup', 'sl_lists', 'sl_settings', 'sl_students',
             'sl_transactions', 'sl_users', 'sh_sync_log'],
  /*  ⛔ שכבת העימוד — ⚠️ הארגומנט השני שלה הוא **עמודת המיון**, ⭐ והיא
   *  אינה יושבת ב-`.order(…)`: ⛔ בלי ההצהרה הזו כל אתרי המיון האמיתיים
   *  אינם נסרקים כלל. */
  /*  ⛔ שכבת העימוד המשותפת — ⚠️ **מה נכנס**: שם הפונקציה שבה תשובת
   *  השרת הופכת לשורות; ⛔ **ומה מפיל**: שם שאין לו גוף במקור. ⭐ **ולמה
   *  היא כאן**: היא נקודת הקריאה האחת, ⛔ וענף הכשל שבה חל על כל הקוראים. */
  pagerFn: '_ysRowsPaged',
  dbPager: '_ysRowsPaged',
  /*  ⛔ טבלה שנגרעה מהמסד ושמה נשאר בקוד — ⚠️ **מה נכנס**: השם, הדגל
   *  שמכבה את המסלול, והנימוק; ⛔ **ומה מפיל**: דגל שאינו כבוי, והכרזה
   *  בלי אתר. ⭐ **ולמה ריק**: נמדד ואין. */
  dbTableGone: {},
  /*  ⛔ שם טבלה שאינו ליטרל ואינו נפתר מקבוע — ⚠️ **מה נכנס**: נוסח
   *  הביטוי, הטבלאות שהוא יכול לקבל, והנימוק; ⛔ **ומה מפיל**: ביטוי
   *  בלי הצהרה, הצהרה בלי אתר, והצהרה שנוקבת בטבלה שאינה מוצהרת.
   *  ⭐ **ולמה המבנה קיים**: שם שמדולג בשתיקה הוא בדיוק מה ששרד. */
  dbDyn: {
    eraTbl:   { tables: ['sl_settings'],
                why: 'טבלת המפתח-ערך שעידן הנתונים נקרא ממנה — ⛔ היא של האפליקציה הזו, ⭐ ולכל אחת מספר משלה' },
    's.name':  { tables: ['sl_students', 'sl_transactions', 'sl_settings', 'sl_lists'],
                 why: 'שם המקור בגיבוי היומי — הרשימה נבנית בזמן ריצה' },
    's.table': { tables: [],
                 why: 'טבלת מפתח-ערך של מקור גיבוי, ⛔ ואין כאן מקור כזה: נמדד ואין' },
    tbl:       { tables: ['sl_students', 'sl_transactions', 'sl_settings', 'sl_lists'],
                 why: 'יעד הדחיפה — נבחר מרשימת הדחיפה בלולאה' },
    'e[0]':    { tables: ['sl_students', 'sl_transactions', 'sl_settings', 'sl_lists'],
                 why: 'שם הטבלה בזוג שבמפת הסנכרון, והלולאה עוברת על כולם' },
  },
  /*  ⛔ עמודת מיון שאינה ליטרל — ⚠️ **מה נכנס**: נוסח הביטוי והעמודות;
   *  ⛔ **ומה מפיל**: ביטוי בלי הצהרה, והצהרה בלי אתר. ⭐ **ו-`null`
   *  פירושו שהעמודה נמדדת בזוג עם הטבלה שלצידה** — ⚠️ ולא מול כל טבלה
   *  בקבוצה. */
  dbOrderDyn: {
    's.order || null': { cols: null,
                 why: 'עמודת המיון מוצהרת בזוג עם שם הטבלה, ונמדדת מול אותו זוג' },
    'e[1]':    { cols: null,
                 why: 'עמודת המיון היא הצד השני של אותו זוג, ונמדדת מולו' },
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [163, 152, 216];

/*  ⛔ המרשם שהסורק מכריז — ⚠️ **מה נכנס**: שם הדפוס שהשער אוכף;
 *  ⛔ **ומה מפיל**: דפוס שאין לו מוטציה, ומוטציה שנוקבת בדפוס שאינו כאן.
 *  ⭐ **ולמה המבנה קיים**: בלעדיו דפוס נשחק בשקט — ⚠️ השער ממשיך להכריז
 *  עליו, ⛔ והוא כבר אינו נמדד. */
export const PATTERNS = ['from-open', 'table-undeclared', 'decl-no-site',
                         'schema-table', 'schema-col', 'schema-dup', 'readguard'];
export const MUTS = ['from-open', 'table-undeclared', 'decl-no-site',
                     'schema-table', 'schema-col', 'schema-dup', 'readguard'];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 7, app: 0, appWhy: '' };
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
const ok = (m) => { RAN++; pass++; console.log('  ok   ' + m); };
const bad = (m) => { RAN++; fail++; console.error('  FAIL ' + m); };

/* ── dbScan — כל שאילתה מול הסכימה ─────────────────────────────────────── */
/*  ⛔ **מה נכנס**: כל `.from(…)` שאינו `Array.from`, והשרשרת שאחריו;
 *  ⛔ **מה מפיל**: שם טבלה או עמודת מיון שאינם ליטרל, אינם נפתרים ואינם
 *  מוצהרים. ⭐ **ולמה המבנה קיים**: `order` על עמודה שאינה קיימת שרד סבב
 *  שלם ⛔ מפני שהוא לא היה ליטרל פשוט — ⚠️ וסורק שמדלג על מה שאינו ליטרל
 *  מדווח «נקי» על מה שנסרק בלבד. */
const DB_COL1 = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains'];
const DB_OBJV = ['insert', 'update', 'upsert'];
const DB_NAME = /^[a-z_][a-z0-9_]*$/;

function dbParen(W, open) {
  let d = 0;
  for (let i = open; i < W.length; i++) {
    const c = W[i];
    if (c === '(') d++; else if (c === ')') { d--; if (!d) return i; }
  }
  return -1;
}
/*  ⛔ הפיצול נעשה על המולבן ⛔ ולא על המקור — ⚠️ פסיק בתוך מחרוזת אינו
 *  מפריד ארגומנטים, ⭐ וההיסטים זהים בשני הצדדים. */
function dbArgs(w, raw) {
  const out = []; let d = 0, last = 0;
  for (let i = 0; i <= w.length; i++) {
    const c = w[i];
    if (i === w.length || (c === ',' && d === 0)) {
      out.push({ w: w.slice(last, i), raw: raw.slice(last, i) }); last = i + 1; continue;
    }
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}') d--;
  }
  return out;
}
/*  ⛔ «ליטרל» נמדד על המולבן — ⚠️ ארגומנט שכולו רווחים אחרי ההלבנה היה
 *  מחרוזת במקור, ⭐ וכל דבר אחר הוא ביטוי: ⛔ זו ההבחנה שהשער נשען עליה. */
const dbIsLit = (w) => w.trim() === '';
const dbLit = (raw) => { const m = /^\s*(['"])([\s\S]*)\1\s*$/.exec(raw); return m ? m[2] : null; };
const dbFlat = (s) => s.replace(/\s+/g, ' ').trim();

function dbChain(W, SRC, from) {
  const out = [];
  let i = from;
  for (;;) {
    while (i < W.length && /\s/.test(W[i])) i++;
    const head = W.slice(i, i + 40);
    let verb = null, open = -1;
    const m = /^\.([A-Za-z_$][\w$]*)\s*\(/.exec(head);
    if (m) { verb = m[1]; open = i + m[0].length - 1; }
    else {
      /*  ⚠️ `['delete']()` הוא קריאת פועל אף הוא — ⛔ `delete` היא מילה
       *  שמורה, ⭐ והמקור כותב אותה בסוגריים מרובעים. */
      const b = /^\[\s*\]\s*\(/.exec(head);
      if (b) {
        const q = /\[\s*(['"])([a-z]+)\1\s*\]/.exec(SRC.slice(i, i + b[0].length));
        if (q) { verb = q[2]; open = i + b[0].length - 1; }
      }
    }
    if (!verb) break;
    const close = dbParen(W, open);
    if (close < 0) break;
    out.push({ verb, raw: SRC.slice(open + 1, close), w: W.slice(open + 1, close), at: open });
    i = close + 1;
  }
  return out;
}

function dbScan(SRC) {
  const W = whiten(SRC, { markup: 'blank' });
  const line = (i) => SRC.slice(0, i).split('\n').length;
  const dynFrom = APP.dbDyn || {}, dynOrder = APP.dbOrderDyn || {}, gone = APP.dbTableGone || {};
  const declared = new Set(APP.dbTables || []);
  const usedDyn = new Set(), usedOrd = new Set(), usedGone = new Set();
  const gaps = [], tables = new Set(), colsBy = new Map(), ordLits = [];
  const addCol = (t, c) => { if (!colsBy.has(t)) colsBy.set(t, new Set()); colsBy.get(t).add(c); };

  const cache = new Map();
  /*  ⛔ הליטרלים שהושמו לשם — ⚠️ ליטרל שצדו השני של אופרטור השוואה אינו
   *  ערך שהושם: ⭐ `y === 'ramataviv'` אינו שם טבלה, ⛔ ומי שסופר אותו
   *  מדווח טבלה שאינה קיימת. ⚠️ **וחוליה אחת אחורה** — ⛔ `var a = B;`
   *  הוא השם שממנו הוא נבנה, ⭐ וזו «מעקב אחרי הקבוע» עצמה. */
  function dbAssigned(name, seen) {
    if (cache.has(name)) return cache.get(name);
    const re = new RegExp('(?:^|[^\\w$.])' + name + '\\s*=(?!=)', 'g');
    const vals = [];
    let m;
    while ((m = re.exec(W))) {
      const st = m.index + m[0].length;
      let e = st;
      while (e < W.length && W[e] !== ';' && W[e] !== '\n') e++;
      const wSeg = W.slice(st, e), rSeg = SRC.slice(st, e);
      let any = false;
      for (const s of rSeg.matchAll(/(['"])([^'"]*)\1/g)) {
        if (wSeg.slice(s.index, s.index + s[0].length).trim() !== '') continue;
        if (/[=<>!]\s*$/.test(rSeg.slice(0, s.index))) continue;
        vals.push(s[2]); any = true;
      }
      if (any) continue;
      const id = /^\s*([A-Za-z_$][\w$]*)\s*(?:[,;]|$)/.exec(wSeg);
      const mark = seen || new Set([name]);
      if (id && !mark.has(id[1]) && mark.size < 4) {
        mark.add(id[1]);
        for (const v of dbAssigned(id[1], mark)) vals.push(v);
      }
    }
    cache.set(name, vals);
    return vals;
  }
  function dbArrayLits(name) {
    const m = new RegExp('(?:^|[^\\w$.])' + name + '\\s*=\\s*\\[', 'g').exec(W);
    if (!m) return [];
    const open = m.index + m[0].length - 1;
    let d = 0, e = open;
    for (; e < W.length; e++) { const c = W[e]; if (c === '[') d++; else if (c === ']') { d--; if (!d) break; } }
    const wSeg = W.slice(open, e), rSeg = SRC.slice(open, e), out = [];
    for (const s of rSeg.matchAll(/(['"])([^'"]*)\1/g))
      if (wSeg.slice(s.index, s.index + s[0].length).trim() === '') out.push(s[2]);
    return out;
  }
  /*  ⛔ `OBJ.from()` ריק — ⚠️ עוקבים אל ההגדרה שממנה הוא נבנה, ⭐ ששם
   *  יושב שם הטבלה: ⛔ בלעדיה האתר נקרא «אינו ליטרל» ומדולג. */
  function dbObjFrom(obj) {
    const at = W.indexOf(obj + ' = {');
    if (at < 0) return [];
    const m = /from:\s*function\s*\([^)]*\)\s*\{[^}]*?\.from\s*\(/.exec(W.slice(at, at + 4000));
    if (!m) return [];
    const open = at + m.index + m[0].length - 1, close = dbParen(W, open);
    if (close < 0) return [];
    const l = dbLit(SRC.slice(open + 1, close));
    return l ? [l] : [];
  }

  function resolveTable(raw, w, at) {
    const expr = dbFlat(raw);
    if (expr !== '' && dbIsLit(w)) { const l = dbLit(raw); if (l) return { how: 'ליטרל', v: [l] }; }
    if (expr === '') {
      const pre = /([A-Za-z_$][\w$]*)\s*$/.exec(W.slice(Math.max(0, at - 60), at));
      if (pre) { const t = dbObjFrom(pre[1]); if (t.length) return { how: 'הפניה', v: t }; }
    }
    if (/^[A-Za-z_$][\w$]*$/.test(expr)) {
      const v = [...new Set(dbAssigned(expr).filter((x) => DB_NAME.test(x)))];
      if (v.length) return { how: 'קבוע', v };
    }
    if (dynFrom[expr]) { usedDyn.add(expr); return { how: 'מוצהר', v: dynFrom[expr].tables || [] }; }
    return { how: null, v: [] };
  }
  function resolveOrder(raw, w) {
    const expr = dbFlat(raw);
    if (expr === '' || expr === 'null') return { how: 'ריק', v: [] };
    if (dbIsLit(w)) { const l = dbLit(raw); if (l) return { how: 'ליטרל', v: [l] }; }
    if (/^[A-Za-z_$][\w$]*$/.test(expr)) {
      const v = [...new Set(dbAssigned(expr).filter((x) => DB_NAME.test(x)))];
      if (v.length) return { how: 'קבוע', v };
    }
    if (dynOrder[expr]) { usedOrd.add(expr); return { how: 'מוצהר', v: dynOrder[expr].cols || [] }; }
    return { how: null, v: [] };
  }
  function resolveSelect(raw, w) {
    const a0 = dbArgs(w, raw)[0] || { w: '', raw: '' };
    const expr = dbFlat(a0.raw);
    if (dbIsLit(a0.w)) { const l = dbLit(a0.raw); return l == null ? null : l; }
    const j = /^([A-Za-z_$][\w$]*)\s*\.\s*join\s*\(/.exec(expr);
    if (j) { const a = dbArrayLits(j[1]); return a.length ? a.join(',') : null; }
    /*  ⛔ שם שהושמו לו שני ליטרלים שונים אינו נפתר — ⚠️ רשימת עמודות
     *  שנבנית בשרשור תנאי היא שתי רשימות, ⭐ ובחירה באחת מהן מדווחת
     *  עמודה שאינה נשאלת בהקשר הזה. */
    if (/^[A-Za-z_$][\w$]*$/.test(expr)) {
      const v = [...new Set(dbAssigned(expr))];
      if (v.length === 1) return v[0];
    }
    return null;
  }

  /*  ⛔ שכבת העימוד — ⚠️ הארגומנט השני שלה הוא עמודת המיון, ⭐ והיא אינה
   *  יושבת ב-`.order(…)` שבשרשרת: ⛔ סורק שמודד את השרשרת בלבד אינו רואה
   *  אותה כלל. */
  const pagers = [];
  if (APP.dbPager) {
    const re = new RegExp('(?:^|[^\\w$.])' + APP.dbPager + '\\s*\\(', 'g');
    let m;
    while ((m = re.exec(W))) {
      const open = m.index + m[0].length - 1, close = dbParen(W, open);
      if (close < 0) continue;
      const parts = dbArgs(W.slice(open + 1, close), SRC.slice(open + 1, close));
      if (parts.length < 2) continue;
      pagers.push({ from: open + 1, to: open + 1 + parts[0].w.length, at: m.index,
                    off: open + 2 + parts[0].w.length, raw: parts[1].raw, w: parts[1].w });
    }
  }

  const sites = [];
  for (const m of W.matchAll(/\.from\s*\(/g)) {
    /*  ⚠️ `Array.from` אינו שאילתה — ⛔ והוא ההחרגה היחידה: ⭐ כל מקבל
     *  אחר הוא לקוח המסד, במישרין או בהפניה. */
    const recv = /([A-Za-z_$][\w$]*)\s*\.\s*$/.exec(W.slice(Math.max(0, m.index - 40), m.index + 1));
    if (recv && recv[1] === 'Array') continue;
    const open = m.index + m[0].length - 1, close = dbParen(W, open);
    if (close < 0) continue;
    const raw = SRC.slice(open + 1, close), w = W.slice(open + 1, close);
    const r = resolveTable(raw, w, m.index);
    const qi = raw.search(/['"]/);
    sites.push({ ln: line(m.index), at: m.index, raw, how: r.how, tables: r.v,
                 litAt: (r.how === 'ליטרל' && qi >= 0) ? open + 1 + qi : -1,
                 chain: dbChain(W, SRC, close + 1) });
  }

  let nOrder = 0, nCols = 0, nDyn = 0, nOpen = 0;
  for (const s of sites) {
    if (!s.how) {
      gaps.push('שורה ' + s.ln + ': `from(' + (dbFlat(s.raw) || '·ריק·') +
                ')` אינו ליטרל, אינו נפתר ואינו מוצהר');
      continue;
    }
    if (s.how === 'מוצהר') nDyn++;
    for (const t of s.tables) tables.add(t);
    for (const c of s.chain) {
      if (c.verb === 'order') {
        nOrder++;
        const a0 = dbArgs(c.w, c.raw)[0] || { w: '', raw: '' };
        const o = resolveOrder(a0.raw, a0.w);
        if (!o.how) {
          gaps.push('שורה ' + line(c.at) + ': `order(' + dbFlat(c.raw) +
                    ')` אינו ליטרל, אינו נפתר ואינו מוצהר');
          continue;
        }
        if (o.how === 'מוצהר') nDyn++;
        if (o.how === 'ליטרל') { const qi = a0.raw.search(/['"]/); if (qi >= 0) ordLits.push({ at: c.at + 1 + qi, lit: o.v[0] }); }
        for (const t of s.tables) for (const col of o.v) addCol(t, col);
      } else if (c.verb === 'select') {
        const l = resolveSelect(c.raw, c.w);
        if (l == null) { nOpen++; continue; }
        for (const part of l.split(',')) {
          const p = part.trim();
          if (!p || p === '*' || p.indexOf('(') >= 0) continue;
          const col = p.indexOf(':') >= 0 ? p.slice(p.indexOf(':') + 1).trim() : p;
          if (!DB_NAME.test(col)) continue;
          for (const t of s.tables) addCol(t, col);
          nCols++;
        }
      } else if (DB_COL1.indexOf(c.verb) >= 0) {
        const a0 = dbArgs(c.w, c.raw)[0] || { w: 'x', raw: '' };
        if (!dbIsLit(a0.w)) { nOpen++; continue; }
        const col = dbLit(a0.raw);
        if (col && DB_NAME.test(col)) { for (const t of s.tables) addCol(t, col); nCols++; }
      } else if (DB_OBJV.indexOf(c.verb) >= 0) {
        const a0 = dbArgs(c.w, c.raw)[0] || { w: '', raw: '' };
        const aw = a0.w.trim(), ar = a0.raw.trim();
        if (!/^\{[\s\S]*\}$/.test(aw)) { nOpen++; continue; }
        for (const part of dbArgs(aw.slice(1, -1), ar.slice(1, -1))) {
          const k = /^\s*['"]?([a-z_][a-z0-9_]*)['"]?\s*:/.exec(part.raw);
          if (!k) continue;
          for (const t of s.tables) addCol(t, k[1]);
          nCols++;
        }
      }
    }
    for (const p of pagers) {
      if (s.at < p.from || s.at > p.to) continue;
      nOrder++;
      const o = resolveOrder(p.raw, p.w);
      if (!o.how) {
        gaps.push('שורה ' + line(p.at) + ': עמודת המיון `' + dbFlat(p.raw) +
                  '` שבשכבת העימוד אינה ליטרל, אינה נפתרת ואינה מוצהרת');
        continue;
      }
      if (o.how === 'מוצהר') nDyn++;
      if (o.how === 'ליטרל') { const qi = p.raw.search(/['"]/); if (qi >= 0) ordLits.push({ at: p.off + qi, lit: o.v[0] }); }
      for (const t of s.tables) for (const col of o.v) addCol(t, col);
    }
  }

  for (const t of tables) {
    if (declared.has(t)) continue;
    if (gone[t]) { usedGone.add(t); continue; }
    gaps.push('הטבלה `' + t + '` נשאלת בקוד ואינה מוצהרת');
  }
  for (const t of declared) if (!tables.has(t)) gaps.push('הטבלה `' + t + '` מוצהרת ואין לה אתר שאילתה');
  for (const e of Object.keys(dynFrom)) {
    if (!usedDyn.has(e)) { gaps.push('`' + e + '` מוצהר ואין לו אתר `from`'); continue; }
    if (!(dynFrom[e].why || '').trim()) gaps.push('`' + e + '` מוצהר בלי נימוק');
    for (const t of dynFrom[e].tables || [])
      if (!declared.has(t) && !gone[t]) gaps.push('`' + e + '` מצהיר את `' + t + '` שאינה מוצהרת');
  }
  for (const e of Object.keys(dynOrder)) {
    if (!usedOrd.has(e)) { gaps.push('`' + e + '` מוצהר ואין לו אתר מיון'); continue; }
    if (!(dynOrder[e].why || '').trim()) gaps.push('`' + e + '` מוצהר בלי נימוק');
  }
  /*  ⛔ טבלה שנגרעה מהמסד ⛔ ושם שלה עדיין בקוד — ⚠️ ההכרזה נושאת את
   *  **הדגל שמכבה את המסלול**, ⭐ והשער מודד שהוא כבוי: ⛔ מי שמדליק
   *  אותו מפיל את השער ⛔ ולא את המשתמש. */
  for (const t of Object.keys(gone)) {
    if (!usedGone.has(t)) { gaps.push('`' + t + '` מוכרזת כטבלה שנגרעה ואין לה אתר שאילתה'); continue; }
    if (!(gone[t].why || '').trim()) gaps.push('`' + t + '` מוכרזת בלי נימוק');
    const g = gone[t].guard;
    if (!g || !new RegExp('\\b' + g + '\\s*=\\s*false\\s*;').test(W))
      gaps.push('`' + t + '` מוכרזת כטבלה שנגרעה והדגל `' + g + '` אינו כבוי');
  }

  return { sites, gaps, tables, colsBy, ordLits, nOrder, nCols, nDyn, nOpen };
}


/* ── הסכימה המוצהרת ────────────────────────────────────────────────────── */
/*  ⛔ **מה נכנס**: `APP.dbSchema` מסונן לפרויקט של הריפו; ⛔ **מה מפיל**:
 *  טבלה כפולה באותו פרויקט, ורשומה בלי עמודות — ⚠️ שתיהן הופכות את
 *  ההצלבה לבדיקה שאינה יכולה להיכשל. ⭐ **ולמה פונקציה ולא קבוע**:
 *  המוטציות בונות סכימה אחרת ומודדות מולה, ⛔ ומפה שנבנתה פעם אחת
 *  הייתה משותפת לכולן. */
function schemaMap(rows, project) {
  const m = new Map(), dup = [], empty = [];
  for (const r of rows) {
    if (r.p !== project) continue;
    const cols = String(r.c || '').split(',').map((x) => x.trim()).filter(Boolean);
    if (!cols.length) empty.push(r.t);
    if (m.has(r.t)) dup.push(r.t);
    m.set(r.t, new Set(cols));
  }
  return { m, dup, empty };
}

/*  ⛔ ההצלבה — ⚠️ **מה נכנס**: תוצאת הסריקה ומפת הסכימה; ⛔ **מה מפיל**:
 *  טבלה שנשאלת ואינה בסכימה, ועמודה שהקוד נוקב בה ואינה בטבלה.
 *  ⭐ **ולמה היא פונקציה נפרדת**: המוטציות מריצות אותה על סריקה מוטטת
 *  ⛔ ועל אותה סכימה בדיוק. */
function schemaGaps(scan, map) {
  const gone = APP.dbTableGone || {};
  const out = [];
  for (const t of [...scan.tables].sort()) {
    if (gone[t]) continue;
    const cols = map.get(t);
    if (!cols) { out.push('הטבלה `' + t + '` נשאלת בקוד ואינה בסכימה המוצהרת'); continue; }
    for (const c of [...(scan.colsBy.get(t) || [])].sort())
      if (!cols.has(c)) out.push('`' + t + '.' + c + '` נשאלת בקוד ואינה בעמודות הטבלה');
  }
  return out;
}

/* ── ההרצה ─────────────────────────────────────────────────────────────── */
console.log(`── סבב 142 — כל שאילתה מול הסכימה המוצהרת (${APP.name})`);

const SCHEMA = schemaMap(APP.dbSchema, APP.project);
const SCAN = dbScan(SRC);

/*  ⛔ טענה א — כל שם נפתר או מוצהר, ⚠️ **וגם שם שהוא קבוע**: ⭐ `BK_TABLE`
 *  אינו ליטרל, ⛔ והוא נפתר מהערך שהושם לו לפני ההצלבה. */
{
  const how = {};
  for (const s of SCAN.sites) how[s.how || 'פתוח'] = (how[s.how || 'פתוח'] || 0) + 1;
  const byHow = Object.keys(how).sort().map((k) => k + ' ' + how[k]).join(' · ');
  if (SCAN.gaps.length)
    bad('א. כל שאילתה נפתרת — ' + SCAN.gaps.join(' · ') + '. נמדדו ' + SCAN.gaps.length +
        ' מול הצפוי 0. פותרים את השם מהקבוע שהוא נבנה ממנו, או מצהירים אותו ' +
        'ב-`APP.dbDyn`/`APP.dbOrderDyn` עם נימוקו');
  else
    ok('א. כל שאילתה נפתרת — ' + SCAN.sites.length + ' אתרי `from` (' + byHow + ') · ' +
       SCAN.tables.size + ' טבלאות · ' + SCAN.nOrder + ' אתרי מיון · ' + SCAN.nCols +
       ' עמודות נקובות, ואפס דילוגים · ' + SCAN.nOpen +
       ' ביטויי עמודה שאינם ליטרל אינם נמדדים כאן');
}

/*  ⛔ טענה ב — ההצלבה עצמה, ⚠️ **מול קבוע ולא מול רשת**: ⭐ הסביבה חסומה
 *  מול Supabase, ⛔ ומדידה שאינה רצה היא הצהרה. */
{
  const g = schemaGaps(SCAN, SCHEMA.m);
  if (g.length)
    bad('ב. כל שאילתה מול הסכימה המוצהרת — ' + g.join(' · ') + '. נמדדו ' + g.length +
        ' מול הצפוי 0. מיישרים את השאילתה לעמודה שקיימת, או מריצים את המיגרציה ' +
        'שמוסיפה אותה ומעדכנים את `APP.dbSchema` באותו קומיט');
  else
    ok('ב. כל שאילתה מול הסכימה המוצהרת — ' + SCAN.tables.size + ' טבלאות ו-' +
       SCAN.nCols + ' עמודות נקובות הוצלבו מול ' + SCHEMA.m.size +
       ' טבלאות שבפרויקט «' + APP.project + '», וכולן קיימות');
}

/*  ⛔ טענה ג — שני צדדיה של ההצהרה: ⚠️ כל טבלה מוצהרת קיימת בסכימה,
 *  ⭐ והסכימה עצמה בלי כפילות ובלי רשומה ריקה. */
{
  const g = [];
  for (const t of APP.dbTables)
    if (!SCHEMA.m.has(t)) g.push('`' + t + '` מוצהרת ב-`APP.dbTables` ואינה בסכימה');
  for (const t of SCHEMA.dup) g.push('`' + t + '` מופיעה פעמיים באותו פרויקט');
  for (const t of SCHEMA.empty) g.push('`' + t + '` מוצהרת בלי עמודות');
  if (!SCHEMA.m.size) g.push('הפרויקט «' + APP.project + '» אינו קיים בסכימה');
  if (g.length)
    bad('ג. הסכימה המוצהרת נמדדת משני צדדיה — ' + g.join(' · ') + '. נמדדו ' +
        g.length + ' מול הצפוי 0. מיישרים את `APP.dbSchema` ל-`APP.dbTables`');
  else
    ok('ג. הסכימה המוצהרת נמדדת משני צדדיה — ' + APP.dbTables.length +
       ' טבלאות מוצהרות, כולן בסכימה; ' + APP.dbSchema.length +
       ' רשומות בשני הפרויקטים, בלי כפילות ובלי רשומה ריקה');
}

/*  ⛔ טענה ד — ההצהרות שאין להן אתר: ⚠️ `APP.dbDyn` ו-`APP.dbOrderDyn`
 *  נמדדות בטענה א, ⭐ וכאן נמדד הפרויקט עצמו — ⛔ שם שאינו אחד משני
 *  הפרויקטים הוא סכימה שאין לה מסד. */
{
  const projects = [...new Set(APP.dbSchema.map((r) => r.p))].sort();
  if (projects.indexOf(APP.project) < 0)
    bad('ד. הפרויקט מוצהר — «' + APP.project + '» אינו אחד מ-' + projects.join(' · ') +
        '. מיישרים את `APP.project` לאחד הפרויקטים שבסכימה');
  else
    ok('ד. הפרויקט מוצהר — «' + APP.project + '» מתוך ' + projects.join(' · ') +
       ', ו-' + SCHEMA.m.size + ' טבלאות נמדדות מולו');
}

/*  ⛔ כשל קריאה מחזיר «אין ראיה» ⛔ ולא «הענן ריק» — ⚠️ מיזוג מול אוסף ריק
 *  מוחק את מה שלא הספיק לעלות, ⭐ ו-`null` הוא מה שעוצר אותו לפני המיזוג.
 *  ⛔ **והנמדד הוא גוף נקודת הקריאה האחת** — ⚠️ שכבת העימוד המשותפת:
 *  ⭐ היא המקום היחיד שבו תשובת השרת הופכת לשורות, ⛔ וענף כשל שמחזיר
 *  מערך ריק שם הופך «לא ידעתי» ל«אין שם כלום» בכל הקוראים בבת אחת.
 *  ⛔ **והמדידה על מקור מולבן** — ⚠️ הערה שנוקבת ב-`return []` אינה קוד. */
function readGuardGaps(src) {
  const out = [];
  const w = whiten(src, { markup: 'blank' });
  const i = w.indexOf('function ' + APP.pagerFn + '(');
  if (i < 0) return ['נקודת הקריאה אינה קיימת במקור: ' + APP.pagerFn];
  const open = w.indexOf('{', i);
  let d = 0, end = -1;
  for (let j = open; j < w.length; j++) {
    if (w[j] === '{') d++;
    else if (w[j] === '}' && --d === 0) { end = j; break; }
  }
  if (end < 0) return ['גוף שאינו מאוזן: ' + APP.pagerFn];
  const body = w.slice(open, end + 1);
  if (!/res\.error/.test(body)) out.push('אין בגוף בדיקת שגיאה על תשובת השרת');
  if (!/return null/.test(body)) out.push('אין בגוף ענף שמחזיר «אין ראיה»');
  if (/return\s*\[\s*\]/.test(body)) out.push('יש בגוף ענף שמחזיר אוסף ריק');
  return out;
}

/*  ⛔ טענה ה — כשל הקריאה: ⚠️ הוא הצד שבמקור של «מקור הקריאה — טבלאות
 *  בלבד», ⭐ והצד שבמסד נמדד בשער עובדות המסד. */
{
  const gaps = readGuardGaps(SRC);
  if (gaps.length)
    bad('ה. מקור הקריאה — ' + gaps.join(' · ') + '. נמדדו ' + gaps.length +
        ' מול הצפוי 0. כשל משיכה מחזיר `null` — ⛔ ומיזוג מול מערך ריק מוחק את מה שלא הספיק לעלות');
  else
    ok('ה. מקור הקריאה — נקודת הקריאה `' + APP.pagerFn +
       '` בודקת שגיאה, ⛔ ומחזירה «אין ראיה» ⛔ ולא אוסף ריק');
}

/*  ⛔ חמש עמודות הסנכרון — ⚠️ **מה נכנס**: כל טבלה ב-`DB_SCHEMA`;
 *  ⛔ **ומה מפיל**: טבלה שחסרה אחת מהן ואינה מוצהרת, ⛔ והצהרה לטבלה
 *  שנושאת את חמשתן. ⭐ **ולמה**: המיזוג ממופתח ב-`client_id`, ⚠️ ומכריע
 *  בחותמת — ⛔ והשחזור נשען על שלוש ה-`deleted`. */
const SYNC_COLS = ['client_id', 'updated_at', 'deleted', 'deleted_at', 'deleted_by'];
{
  const ex = APP.syncColsExempt || {};
  const short = [], overDecl = new Set(Object.keys(ex));
  for (const e of APP.dbSchema) {
    const cols = String(e.c).split(',');
    const miss = SYNC_COLS.filter((c) => !cols.includes(c));
    if (miss.length) { if (!(e.t in ex)) short.push(`${e.t}[${e.p}] חסר ${miss.join('+')}`); overDecl.delete(e.t); }
  }
  const declNoCase = [...overDecl];
  (short.length === 0 && declNoCase.length === 0 ? ok : bad)(
    `[sync-cols] ⛔ כל טבלה מסונכרנת נושאת את חמש העמודות — ${APP.dbSchema.length} טבלאות, ` +
    `${short.length} חסרות בלי הצהרה · ${declNoCase.length} הצהרה בלי מקרה, והצפוי אפס` +
    (short.length ? ` (${short.slice(0, 4).join(' · ')})` : '') +
    (declNoCase.length ? ` (${declNoCase.join(' ')})` : ''));
  const noWhy = Object.entries(ex).filter(([, v]) => !v || v.length < 12).map(([k]) => k);
  (noWhy.length === 0 ? ok : bad)(
    `[sync-cols-why] ⛔ כל הצהרה נושאת נימוק תפקידי — ${Object.keys(ex).length} הצהרות, ` +
    `נמדדו ${noWhy.length} בלי נימוק והצפוי אפס` + (noWhy.length ? ` (${noWhy.join(' ')})` : ''));
}

if (RUN_MUT) {
  mutStage();

/* מס1. טבלה שחסרה עמודה ואינה מוצהרת — `[sync-cols]` נופלת */
{
  const cols = 'key,value,updated_at,client_id,deleted,deleted_at'.split(',');
  (SYNC_COLS.filter((c) => !cols.includes(c)).length === 1 ? ok : bad)(
    'מס1 · ⛔ מוטציה: טבלה בלי `deleted_by` — `[sync-cols]` הייתה נכשלת');
}
/*  ⭐ מוטציית-נגד: `sh_backup` בלי `client_id` ⛔ אינה מפילה — ⚠️ היא
 *  מוצהרת כתוספת-בלבד, ⭐ ואינה טבלת סנכרון. */
('sh_backup' in (APP.syncColsExempt || {}) ? ok : bad)(
  'נס1 · ⭐ מוטציית-נגד: `sh_backup` המוצהרת ⛔ אינה מפילה');
  /*  ⛔ המוטציות בזיכרון — ⚠️ הסורק מקבל את התוכן כארגומנט, ⭐ ואין עותק
   *  בעץ, אין תהליך ואין רשת: ⛔ וכל מוטציה נוקבת בשם הטענה שתיפול
   *  ⛔ ומאמתת שהיא זו שנפלה. */
  const mut = (label, hit, want, claim) => {
    if (hit.some((x) => want.test(x)))
      ok(label + ' — נמדד נפל כמצופה, והטענה שנפלה היא «' + claim + '»');
    else
      bad(label + ' — נמדד עבר מול הצפוי נפל. מיישרים את הסורק, או את המוטציה');
  };

  /*  ⛔ א · שם עמודה ב-`order` שאינו קיים — ⚠️ זו הצורה ששרדה סבב שלם,
   *  ⭐ והיא מפילה את ההצלבה מול הסכימה ⛔ ולא את הפרסור. */
  if (SCAN.ordLits.length) {
    const o = SCAN.ordLits[0];
    const src = SRC.slice(0, o.at + 1) + 'zz_no_such_col' + SRC.slice(o.at + 1 + o.lit.length);
    mut('⛔ מוטציה: שם עמודה ב-`order` שאינו קיים', schemaGaps(dbScan(src), SCHEMA.m),
        /zz_no_such_col/, 'ב. כל שאילתה מול הסכימה המוצהרת');
  } else {
    const od = APP.dbOrderDyn || {};
    const k = Object.keys(od).find((x) => (od[x].cols || []).length);
    if (k) {
      const saved = od[k].cols;
      od[k].cols = ['zz_no_such_col'];
      const g = schemaGaps(dbScan(SRC), SCHEMA.m);
      od[k].cols = saved;
      mut('⛔ מוטציה: עמודת מיון מוצהרת שאינה קיימת', g, /zz_no_such_col/,
          'ב. כל שאילתה מול הסכימה המוצהרת');
    } else {
      ok('⛔ אין מוטציית עמודת מיון — ⚠️ אין כאן עמודת מיון בליטרל ואין מוצהרת, ⛔ ואין מה למוטט');
    }
  }

  const litSite = SCAN.sites.find((s) => s.litAt >= 0 && s.tables.length === 1);
  if (litSite) {
    const a = litSite.litAt, n = litSite.tables[0].length;
    /*  ⛔ ב · שם טבלה אחר — ⚠️ המוטציה מחליפה ליטרל בליטרל, ⭐ ולכן היא
     *  שוברת את ההצלבה מול ההצהרה ⛔ ולא את הפרסור. */
    mut('⛔ מוטציה: שם טבלה ב-`from` שאינו מוצהר',
        dbScan(SRC.slice(0, a + 1) + 'zz_no_such_table' + SRC.slice(a + 1 + n)).gaps,
        /zz_no_such_table/, 'א. כל שאילתה נפתרת');
    /*  ⛔ ג · ליטרל שהפך לשם שאי אפשר לפתור ואינו מוצהר — ⚠️ בדיוק המקרה
     *  שסורק הליטרלים בלבד מדלג עליו בשתיקה. */
    mut('⛔ מוטציה: ליטרל שהפך לשם שאינו נפתר ואינו מוצהר',
        dbScan(SRC.slice(0, a) + ' zzUnresolvable ' + SRC.slice(a + n + 2)).gaps,
        /אינו ליטרל, אינו נפתר ואינו מוצהר/, 'א. כל שאילתה נפתרת');
    /*  ⛔ ד · שם טבלה מוצהר שאינו בסכימה — ⚠️ ההצהרה מקבלת את השם,
     *  ⭐ וההצלבה היא זו שנופלת: ⛔ שתי הטענות נבדלות. */
    {
      const saved = APP.dbTables;
      APP.dbTables = APP.dbTables.concat(['zz_ghost_table']);
      const src = SRC.slice(0, a + 1) + 'zz_ghost_table' + SRC.slice(a + 1 + n);
      const g = schemaGaps(dbScan(src), SCHEMA.m);
      APP.dbTables = saved;
      mut('⛔ מוטציה: טבלה מוצהרת שאינה בסכימה', g, /zz_ghost_table/,
          'ב. כל שאילתה מול הסכימה המוצהרת');
    }
  } else {
    ok('⛔ אין מוטציית שם טבלה — ⚠️ אין כאן `from` בליטרל, ⛔ ואין מה למוטט');
    ok('⛔ אין מוטציית ליטרל שהפך לביטוי — ⚠️ אין כאן `from` בליטרל, ⛔ ואין מה למוטט');
    ok('⛔ אין מוטציית טבלה מוצהרת שאינה בסכימה — ⚠️ אין כאן `from` בליטרל, ⛔ ואין מה למוטט');
  }

  /*  ⛔ ה · הצהרה שאין לה אתר — ⚠️ הצד השני של `APP.dbTables`: ⭐ שם
   *  שמוצהר ואין לו שאילתה. */
  {
    const saved = APP.dbTables;
    APP.dbTables = APP.dbTables.concat(['zz_never_queried']);
    const g = dbScan(SRC).gaps;
    APP.dbTables = saved;
    mut('⛔ מוטציה: טבלה מוצהרת שאין לה אתר שאילתה', g,
        /zz_never_queried/, 'א. כל שאילתה נפתרת');
  }

  /*  ⛔ ו · עמודה שהקוד נוקב בה ואינה בסכימה — ⚠️ המוטציה מסירה עמודה
   *  **מהסכימה** ⛔ ולא מהקוד: ⭐ זו בדיוק התשובה שהמסד היה מחזיר. */
  {
    const t = [...SCAN.tables].find((x) => (SCAN.colsBy.get(x) || new Set()).size);
    if (t) {
      const col = [...SCAN.colsBy.get(t)][0];
      const bent = schemaMap(APP.dbSchema.map((r) => (r.p === APP.project && r.t === t)
        ? { p: r.p, t: r.t, c: String(r.c).split(',').filter((x) => x.trim() !== col).join(',') }
        : r), APP.project);
      mut('⛔ מוטציה: עמודה שהקוד נוקב בה ואינה בסכימה',
          schemaGaps(SCAN, bent.m), new RegExp(t + '\\.' + col), 'ב. כל שאילתה מול הסכימה המוצהרת');
    } else {
      ok('⛔ אין מוטציית עמודה — ⚠️ אין כאן עמודה נקובה, ⛔ ואין מה למוטט');
    }
  }

  /*  ⛔ ז · רשומה כפולה בסכימה — ⚠️ הצד שנמדד בטענה ג, ⭐ והוא מה שהופך
   *  שתי הגדרות לאותה טבלה לאחת בשקט. */
  {
    const first = APP.dbSchema.find((r) => r.p === APP.project);
    const g = [];
    const s2 = schemaMap(APP.dbSchema.concat([{ p: first.p, t: first.t, c: first.c }]), APP.project);
    for (const t of s2.dup) g.push('`' + t + '` מופיעה פעמיים באותו פרויקט');
    mut('⛔ מוטציה: רשומה כפולה בסכימה', g, new RegExp(first.t), 'ג. הסכימה המוצהרת נמדדת משני צדדיה');
  }


  /*  ⛔ ה · ענף הכשל שמחזיר אוסף ריק — ⚠️ המוטציה בזיכרון, ⭐ והיא הופכת
   *  את «אין ראיה» ל«אין שם כלום»: ⛔ בדיוק המחיקה שהטענה מונעת. */
  {
    /*  ⛔ ההחלפה בתוך גוף שכבת העימוד בלבד — ⚠️ `return null` חי גם
     *  במסלולים אחרים, ⭐ והחלפה גורפת מוטטת קוד שאינו נמדד כאן. */
    const i0 = SRC.indexOf('function ' + APP.pagerFn + '(');
    const o0 = SRC.indexOf('{', i0);
    let d0 = 0, e0 = -1;
    for (let j = o0; j < SRC.length; j++) {
      if (SRC[j] === '{') d0++;
      else if (SRC[j] === '}' && --d0 === 0) { e0 = j; break; }
    }
    const src = SRC.slice(0, o0) +
      SRC.slice(o0, e0 + 1).replace('return null;', 'return [];') + SRC.slice(e0 + 1);
    mut('⛔ מוטציה: ענף כשל שמחזיר אוסף ריק', readGuardGaps(src),
        /אוסף ריק/, 'ה. מקור הקריאה');
  }

  /*  ⭐ נ4 · מוטציית-נגד: ⛔ שם שהוחלף בעקביות בשכבת העימוד ⛔ אינו מפיל —
   *  ⚠️ הנמדד הוא ענף הכשל, ⭐ ולא שם הפונקציה. */
  {
    const src = SRC.split(APP.pagerFn).join('_ysRowsPagedRenamed');
    const saved = APP.pagerFn;
    APP.pagerFn = '_ysRowsPagedRenamed';
    const g = readGuardGaps(src);
    APP.pagerFn = saved;
    if (!g.length) ok('נ4 · ⭐ מוטציית-נגד: שם שכבת העימוד שהוחלף בעקביות ⛔ אינו מפיל');
    else bad('נ4 · ⭐ מוטציית-נגד: שם שהוחלף בעקביות — נמדדו ' + g.length +
             ' פערים והצפוי 0. מיישרים את הגזירה לשם המוצהר');
  }

  /*  ⭐ נ1 · מוטציית-נגד: `from` שיושב **בתוך הערה** ⛔ אינו נסרק — ⚠️ זו
   *  ההחרגה שהבאנר מכריז, ⭐ ו-`password` בשכר ו-`password_hash` בהנהלה
   *  חיים בהערות בלבד: ⛔ סורק שקורא את המקור הגולמי היה נופל עליהן. */
  {
    const src = SRC.replace('<body', "<!-- x -->\n<script>/* .from('zz_comment_table').select('zz_comment_col') */</script>\n<body");
    const g2 = dbScan(src);
    const both = g2.gaps.concat(schemaGaps(g2, SCHEMA.m));
    if (src !== SRC && !both.some((x) => /zz_comment/.test(x)))
      ok('נ1 · ⭐ מוטציית-נגד: `from` שבתוך הערה ⛔ אינו נסרק — נמדדו 0 פערים חדשים והצפוי 0');
    else
      bad('נ1 · ⭐ מוטציית-נגד: `from` שבתוך הערה — נמדדו פערים והצפוי 0. מיישרים את הסורק להלבנה');
  }

  /*  ⭐ נ2 · מוטציית-נגד: שם שהוחלף **בעקביות** ⛔ אינו מפיל — ⚠️ שכבת
   *  העימוד מוצהרת בשמה, ⭐ והחלפה עקבית שלה היא שינוי חי. */
  {
    const pg = APP.dbPager;
    const hits = (SRC.match(new RegExp('\\b' + pg + '\\b', 'g')) || []).length;
    APP.dbPager = pg + 'Rows';
    const g = dbScan(SRC.split(pg).join(pg + 'Rows'));
    APP.dbPager = pg;
    const both = g.gaps.concat(schemaGaps(g, SCHEMA.m));
    if (!both.length && hits > 1)
      ok('נ2 · ⭐ מוטציית-נגד: שם שהוחלף בעקביות ב-' + hits + ' אתרים ⛔ אינו מפיל');
    else
      bad('נ2 · ⭐ מוטציית-נגד: שם שהוחלף בעקביות — נמדדו ' + both.length +
          ' פערים מול הצפוי 0. מיישרים את הסורק כך שימדוד מנגנון ולא שם');
  }

  /*  ⭐ נ3 · מוטציית-נגד: עמודה **שכן קיימת** ⛔ אינה מפילה — ⚠️ הנמדד הוא
   *  ההצלבה, ⭐ ולא עצם הוספת שם לסכימה. */
  {
    const t = APP.dbTables[0];
    const col = [...(SCHEMA.m.get(t) || new Set())][0];
    const s2 = { tables: new Set([t]), colsBy: new Map([[t, new Set([col])]]) };
    const g = schemaGaps(s2, SCHEMA.m);
    if (col && !g.length)
      ok('נ3 · ⭐ מוטציית-נגד: עמודה שכן קיימת (`' + t + '.' + col + '`) ⛔ אינה מפילה');
    else
      bad('נ3 · ⭐ מוטציית-נגד: עמודה שכן קיימת — נמדדו ' + g.length +
          ' פערים מול הצפוי 0. מיישרים את ההצלבה');
  }
}

if (fail) {
  console.error(`\n❌ ${GATE_ID}: ${fail} כשלים מתוך ${pass + fail}`);
  process.exit(1);
}
console.log(`\n✅ ${GATE_ID}: ${pass} טענות`);
