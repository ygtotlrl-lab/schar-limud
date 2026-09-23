#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
   test_declscan.mjs — כל הצהרה ב-`APP` נאכפת

   **מה נאכף:** ⛔ חמישה כיוונים על כל בלוק `APP` שבכל הריפו — ⚠️ כל מפתח
   נקרא · כל קורא מוצהר · מפתח פרטי נושא נימוק **תפקידי** · ערך ריק
   נושא נימוק · ⭐ והנימוק אומר מה התפקיד ⛔ ולא איפה הוא אינו.

   **הנימוק המדוד:** ⚠️ 269 מפתחות חיים בכל הריפו, ⛔ וההצהרות עצמן מעולם לא
   נאכפו: ⭐ מי שהוסיף מפתח לא נדרש לקורא, ⛔ ומי שהסיר קורא לא
   נדרש להסיר את המפתח — ⚠️ והרשימה גדלה בשקט.

   **מה יישבר בלעדיו:** ⛔ הצהרה בלי קורא נקראת כהוראה שמישהו מקיים — ⚠️ ואיש אינו,
   ⭐ ומי שמיישר אליה מיישר לעולם שאינו קיים.

   **מה אינו נאכף כאן:** ⚠️ **האם הערך עצמו נכון** — ⛔ זו מדידה של השער שקורא אותו ·
   ⛔ ושער פרטי לאפליקציה אחת, שאין לו מול מה להישוות.
   ──────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS } from './peers.mjs';
import { FACTS, appFacts } from './app-facts.mjs';
import { whitenJs } from './whiten.mjs';
import { declCases, dumpCases, caseGaps, appListNames, listValues, whyOk } from './decl-cases.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  /*  ⭐ קבצים שבלוק ה-`APP` שלהם נפרס בידי אחר — ⛔ **אינו נגזר**: הנימוק הוא התפקיד, ⚠️ ואין קובץ שמצהיר עליו */
  readerExempt: {
    'check-capabilities.mjs': 'הבודק המרוכז פורס את בלוקי ה-APP של שאר השערים ומודד אותם — ⚠️ והאזכורים בגופו מפנים לבלוק שנפרס',
    'test_rulesdocs.mjs': 'רתמת המוטציות שלו מזריקה מפתחות מדומים לבלוק כדי לאמת שהשער נופל עליהם',
  },
  /*  ⛔ ההצהרות שהסבב הוסיף — ⚠️ **מה נכנס**: זוג `[קובץ, מפתח]` לכל
   *  הצהרה חדשה; ⛔ **ומה מפיל**: רשימה ריקה, וזוג שאין לו מפתח בבלוק.
   *  ⭐ **ולמה המבנה קיים**: הכיוונים שמעליו סורקים את **כל** ההצהרות,
   *  ⚠️ והרשימה הזו היא מה שמוודא שמה שנוסף עכשיו אכן נסרק. */
  newDecls: [
    ['test_dbscan.mjs', 'project'],
    ['test_dbscan.mjs', 'dbSchema'],
    ['test_dbscan.mjs', 'dbTables'],
    ['test_dbscan.mjs', 'dbPager'],
    ['test_dbscan.mjs', 'dbDyn'],
    ['test_dbscan.mjs', 'dbOrderDyn'],
    ['check-capabilities.mjs', 'kvMeta'],
    ['test_mignames.mjs', 'migrations'],
    ['test_mignames.mjs', 'migNoRecord'],
    ['test_mignames.mjs', 'migRanNoFile'],
  ],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */
const CASE = declCases(import.meta.url, APP);

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [35, 36, 210];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
/*  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ כל טענה שאין לה מה למדוד בריפו הזה
 *  נושאת שורת נימוק ⛔ ואינה מדולגת: ⭐ המספר זהה בכולן. */
const FLOOR = { shared: 15, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו.
 *  ⛔ **ושומר הרקורסיה הוא ריצת-משנה אף הוא** — ⚠️ הסט רץ שם על **עותק
 *  סינתטי** שאין לצידו אחיות ואין בו `.git`, ⭐ ולכן שער שמשווה מול אחות
 *  או קורא את סט המעקב מגיע לחלק מטענותיו **בכוונה**: ⛔ והריצפה נמדדת
 *  על עץ אמיתי ⛔ ולא שם. */
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.GATE_INNER;
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  dumpCases();
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
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/*  ⛔ הריפו האחיות זה לצד זה — ⚠️ ההשוואה היא **בין** הריפו, ⭐ ולכן
 *  היעדרן אינו דילוג: ⛔ שער שמדלג בשתיקה כשאין מול מה להשוות אינו
 *  יכול להיכשל. */
const SIBS = path.resolve(ROOT, '..');
const REPOS = PEERS;

/*  ⛔ חילוץ בלוק ה-`APP` — ⚠️ **מה נכנס**: גוף קובץ שער; ⛔ **ומה מפיל**:
 *  בלוק שנפתח ואינו נסגר. ⭐ **ולמה המבנה קיים**: שערים בשם אחד
 *  מצהירים ארבע רשימות, ⛔ והשוואה ביניהן דורשת חילוץ זהה בדיוק. */
function appBlock(src) {
  const i = src.indexOf('/* ── APP —');
  if (i < 0) return null;
  const j = src.indexOf('/* ── סוף APP', i);
  return j < 0 ? null : src.slice(i, j);
}

/*  ⛔ מונה שמדלג על מחרוזת · תבנית · הערה **ותבנית `regex`** — ⚠️ כולן
 *  נושאות סוגריים שאינם מבנה: ⭐ הנימוק המדוד — `\(` בתוך תבנית נספר
 *  כפותח שאין לו סוגר, ⛔ והעומק לא חזר לאפס עד סוף הבלוק, ⚠️ ו-20
 *  מפתחות אחרי אותה שורה לא נספרו כלל. */
const RE_OK_BEFORE = /[({[,;:!&|?+\-*%~^<=>]$/;
const RE_KW_BEFORE = /\b(return|typeof|instanceof|case|in|of|new|delete|void|do|else|yield|await)$/;
function* toks(body) {
  let i = 0, prev = '', tail = '';
  while (i < body.length) {
    const c = body[i], c2 = body[i + 1];
    if (c === '/' && c2 === '/') { const e = body.indexOf('\n', i); i = e < 0 ? body.length : e; continue; }
    if (c === '/' && c2 === '*') { const e = body.indexOf('*/', i + 2); i = e < 0 ? body.length : e + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < body.length) { if (body[i] === '\\') { i += 2; continue; } if (body[i] === q) { i++; break; } i++; }
      prev = 'x'; tail = 'x'; continue;
    }
    if (c === '/') {
      const t = tail.replace(/\s+$/, '');
      if (t === '' || RE_OK_BEFORE.test(t) || RE_KW_BEFORE.test(t)) {
        i++; let cls = false;
        while (i < body.length) {
          if (body[i] === '\\') { i += 2; continue; }
          if (body[i] === '[') cls = true;
          else if (body[i] === ']') cls = false;
          else if (body[i] === '/' && !cls) { i++; break; }
          else if (body[i] === '\n') break;
          i++;
        }
        while (i < body.length && /[a-z]/.test(body[i])) i++;
        prev = 'x'; tail = 'x'; continue;
      }
    }
    if (/\s/.test(c)) { tail = (tail + c).slice(-40); i++; continue; }
    yield { i, c, prev };
    prev = c; tail = (tail + c).slice(-40); i++;
  }
}
const MARK = 'const APP = {';
function topKeysScan(block) {
  const at = block.indexOf(MARK);
  if (at < 0) return [];
  const body = block.slice(at + MARK.length);
  const out = [];
  let d = 0;
  for (const { i, c, prev } of toks(body)) {
    if ('{[('.includes(c)) { d++; continue; }
    if ('}])'.includes(c)) { if (d === 0) break; d--; continue; }
    if (d === 0 && (prev === '' || prev === ',')) {
      const m = /^([A-Za-z_$][\w$]*|'[^']+'|"[^"]+")\s*:/.exec(body.slice(i));
      if (m) out.push(m[1].replace(/^['"]|['"]$/g, ''));
    }
  }
  return [...new Set(out)];
}
function keyAtScan(block, key) {
  const at = block.indexOf(MARK);
  if (at < 0) return -1;
  const body = block.slice(at + MARK.length);
  let d = 0;
  for (const { i, c, prev } of toks(body)) {
    if ('{[('.includes(c)) { d++; continue; }
    if ('}])'.includes(c)) { if (d === 0) break; d--; continue; }
    if (d === 0 && (prev === '' || prev === ',')) {
      const m = new RegExp('^(?:' + key + "|'" + key + "'|\"" + key + '")\\s*:').exec(body.slice(i));
      if (m) return at + MARK.length + i + m[0].length;
    }
  }
  return -1;
}
function valueOfScan(block, key) {
  const from = keyAt(block, key);
  if (from < 0) return null;
  let d = 0, end = block.length;
  for (const { i, c } of toks(block.slice(from))) {
    if ('{[('.includes(c)) { d++; continue; }
    if ('}])'.includes(c)) { if (d === 0) { end = from + i; break; } d--; continue; }
    if (c === ',' && d === 0) { end = from + i; break; }
  }
  return block.slice(from, end).trim();
}
/*  ⛔ הסרת הערות בלבד ⛔ **ולא מחרוזות** — ⚠️ `${APP.x}` בתוך תבנית הוא
 *  קריאה חיה, ⭐ והלבנה גורפת הייתה מוחקת אותה ומדווחת «מפתח בלי קורא». */
function noCmtScan(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i], c2 = src[i + 1];
    if (c === '/' && c2 === '/') { const e = src.indexOf('\n', i); const k = (e < 0 ? src.length : e) - i; out += ' '.repeat(k); i += k; continue; }
    if (c === '/' && c2 === '*') { const e = src.indexOf('*/', i + 2); const k = (e < 0 ? src.length : e + 2) - i;
      out += src.slice(i, i + k).replace(/[^\n]/g, ' '); i += k; continue; }
    out += c; i++;
  }
  return out;
}
/*  ⛔ הנימוק הוא ההערה שמעל המפתח — ⚠️ **או שמעל הקבוצה הרצופה שהוא
 *  שייך לה**: ⭐ זו המוסכמה בפועל — הערה אחת מעל שלושה שדות שמתארים
 *  יחד יכולת אחת, ⛔ ודרישה להערה לכל שדה הייתה שלושים ושש הערות
 *  שחוזרות זו על זו. ⚠️ **ושורה ריקה חותכת** — ⛔ הערה שמעברה השני של
 *  שורה ריקה אינה נימוק של המפתח, ⭐ והיא שייכת למה שלפניה. */
function reasonOfScan(block, key) {
  const at = keyAt(block, key);
  if (at < 0) return '';
  let before = block.slice(0, block.lastIndexOf('\n', at) + 1);
  for (;;) {
    /*  ⛔ ההערה האחרונה ⛔ ולא הראשונה — ⚠️ הנימוק המדוד: ביטוי לא-חמדני
     *  שעוגן לסוף תפס מה-`/*` הראשון **בקובץ** ועד הסוגר האחרון, ⭐ והחזיר
     *  את כל הערות הקובץ כנימוק אחד: ⛔ ואז «יש נימוק» היה נכון תמיד,
     *  ⚠️ ובדיוק זה probe שאינו יכול להיכשל. */
    const tail = before.replace(/\s+$/, '');
    if (tail.endsWith('*/')) {
      const open = tail.lastIndexOf('/*');
      if (open >= 0) return tail.slice(open + 2, tail.length - 2);
    }
    /* ⚠️ מדלג אחורה מעל שורות מפתח בלבד — ⛔ שורה ריקה עוצרת */
    const cut = before.replace(/\n$/, '');
    const nl = cut.lastIndexOf('\n');
    const line = cut.slice(nl + 1);
    if (!line.trim() || !/^\s{2,}/.test(line)) return '';
    before = cut.slice(0, nl + 1);
  }
}
/*  ⛔ הסריקה נשמרת לכל טקסט — ⚠️ המוטציות משכפלות את המפה ומחליפות קובץ
 *  אחד, ⭐ ושאר הבלוקים הם אותה מחרוזת: ⛔ סריקה חוזרת עליהם הייתה
 *  מכפילה את זמן השער במספר המוטציות. */
const memo1 = (fn) => { const m = new Map();
  return (a) => { if (!m.has(a)) m.set(a, fn(a)); return m.get(a); }; };
const memo2 = (fn) => { const m = new Map();
  return (a, b) => { let n = m.get(a); if (!n) m.set(a, (n = new Map()));
    if (!n.has(b)) n.set(b, fn(a, b)); return n.get(b); }; };
const topKeys = memo1(topKeysScan);
const keyAt = memo2(keyAtScan);
const valueOf = memo2(valueOfScan);
const noCmt = memo1(noCmtScan);
const reasonOf = memo2(reasonOfScan);
/*  ⛔ נימוק תפקידי ⛔ ולא נוכחות — ⚠️ «אינו בכולן» הוא המדידה ⛔ ולא
 *  הנימוק: ⭐ הנימוק אומר **מה תפקיד המפתח**, ⛔ ולמה התפקיד אינו קיים שם. */
const PRESENCE = /אינו בכולן|אינה בכולן|לא קיים בשאר|אין כאן\s*$|קיים רק ב|אינו קיים בשאר/;
const isFunctional = (why) => {
  const t = String(why).replace(/[⛔⚠️⭐*]/g, ' ').trim();
  if (t.length < 12) return false;
  if (PRESENCE.test(t) && t.length < 60) return false;
  return true;
};

/*  ⛔ מרשם הדפוסים והמוטציות — ⚠️ **מה נכנס**: שם כל דפוס שהשער מכריז,
 *  ⛔ ושם כל דפוס שיש לו מוטציה; ⛔ **ומה מפיל**: דפוס בלי מוטציה,
 *  ומוטציה בלי דפוס. ⭐ **ולמה המבנה קיים**: הוא מה שמאפשר להצליב
 *  את השער מבחוץ — ⛔ דפוס בלי מוטציה נשחק בשקט. */
export const PATTERNS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'];
export const MUTS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'];

/*  ⛔ קובצי `tools/` שקיימים בכל הריפו — ⚠️ ההשוואה היא ביניהם,
 *  ⭐ ושער פרטי לאפליקציה אחת אין לו מול מה להישוות. */
const present = REPOS.map((r) => fs.existsSync(path.join(SIBS, r, 'tools')));
const missing = REPOS.filter((r, i) => !present[i]);
/*  ⚠️ עץ שחסרה בו אחות אינו מודד את הקוראים — ⛔ ההשוואה היא בין כל
 *  הריפו, ⭐ ורשימת הפטור מוצהרת «לא נמדדה» ⛔ ולא «מתה». */
if (missing.length) CASE.unmeasured('readerExempt', `אחיות שאינן על הדיסק: ${missing.join(', ')} — ⛔ הקוראים נמדדים מול כל הריפו יחד`);
const FILES = present[0]
  ? fs.readdirSync(path.join(SIBS, REPOS[0], 'tools'))
      .filter((x) => x.endsWith('.mjs'))
      .filter((f) => REPOS.every((r, i) => present[i] &&
        fs.existsSync(path.join(SIBS, r, 'tools', f)))).sort()
  : [];

/*  ⛔ המצב נקרא פעם אחת לזיכרון — ⚠️ **מה נכנס**: ריפו ⟵ קובץ ⟵ מקור;
 *  ⛔ **ומה מפיל**: כלום. ⭐ **ולמה המבנה קיים**: חמשת הכיוונים מודדים
 *  את אותו טקסט, ⚠️ והמוטציות מחליפות אותו בזיכרון ⛔ בלי לכתוב לעץ. */
function snapshot() {
  const st = {};
  for (const r of REPOS) {
    if (missing.includes(r)) continue;
    st[r] = {};
    for (const f of FILES) st[r][f] = fs.readFileSync(path.join(SIBS, r, 'tools', f), 'utf8');
  }
  return st;
}

/* א · כל מפתח נקרא */
function keyNoReader(st) {
  const out = [];
  for (const r of Object.keys(st)) for (const f of FILES) {
    const src = st[r][f]; const b = appBlock(src); if (!b) continue;
    const exempt = !!APP.readerExempt[f];
    const after = noCmt(src).slice(src.indexOf('/* ── סוף APP'));
    for (const k of topKeys(b)) {
      if (!new RegExp('APP\\.' + k + '\\b|APP\\[[\'"]' + k + '[\'"]\\]').test(after)) {
        if (exempt) CASE('readerExempt', f);
        else out.push(`${r}/${f}::${k}`);
      }
    }
  }
  return out;
}

/* ב · כל קורא מוצהר */
function readerNoKey(st) {
  const out = new Set();
  for (const r of Object.keys(st)) for (const f of FILES) {
    const src = st[r][f]; const b = appBlock(src); if (!b) continue;
    const keys = topKeys(b);
    const after = noCmt(src).slice(src.indexOf('/* ── סוף APP'));
    /*  ⛔ `APP.${…}` בתוך תבנית אינו קריאה — ⚠️ הוא **טקסט בהודעה**
     *  שמרכיב שם מפתח לקורא: ⭐ קריאה חיה נכתבת `${APP.x}`, ⛔ והיפוך
     *  הסדר הוא בדיוק ההבדל. */
    for (const m of after.matchAll(/APP\.([A-Za-z_$][\w$]*)/g)) {
      if (m[1] === '$' || after[m.index + 4] === '$') continue;
      if (keys.includes(m[1])) continue;
      if (APP.readerExempt[f]) CASE('readerExempt', f);
      else out.add(`${r}/${f}::${m[1]}`);
    }
  }
  return [...out];
}

/* ג · מפתח שאינו בכולן נושא נימוק תפקידי */
function privateNoWhy(st) {
  const out = [];
  const repos = Object.keys(st);
  for (const f of FILES) {
    const bl = repos.map((r) => appBlock(st[r][f]));
    if (bl.some((b) => !b)) continue;
    const ks = bl.map(topKeys);
    for (const k of [...new Set(ks.flat())]) {
      const n = ks.filter((x) => x.includes(k)).length;
      if (n === repos.length) continue;
      bl.forEach((b, i) => {
        if (!ks[i].includes(k)) return;
        if (!isFunctional(reasonOf(b, k))) out.push(`${repos[i]}/${f}::${k} (${n}/${repos.length})`);
      });
    }
  }
  return out;
}

/*  ד · ערך ריק הוא «נמדד ואין» — ⛔ **והנימוק נדרש כשהשדה נבדל בין
 *  כולן**: ⚠️ שדה שריק בכולן אינו הבדל, ⭐ והוא נקרא כ«אין כאן
 *  מקרה» בלי שאיש צריך להסביר; ⛔ אבל שדה שריק כאן ומלא באחות הוא
 *  **הבדל פר-אפליקציה**, ⚠️ והוא נושא נימוק במקומו. */
function emptyNoWhy(st) {
  const out = [];
  const repos = Object.keys(st);
  for (const f of FILES) {
    const bl = repos.map((r) => appBlock(st[r][f]));
    if (bl.some((b) => !b)) continue;
    const ks = bl.map(topKeys);
    for (const k of [...new Set(ks.flat())]) {
      const vals = bl.map((b, i) => (ks[i].includes(k) ? valueOf(b, k) : null));
      const isEmpty = (v) => v === '[]' || v === '{}' || v === "''" || v === '""';
      /* ⛔ ריק בכולן אינו הבדל — ⚠️ ואינו דורש נימוק */
      if (vals.length && vals.every((v) => v === null || isEmpty(v))) continue;
      bl.forEach((b, i) => {
        if (!ks[i].includes(k) || !isEmpty(vals[i])) return;
        if (!reasonOf(b, k).trim()) out.push(`${repos[i]}/${f}::${k}`);
      });
    }
  }
  return out;
}

/* ה · הנימוק תפקידי ⛔ ולא נוכחות — ⚠️ «אינו בשאר» הוא המדידה, ולא הסיבה */
function whyIsPresence(st) {
  const out = [];
  for (const r of Object.keys(st)) for (const f of FILES) {
    const b = appBlock(st[r][f]); if (!b) continue;
    for (const k of topKeys(b)) {
      const why = reasonOf(b, k).replace(/[⛔⚠️⭐*]/g, ' ').trim();
      if (why && PRESENCE.test(why) && why.length < 60) out.push(`${r}/${f}::${k}`);
    }
  }
  return out;
}

/*  ⛔ העובדות שנגזרות מהעץ של כל אחות — ⚠️ **מה נכנס**: שם הריפו, השם
 *  למשתמש, קובץ הכניסה, ה-`scope` וקידומת המטמון; ⛔ **ומה מפיל**: כלום.
 *  ⭐ **ולמה המבנה קיים**: ערך בבלוק הקלט שזהה לאחת מהן הוא מקור אמת שני,
 *  ⚠️ והגזירה היא של המודול המשותף ⛔ ולא של השער הזה. */
const FACT_KEYS = ['slug', 'title', 'entry', 'scope', 'cachePrefix'];
const SIB_FACTS = Object.fromEntries(REPOS.filter((r) => !missing.includes(r))
  .map((r) => [r, appFacts(path.join(SIBS, r), false)]));
const litOf = (v) => {
  const m = /^(['"`])([^'"`$\\]*)\1$/.exec(String(v == null ? '' : v).trim());
  return m ? m[2] : null;
};
/*  ⛔ כל מפתח בבלוק שערכו ליטרל, ⚠️ **גם בתוך אובייקט מקונן** — `app` שקונן
 *  הוא אותה הצהרה: ⭐ ⛔ **אבל לא בתוך מערך** — ⚠️ פריט במערך הוא שורת נתון
 *  ברשימה, ⛔ ולא שדה שמצהיר על האפליקציה. */
function litPairs(block) {
  const out = [];
  const at = block.indexOf(MARK);
  if (at < 0) return out;
  const body = block.slice(at + MARK.length);
  const stack = ['{'];
  for (const { i, c, prev } of toks(body)) {
    if ('{[('.includes(c)) { stack.push(c); continue; }
    if ('}])'.includes(c)) { stack.pop(); if (!stack.length) break; continue; }
    if (stack.includes('[') || stack.includes('(')) continue;
    if (prev !== '' && prev !== ',' && prev !== '{') continue;
    const m = /^([A-Za-z_$][\w$]*)\s*:\s*(['"`][^'"`\n]*['"`])/.exec(body.slice(i));
    const v = m ? litOf(m[2]) : null;
    if (v !== null) out.push([m[1], v]);
  }
  return out;
}

/*  ו · ערך שניתן לגזור אינו מוצהר — ⛔ **והגזירה אחידה**: ⚠️ מפתח שערכו
 *  בכל ריפו שנושא אותו שווה לאותה עובדה נגזרת הוא הצהרה של מה שהעץ כבר
 *  אומר, ⭐ ושדה שמקורו בעץ אך צורתו נבדלת בין הריפו אינו נגזר בכלל אחד
 *  ⛔ ואינו נמדד כאן. */
function derivable(st) {
  const out = [];
  const repos = Object.keys(st).filter((r) => SIB_FACTS[r]);
  for (const f of FILES) {
    const per = {};
    for (const r of repos) {
      const b = appBlock(st[r][f]); if (!b) continue;
      for (const [k, v] of litPairs(b)) ((per[k] ??= {})[r] ??= []).push(v);
    }
    for (const [k, byRepo] of Object.entries(per)) {
      const rs = Object.keys(byRepo);
      const fk = FACT_KEYS.find((x) => rs.every((r) =>
        byRepo[r].some((v) => v !== '' && v === SIB_FACTS[r][x])));
      if (fk) out.push(`${f}::${k}=${fk}`);
    }
  }
  return out;
}

/*  ז · שדה שנשאר מוצהר נושא את נימוקו בשדה עצמו — ⚠️ ההערה שמעליו,
 *  ⭐ או שמעל הקבוצה הרצופה שהוא בה, ⛔ ולא הערה שמעבר לשורה ריקה. */
function declNoWhy(st) {
  const out = [];
  for (const r of Object.keys(st)) for (const f of FILES) {
    const b = appBlock(st[r][f]); if (!b) continue;
    for (const k of topKeys(b)) if (!isFunctional(reasonOf(b, k))) out.push(`${r}/${f}::${k}`);
  }
  return out;
}

/*  ח · הגזירה במקום אחד — ⛔ שם הריפו נגזר מהתיקייה או מהסביבה, ⚠️ והקוד
 *  שעושה זאת חי במודול המשותף בלבד: ⭐ גזירה שנייה בשער היא תשובה שנייה
 *  לאותה שאלה, ⛔ ונבדלת ביום הראשון שבו אחת מהן תיערך. */
const DERIVE = /\bfunction\s+appFacts\b|\bbasename\(\s*(?:ROOT|root)\b|\bAPP_FACTS_SLUG\b|\bSLUG_ENV\b/g;
const FACTS_HOME = 'app-facts.mjs';
/*  ⛔ ההלבנה נשמרת לכל מקור — ⚠️ המוטציות משכפלות את המפה ומחליפות קובץ
 *  אחד, ⭐ ושאר המקורות הם אותה מחרוזת: ⛔ הלבנה חוזרת עליהם הייתה
 *  מכפילה את זמן השער במספר המוטציות. */
const WHITE = new Map();
const white = (src) => { if (!WHITE.has(src)) WHITE.set(src, whitenJs(src)); return WHITE.get(src); };
function deriveTwice(st) {
  const out = [];
  for (const r of Object.keys(st)) for (const f of FILES) {
    if (f === FACTS_HOME) continue;
    const n = (white(st[r][f]).match(DERIVE) || []).length;
    if (n) out.push(`${r}/${f} (${n})`);
  }
  return out;
}

const ST = snapshot();
/*  ⛔ המדידה על העץ האמיתי נשמרת — ⚠️ כל מוטציה משווה מולה, ⭐ וחישוב
 *  חוזר שלה בכל אחת הוא אותה עבודה פעמיים. */
const BASE = new Map();
const base = (fn) => { if (!BASE.has(fn)) BASE.set(fn, fn(ST).length); return BASE.get(fn); };
/*  ⛔ **אפס אחיות אינו «אחות חסרה»** — ⚠️ הוא עותק בודד של הריפו: ⭐ שער
 *  הקריאה-בלבד מריץ את הסט על עותק בתיקייה זמנית, ⛔ ואין שם ולא אמורות
 *  להיות אחיות. ⚠️ **וחלקן על הדיסק הוא המקרה המסוכן** — ⛔ שם ההשוואה
 *  רצה על תת-קבוצה ומדווחת «נקי». */
/*  ⚠️ **והעותק אינו נושא את שם הריפו** — ⛔ שער הקריאה-בלבד מעתיק לתיקייה
 *  זמנית בשם אחר, ⭐ ואז חסר גם הריפו עצמו: ⛔ ולכן «לכל היותר אחת». */
const LONE = missing.length >= REPOS.length - 1;
if (LONE) console.log(`  ⚠️  ההשוואה בין הריפו לא רצה — ${missing.join(' · ')} ` +
                      `אינם על הדיסק לצד ${FACTS.slug}; מריצים את הסבב עם כל הריפו זה לצד זה`);
t(LONE || (missing.length === 0 && FILES.length > 0),
  `הריפו האחיות — נמדדו ${REPOS.length - missing.length} מתוך ${REPOS.length} ` +
  `ו-${FILES.length} קובצי \`tools/\` משותפים` +
  (missing.length ? `; חסרות: ${missing.join(', ')}. מעמידים אותן זו לצד זו` : ''));

{ const g = keyNoReader(ST);
  t(g.length === 0, `א · כל מפתח נקרא — נמדדו ${g.length} בלי קורא והצפוי אפס` +
    (g.length ? `: ${g.slice(0, 8).join(' · ')}. מסירים את המפתח, או מחווטים לו קורא` : '')); }
{ const g = readerNoKey(ST);
  t(g.length === 0, `ב · כל קורא מוצהר — נמדדו ${g.length} בלי הצהרה והצפוי אפס` +
    (g.length ? `: ${g.slice(0, 8).join(' · ')}. מצהירים את המפתח, או מסירים את הקורא` : '')); }
{ const g = privateNoWhy(ST);
  t(g.length === 0, `ג · מפתח פרטי נושא נימוק תפקידי — נמדדו ${g.length} בלעדיו והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. מנסחים **מה תפקיד המפתח**, ⛔ ולא שאינו בשאר` : '')); }
{ const g = emptyNoWhy(ST);
  t(g.length === 0, `ד · ערך ריק נושא נימוק — נמדדו ${g.length} בלעדיו והצפוי אפס` +
    (g.length ? `: ${g.slice(0, 10).join(' · ')}. מוסיפים «נמדד ואין» — ⛔ ריק בלי נימוק נקרא «לא נשאל»` : '')); }
{ const g = whyIsPresence(ST);
  t(g.length === 0, `ה · הנימוק תפקידי — נמדדו ${g.length} שנוקבים בנוכחות בלבד והצפוי אפס` +
    (g.length ? `: ${g.slice(0, 8).join(' · ')}. אומרים מה התפקיד, ⛔ ולא איפה הוא אינו` : '')); }

{ const g = derivable(ST);
  t(LONE || g.length === 0, `[decl-derivable] ו · ערך שניתן לגזור אינו מוצהר — נמדדו ${g.length} והצפוי אפס` +
    (g.length ? `: ${g.slice(0, 8).join(' · ')}. קוראים אותו מ-\`app-facts.mjs\` ⛔ ומסירים את ההצהרה` : '')); }
{ const g = declNoWhy(ST);
  t(g.length === 0, `[decl-why] ז · שדה מוצהר נושא את נימוקו — נמדדו ${g.length} בלעדיו והצפוי אפס` +
    (g.length ? `: ${g.slice(0, 8).join(' · ')}. כותבים מעליו מה חסר כדי לגזור אותו` : '')); }
{ const g = deriveTwice(ST);
  const home = Object.keys(ST).filter((r) => ST[r][FACTS_HOME] &&
    (white(ST[r][FACTS_HOME]).match(DERIVE) || []).length > 0);
  t(LONE || (g.length === 0 && home.length === Object.keys(ST).length),
    `[decl-once] ח · הגזירה במקום אחד — נמדדו ${g.length} גזירות מחוץ ל-\`${FACTS_HOME}\` ` +
    `ו-${home.length} ריפו שהגזירה חיה בהם מתוך ${Object.keys(ST).length}; והצפוי אפס וכולם` +
    (g.length ? `: ${g.join(' · ')}. מייבאים את \`FACTS\` ⛔ ואין גוזרים שוב` : '')); }

/* ⛔ ורשימות ההחרגה נמדדות משני צדדיהן — ⚠️ הצהרה שאין לה מקרה היא היתר שלא נסגר */
{
  const ghostRd = Object.keys(APP.readerExempt).filter((f) => !FILES.includes(f));
  const bareRd = Object.entries(APP.readerExempt).filter(([, w]) => !isFunctional(w)).map(([f]) => f);
  t(LONE || (ghostRd.length === 0 && bareRd.length === 0),
    `ההחרגות נמדדות משני צדדיהן — נמדדו ${ghostRd.length} בלי מקרה ` +
    `ו-${bareRd.length} בלי נימוק תפקידי; והצפוי אפס` +
    (ghostRd.length + bareRd.length
      ? `: ${[...ghostRd, ...bareRd].join(' · ')}. מסירים מהרשימה` : ''));
}

/* ⛔ וההצהרות שהסבב הוסיף נסרקות כאן — ⚠️ רשימה ריקה הופכת את ארבעת הכיוונים שמעליה לבדיקה שאינה יכולה להיכשל */
{
  const found = APP.newDecls.filter(([f, k]) => {
    const b = ST[FACTS.slug] && ST[FACTS.slug][f] ? appBlock(ST[FACTS.slug][f]) : null;
    return b && topKeys(b).includes(k);
  });
  t(LONE || (APP.newDecls.length > 0 && found.length === APP.newDecls.length),
    `ההצהרות שהסבב הוסיף נסרקות — נמדדו ${found.length} מתוך ${APP.newDecls.length} והצפוי כולן` +
    (found.length !== APP.newDecls.length
      ? `; חסרות: ${APP.newDecls.filter((x) => !found.includes(x)).map((x) => x.join('::')).join(' · ')}` : ''));
}

/*  ⛔ ט · ההצהרה נמדדת מול מקריה — ⚠️ **מה נכנס**: כל קובץ ב-`tools/` של
 *  הריפו הזה, ⭐ ובו כל רשימת פטור שנגזרת מסיומת שמה; ⛔ **ומה מפיל**:
 *  רשימה בלי אתר רישום · ערך בלי נימוק · ערך שההצלבה אינה מסמנת מת ·
 *  ⚠️ ורשימה שהוחלפה במדידה וחזרה. ⭐ **ולמה כאן**: המריץ מצליב את
 *  הרישומים בזמן ריצה, ⛔ וכאן נמדד שההצלבה עצמה יכולה ליפול. */
const TOOLS = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'tools'))
  .filter((f) => f.endsWith('.mjs')).map((f) => [f, rd('tools/' + f)]));
/*  ⛔ ערכי הרשימה נקראים מהליטרל שבבלוק — ⚠️ רשימה שהליטרל שלה אינו
 *  ליטרל טהור מדווחת בשמה ⛔ ואינה נספרת כנמדדת. */
function listsOf(files) {
  const out = [], opaque = [];
  for (const [f, src] of Object.entries(files)) {
    const b = appBlock(src); if (!b) continue;
    for (const k of appListNames(src)) {
      let val;
      try { val = Function('"use strict"; return (' + valueOf(b, k) + ');')(); }
      catch (_) { opaque.push(`${f}::${k}`); continue; }
      out.push({ f, k, vals: listValues(val) });
    }
  }
  return { out, opaque };
}
const probeGaps = (files) => {
  const bad = [];
  for (const [f, src] of Object.entries(files)) for (const k of appListNames(src)) {
    /*  ⛔ רשימה ריקה בכל הריפו יורדת — ⚠️ ריקה כאן ומלאה באחות היא «נמדד
     *  ואין» ⛔ ונושאת אתר רישום כמו כל רשימה: ⭐ הגוף משותף. */
    const blank = (x) => /^\[\s*\]$|^\{\s*\}$/.test(String(x || ''));
    if (blank(valueOf(appBlock(src), k)) && !LONE && Object.keys(ST).every((r) =>
      !ST[r][f] || !appBlock(ST[r][f]) || blank(valueOf(appBlock(ST[r][f]), k)))) { bad.push(`${f}::${k} (ריקה בכולן)`); continue; }
    if (!new RegExp(`\\bCASE(?:\\.unmeasured)?\\(\\s*['"]${k}['"]`).test(noCmt(src))) bad.push(`${f}::${k}`);
  }
  return bad;
};
const bareGaps = (files) => listsOf(files).out
  .flatMap(({ f, k, vals }) => Object.keys(vals).filter((n) => !whyOk(vals[n])).map((n) => `${f}::${k}::${n}`));
/*  ⛔ ההצלבה נמדדת על הרשימות החיות — ⚠️ רשומת ריצה שבה כל ערך פטר מקרה
 *  היא הבקרה החיובית, ⭐ וערך שהרשומה אינה נוקבת בו הוא מה שהמוטציה שותלת. */
const recOf = (lists, drop) => {
  const by = {};
  for (const { f, k, vals } of lists) (by[f] ??= {})[k] = { vals: Object.keys(vals), bare: [],
    hits: Object.keys(vals).filter((n) => n !== drop), unmeasured: '' };
  return Object.entries(by).map(([o, l]) => '[decl-cases] ' + JSON.stringify({ owner: o, root: ROOT, lists: l }));
};
const deadGaps = (files, drop) => caseGaps(recOf(listsOf(files).out, drop), files, ROOT).dead;
/*  ⛔ רשימה שהוחלפה במדידה אינה חוזרת — ⚠️ פער הזמן בין הריפו נמדד בשני
 *  יחסים מול סף, ⭐ ורשימת נימוקים לצידם היא פטור שני לאותה ראיה. */
const GONE = { 'deep-check.mjs': /\b(?:const|let|var)\s+[A-Z_]*WHY\b/ };
const goneGaps = (files) => Object.entries(GONE)
  .filter(([f, re]) => files[f] && re.test(white(files[f]))).map(([f]) => f);

{ const g = probeGaps(TOOLS);
  t(g.length === 0, `[decl-cases-probe] ט1 · כל רשימת פטור נושאת אתר רישום — נמדדו ${g.length} בלעדיו והצפוי אפס` +
    (g.length ? `: ${g.slice(0, 8).join(' · ')}. רושמים \`CASE\` באתר שבו הערך פוטר, ⛔ או מסירים רשימה ריקה` : '')); }
{ const g = bareGaps(TOOLS); const { out, opaque } = listsOf(TOOLS);
  const n = out.reduce((a, x) => a + Object.keys(x.vals).length, 0);
  t(g.length === 0 && opaque.length === 0,
    `[decl-cases-bare] ט2 · כל ערך נושא בערך עצמו את המקרה שהוא פוטר — נמדדו ${g.length} בלי נימוק ` +
    `ו-${opaque.length} רשימות שאינן ליטרל, מתוך ${n} ערכים ב-${out.length} רשימות; והצפוי אפס` +
    (g.length + opaque.length ? `: ${[...g, ...opaque].slice(0, 8).join(' · ')}. כותבים בערך מה המקרה` : '')); }
{ const g = deadGaps(TOOLS, null);
  t(g.length === 0, `[decl-cases-dead] ט3 · רשומה שבה כל ערך פטר מקרה אינה מפילה — נמדדו ${g.length} והצפוי אפס` +
    (g.length ? `: ${g.slice(0, 8).join(' · ')}. מיישרים את ההצלבה למבנה הרשומה` : '')); }
{ const g = goneGaps(TOOLS);
  t(g.length === 0, `[decl-cases-gone] ט4 · רשימה שהוחלפה במדידה אינה חוזרת — נמדדו ${g.length} והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. מסירים את הרשימה, ⛔ והיחס הוא המדידה` : '')); }

mutStage();
if (RUN_MUT) {
  /*  ⛔ המוטציות בזיכרון — ⚠️ כל אחת מחליפה מקור אחד במפה, ⭐ ואינה
   *  כותבת לעץ ⛔ ואינה פותחת תהליך: ⚠️ הזמן נגזר ממספרן. */
  const R0 = REPOS.find((r) => ST[r]);
  const clone = (edit) => {
    const c = {};
    for (const r of Object.keys(ST)) { c[r] = {}; for (const f of FILES) c[r][f] = ST[r][f]; }
    edit(c); return c;
  };
  /*  ⛔ הקובץ שהמוטציות נשענות עליו נבחר ⛔ ואינו הראשון שנמצא — ⚠️ קובץ
   *  שאין בו בלוק `APP` היה מייצר מוטציה שאינה נוגעת בדבר. */
  /*  ⛔ והוא אינו קובץ מוחרג — ⚠️ הסורק מדלג על מוחרגים, ⭐ ומוטציה
   *  שנשתלה בהם אינה נמדדת כלל: ⛔ וזו מוטציה שאינה יכולה להפיל. */
  const HOST = FILES.find((f) => !APP.readerExempt[f] &&
    appBlock(ST[R0][f]) && topKeys(appBlock(ST[R0][f])).length > 1);
  const put = (c, f, src) => { c[R0][f] = src; };
  /*  ⛔ שם ההצהרה נבנה בשרשור ⛔ ואינו ליטרל — ⚠️ הסורק היה מונה את
   *  מחרוזת המוטציה עצמה כקריאה חיה, ⭐ ומדווח על עצמו: ⛔ ובדיוק זה
   *  «probe שנופל על שינוי תקין». */
  const REF = (k) => 'APP' + '.' + k;
  const inject = (src, line) => src.replace(/(const APP = \{)/, '$1\n' + line);
  /*  ⛔ הקורא נשתל **אחרי** סוגר בלוק ה-`APP` — ⚠️ הסורק מודד את מה
   *  שאחרי הסוגר בלבד, ⭐ וקורא שנשתל לפניו אינו נסרק כלל: ⛔ ואז
   *  המוטציה «לא הפילה» מפני שלא נמדדה. */
  const after = (src, line) => src.replace(/(\/\* ── סוף APP[^\n]*\n)/, '$1' + line + '\n');

  const MUT = [
    { m: 'מ1', claim: 'א', lbl: 'מפתח שאין לו קורא',
      run: () => keyNoReader(clone((c) => put(c, HOST,
        inject(ST[R0][HOST], "  zzNoReader: 'x',")))).length > base(keyNoReader) },
    { m: 'מ2', claim: 'ב', lbl: 'קורא שאין לו הצהרה',
      run: () => readerNoKey(clone((c) => put(c, HOST,
        after(ST[R0][HOST], 'const _zz = ' + REF('zzNoDecl') + ';')))).length >
        base(readerNoKey) },
    { m: 'מ3', claim: 'ג', lbl: 'מפתח פרטי בלי נימוק תפקידי',
      run: () => privateNoWhy(clone((c) => {
        const b = appBlock(c[R0][HOST]);
        const k = topKeys(b)[0];
        for (const r of Object.keys(c)) if (r !== R0)
          c[r][HOST] = c[r][HOST].replace(new RegExp('(^|\\n)(\\s*)' + k + '\\s*:', 'm'), '$1$2zzGone:');
        /*  ⛔ ההערה שמעל המפתח נחתכת לפי מיקום ⛔ ולא בתבנית — ⚠️ נימוק שיש
         *  בו `**` שובר תבנית של «כל תו שאינו כוכבית», ⭐ והמוטציה לא הסירה דבר. */
        const src = c[R0][HOST];
        const ki = src.search(new RegExp('\\n\\s*' + k + '\\s*:'));
        const ce = src.lastIndexOf('*/', ki);
        const cs = src.lastIndexOf('/*', ce);
        if (ki > 0 && ce > 0 && !src.slice(ce + 2, ki).trim()) c[R0][HOST] = src.slice(0, cs) + src.slice(ce + 2);
      })).length > base(privateNoWhy) },
    { m: 'מ4', claim: 'ד', lbl: 'ערך ריק בלי נימוק',
      /*  ⛔ ריק **שנבדל** — ⚠️ ריק בכולן אינו הבדל ואינו דורש נימוק,
       *  ⭐ ולכן המוטציה מציבה ריק כאן ומלא באחות. */
      run: () => emptyNoWhy(clone((c) => {
        put(c, HOST, inject(ST[R0][HOST], "  zzEmpty: [],"));
        for (const r of Object.keys(c)) if (r !== R0)
          c[r][HOST] = inject(c[r][HOST], "  zzEmpty: ['x'],");
      })).length > base(emptyNoWhy) },
    { m: 'מ5', claim: 'ה', lbl: 'נימוק שנוקב בנוכחות בלבד',
      run: () => whyIsPresence(clone((c) => put(c, HOST,
        inject(ST[R0][HOST], "  /* אינו בכולן */\n  zzWhy: 'x',")))).length >
        base(whyIsPresence) },
    { m: 'מ6', claim: 'ו', lbl: '[decl-derivable] שם הריפו שמוצהר בשער',
      /*  ⛔ בכל ריפו בשמו שלו — ⚠️ זו ההצהרה שהגזירה החליפה, ⭐ והערך
       *  שונה בכל אחד ⛔ ושווה בכולם לאותה עובדה. */
      run: () => derivable(clone((c) => {
        for (const r of Object.keys(c)) if (SIB_FACTS[r])
          c[r][HOST] = inject(c[r][HOST], "  /*  ⭐ שם הריפו — מוטציה */\n  app: '" + SIB_FACTS[r].slug + "',");
      })).length > base(derivable) },
    { m: 'מ7', claim: 'ז', lbl: '[decl-why] שדה בלי נימוק',
      run: () => declNoWhy(clone((c) => put(c, HOST,
        inject(ST[R0][HOST], "  zzNoWhy: 'x',")))).length > base(declNoWhy) },
    { m: 'מ8', claim: 'ח', lbl: '[decl-once] הגזירה משוכפלת בשני שערים',
      run: () => {
        const dup = '\nfunction appFacts(root) { return basename(root); }\n';
        const two = FILES.filter((f) => f !== FACTS_HOME && f !== HOST).slice(0, 1).concat(HOST);
        return deriveTwice(clone((c) => { for (const f of two) c[R0][f] = c[R0][f] + dup; })).length >
          base(deriveTwice) + 1;
      } },
    { m: 'מ9', claim: 'ט3', lbl: '[decl-cases-dead] ערך פטור שאין לו מקרה',
      /*  ⛔ ערך חי שהרשומה אינה נוקבת בו — ⚠️ בדיוק ההצהרה שנשארה אחרי שמקרהו נסגר. */
      run: () => { const L = listsOf(TOOLS).out.find((x) => Object.keys(x.vals).length);
        return deadGaps(TOOLS, Object.keys(L.vals)[0]).length > 0; } },
    { m: 'מ10', claim: 'ט2', lbl: '[decl-cases-bare] ערך בלי נימוק',
      run: () => { const L = listsOf(TOOLS).out.find((x) => Object.keys(x.vals).length);
        const isArr = /^\[/.test(valueOf(appBlock(TOOLS[L.f]), L.k));
        const src = TOOLS[L.f].replace(new RegExp('(\\n  ' + L.k + '\\s*:\\s*[\\[{])'),
          '$1 ' + (isArr ? "'zzBare'," : "zzBare: '',"));
        return bareGaps({ ...TOOLS, [L.f]: src }).length > bareGaps(TOOLS).length; } },
    { m: 'מ11', claim: 'ט4', lbl: '[decl-cases-gone] רשימת נימוקי הפער חזרה',
      run: () => goneGaps({ ...TOOLS, 'deep-check.mjs': TOOLS['deep-check.mjs'] +
        '\nconst GAP_' + 'WHY = {};\n' }).length > 0 },
    { m: 'מ12', claim: 'ט1', lbl: '[decl-cases-probe] רשימה בלי אתר רישום',
      run: () => { const L = listsOf(TOOLS).out.find((x) => Object.keys(x.vals).length);
        const src = TOOLS[L.f].split('CASE(\'' + L.k + '\'').join('NOCASE(\'' + L.k + '\'')
          .split('CASE.unmeasured(\'' + L.k + '\'').join('NOCASE(\'' + L.k + '\'');
        return probeGaps({ ...TOOLS, [L.f]: src }).length > probeGaps(TOOLS).length; } },
  ];
  for (const r of MUT) {
    const got = r.run();
    t(got === true, `${r.m} · ${r.lbl} **מפיל** את «${r.claim}»`);
  }
  /*  ⭐ מוטציית-נגד: מפתח חדש **שמוצהר כהלכה ונקרא** ⛔ אינו מפיל —
   *  ⚠️ הנמדד הוא ההצהרה מול הקורא, ⛔ ולא מספר המפתחות. */
  const anti = clone((c) => put(c, HOST,
    after(inject(ST[R0][HOST],
      "  /*  ⛔ מפתח בדיקה — ⚠️ תפקידו לאמת שהצהרה תקינה ונקראת אינה מפילה */\n  zzOk: 'x',"),
      'const _z4 = ' + REF('zzOk') + ';')));
  t(keyNoReader(anti).length === base(keyNoReader) &&
    readerNoKey(anti).length === base(readerNoKey) &&
    emptyNoWhy(anti).length === base(emptyNoWhy) &&
    whyIsPresence(anti).length === base(whyIsPresence),
    'נ1 · מפתח שמוצהר כהלכה ונקרא — ⛔ אינו מפיל');

  /*  ⭐ מוטציית-נגד שנייה: `sortFn` **עם נימוקו** ⛔ אינו מפיל — ⚠️ שם
   *  פונקציה ב-`index.html` אינו נגזר, ⭐ והשדה נושא את מה שחסר כדי לגזור אותו. */
  const anti2 = clone((c) => put(c, HOST, after(inject(ST[R0][HOST],
    "  /*  ⭐ שם פונקציית המיון האחת — ⛔ **אינו נגזר**: שם פונקציה ב-`index.html`, ⚠️ ואין קובץ שמצהיר עליה */\n  sortFn: 'zzSort',"),
    'const _z5 = ' + REF('sortFn') + ';')));
  t(derivable(anti2).length === base(derivable) &&
    declNoWhy(anti2).length === base(declNoWhy) &&
    deriveTwice(anti2).length === base(deriveTwice),
    'נ2 · `sortFn` עם נימוקו — ⛔ אינו מפיל את «ו» · «ז» · «ח»');

  /*  ⭐ מוטציית-נגד שלישית: ערך שנוסף **ויש לו מקרה** ⛔ אינו מפיל — ⚠️ הסרתו
   *  הייתה מפילה שער, ⭐ ולכן הוא חי ונשאר. */
  {
    const L = listsOf(TOOLS).out.find((x) => Object.keys(x.vals).length);
    const recs = recOf(listsOf(TOOLS).out.map((x) => x === L
      ? { ...x, vals: { ...x.vals, zzLive: 'ערך שפוטר מקרה שנרשם בריצה הזו' } } : x), null);
    t(caseGaps(recs, TOOLS, ROOT).dead.length === 0, 'נ3 · ערך שנוסף ויש לו מקרה — ⛔ אינו מפיל את «ט3»');
  }
  /*  ⭐ מוטציית-נגד רביעית: רשימה **שאין לה מדידה חלופית** ⛔ ונושאת אתר רישום
   *  ונימוק לכל ערך — ⚠️ אינה מפילה: ⭐ היא נשארת רשימה, ⛔ והמדידה היא מקריה. */
  {
    const f = 'zz_decl.mjs';
    const src = "/* ── APP — x */\nconst APP = {\n  zzAllow: { a: 'ערך שפוטר מקרה אחד שנרשם כאן' },\n};\n" +
      "/* ── סוף APP */\nCASE('zzAllow', 'a');\n";
    const files = { ...TOOLS, [f]: src };
    t(probeGaps(files).length === probeGaps(TOOLS).length && bareGaps(files).length === bareGaps(TOOLS).length &&
      deadGaps(files, null).length === 0, 'נ4 · רשימה בלי מדידה חלופית, עם אתר ונימוק — ⛔ אינה מפילה את «ט1» · «ט2» · «ט3»');
  }
}

if (fail) {
  console.error(`\n❌ ${GATE_ID}: ${fail} כשלים מתוך ${pass + fail}`);
  process.exit(1);
}
console.log(`\n✅ ${GATE_ID}: ${pass} טענות`);
