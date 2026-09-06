#!/usr/bin/env node
/*  test_push.mjs — שכבת הדחיפה המאוחדת.
 *
 *  **מה נאכף:** הדחיפה היא **שלוש שכבות נפרדות** — מנה · טבלה · טבלאות —
 *  ⛔ וכל אחת פונקציה משלה, בליבה חתומה אחת · ⛔ המנה היא מספר מוצהר,
 *  ⛔ ומנה שנכשלה נדחפת שוב שורה-שורה · ⛔ ומתזמן מושהה אחד · ⛔ וכל טבלה
 *  שנכתבת מקומית יושבת ב-`PUSH_TABLES` או במסלול מוצהר בנפרד.
 *
 *  **הנימוק המדוד:** אותו תפקיד נכתב בארבע צורות — ⛔ באחת דחיפת שורה
 *  ולולאה באותה פונקציה, ⚠️ באחת שתי פונקציות בלי לולאת טבלאות, ⭐ ובאחת
 *  לא היה מתזמן כלל וכל שמירה ירתה מחזור סנכרון מלא.
 *
 *  **מה יישבר בלעדיו:** ⛔ שכבות מעורבבות אינן ניתנות לחתימה — ⚠️ ואז
 *  תיקון שנעשה באחת אינו מגיע לשלוש, ⭐ והטבלה מצהירה «זהה» על ארבעה
 *  מימושים · ⛔ וטבלה שאינה באף מסלול — שורותיה אינן עולות לעולם.
 *
 *  **מה אינו נאכף כאן:** ⛔ **מה** נדחף — ⚠️ בחירת המלוכלכות והכתיבה עצמן
 *  הן `PUSH_CFG` פר-אפליקציה, ⭐ וכאן נמדד **המנגנון** שמעליהן · ⛔ ומרווח
 *  המשיכה, שנאכף בשער המשיכה.
 *
 *  ⚠️ הרתמה מריצה את הליבה האמיתית ב-`vm` עם קונפיג ושעון מזויפים —
 *  ⛔ ואינה בודקת ביטויים רגולריים על ההתנהגות. ⛔ המוטציות אינן נכתבות לעץ.
 *  הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */

import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'שכר לימוד',
  file: 'index.html',
  /*  ⛔ תלמידים לפני תנועות — ⚠️ התנועה מפנה לתלמיד, ⭐ ובכסף שורה שאיבדה
   *  את האב שלה היא תשלום בלי בעלים. */
  tables: ['sl_students', 'sl_transactions', 'sl_settings', 'sl_lists'],
  /*  ⛔ טבלת מפתח-ערך — ⚠️ היא גם ב-`PUSH_TABLES`, ⭐ שיש לשורותיה
   *  `updated_at` והן ממוזגות ברמת רשומה. */
  kvTables: ['sl_settings'],
  userTables: ['sl_users'],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ שורת טבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן, ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [__ROW__];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

/*  ⛔ ארבעת הריפו בשמם — ⚠️ הרשימה זהה בית-לבית בארבעת העותקים: ⭐ ריפו
 *  שיורד מכאן יורד בארבעתם באותו סבב. */
const PEERS = ['yoman-avoda', 'hanhala-ruchanit', 'schar-limud', 'gius'];

/*  ⛔ החתימה נקראת מ-`check-capabilities` ⛔ ואינה מוקלדת כאן — ⚠️ ערך
 *  שמוצהר בשני מקומות מתיישן באחד מהם, ⭐ והשער השני מאשר בשקט את מה
 *  שכבר אינו. */
function capsBlock(startMark) {
  const caps = fs.readFileSync(new URL('./check-capabilities.mjs', import.meta.url), 'utf8');
  const re = /block:\s*\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(caps)) !== null) {
    const s = /start:\s*'([^']*)'/.exec(m[1]);
    if (!s || s[1] !== startMark) continue;
    return { sha: (/sha:\s*'([0-9a-f]{16})'/.exec(m[1]) || [])[1] || '',
             lines: Number((/lines:\s*(\d+)/.exec(m[1]) || [])[1]) || 0 };
  }
  return { sha: '', lines: 0 };
}
const START = '/* ═══ שכבת הדחיפה — מודול משותף (סבב 102)';
const BLOCK = Object.assign({
  start: START,
  end: '/* ═══════════════ סוף מודול שכבת הדחיפה',
}, capsBlock(START));

/*  ⛔ המנה המוצהרת — ⚠️ הערך אחד בארבעתן, ⭐ והוא נמדד מול האחיות למטה:
 *  ⛔ ערך אחר באחת מהן הוא דחיפה ראשונה באלפי בקשות רשת במקום בעשרות. */
const CHUNK = 500;

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIBS = resolve(ROOT, '..');
const src = fs.readFileSync(APP.file, 'utf8');

function grab(text) {
  const i = text.indexOf(BLOCK.start);
  if (i < 0) return null;
  const j = text.indexOf(BLOCK.end, i);
  if (j < 0) return null;
  const k = text.indexOf('*/', j);
  if (k < 0) return null;
  return text.slice(i, k + 2);
}

console.log('\n🔎 שכבת הדחיפה (סבב 102) — ' + APP.app + '\n');

const block = grab(src);
if (!block) {
  fail('הבלוק המשותף לא נמצא ב-' + APP.file);
  console.log('\n❌ בדיקת שכבת הדחיפה נכשלה (' + failures + ')');
  process.exit(1);
}

/* ── 1–2. הליבה — חתימה ומספר שורות ────────────────────────────────────── */
const sha = crypto.createHash('sha256').update(block).digest('hex').slice(0, 16);
if (sha !== BLOCK.sha) fail(`1. חתימת הליבה ${sha} במקום ${BLOCK.sha} — הליבה חייבת להיות זהה בית-לבית ×4`);
else pass('1. חתימת הליבה תואמת (' + BLOCK.sha + ')');
const nLines = block.split('\n').length;
if (nLines !== BLOCK.lines) fail(`2. ${nLines} שורות במקום ${BLOCK.lines}`);
else pass('2. ' + BLOCK.lines + ' שורות, כמצופה');

/* ── 3–4. `PUSH_CFG` מוגדר מעל הליבה, עם כל שמונת השדות ────────────────── */
const cfgAt = src.indexOf('var PUSH_CFG');
const blockAt = src.indexOf(BLOCK.start);
const cfgSrc = (cfgAt >= 0 && cfgAt < blockAt) ? src.slice(cfgAt, blockAt) : '';
if (!cfgSrc) fail('3. `PUSH_CFG` אינו מוגדר מעל הליבה — ליבה בלי פרמטרים אינה מודול');
else pass('3. `PUSH_CFG` מוגדר מעל הליבה');
for (const f of ['tables', 'chunk', 'delay', 'dirty', 'key', 'send', 'mark', 'run']) {
  if (new RegExp('\\b' + f + '\\s*:').test(cfgSrc)) pass('4. `PUSH_CFG.' + f + '` מוגדר');
  else fail('4. `PUSH_CFG.' + f + '` חסר');
}

/* ── 5. המנה — מספר מוצהר, ⛔ ולא ברירת מחדל של המודול ─────────────────── */
if (new RegExp('chunk\\s*:\\s*' + CHUNK + '\\b').test(cfgSrc))
  pass('5. `PUSH_CFG.chunk` = ' + CHUNK + ' — המנה המוצהרת');
else fail('5. `PUSH_CFG.chunk` אינו ' + CHUNK + ' — המנה היא פרמטר מוצהר ולא נבחר');

/* ── 6. `PUSH_TABLES` — הרשימה, וההצהרה שווה למה שנמדד ────────────────── */
const tm = /var PUSH_TABLES\s*=\s*\[([^\]]*)\]/.exec(src);
const tables = tm ? tm[1].split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : [];
if (tables.join('|') === APP.tables.join('|'))
  pass('6. `PUSH_TABLES` = ' + tables.length + ' טבלאות, בסדר המוצהר');
else fail('6. `PUSH_TABLES` נמדד «' + tables.join(',') + '» והצפוי «' + APP.tables.join(',') +
          '». מיישרים את ההצהרה לרשימה שבקוד');

/* ── 7. שלוש השכבות נפרדות — ⛔ ולא פונקציה אחת שיודעת הכול ────────────── */
function fnBody(text, name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(text);
  if (!m) return '';
  let i = text.indexOf('{', m.index), d = 0;
  for (let j = i; j < text.length; j++) {
    if (text[j] === '{') d++;
    else if (text[j] === '}') { d--; if (!d) return text.slice(i, j + 1); }
  }
  return '';
}
const LAYERS = [
  { fn: 'pushRow',   must: ['PUSH_CFG.send'],   never: ['PUSH_CFG.tables', 'PUSH_CFG.dirty', 'PUSH_CFG.chunk'] },
  { fn: 'pushTable', must: ['PUSH_CFG.dirty', 'PUSH_CFG.chunk', 'PUSH_CFG.mark'], never: ['PUSH_CFG.tables'] },
  { fn: 'pushDirty', must: ['PUSH_CFG.tables'], never: ['PUSH_CFG.send', 'PUSH_CFG.dirty'] },
];
for (const L of LAYERS) {
  const body = fnBody(block, L.fn);
  if (!body) { fail('7. השכבה `' + L.fn + '` אינה בליבה — שלוש השכבות חייבות להיות שלוש פונקציות'); continue; }
  const miss = L.must.filter((x) => body.indexOf(x) < 0);
  const extra = L.never.filter((x) => body.indexOf(x) >= 0);
  if (!miss.length && !extra.length) pass('7. `' + L.fn + '` — שכבה אחת בדיוק');
  else fail('7. `' + L.fn + '` נמדד חסר [' + miss.join(' ') + '] ועודף [' + extra.join(' ') +
            ']. מחזירים כל תפקיד לשכבה שלו');
}

/* ── 8. החיווט — `schedulePush` נקראת מקוד האפליקציה, ⛔ ואין מתזמן שני ── */
function codeOnly(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}
const codeOutside = codeOnly(src.slice(0, blockAt) + src.slice(blockAt + block.length));
const nSched = (codeOutside.match(/\bschedulePush\s*\(/g) || []).length;
if (nSched >= 1) pass('8. `schedulePush()` נקראת ' + nSched + ' פעמים מקוד האפליקציה');
else fail('8. `schedulePush()` אינה נקראת כלל — מתזמן שאין לו קורא אינו מחווט');
if (!/\bsetTimeout\s*\([^)]{0,80}PUSH_CFG\s*\.\s*run/.test(codeOutside))
  pass('9. ⛔ אין מתזמן שני מחוץ לליבה');
else fail('9. מתזמן שני נמצא מחוץ לליבה — שתי השהיות לאותה דחיפה הן שני מקורות אמת. מסירים אותו');

/* ── 10. כל כתיבה לענן עוברת באחד משלושה מסלולים מוצהרים ───────────────── */
/*  ⛔ שלושה ותו לא: `PUSH_TABLES` · טבלת מפתח-ערך · טבלת המשתמשים —
 *  ⚠️ טבלה שאינה באף אחד מהם, שורותיה אינן עולות לעולם. */
const ALLOWED = new Set([].concat(APP.tables, APP.kvTables, APP.userTables));
const writes = [];
const wre = /\.from\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)\s*\.\s*(upsert|update|insert)\b/g;
let wm;
while ((wm = wre.exec(codeOnly(src)))) if (!ALLOWED.has(wm[1])) writes.push(wm[1] + '.' + wm[2]);
if (!writes.length) pass('10. אפס כתיבות לטבלה שאינה באחד משלושת המסלולים');
else fail('10. כתיבה לטבלה שאינה מוצהרת: ' + [...new Set(writes)].join(', ') +
          '. מוסיפים ל-`PUSH_TABLES` או מצהירים חריגה עם נימוקה');

/* ── 11. המנה זהה בארבעת הריפו ─────────────────────────────────────────── */
{
  const seen = [];
  for (const p of PEERS) {
    const f = join(SIBS, p, 'index.html');
    if (!fs.existsSync(f)) { console.log('  ⚠️ ' + p + ' אינו על הדיסק — לא נמדד'); continue; }
    const t = fs.readFileSync(f, 'utf8');
    const at = t.indexOf('var PUSH_CFG');
    const m = at < 0 ? null : /chunk\s*:\s*(\d+)/.exec(t.slice(at, at + 900));
    seen.push({ p, n: m ? Number(m[1]) : null });
  }
  const bad = seen.filter((x) => x.n !== CHUNK);
  if (seen.length && !bad.length) pass('11. המנה ' + CHUNK + ' ב-' + seen.length + ' ריפו שנמדדו');
  else fail('11. המנה נבדלת: ' + bad.map((x) => x.p + '=' + x.n).join(', ') +
            ' והצפוי ' + CHUNK + ' בכולם. מיישרים את `PUSH_CFG.chunk`');
}

/* ══════════════════════════════════════════════════════════════════════════
   רתמת ההתנהגות — הליבה האמיתית, `PUSH_CFG` מזויף ושעון מזויף
   ══════════════════════════════════════════════════════════════════════════ */
function harness(moduleSrc) {
  const log = { sent: [], cleared: [], failed: [], marked: [], touch: 0, notes: 0, ran: 0, timers: [] };
  const st = {
    dirty: {},                    /* t ⟶ מערך שורות, או `null` ל«אין ראיה» */
    reject: null,                 /* (t, rows) ⟶ שגיאה, או null להצלחה     */
    delay: 400,
    chunk: CHUNK,
    tables: ['A', 'B'],
  };
  const ctx = {
    Promise, JSON, Math, String, Number, Array, Object,
    console: { warn() {}, log() {}, error() {} },
    setTimeout: (fn, ms) => { log.timers.push({ fn, ms }); return log.timers.length; },
    clearTimeout: (id) => { if (id) log.timers[id - 1] = null; },
    isNetErr: (e) => /network/.test((e && e.message) || ''),
    pendClear: (k) => log.cleared.push(k),
    pendFailed: (k) => log.failed.push(k),
    plTouch: () => { log.touch++; },
    rtyNote: () => { log.notes++; },
  };
  ctx.PUSH_CFG = {
    get tables() { return st.tables; },
    get chunk() { return st.chunk; },
    get delay() { return st.delay; },
    dirty: (t) => st.dirty[t],
    key: (t, row) => (row.k == null ? null : t + ':' + row.k),
    send: (t, rows) => {
      const e = st.reject && st.reject(t, rows);
      log.sent.push({ t, rows: rows.map((r) => r.k), ok: !e });
      return e ? Promise.reject(e) : Promise.resolve({});
    },
    mark: (t) => log.marked.push(t),
    run: () => { log.ran++; },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(moduleSrc, ctx);
  return { ctx, log, st };
}
const rows = (n, from = 0) => Array.from({ length: n }, (_, i) => ({ k: from + i + 1 }));

async function scenarios(moduleSrc) {
  const res = [];
  const add = (name, ok) => res.push({ name, ok: !!ok });

  /* א. אין מה לדחוף ⇒ עֵד הפינוי מסומן, ואפס כתיבות */
  {
    const h = harness(moduleSrc);
    h.st.dirty.A = [];
    const r = await h.ctx.pushTable('A');
    add('א. מערך ריק ⇒ העֵד מסומן ואפס כתיבות',
        h.log.sent.length === 0 && h.log.marked.join() === 'A' && r.ok === true && r.n === 0);
  }
  /* ב. «אין ראיה» ⇒ ⛔ העֵד **אינו** מסומן */
  {
    const h = harness(moduleSrc);
    h.st.dirty.A = null;
    const r = await h.ctx.pushTable('A');
    add('ב. `null` ⇒ אין סימון עֵד ואפס כתיבות',
        h.log.sent.length === 0 && h.log.marked.length === 0 && r.ok === true);
  }
  /* ג. 1200 שורות במנות של 500 ⇒ שלוש כתיבות, וכל השורות הגיעו */
  {
    const h = harness(moduleSrc);
    h.st.dirty.A = rows(1200);
    const r = await h.ctx.pushTable('A');
    const sizes = h.log.sent.map((s) => s.rows.length).join(',');
    const all = h.log.sent.reduce((a, s) => a.concat(s.rows), []);
    add('ג. 1200 שורות ⇒ 3 מנות של 500/500/200, וכולן נכתבו',
        sizes === '500,500,200' && all.length === 1200 && new Set(all).size === 1200 &&
        h.log.cleared.length === 1200 && h.log.touch === 1 && r.n === 1200 && r.ok === true);
  }
  /* ד. מנה שנכשלה ⇒ נפילה-חזרה פר-שורה, והפגומה לבדה אינה עולה */
  {
    const h = harness(moduleSrc);
    h.st.dirty.A = rows(4);
    h.st.reject = (t, rs) => (rs.length > 1 || rs[0].k === 3) ? new Error('bad row') : null;
    const r = await h.ctx.pushTable('A');
    const solo = h.log.sent.filter((s) => s.rows.length === 1);
    add('ד. מנה שנכשלה ⇒ ארבע שליחות פר-שורה, ושלוש מהן עברו',
        solo.length === 4 && h.log.cleared.length === 3 && h.log.failed.join() === 'A:3' &&
        r.n === 3 && r.ok === false);
  }
  /* ה. כשל רשת ⇒ הסימון נשאר, ⛔ ועֵד הפינוי אינו מסומן */
  {
    const h = harness(moduleSrc);
    h.st.dirty.A = rows(2);
    h.st.reject = () => new Error('network down');
    const r = await h.ctx.pushTable('A');
    add('ה. כשל רשת ⇒ הסימון נשאר והעֵד אינו מסומן',
        r.still.join() === 'A:1,A:2' && h.log.marked.length === 0 &&
        h.log.failed.length === 0 && h.log.touch === 0);
  }
  /* ו. כשל סמכותי ⇒ הסימון יורד, ⭐ והעֵד כן מסומן — אין שורה שנשארה ברשת */
  {
    const h = harness(moduleSrc);
    h.st.dirty.A = rows(2);
    h.st.reject = () => new Error('column missing');
    const r = await h.ctx.pushTable('A');
    add('ו. כשל סמכותי ⇒ הסימון יורד והעֵד מסומן',
        r.still.length === 0 && h.log.failed.length === 2 && h.log.marked.join() === 'A' && r.ok === false);
  }
  /* ז. שכבת הטבלאות עוברת על `PUSH_CFG.tables` בסדר, וממשיכה אחרי כשל */
  {
    const h = harness(moduleSrc);
    h.st.tables = ['A', 'B', 'C'];
    h.st.dirty = { A: rows(1), B: rows(1, 10), C: rows(1, 20) };
    h.st.reject = (t) => (t === 'B' ? new Error('network down') : null);
    const r = await h.ctx.pushDirty();
    add('ז. הלולאה בסדר המוצהר, וכשל בטבלה אחת אינו עוצר את הבאות',
        [...new Set(h.log.sent.map((s) => s.t))].join() === 'A,B,C' && r.still.join() === 'B:11' &&
        r.n === 2 && r.ok === false);
  }
  /* ח. המתזמן — שתי קריאות ⇒ השהיה אחת, במרווח המוצהר */
  {
    const h = harness(moduleSrc);
    h.st.delay = 4321;
    h.ctx.schedulePush();
    h.ctx.schedulePush();
    const live = h.log.timers.filter(Boolean);
    live.forEach((t) => t.fn());
    add('ח. שתי כתיבות ⇒ ריצה אחת, במרווח `PUSH_CFG.delay`',
        h.log.timers.length === 2 && live.length === 1 && live[0].ms === 4321 &&
        h.log.ran === 1 && h.log.notes === 2);
  }
  return res;
}

const base = await scenarios(block);
for (const r of base) { if (r.ok) pass('12. ' + r.name); else fail('12. ' + r.name); }

if (!RUN_MUT) {
  console.log('\n⏭ test_push: המוטציות רצות ברמה המלאה (--full)');
  console.log(failures ? '\n❌ בדיקת שכבת הדחיפה נכשלה (' + failures + ')'
                       : '\n✓ שכבת הדחיפה — ' + base.length + ' תרחישים עברו');
  process.exit(failures ? 1 : 0);
}
/* ══════════════════════════════════════════════════════════════════════════
   מוטציות — ⛔ אינן נכתבות לעץ
   ══════════════════════════════════════════════════════════════════════════ */
const MUTATIONS = [
  { name: 'סימון עֵד הפינוי גם על «אין ראיה»',
    from: "    if (!rows) return { ok: true, still: [], n: 0 };",
    to:   "    if (!rows) { PUSH_CFG.mark(t); return { ok: true, still: [], n: 0 }; }",
    hits: 'ב' },
  { name: 'ביטול המנה — הכול בכתיבה אחת',
    from: "      var part = rows.slice(i, i + PUSH_CFG.chunk);",
    to:   "      var part = rows.slice(i);",
    hits: 'ג' },
  { name: 'ביטול הנפילה-חזרה פר-שורה',
    from: "      return pushRow(t, part).then(function () { part.forEach(won); },\n                                   function () { return solo(part, 0); })",
    to:   "      return pushRow(t, part).then(function () { part.forEach(won); },\n                                   function () { return Promise.resolve(); })",
    hits: 'ד' },
  { name: 'סימון עֵד הפינוי גם כששורה נשארה בכשל רשת',
    from: "      if (!still.length) PUSH_CFG.mark(t);",
    to:   "      PUSH_CFG.mark(t);",
    hits: 'ה' },
  { name: 'כשל רשת נספר ככשל סמכותי',
    from: "      if (isNetErr(e)) { if (k != null) still.push(k); }",
    to:   "      if (false) { if (k != null) still.push(k); }",
    hits: 'ה' },
  { name: 'ביטול ההשהיה החוזרת — שתי כתיבות, שתי ריצות',
    from: "  if (_pushTimer) clearTimeout(_pushTimer);",
    to:   "  if (false) clearTimeout(_pushTimer);",
    hits: 'ח' },
];

for (const mu of MUTATIONS) {
  if (block.indexOf(mu.from) < 0) { fail('13. עוגן המוטציה «' + mu.name + '» לא נמצא בליבה'); continue; }
  const mutated = block.replace(mu.from, mu.to);
  let res;
  try { res = await scenarios(mutated); } catch (e) { res = [{ name: mu.hits + '.', ok: false }]; }
  const target = res.filter((r) => r.name.indexOf(mu.hits + '.') === 0);
  if (!target.length) { fail('13. המוטציה «' + mu.name + '» מכוונת לטענה «' + mu.hits + '» שאינה קיימת'); continue; }
  if (target.every((r) => r.ok)) fail('13. המוטציה «' + mu.name + '» ⛔ **לא** הפילה את טענה «' + mu.hits + '»');
  else pass('13. המוטציה «' + mu.name + '» הפילה את טענה «' + mu.hits + '», כנדרש');
}

/*  ⭐ מוטציית-נגד — **שם פנימי שהוחלף בעקביות** ⛔ אינו מפיל: ⚠️ הטענות
 *  מודדות את המנה, את הנפילה-חזרה ואת העֵד, ⛔ ולא את שם המונה שמחזיק
 *  אותם — ⭐ שער שהיה נופל על שינוי שם היה חוסם כל ניקוי. */
{
  const renamed = block.replace(/\bsolo\b/g, '_perRow');
  if (renamed === block) fail('13. מוטציית-הנגד לא מצאה את הנפילה-חזרה בליבה');
  else {
    let res;
    try { res = await scenarios(renamed); } catch (e) { res = [{ name: 'שגיאה: ' + e.message, ok: false }]; }
    const broke = res.filter((r) => !r.ok);
    if (!broke.length) pass('נ1 · ⭐ מוטציית-נגד: שם פנימי שהוחלף בעקביות ⛔ אינו מפיל');
    else fail('נ1 · ⛔ שם פנימי שהוחלף בעקביות הפיל ' + broke.length +
              ' טענות והצפוי אפס — הראשונה «' + broke[0].name + '»');
  }
}

console.log(failures ? '\n❌ בדיקת שכבת הדחיפה נכשלה (' + failures + ')'
                     : '\n✓ שכבת הדחיפה — כל הטענות והמוטציות עברו');
process.exit(failures ? 1 : 0);
