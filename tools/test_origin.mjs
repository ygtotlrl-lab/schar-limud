#!/usr/bin/env node
/*  test_origin.mjs — מה שכל האפליקציות חולקות ב-origin אחד: האחסון המקומי.
 *
 *  **מה נאכף:** מכסת האחסון היא המספר שנמדד בכרומיום, ⛔ והספים נגזרים
 *  ממנה באחוזים · ⚠️ `LS_APPS` מוצלבת מול כל הריפו האחיות · ⛔ כל טבלת
 *  מראה בפינוי, או מוצהרת קבועה בגודלה עם נימוקה · ⭐ רשומת בן יורדת עם
 *  אביה, ברתמה שמריצה את המודול · ⚠️ `wholeKeys` אינה מחזיקה מראה שהמסך
 *  צריך · ⛔ ושמות הרשימות לפי תפקיד, בלי «tier» ובלי «שלב א/ב».
 *
 *  **הנימוק המדוד:** המד הראה יותר ממאה אחוז מהמכסה ⛔ בזמן שהאפליקציות
 *  עדיין כתבו; ⭐ טבלת הסימונים תפסה את רוב האחסון ⛔ ולא הייתה בפינוי;
 *  ⚠️ ומפתחות `k_` נספרו כ«אחר», ⛔ שהקופה נולדה אחרי הרשימה.
 *
 *  **מה יישבר בלעדיו:** ⛔ טבלה אחת שגדלה ממלאת את האחסון **המשותף** —
 *  ⚠️ וחונקת את כל האפליקציות, ⭐ לא רק את עצמה: ⛔ והמד שאמור להתריע
 *  מתריע על מצב שאינו קיים.
 *
 *  **מה אינו נאכף כאן:** ⛔ דפדפן אחר עם מכסה אחרת — ⚠️ המספר נמדד
 *  בכרומיום בלבד · ⭐ וטבלה «קבועה» שבכל זאת גדלה — ⛔ ההצהרה נמדדת,
 *  ⚠️ והגודל בפועל אינו נמדד בשער.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { appSrc } from './appsrc.mjs';
import { PEERS } from './peers.mjs';
import { appFacts, FACTS } from './app-facts.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  /*  ⭐ המרשמים שמחזיקים את טבלאות המראה — ⛔ **אינו נגזר**: ⚠️ `MIRROR_CFG.tables`
   *  היא פונקציה שאינה נקראת בלי הרצת הדף, ⭐ וכל אפליקציה מחזיקה את הרשימה במרשם בשם אחר */
  mirrorList: ['PUSH_TABLES', 'SL_USERS_TABLE'],
  /*  ⛔ מוטציות פרטיות לאפליקציה — ⚠️ **מה נכנס**: `[מחט, תחליף, טענה,
   *  הודעה]`; ⛔ **ומה מפיל**: מוטציה שאינה מפילה את הטענה שהיא נוקבת בה.
   *  ⭐ **ולמה היא קיימת**: ההגדרות נכתבות מקומית-תחילה, ⛔ ופינויין כמפתח שלם חייב ליפול. */
  mutations: [
    ["  wholeKeys: [],", "  wholeKeys: [{ key: mirrorKey(KV_TABLE), syncedThrough: function () { return 0; } }],",
     '[mirror-screen-whole]', 'ההגדרות חזרו לפינוי כמפתח שלם'],
  ],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [100, 124];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ הן רצות ברמה המלאה (`--full`), ⭐ בסוף
 *  הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

/*  ⭐ המכסה שנמדדה בכרומיום — ⚠️ כתיבה עד `QuotaExceededError` ב-origin
 *  בדיקה, ⛔ במדידת `lsEntryBytes` (תווים × 2): ⭐ זו העובדה שהקוד נמדד מולה,
 *  ⛔ ולא ערך שהקוד מצהיר. */
const MEASURED_QUOTA = 10485756;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIBS = join(ROOT, '..');
const SRC = appSrc(ROOT);

let failed = 0;
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 12, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.GATE_INNER;
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
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — ` +
      'עדכן את `FLOOR`.');
    process.exitCode = 1;
  }
});
const ok = (m) => (RAN++, console.log('  ok   ' + m));
const bad = (m) => { RAN++; failed++; console.error('  FAIL ' + m); };
const assert = (cond, m) => (cond ? ok(m) : bad(m));

/* ── חילוץ ─────────────────────────────────────────────────────────────── */
const START = '/* ═══ עמידות אחסון מקומי — מודול משותף';
const END = '/* ═══════════════ סוף המודול המשותף';
function storageBlock(src) {
  const a = src.indexOf(START);
  if (a < 0) return '';
  const b = src.indexOf(END, a);
  return b < 0 ? '' : src.slice(a, src.indexOf('\n', b));
}
/*  ⛔ הסוגר נסגר בהתאמה ⛔ ולא בחלון תווים — ⚠️ מחרוזת עם סוגר אינה סוגר. */
function matchClose(s, i, open, close) {
  let d = 0, q = '';
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = ''; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === open) d++;
    else if (c === close) { d--; if (!d) return j; }
  }
  return -1;
}
function objectAfter(src, head) {
  const i = src.indexOf(head);
  if (i < 0) return '';
  const o = src.indexOf('{', i);
  const e = matchClose(src, o, '{', '}');
  return e < 0 ? '' : src.slice(o, e + 1);
}
/*  ⚠️ המדיניות היא `LS_CFG` **וגם** `lsRebuildPolicy()` — ⭐ ביומן היא
 *  נבנית בזמן ריצה, ⛔ והמפתחות נושאים סיומת מוסד. */
const policyText = (src) => objectAfter(src, 'var LS_CFG = {') + objectAfter(src, 'function lsRebuildPolicy(');
function arraysNamed(text, name) {
  const out = [];
  const re = new RegExp('\\b' + name + '\\s*[:=]\\s*\\[', 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    const o = m.index + m[0].length - 1;
    const e = matchClose(text, o, '[', ']');
    if (e > o) out.push(text.slice(o + 1, e));
  }
  return out;
}
/*  ⛔ שם קבוע נפתר לערכו — ⚠️ `KV_TABLE` הוא שם הטבלה, ⭐ ולא הטבלה. */
function resolveName(src, tok) {
  const t = tok.trim();
  const q = /^'([^']*)'$/.exec(t);
  if (q) return q[1];
  const v = new RegExp('\\bvar\\s+' + t + "\\s*=\\s*'([^']*)'").exec(src);
  return v ? v[1] : null;
}
/*  ⭐ מפתח אחסון ⟵ שם הטבלה: `mirrorKey('x')` · `mirrorKey(IDENT)` · `'x' + LS` · `'x'`. */
function keyTable(src, keyExpr) {
  const e = keyExpr.trim();
  const mk = /^mirrorKey\(\s*([^)]+?)\s*\)$/.exec(e);
  if (mk) return resolveName(src, mk[1]);
  const suf = /^'([^']+)'\s*\+\s*\w+$/.exec(e);
  if (suf) return suf[1];
  return resolveName(src, e);
}
function specKeys(src, body) {
  const out = [];
  for (const m of body.matchAll(/\bkey\s*:\s*((?:mirrorKey\([^)]*\))|(?:'[^']*'(?:\s*\+\s*\w+)?)|\w+)/g)) {
    out.push(keyTable(src, m[1]));
  }
  return out;
}
function mirrorTables(src) {
  const out = [];
  for (const name of APP.mirrorList) {
    const arrs = arraysNamed(src, name);
    if (arrs.length) {
      /*  ⚠️ רשימת אובייקטים נושאת את הטבלה ב-`t:` בלבד — ⛔ ושאר מחרוזותיה הן עמודות. */
      const re = arrs[0].includes('{') ? /\bt\s*:\s*('[^']*'|\w+)/g
        : /('[^']*')|\b([A-Z][A-Z0-9_]+)\b/g;
      for (const m of arrs[0].matchAll(re)) {
        const tok = m[1] || m[2];
        const v = resolveName(src, tok);
        if (v && !out.includes(v)) out.push(v);
      }
    } else {
      const v = resolveName(src, name);
      if (v && !out.includes(v)) out.push(v);
    }
  }
  return out;
}
function fixedDecl(src, pol) {
  const out = [];
  for (const body of arraysNamed(pol, 'fixedSize')) {
    for (const m of body.matchAll(/\{\s*t\s*:\s*('[^']*'|\w+)\s*,\s*why\s*:\s*'([^']*)'\s*\}/g)) {
      out.push({ t: resolveName(src, m[1]), why: m[2] });
    }
  }
  return out;
}

/* ── הטענות ────────────────────────────────────────────────────────────── */
/*  ⛔ [ls-quota-derived] — כל סף בבתים נגזר מהמכסה. */
function quotaDerivedGaps(src) {
  const blk = storageBlock(src);
  const out = [];
  for (const m of blk.matchAll(/\bvar\s+(LS_\w+_BYTES)\s*=\s*([^;\n]+)/g)) {
    if (m[1] === 'LS_QUOTA_BYTES') continue;
    if (!/\bLS_QUOTA_BYTES\b/.test(m[2])) out.push(m[1]);
  }
  for (const m of blk.matchAll(/\bvar\s+(LS_\w+_PCT|LS_SWEEP_TO)\s*=\s*([\d.]+)/g)) {
    const v = Number(m[2]);
    if (!(v > 0 && v <= 1)) out.push(m[1]);
  }
  return out;
}
/*  ⛔ [ls-quota-measured] — המכסה היא המספר שנמדד, ⚠️ ולא פחות ממנו: ⭐ מד
 *  שמחלק במכסה קטנה מדווח יותר ממאה אחוז בזמן שהכתיבה מצליחה. */
function quotaValue(src) {
  const m = /\bvar\s+LS_QUOTA_BYTES\s*=\s*([^;\n]+)/.exec(storageBlock(src));
  if (!m || !/^[\d\s*+]+$/.test(m[1].trim())) return NaN;
  return Function('return (' + m[1] + ');')();
}
const quotaOk = (q) => q >= MEASURED_QUOTA && q <= MEASURED_QUOTA * 1.01;
/*  ⛔ [ls-apps-peers] — כל אחות על הדיסק ברשימה, ⚠️ וכל ערך ברשימה אחות. */
function lsApps(src) {
  const arr = arraysNamed(storageBlock(src), 'LS_APPS')[0] || '';
  return [...arr.matchAll(/\{\s*id\s*:\s*'([^']*)'\s*,\s*name\s*:\s*'([^']*)'\s*,\s*pre\s*:\s*\[([^\]]*)\]\s*\}/g)]
    .map((m) => ({ id: m[1], name: m[2], pre: [...m[3].matchAll(/'([^']*)'/g)].map((x) => x[1]) }));
}
function peerFacts() {
  const out = [], missing = [];
  for (const slug of PEERS) {
    const root = slug === FACTS.slug ? ROOT : join(SIBS, slug);
    const per = join(root, 'tools', 'test_period.mjs');
    if (!existsSync(per) || !existsSync(join(root, 'manifest.json'))) { missing.push(slug); continue; }
    const pre = (/tablePrefix:\s*'([^']+)'/.exec(readFileSync(per, 'utf8')) || [])[1];
    out.push({ slug, pre, name: appFacts(root).title });
  }
  return { peers: out, missing };
}
function appsGaps(apps, peers) {
  const out = [];
  for (const p of peers) {
    const hit = apps.find((a) => a.pre.includes(p.pre));
    if (!hit) out.push(`${p.slug}: התחילית ${p.pre} אינה ב-LS_APPS`);
    else if (hit.name !== p.name) out.push(`${p.slug}: השם «${hit.name}» ולא «${p.name}»`);
  }
  for (const a of apps) {
    if (!peers.some((p) => a.pre.includes(p.pre))) out.push(`${a.id}: ערך בלי ריפו`);
  }
  return out;
}
/*  ⛔ [mirror-evict] — כל טבלת מראה בפינוי או קבועה בגודלה, ⚠️ והצהרה בלי
 *  טבלה, או בלי נימוק, מפילה אף היא. */
function evictGaps(src) {
  const pol = policyText(src);
  const tables = mirrorTables(src);
  const evict = new Set();
  for (const b of arraysNamed(pol, 'oldRecords')) for (const t of specKeys(src, b)) evict.add(t);
  const fixed = fixedDecl(src, pol);
  const out = [];
  if (!tables.length) out.push('אין טבלאות מראה במרשם המוצהר');
  for (const t of tables) {
    if (!evict.has(t) && !fixed.some((f) => f.t === t)) out.push(`${t}: אינה בפינוי ואינה מוצהרת`);
  }
  for (const f of fixed) {
    if (!tables.includes(f.t)) out.push(`${f.t}: הצהרה בלי טבלת מראה`);
    if (f.why.length < 12) out.push(`${f.t}: הצהרה בלי נימוק`);
    if (evict.has(f.t)) out.push(`${f.t}: בפינוי וגם מוצהרת קבועה`);
  }
  return out;
}
/*  ⛔ [mirror-screen-whole] — מראה אינה נמחקת שלמה. */
function wholeGaps(src) {
  const pol = policyText(src);
  const tables = mirrorTables(src);
  const out = [];
  for (const b of arraysNamed(pol, 'wholeKeys')) {
    for (const t of specKeys(src, b)) if (tables.includes(t)) out.push(`${t}: מראה ב-wholeKeys`);
  }
  return out;
}
/*  ⛔ [ls-role-names] — שם לפי תפקיד: ⚠️ «tier» ו«שלב א/ב» אומרים מתי, ⛔ ולא מה. */
const ROLE_BAD = /\btier\d?\b|שלב [אב](?![א-ת])/g;
function roleGaps(src) {
  const scope = storageBlock(src) + '\n' + policyText(src);
  return (scope.match(ROLE_BAD) || []);
}

/* ── רתמה: המודול רץ בארגז חול ─────────────────────────────────────────── */
function memLS(init) {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}
const DAY = 86400000;
function cascade(mod, childWitness) {
  const now = Date.now();
  const p = [{ id: 's1', ts: now - 300 * DAY }, { id: 's2', ts: now - 200 * DAY }, { id: 's3', ts: now }];
  const c = p.map((r) => ({ id: r.id + ':a', sid: r.id, ts: r.ts }));
  const ls = memLS({ p: JSON.stringify(p), c: JSON.stringify(c) });
  const cfg = {
    logKey: 't_log', hzPrefix: 't_hz_', pending: () => false, syncedThrough: () => 0,
    wholeKeys: [],
    oldRecords: [
      { key: 'p', ts: (r) => r.ts, minAgeMs: 100 * DAY, idOf: (r) => r.id, syncedThrough: () => now },
      { key: 'c', ts: (r) => r.ts, minAgeMs: 100 * DAY, parent: 'p', parentOf: (r) => r.sid,
        idOf: (r) => r.id, syncedThrough: () => childWitness(now) },
    ],
  };
  const box = { localStorage: ls, LS_CFG: cfg, console: { log() {}, warn() {}, error() {} },
    setTimeout: () => 0, clearTimeout: () => {}, window: {} };
  vm.createContext(box);
  vm.runInContext(mod, box);
  box.lsSweep('t', 1e9);
  const ids = (k) => JSON.parse(ls.getItem(k) || '[]').map((r) => r.id).join(',');
  return { p: ids('p'), c: ids('c') };
}
const cascadeOk = (mod) => {
  const a = cascade(mod, (now) => now);
  const b = cascade(mod, () => 0);
  return a.p === 's3' && a.c === 's3:a' && b.c === 's1:a,s2:a,s3:a';
};

/* ── הרצה ──────────────────────────────────────────────────────────────── */
const MOD = storageBlock(SRC);
assert(MOD.length > 0, 'מודול האחסון נמצא — ' + `נמדדו ${MOD.split('\n').length} שורות`);
{
  const g = quotaDerivedGaps(SRC);
  assert(g.length === 0, '[ls-quota-derived] כל סף בבתים נגזר מהמכסה באחוזים — ' +
    `נמדדו ${g.length} ספים מוקלדים והצפוי 0` + (g.length ? ': ' + g.join(', ') : ''));
}
{
  const q = quotaValue(SRC);
  assert(quotaOk(q), '[ls-quota-measured] המכסה היא המספר שנמדד בכרומיום — ' +
    `נמדדו ${q} והצפוי ${MEASURED_QUOTA} עד אחוז מעליו`);
}
const PF = peerFacts();
if (PF.missing.length) console.log('  ⏭ אחיות שאינן על הדיסק — שמן ותחיליתן לא נמדדו מול `LS_APPS`: ' + PF.missing.join(', '));
{
  const g = appsGaps(lsApps(SRC), PF.peers);
  assert(PF.peers.length > 0 && g.length === 0, '[ls-apps-peers] LS_APPS מול כל הריפו — ' +
    `נמדדו ${g.length} פערים מול ${PF.peers.length} ריפו והצפוי 0` + (g.length ? ': ' + g.join(' · ') : ''));
}
{
  const t = mirrorTables(SRC);
  assert(t.length > 0, 'טבלאות המראה נגזרות מהמרשם המוצהר — ' + `נמדדו ${t.length}: ${t.join(', ')}`);
  const g = evictGaps(SRC);
  assert(g.length === 0, '[mirror-evict] כל טבלת מראה בפינוי או קבועה בגודלה — ' +
    `נמדדו ${g.length} פערים והצפוי 0` + (g.length ? ': ' + g.join(' · ') : ''));
}
{
  const g = wholeGaps(SRC);
  assert(g.length === 0, '[mirror-screen-whole] אין מראה ב-wholeKeys — ' +
    `נמדדו ${g.length} והצפוי 0` + (g.length ? ': ' + g.join(' · ') : ''));
}
{
  const pol = policyText(SRC);
  const kids = [...pol.matchAll(/\bparent\s*:\s*(mirrorKey\([^)]*\)|'[^']*')/g)].map((m) => keyTable(SRC, m[1]));
  const ev = new Set();
  for (const b of arraysNamed(pol, 'oldRecords')) for (const t of specKeys(SRC, b)) ev.add(t);
  const orphanParent = kids.filter((t) => !ev.has(t));
  assert(orphanParent.length === 0, '[child-with-parent] כל אב שמוצהר לבן נמצא בפינוי — ' +
    `נמדדו ${orphanParent.length} אבות מחוץ לפינוי והצפוי 0`);
  const a = cascade(MOD, (now) => now);
  assert(a.p === 's3' && a.c === 's3:a', '[child-with-parent] בן יורד עם אביו ברתמה — ' +
    `נמדדו אב «${a.p}» ובן «${a.c}» והצפוי «s3» ו«s3:a»`);
  const b = cascade(MOD, () => 0);
  assert(b.c === 's1:a,s2:a,s3:a', '[child-with-parent] בן בלי עֵד נשאר — ' +
    `נמדד «${b.c}» והצפוי שלושתם`);
}
{
  const g = roleGaps(SRC);
  assert(g.length === 0, '[ls-role-names] שמות הפינוי לפי תפקיד — ' +
    `נמדדו ${g.length} שמות סדר והצפוי 0` + (g.length ? ': ' + g.join(', ') : ''));
}
/*  ⛔ פריט הוא אובייקט ברמה העליונה של הרשימה — ⚠️ אובייקט מקונן (`verify`) אינו פריט. */
function topItems(arr) {
  const out = []; let d = 0, st = -1;
  for (let i = 0; i < arr.length; i++) {
    const c = arr[i];
    if (c === '{') { if (d === 0) st = i; d++; }
    else if (c === '}') { d--; if (d === 0 && st >= 0) { out.push(arr.slice(st, i + 1)); st = -1; } }
  }
  return out;
}
function tslessItems(src) {
  const items = arraysNamed(policyText(src), 'oldRecords').flatMap(topItems);
  return { all: items.length, bad: items.filter((it) => !/(^|[,{\s])ts\s*:/.test(it)).length };
}
{
  const r = tslessItems(SRC);
  assert(r.all > 0 && r.bad === 0, '[old-records-ts] כל פריט ב-oldRecords נושא `ts` — ' +
    `נמדדו ${r.bad} פריטים בלי \`ts\` מתוך ${r.all} והצפוי 0`);
}

mutStage();
if (!RUN_MUT) {
  console.log('\n⏭ test_origin: המוטציות רצות ברמה המלאה (--full) — ⛔ ואינן נמדדות כאן');
  process.exit(failed ? 1 : 0);
}
/* ── מוטציות ───────────────────────────────────────────────────────────── */
{
  const mut = SRC.replace(/var LS_WARN_BYTES\s*=\s*[^;\n]+;/, 'var LS_WARN_BYTES  = 3 * 1024 * 1024;');
  const n = quotaDerivedGaps(mut).length;
  assert(mut !== SRC && n === 1, 'מ1 · סף שמוקלד בבתים **מפיל** את «[ls-quota-derived]» — ' + `נמדדו ${n} והצפוי 1`);
}
{
  const mut = SRC.replace(/var LS_QUOTA_BYTES\s*=\s*[^;\n]+;/, 'var LS_QUOTA_BYTES = 5 * 1024 * 1024;');
  const q = quotaValue(mut);
  assert(mut !== SRC && !quotaOk(q), 'מ2 · מכסת 5 MiB **מפילה** את «[ls-quota-measured]» — ' + `נמדדו ${q} והצפוי כשל`);
  /*  ⭐ נ1 · אותו מספר בכתיב אחר ⛔ אינו מפיל — ⚠️ נמדד הערך, ⛔ ולא הכתיב. */
  const same = SRC.replace(/var LS_QUOTA_BYTES\s*=\s*[^;\n]+;/, 'var LS_QUOTA_BYTES = 10485760;');
  assert(quotaOk(quotaValue(same)) && quotaDerivedGaps(same).length === 0,
    'נ1 · ⭐ אותה מכסה בכתיב אחר ⛔ **אינה** מפילה את «[ls-quota-measured]» — ' + `נמדדו ${quotaValue(same)}`);
}
{
  const apps = lsApps(SRC);
  const noK = apps.filter((a) => !a.pre.includes('k_'));
  const g1 = appsGaps(noK, PF.peers).length;
  assert(noK.length < apps.length && g1 === 1, 'מ3 · הסרת הקופה **מפילה** את «[ls-apps-peers]» — ' + `נמדדו ${g1} והצפוי 1`);
  const g2 = appsGaps(apps.concat([{ id: 'zz', name: 'אין', pre: ['zz_'] }]), PF.peers).length;
  assert(g2 === 1, 'מ4 · אפליקציה בלי ריפו **מפילה** את «[ls-apps-peers]» — ' + `נמדדו ${g2} והצפוי 1`);
}
{
  const name = APP.mirrorList.find((n) => arraysNamed(SRC, n).length);
  const re = new RegExp('(\\b' + name + '\\s*=\\s*\\[)');
  const obj = arraysNamed(SRC, name)[0].includes('{');
  const mut = SRC.replace(re, obj ? "$1{ t: 'zz_mut' }, " : "$1'zz_mut', ");
  const n = evictGaps(mut).length - evictGaps(SRC).length;
  assert(mut !== SRC && n === 1, 'מ5 · טבלת מראה בלי פינוי ובלי הצהרה **מפילה** את «[mirror-evict]» — ' + `נמדדו ${n} והצפוי 1`);
}
{
  const mut = MOD.replace('    return !proven(r);', '    return true;');
  assert(mut !== MOD && !cascadeOk(mut), 'מ6 · בן שנשאר אחרי אביו **מפיל** את «[child-with-parent]» — ' +
    `נמדד ${cascadeOk(mut)} והצפוי false`);
  /*  ⭐ נ2 · שם פנימי שהוחלף בעקביות ⛔ אינו מפיל — ⚠️ נמדד המנגנון, ⛔ ולא השם. */
  const ren = MOD.replace(/\bproven\b/g, 'hasProof');
  assert(ren !== MOD && cascadeOk(ren), 'נ2 · ⭐ שם שהוחלף בעקביות ⛔ **אינו** מפיל את «[child-with-parent]» — ' +
    `נמדד ${cascadeOk(ren)}`);
}
{
  const t0 = mirrorTables(SRC)[0];
  const mut = SRC.replace(/(\bwholeKeys\s*:\s*\[)/, `$1{ key: mirrorKey('${t0}') }, `);
  const n = wholeGaps(mut).length;
  assert(mut !== SRC && n === 1, 'מ7 · מראה ב-wholeKeys **מפילה** את «[mirror-screen-whole]» — ' + `נמדדו ${n} והצפוי 1`);
}
{
  const mut = SRC.replace(/\boldRecords(\s*:)/, 'tier' + '2$1');
  const n = roleGaps(mut).length;
  assert(mut !== SRC && n === 1, 'מ8 · `tier2` שחזר **מפיל** את «[ls-role-names]» — ' + `נמדדו ${n} והצפוי 1`);
}
{
  const mut = SRC.replace(/(\boldRecords\s*:\s*\[[\s\S]*?)\bts\s*:\s*[^,\n}]+,?/, '$1');
  const r = tslessItems(mut);
  assert(mut !== SRC && r.bad === 1, 'מ10 · פריט בלי `ts` **מפיל** את «[old-records-ts]» — ' + `נמדדו ${r.bad} והצפוי 1`);
}
const CLAIMS = {
  '[mirror-evict]': (s) => evictGaps(s).length,
  '[mirror-screen-whole]': (s) => wholeGaps(s).length,
  '[ls-role-names]': (s) => roleGaps(s).length,
};
for (const [needle, repl, claim, msg] of APP.mutations) {
  if (!SRC.includes(needle)) { bad('עוגן מוטציה חסר: ' + msg); continue; }
  const n = CLAIMS[claim](SRC.replace(needle, repl));
  assert(CLAIMS[claim](SRC) === 0 && n > 0, `מ9 · ${msg} **מפיל** את «${claim}» — ` + `נמדדו ${n} והצפוי יותר מ-0`);
}

if (failed) { console.error('\n' + failed + ' assertion(s) failed.'); process.exit(1); }
console.log('\ntest_origin: הכול עבר.');
