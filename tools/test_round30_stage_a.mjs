#!/usr/bin/env node
/*  בדיקת שלב א של סבב 30 — הגיבוי היומי ויומן הפעולות.
 *
 *  ⚠️ הבדיקה מריצה את **הקוד האמיתי** המחולץ מ-`index.html`: הבלוק שבין
 *     סמן פתיחת מודול הגיבוי לבין סמן הסיום שלו נחתך מהקובץ ורץ ב-`vm` מעל
 *     localStorage, DOM ולקוח Supabase מדומים. כלומר מוטציה בקוד האמיתי
 *     מפילה טענה — ולא בעותק שנכתב לבדיקה.
 *
 *  ⚠️ הלקוח המדומה משקף את החוזה של supabase-js: הוא **אינו זורק** ומחזיר
 *     `{data, error}`. בלי זה כל בדיקת «נכשל בשקט» הייתה נבדקת מול חוזה
 *     שאינו קיים במציאות, וה-`error` המפורש שבמודול לא היה נבדק כלל.
 *
 *  ⚠️ ההמתנה היא ל**אירוע** ולא לשעון (הלקח מהבאג תלוי-השעון שנמצא
 *     ב-`test_round24.mjs` של schar-limud באימות חיצוני): כל מסלול נאחז
 *     ב-`await` על ה-Promise שהמודול מחזיר, ו-`waitFor` נכשלת ברעש בתום
 *     תקרה במקום לעבור בשקט.
 *
 *  הקובץ **זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו** — המודול
 *  הנבדק משותף, ולכן גם הבדיקה שלו.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  file: 'index.html',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, APP.file), 'utf8');
const START = '/* ═══ גיבוי יומי ויומן פעולות';
const END = 'סוף מודול הגיבוי היומי';

let passN = 0, failN = 0;
const ok = (c, m) => { if (c) passN++; else { failN++; console.error('❌ ' + m); } };
const eq = (a, b, m) => ok(a === b, `${m} — קיבלתי ${JSON.stringify(a)}, ציפיתי ${JSON.stringify(b)}`);
const TODAY = new Date().toISOString().slice(0, 10);

async function waitFor(pred, label, ms = 5000) {
  const t0 = Date.now();
  for (;;) {
    let v = false;
    try { v = pred(); } catch (e) { v = false; }
    if (v) return true;
    if (Date.now() - t0 > ms) { failN++; console.error(`❌ ${label} — לא קרה בתוך ${ms}ms`); return false; }
    await new Promise((r) => setTimeout(r, 5));
  }
}

/* ── חיתוך המודול מהקובץ האמיתי ────────────────────────────────────────── */
const MODULE_SRC = (() => {
  const i = SRC.indexOf(START);
  if (i < 0) throw new Error('סמן פתיחת המודול לא נמצא ב-' + APP.file);
  const j = SRC.indexOf(END, i);
  const k = j < 0 ? -1 : SRC.indexOf('*/', j);
  if (j < 0 || k < 0) throw new Error('המודול אינו סגור ב-' + APP.file);
  return SRC.slice(i, k + 2);
})();

/* ── הרתמה ─────────────────────────────────────────────────────────────── */
function makeEnv(opts = {}) {
  const env = {
    store: Object.assign({}, opts.store || {}),
    kv: Object.assign({}, opts.kv || {}),
    tables: Object.assign({}, opts.tables || {}),
    calls: [],
    inserted: { kv_backup: [], sync_log: [] },
    net: opts.net !== false,
    lsBlocked: !!opts.lsBlocked,
  };

  env.client = {
    from(table) {
      const q = { table, cols: '*', key: null };
      const api = {
        select(cols) { q.cols = cols === undefined ? '*' : cols; return api; },
        eq(col, val) { if (col === 'key') q.key = val; return api; },
        maybeSingle() {
          env.calls.push({ op: 'select', table: q.table, cols: q.cols, key: q.key });
          if (!env.net) return Promise.resolve({ data: null, error: { message: 'net' } });
          const v = env.kv[q.key];
          return Promise.resolve({ data: v === undefined ? null : { value: v }, error: null });
        },
        // `select('*')` בלי maybeSingle — thenable, בדיוק כמו PostgREST
        then(res, rej) {
          env.calls.push({ op: 'select', table: q.table, cols: q.cols, key: null });
          const out = env.net
            ? { data: env.tables[q.table] || [], error: null }
            : { data: null, error: { message: 'net' } };
          return Promise.resolve(out).then(res, rej);
        },
        insert(row) {
          env.calls.push({ op: 'insert', table: q.table, row });
          if (!env.net) return Promise.resolve({ data: null, error: { message: 'net' } });
          (env.inserted[q.table] = env.inserted[q.table] || []).push(row);
          return Promise.resolve({ data: [row], error: null });
        },
      };
      return api;
    },
  };

  const details = { kids: [], querySelector: () => null, appendChild(n) { this.kids.push(n); } };
  env.details = details;
  const sandbox = {
    console, setTimeout, clearTimeout, JSON, Date, Math, String, Number, Array, Object,
    parseInt, isFinite, Promise, RegExp, Error,
    window: {},
    document: {
      getElementById: (id) => (id === 'tech-info-box' ? { querySelector: () => details } : null),
      createElement: () => { const n = { _h: '', get firstChild() { return { html: n._h }; } }; Object.defineProperty(n, 'innerHTML', { set(h) { n._h = h; } }); return n; },
    },
    esc: (s) => String(s == null ? '' : s),
    syncFmtTime: (t) => 'T' + t,
    lsGet: (k, d) => (k in env.store ? env.store[k] : (d === undefined ? null : d)),
    lsSet: (k, v) => { if (env.lsBlocked) return false; env.store[k] = String(v); return true; },
    BK_CFG: null,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(MODULE_SRC, sandbox, { filename: 'bk-module.js' });
  env.sb = sandbox;
  return env;
}

function cfgKv(env, extra = {}) {
  return Object.assign({
    client: () => env.client,
    flagKey: 'x_last_backup',
    atKey: 'x_last_backup_at',
    logQueueKey: 'x_log_queue',
    prefix: '',
    device: () => 'dev1',
    user: () => null,
    sources: () => [{ kind: 'kv', table: 'kv', name: 'k1' }, { kind: 'kv', table: 'kv', name: 'k2' }],
  }, extra);
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · הגיבוי כותב, והדגל נכתב **אחרי** ההצלחה
   ══════════════════════════════════════════════════════════════════════════ */
async function t1() {
  const env = makeEnv({ kv: { k1: 'AAA', k2: 'BBB' } });
  env.sb.BK_CFG = cfgKv(env);
  const r = await env.sb.bkMaybeDaily();
  eq(r, true, '1א · גיבוי מוצלח מחזיר true');
  eq(env.inserted.kv_backup.length, 2, '1ב · שני המקורות נכתבו ל-kv_backup');
  eq(env.inserted.kv_backup[0].key, 'k1', '1ג · מפתח הגיבוי הוא שם המקור');
  eq(env.inserted.kv_backup[0].value, 'AAA', '1ד · הערך שנכתב הוא הערך שבענן');
  eq(env.store['x_last_backup'], TODAY, '1ה · הדגל היומי נכתב אחרי ההצלחה');
  ok(Number(env.store['x_last_backup_at']) > 0, '1ו · חותמת «גובה לאחרונה» נכתבה');
  ok(env.inserted.sync_log.some((x) => x.action === 'backup'), '1ז · הגיבוי נרשם ביומן');
  // ריצה שנייה באותו יום — יוצאת מיד ואינה נוגעת ברשת
  const before = env.calls.length;
  const r2 = await env.sb.bkMaybeDaily();
  eq(r2, false, '1ח · ריצה שנייה באותו יום אינה מגבה');
  eq(env.calls.length, before, '1ט · ⛔ ואינה נוגעת ברשת כלל');
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · ⛔ נכשל בשקט בלי רשת — הדגל **אינו** נכתב, והניסיון הבא מצליח
   ══════════════════════════════════════════════════════════════════════════ */
async function t2() {
  const env = makeEnv({ kv: { k1: 'AAA', k2: 'BBB' }, net: false });
  env.sb.BK_CFG = cfgKv(env);
  let threw = false;
  let r;
  try { r = await env.sb.bkMaybeDaily(); } catch (e) { threw = true; }
  ok(!threw, '2א · ⛔ כשל רשת אינו זורק — הגיבוי אינו חוסם ואינו מפיל');
  eq(r, false, '2ב · ומחזיר false');
  eq(env.store['x_last_backup'], undefined, '2ג · ⛔ הדגל היומי לא נכתב — אין דילוג על יממה');
  eq(env.inserted.kv_backup.length, 0, '2ד · שום דבר לא נכתב ל-kv_backup');
  // הרשת חוזרת — אותו יום, והגיבוי כן רץ
  env.net = true;
  const r2 = await env.sb.bkMaybeDaily();
  eq(r2, true, '2ה · ⭐ הניסיון הבא באותו יום מצליח (זה מה שהדגל-אחרי-הצלחה נותן)');
  eq(env.inserted.kv_backup.length, 2, '2ו · והפעם הכל נכתב');
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · כישלון חלקי — מקור אחד נכשל ⇒ אין דגל
   ══════════════════════════════════════════════════════════════════════════ */
async function t3() {
  const env = makeEnv({ kv: { k1: 'AAA', k2: 'BBB' } });
  env.sb.BK_CFG = cfgKv(env);
  // ⚠️ המונה יושב **מחוץ** ל-`from` בכוונה: כל קריאה יוצרת אובייקט חדש,
  //    ומונה פנימי היה מתאפס בכל insert ולעולם לא היה מפיל אף אחד מהם.
  let nIns = 0;
  const orig = env.client.from;
  env.client.from = function (t) {
    const api = orig.call(env.client, t);
    if (t === 'kv_backup') {
      const ins = api.insert;
      api.insert = (row) => (++nIns === 2 ? Promise.resolve({ data: null, error: { message: 'boom' } }) : ins(row));
    }
    return api;
  };
  const r = await env.sb.bkMaybeDaily();
  eq(r, false, '3א · כישלון של מקור אחד מחזיר false');
  eq(env.store['x_last_backup'], undefined, '3ב · ⛔ ואינו כותב את הדגל היומי');
  ok(env.inserted.sync_log.some((x) => x.action === 'backup_fail'), '3ג · הכישלון נרשם ביומן');
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · ⭐ גיבוי דיפרנציאלי — ערך שלא השתנה אינו נכתב שוב
   ══════════════════════════════════════════════════════════════════════════ */
async function t4() {
  const env = makeEnv({ kv: { k1: 'AAA', k2: 'BBB' } });
  env.sb.BK_CFG = cfgKv(env);
  await env.sb.bkMaybeDaily();
  eq(env.inserted.kv_backup.length, 2, '4א · היום הראשון כותב הכל');
  // יום חדש, אותם ערכים
  delete env.store['x_last_backup'];
  const r = await env.sb.bkMaybeDaily();
  eq(r, true, '4ב · היום השני מצליח');
  eq(env.inserted.kv_backup.length, 2, '4ג · ⭐ ולא נכתבה אף שורה חדשה — הערכים זהים');
  // ערך אחד השתנה
  delete env.store['x_last_backup'];
  env.kv.k2 = 'CCC';
  await env.sb.bkMaybeDaily();
  eq(env.inserted.kv_backup.length, 3, '4ד · רק המקור שהשתנה נכתב');
  eq(env.inserted.kv_backup[2].key, 'k2', '4ה · והוא הנכון');
  // ⛔ בספק — כותבים: חתימה שנמחקה מחזירה כתיבה מלאה
  delete env.store['x_last_backup'];
  delete env.store['bk_sig_k1'];
  await env.sb.bkMaybeDaily();
  eq(env.inserted.kv_backup.length, 4, '4ו · ⛔ חתימה חסרה ⇒ כותבים שוב (בספק — מגבים)');
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · מקור מסוג טבלה, ו-`cols` שמונע גיבוי של סוד
   ══════════════════════════════════════════════════════════════════════════ */
async function t5() {
  const env = makeEnv({ tables: { t_data: [{ id: 1 }], t_users: [{ id: 2, username: 'u' }] } });
  env.sb.BK_CFG = cfgKv(env, {
    sources: () => [
      { kind: 'table', name: 't_data' },
      { kind: 'table', name: 't_users', cols: 'id,username' },
    ],
  });
  const r = await env.sb.bkMaybeDaily();
  eq(r, true, '5א · גיבוי טבלאות מצליח');
  eq(env.inserted.kv_backup[0].value, JSON.stringify([{ id: 1 }]), '5ב · הערך הוא JSON של השורות');
  const sel = env.calls.filter((c) => c.op === 'select');
  eq(sel.find((c) => c.table === 't_data').cols, '*', '5ג · טבלה בלי `cols` נשלפת ב-`*`');
  eq(sel.find((c) => c.table === 't_users').cols, 'id,username',
    '5ד · ⛔ טבלה עם סוד נשלפת בעמודות מפורשות — הסוד אינו מגיע לזיכרון כלל');
}

/* ══════════════════════════════════════════════════════════════════════════
   6 · ⛔ מקור ריק / חוסר מוכנות — לא נוגעים ברשת ולא כותבים דגל
   ══════════════════════════════════════════════════════════════════════════ */
async function t6() {
  const env = makeEnv({ kv: { k1: 'A' } });
  env.sb.BK_CFG = cfgKv(env, { sources: () => [] });
  const r = await env.sb.bkMaybeDaily();
  eq(r, false, '6א · ⛔ בלי מקורות (מוסד שטרם נבחר) אין גיבוי');
  eq(env.calls.length, 0, '6ב · ואפס קריאות רשת');
  eq(env.store['x_last_backup'], undefined, '6ג · ואין דגל שיחסום את הניסיון הבא');

  const env2 = makeEnv({});
  env2.sb.BK_CFG = cfgKv(env2, { client: () => null });
  eq(await env2.sb.bkMaybeDaily(), false, '6ד · בלי לקוח — יוצאת מיד');

  // מקור שאין לו ערך בענן אינו כישלון
  const env3 = makeEnv({ kv: { k1: 'A' } });   // k2 חסר
  env3.sb.BK_CFG = cfgKv(env3);
  eq(await env3.sb.bkMaybeDaily(), true, '6ה · מפתח שאין לו ערך בענן אינו כישלון');
  eq(env3.inserted.kv_backup.length, 1, '6ו · ורק מה שקיים גובה');
}

/* ══════════════════════════════════════════════════════════════════════════
   7 · יומן הפעולות — תור אופליין, ריקון, ותקרה
   ══════════════════════════════════════════════════════════════════════════ */
async function t7() {
  const env = makeEnv({ net: false });
  env.sb.BK_CFG = cfgKv(env);
  env.sb.logAction('login_fail', 'net', 0, { a: 1 });
  await waitFor(() => JSON.parse(env.store['x_log_queue'] || '[]').length === 1, '7א · הרישום נכנס לתור באופליין');
  const q = JSON.parse(env.store['x_log_queue']);
  eq(q[0].action, 'login_fail', '7ב · עם הפעולה הנכונה');
  eq(q[0].device_id, 'dev1', '7ג · ועם מזהה המכשיר');
  eq(q[0].record_count, 0, '7ד · ועם המונה');

  env.net = true;
  const sent = await env.sb.logFlush();
  eq(sent, 1, '7ה · ⭐ הריקון שולח את מה שהצטבר כשהרשת חוזרת');
  eq(JSON.parse(env.store['x_log_queue']).length, 0, '7ו · והתור מתרוקן');
  eq(env.inserted.sync_log.length, 1, '7ז · והשורה הגיעה ל-sync_log');

  // ריקון שנכשל — הפריטים חוזרים לתור
  env.net = false;
  env.sb.logAction('x', 'y', 1, null);
  await waitFor(() => JSON.parse(env.store['x_log_queue'] || '[]').length === 1, '7ח · נרשם שוב לתור');
  eq(await env.sb.logFlush(), 0, '7ט · ריקון בלי רשת אינו שולח דבר');
  eq(JSON.parse(env.store['x_log_queue']).length, 1, '7י · ⛔ והפריט חוזר לתור ואינו נעלם');

  // תקרה
  const env2 = makeEnv({ net: false });
  env2.sb.BK_CFG = cfgKv(env2);
  for (let i = 0; i < 60; i++) env2.sb.logAction('a' + i, null, 0, null);
  await waitFor(() => JSON.parse(env2.store['x_log_queue'] || '[]').length === 50, '7יא · התור נחתך לתקרה');
  const q2 = JSON.parse(env2.store['x_log_queue']);
  eq(q2[q2.length - 1].action, 'a59', '7יב · ונשמרים החדשים ולא הישנים');
}

/* ══════════════════════════════════════════════════════════════════════════
   8 · ⛔ היומן אינו מפיל את המסלול שקרא לו
   ══════════════════════════════════════════════════════════════════════════ */
async function t8() {
  const env = makeEnv({});
  env.sb.BK_CFG = cfgKv(env, { device: () => { throw new Error('boom'); } });
  let threw = false;
  try { env.sb.logAction('a', null, 0, null); } catch (e) { threw = true; }
  ok(!threw, '8א · ⛔ קונפיגורציה שזורקת אינה מפילה את `logAction`');

  const env2 = makeEnv({});
  env2.sb.BK_CFG = null;
  let threw2 = false;
  try { env2.sb.logAction('a', null, 0, null); } catch (e) { threw2 = true; }
  ok(!threw2, '8ב · ⛔ וגם BK_CFG חסר לגמרי אינו מפיל');
  ok(!(await env2.sb.bkMaybeDaily()), '8ג · ולא את הגיבוי');
}

/* ══════════════════════════════════════════════════════════════════════════
   9 · «גובה לאחרונה» — התצוגה ב«מידע טכני»
   ══════════════════════════════════════════════════════════════════════════ */
async function t9() {
  const env = makeEnv({ kv: { k1: 'A', k2: 'B' } });
  env.sb.BK_CFG = cfgKv(env);
  eq(env.sb.bkLastAt(), 0, '9א · לפני גיבוי — 0');
  ok(/טרם גובה/.test(env.sb.bkStatusHTML()), '9ב · והתצוגה אומרת «טרם גובה»');
  await env.sb.bkMaybeDaily();
  ok(env.sb.bkLastAt() > 0, '9ג · אחרי גיבוי — חותמת אמיתית');
  ok(/גובה לאחרונה/.test(env.sb.bkStatusHTML()), '9ד · והתצוגה מציגה אותה');
  env.details.kids.length = 0;
  env.sb.bkStatusMount();
  eq(env.details.kids.length, 1, '9ה · ⛔ הרכיב נתלה בתוך «מידע טכני» ואינו עורך את הבלוק הקפוא');
}

/* ══════════════════════════════════════════════════════════════════════════
   10 · ⛔ כתיבה מקומית חסומה — הדגל לא נכתב, ואין הצהרת הצלחה שקרית
   ══════════════════════════════════════════════════════════════════════════ */
async function t10() {
  const env = makeEnv({ kv: { k1: 'A', k2: 'B' }, lsBlocked: true });
  env.sb.BK_CFG = cfgKv(env);
  const r = await env.sb.bkMaybeDaily();
  eq(r, true, '10א · הגיבוי לענן עצמו הצליח');
  eq(env.store['x_last_backup'], undefined, '10ב · ⛔ באחסון חסום הדגל אינו נכתב — הגיבוי יינסה שוב');
  eq(env.sb.bkLastAt(), 0, '10ג · ו«גובה לאחרונה» אינו מדווח מה שלא נשמר');
}

/* ══════════════════════════════════════════════════════════════════════════
   11 · חתימת התוכן — יציבה, רגישה, ואינה מתנגשת על שינוי קטן
   ══════════════════════════════════════════════════════════════════════════ */
async function t11() {
  const env = makeEnv({});
  env.sb.BK_CFG = cfgKv(env);
  const s = env.sb.bkSig;
  eq(s('abc'), s('abc'), '11א · דטרמיניסטית');
  ok(s('abc') !== s('abd'), '11ב · רגישה לשינוי תו');
  ok(s('ab') !== s('abc'), '11ג · ורגישה לאורך');
  eq(s(''), s(''), '11ד · ריק יציב');
  eq(env.sb.bkToday(), TODAY, '11ה · התאריך הוא UTC, כמו בשני המימושים הקודמים');
}

/* ── הרצה ──────────────────────────────────────────────────────────────── */
const tests = [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11];
for (const t of tests) {
  try { await t(); }
  catch (e) { failN++; console.error(`❌ ${t.name} זרקה: ${e && e.stack || e}`); }
}
console.log(`\n[${APP.app}] שלב א — ${passN} עברו, ${failN} נכשלו`);
process.exit(failN ? 1 : 0);
