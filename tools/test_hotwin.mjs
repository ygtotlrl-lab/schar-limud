#!/usr/bin/env node
/*  test_hotwin.mjs — סבב 35: מודול החלון החם ויכולות הסבב.
 *
 *  שלושה חלקים:
 *    1. חילוץ מודול «חלון חם ושחזור מקומי» מ-index.html והרצתו ברתמת vm —
 *       פינוי בשני תנאים, נכשל-סגור, שער הדיסק, מסך העבר, כפתור השחזור.
 *    2. מוטציות על המודול: מוטציה שמפנה רשומה לא-מסונכרנת חייבת להיתפס,
 *       ומוטציה שמבטלת את הנכשל-סגור חייבת להיתפס.
 *    3. בלוק APP — טענות ומוטציות פר-אפליקציה (הדבר היחיד שנבדל בין הריפו).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import crypto from 'node:crypto';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  checks: [
    [/id="sc-edit-debt"/, 'שדה חוב-משנים-קודמות קיים בכרטיס התלמיד'],
    [/cs\.prev_debt_note/, 'הערת החוב נשמרת ב-card_settings'],
    [/חוב משנים קודמות/, 'שורת החוב המסומנת קיימת בטבלה השנתית'],
    [/if\(debtRaw&&debtVal>0\)cs\.prev_debt=debtVal;else delete cs\.prev_debt;/, 'אימות שדה החוב: רק ערך חיובי נשמר, ערך ריק נמחק'],
    [/function slSyncLog\(/, 'עוטף sync_log קיים (slSyncLog)'],
    [/var SL_NEVER_MIRROR_SETTINGS = \[\];/, 'רשימת הסודות ריקה (admin_pass נמחק מהמסד, סבב 35)'],
    [/HW_CFG = \{\s*\n\s*enabled: true,/, 'החלון החם פעיל (HW_CFG.enabled)'],
    [/hwPastLoad\('sl_mirror_transactions'/, 'מסך «שנים קודמות» קורא דרך hwPastLoad'],
  ],
  fileChecks: [
    ['sw.js', /supabase-js@2\.111\.0/, 'רשימת ה-CDN ב-sw.js נעוצה ל-supabase-js 2.111.0'],
    ['sw.js', /ensureCdnCached/, 'ריפוי עצמי של ה-CDN קיים (ensureCdnCached)'],
    ['sw.js', /var CDN_ASSETS = \[/, 'רשימת ה-CDN נושאת את השם המשותף CDN_ASSETS (השלמת סבב 35)'],
    ['sw.js', /mode:\s*'cors'/, "משיכת ה-CDN ב-mode:'cors'"],
  ],
  mutations: [
    ["if(debtRaw&&debtVal>0)cs.prev_debt=debtVal;else delete cs.prev_debt;",
     "cs.prev_debt=debtVal;",
     /if\(debtRaw&&debtVal>0\)cs\.prev_debt=debtVal;else delete cs\.prev_debt;/,
     'מוטציה בשדה החוב (ביטול האימות) נתפסת'],
  ],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'index.html'), 'utf8');

let failed = 0;
const ok = (m) => console.log('  ok   ' + m);
const bad = (m) => { failed++; console.error('  FAIL ' + m); };
const assert = (cond, m) => (cond ? ok(m) : bad(m));

/* ── 1. חילוץ המודול ───────────────────────────────────────────────────── */
const START = '/* ═══ חלון חם ושחזור מקומי — מודול משותף (סבב 35)';
const END = '/* ═══════════════ סוף מודול החלון החם';
const lines = SRC.split('\n');
const si = lines.findIndex(l => l.includes(START));
const ei = lines.findIndex(l => l.includes(END));
assert(si >= 0 && ei > si, 'מודול החלון החם קיים ב-index.html');
const MOD = lines.slice(si, ei + 1).join('\n');
const sha = crypto.createHash('sha256').update(MOD).digest('hex').slice(0, 16);
assert(sha === 'b1caa1637737862f', 'חתימת המודול תואמת (' + sha + ')');

/* רתמה: מריצה את המודול בהקשר נקי עם ספק-פיקסטורה. */
function harness(modSrc, opts) {
  const state = {
    local: [
      { id: 'a', ts: 100, old: true },
      { id: 'b', ts: 200, old: true, pending: true },
      { id: 'c', ts: 300 },
    ],
    cloud: { ok: true, rows: [{ id: 'a', ts: 100 }, { id: 'b', ts: 200 }] },
    pending: false, applied: undefined, fetchCalls: 0, restoreCalls: 0, domCalls: 0,
  };
  Object.assign(state, opts || {});
  const spec = {
    key: 'k', label: 'k',
    inWindow: (r) => !r.old,
    idOf: (r) => r.id,
    ts: (r) => r.ts,
    isPending: (r) => !!r.pending,
    fetch: async () => { state.fetchCalls++; return state.cloud; },
    rows: () => state.local,
    apply: (kept) => { state.applied = kept; return true; },
  };
  const sandbox = {
    console,
    Date,
    setTimeout: (fn) => fn,
    window: {},
    document: { getElementById: () => { state.domCalls++; return null; } },
    lsLog: () => {},
    lsRestoreAll: () => { state.restoreCalls++; },
    HW_CFG: { enabled: true, admin: () => true, specs: [spec] },
    LS_CFG: { pending: () => state.pending },
  };
  if (opts && opts.admin === false) sandbox.HW_CFG.admin = () => false;
  vm.createContext(sandbox);
  vm.runInContext(modSrc, sandbox);
  return { state, ctx: sandbox };
}

const ids = (rows) => (rows || []).map((r) => r.id).join(',');

/* ── תרחיש הבסיס: פינוי רק לרשומה מסונכרנת ומאומתת שמחוץ לחלון ─────────── */
{
  const { state, ctx } = harness(MOD);
  await ctx.hwSweep();
  assert(ids(state.applied) === 'b,c',
    'פינוי בסיס: רק a (מחוץ לחלון, לא-ממתינה, מאומתת) פונתה; b הממתינה נשארה');
}
/* ── נכשל סגור: משיכה שאינה ok אינה מפנה דבר ───────────────────────────── */
{
  const { state, ctx } = harness(MOD, { cloud: { ok: false, rows: [{ id: 'a', ts: 100 }] } });
  const r = await ctx.hwSweep();
  assert(r.swept === 0 && state.applied === undefined, 'נכשל סגור: ok:false ⇒ אפס פינוי');
}
/* ── תור יוצא לא ריק ⇒ הפינוי מדולג כולו, בלי לגעת ברשת ────────────────── */
{
  const { state, ctx } = harness(MOD, { pending: true });
  const r = await ctx.hwSweep();
  assert(r.swept === 0 && state.fetchCalls === 0, 'LS_CFG.pending() ⇒ דילוג מלא, אפס משיכות');
}
/* ── ראיה עננית ישנה מהמקומית אינה מפנה ────────────────────────────────── */
{
  const { state, ctx } = harness(MOD, { cloud: { ok: true, rows: [{ id: 'a', ts: 50 }] } });
  const r = await ctx.hwSweep();
  assert(r.swept === 0 && state.applied === undefined, 'חותמת ענן ישנה מהמקומית ⇒ הרשומה נשארת');
}
/* ── שער הדיסק בלי ראיה עננית אינו מסנן דבר ────────────────────────────── */
{
  const { state, ctx } = harness(MOD);
  const kept = ctx.hwDiskFilter('k', state.local);
  assert(kept.length === 3, 'hwDiskFilter בלי ראיה עננית מחזיר הכול');
}
/* ── מסך העבר: חיות שמחוץ לחלון בלבד, מהחדשה לישנה, קריאה בלבד ─────────── */
{
  const { state, ctx } = harness(MOD, {
    cloud: { ok: true, rows: [
      { id: 'a', ts: 100, old: true },
      { id: 'd', ts: 400, old: true, deleted: true },
      { id: 'e', ts: 500, old: true },
      { id: 'c', ts: 300 },
    ] },
  });
  const r = await ctx.hwPastLoad('k');
  assert(r.ok === true && ids(r.rows) === 'e,a' && state.applied === undefined,
    'hwPastLoad: חיות מחוץ לחלון בלבד, ממוינות, בלי כתיבה לדיסק');
}
/* ── כפתור השחזור: דו-שלבי, ושער מנהל ──────────────────────────────────── */
{
  const { state, ctx } = harness(MOD);
  ctx.hwRestoreClick(null);
  assert(state.restoreCalls === 0, 'לחיצה ראשונה חומשת בלבד — lsRestoreAll לא נקראה');
  ctx.hwRestoreClick(null);
  assert(state.restoreCalls === 1, 'לחיצה שנייה בתוך החלון מפעילה את lsRestoreAll');
}
{
  const { state, ctx } = harness(MOD, { admin: false });
  ctx.hwRestoreMount();
  assert(state.domCalls === 0, 'hwRestoreMount נעצר לפני ה-DOM כשאין הרשאת מנהל');
}

/* ── 2. מוטציות על המודול ──────────────────────────────────────────────── */
/* מוטציה א: ביטול בדיקת ה-⏳ — רשומה ממתינה חייבת להתפנות במוטנט,
   כלומר טענת הבסיס הייתה תופסת את המוטציה. */
{
  const needle = 'if (!pend) {';
  assert(MOD.split(needle).length === 2, 'עוגן מוטציית ה-⏳ קיים פעם אחת במודול');
  const mut = MOD.replace(needle, 'if (true) {');
  const { state, ctx } = harness(mut);
  await ctx.hwSweep();
  assert(ids(state.applied) === 'c',
    'מוטציה שמפנה רשומה לא-מסונכרנת נתפסת: במוטנט b פונתה — טענת הבסיס הייתה נכשלת');
}
/* מוטציה ב: ביטול הנכשל-סגור — משיכה עם ok:false מפנה במוטנט. */
{
  const needle = 'if (!res || res.ok !== true || !Array.isArray(res.rows)) continue;';
  assert(MOD.includes(needle), 'עוגן מוטציית הנכשל-סגור קיים במודול');
  const mut = MOD.replace(needle, 'if (!res || !Array.isArray(res.rows)) continue;');
  const { ctx } = harness(mut, { cloud: { ok: false, rows: [{ id: 'a', ts: 100 }] } });
  const r = await ctx.hwSweep();
  assert(r.swept === 1,
    'מוטציה שמבטלת את הנכשל-סגור נתפסת: במוטנט ok:false כן פינה — טענת הבסיס הייתה נכשלת');
}

/* ── 3. בלוק APP — טענות ומוטציות פר-אפליקציה ──────────────────────────── */
for (const [re, msg] of APP.checks) {
  assert(re.test(SRC), msg);
}
for (const [file, re, msg] of APP.fileChecks || []) {
  const s = readFileSync(join(ROOT, file), 'utf8');
  assert(re.test(s), msg);
}
for (const [needle, replacement, re, msg] of APP.mutations || []) {
  if (!SRC.includes(needle)) { bad('עוגן מוטציה חסר: ' + msg); continue; }
  const mut = SRC.replace(needle, replacement);
  assert(re.test(SRC) && !re.test(mut), msg);
}

if (failed) { console.error('\n' + failed + ' assertion(s) failed.'); process.exit(1); }
console.log('\ntest_hotwin: הכול עבר.');
