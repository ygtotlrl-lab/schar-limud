#!/usr/bin/env node
/*  סבב 42ג — ליבת ה-service worker: החתימה, הפרמטרים, ושלושת הליקויים.
 *
 *  ⭐ הקובץ הזה **זהה בית-לבית בארבעת הריפו** פרט לבלוק `APP` שבראשו.
 *
 *  ⚠️ מה שהוא אוכף, ומה שהוא **אינו** אוכף:
 *  ה-**התנהגות** של ה-service worker נאכפת ב-`tools/test_round42_sw.mjs`
 *  — רתמת קו-הבסיס, שמריצה את ה-`sw.js` האמיתי ומשווה ארבעה-עשר
 *  תרחישים. ⛔ הקובץ הזה אינו מכפיל אותה: הוא אוכף את **הליבה** (חתימה
 *  ומבנה), את **הפרמטרים** (`SW_CFG` — ידיות המדיניות שנמדדו בסבב 40),
 *  ו**שהתיקונים באמת מוגנים** — כל אחד עם מוטציה שמפילה את הרתמה.
 *
 *  ⛔ המוטציות רצות על **עותק** בתיקייה זמנית ולא על העץ (סבב 42ג) —
 *  מוטציה שנכתבת לקובץ האמיתי ומוחזרת ב-`finally` מותירה את הריפו שבור
 *  אם התהליך נהרג באמצע.
 */
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /*  ⚠️ ידיות המדיניות **נמדדו בסבב 40 ונשמרו** — ⛔ אינן ברירת מחדל
   *  שנפלה מאליה, ואין לשנות אף אחת מהן «לשם אחידות» (סבב 42ג).
   *  ⭐ דף האופליין כאן **נוצר בסבב 42ג** — עד אז לא היה כזה כלל. */
  cfg: {
    prefix: "'schar-limud-'",
    scoped: 'false',
    navFallback: "'request'",
    navIgnoreSearch: 'false',
    subStrategy: "'network-first'",
    subMiss: "'error'",
    offlineStatus: '503',
    skipWaiting: 'true',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⭐ החתימה, מספר השורות והסמנים — זהים בארבעת הריפו. */
const CORE_SHA = '7bdea85555a99662';
const CORE_LINES = 255;
const START = '/* ═══ מודול ה-service worker — מודול משותף (סבב 42ג)';
const END = '/* ═══════════════ סוף מודול ה-service worker';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SW_PATH = join(ROOT, 'sw.js');
const HARNESS = join(ROOT, 'tools', 'test_round42_sw.mjs');
const SRC = fs.readFileSync(SW_PATH, 'utf8');

let n = 0, bad = 0;
const is = (cond, msg) => {
  n++;
  if (cond) console.log(`  ok   ${n} · ${msg}`);
  else { bad++; console.error(`  FAIL ${n} · ${msg}`); }
};

/* ── א. הליבה ──────────────────────────────────────────────────────────── */
function core(src) {
  const i = src.indexOf(START);
  if (i < 0) return null;
  const j = src.indexOf(END, i);
  if (j < 0) return null;
  const k = src.indexOf('*/', j);
  if (k < 0) return null;
  return src.slice(i, k + 2);
}
const CORE = core(SRC);
is(!!CORE, 'הבלוק המשותף נמצא ב-sw.js (סמן פתיחה וסגירה)');
const sha = CORE ? crypto.createHash('sha256').update(CORE).digest('hex').slice(0, 16) : '—';
is(sha === CORE_SHA, `הליבה זהה לחתימה הקנונית (${CORE_SHA}) — נמדד ${sha}`);
is(CORE ? CORE.split('\n').length === CORE_LINES : false,
   `הליבה בת ${CORE_LINES} שורות`);

/*  ⛔ מוטציה 1 — בית אחד בליבה מזיז את החתימה. זה מה שהופך את
 *  `check-capabilities.mjs` לשער אמיתי ולא להצהרה. */
is(CORE
   ? crypto.createHash('sha256').update(CORE.replace('swStore', 'swStorX'))
       .digest('hex').slice(0, 16) !== CORE_SHA
   : false,
   '⛔ מוטציה: שינוי בית אחד בליבה מזיז את החתימה — check-capabilities היה נכשל');

/* ── ב. הפרמטרים ───────────────────────────────────────────────────────── */
const cfgAt = SRC.indexOf('var SW_CFG = {');
is(cfgAt >= 0, 'SW_CFG מוגדר ב-sw.js');
is(cfgAt >= 0 && CORE ? cfgAt < SRC.indexOf(START) : false,
   '⛔ SW_CFG יושב **מעל** הליבה — ליבה בלי פרמטרים אינה מודול');
const cfgBlock = cfgAt >= 0 ? SRC.slice(cfgAt, SRC.indexOf('};', cfgAt) + 2) : '';
for (const [k, v] of Object.entries(APP.cfg)) {
  const m = new RegExp(`\\b${k}\\s*:\\s*([^,\\n]+)`).exec(cfgBlock);
  const got = m ? m[1].trim() : '—';
  is(got === v, `SW_CFG.${k} = ${v} (נמדד ${got})`);
}

/* ── ג. שלושת הליקויים — הצד הסטטי ─────────────────────────────────────── */
is(/if \(!res \|\| !res\.ok \|\| res\.status !== 200 \|\| res\.type === 'opaque'\) return;/
   .test(CORE || ''),
   '⛔ swStore שומרת אך ורק תשובה שאומתה (ok · 200 · לא opaque)');
is(/return first\.then\(function \(hit\) \{ return hit \|\| swOfflinePage\(\); \}\);/
   .test(CORE || ''),
   '⛔ מסלול הניווט האופליין מסתיים תמיד בתשובה תקפה — לעולם לא undefined');
is(/text\/html; charset=utf-8/.test(SRC),
   'דף האופליין מוגש עם Content-Type מפורש — בארבעתן, גם ב-schar');

/* ── ד. שלוש המוטציות ההתנהגותיות ──────────────────────────────────────── */
/*  ⚠️ כל מוטציה רצה על עותק בתיקייה זמנית, ומריצה את **רתמת קו-הבסיס
 *  האמיתית**. הצלחה = הרתמה נכשלה. ⛔ מוטציה שהרתמה עוברת עליה היא תיקון
 *  שאינו נאכף, וזו בדיוק הנקודה. */
function harnessFails(label, from, to) {
  if (!SRC.includes(from)) { is(false, `${label} — עוגן המוטציה לא נמצא ב-sw.js`); return; }
  const dir = fs.mkdtempSync(join(os.tmpdir(), 'sw42c-'));
  try {
    fs.mkdirSync(join(dir, 'tools'));
    fs.writeFileSync(join(dir, 'sw.js'), SRC.replace(from, to));
    fs.copyFileSync(HARNESS, join(dir, 'tools', 'test_round42_sw.mjs'));
    const r = spawnSync(process.execPath, [join(dir, 'tools', 'test_round42_sw.mjs')],
                        { encoding: 'utf8' });
    is(r.status !== 0, label);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

harnessFails(
  '⛔ מוטציה: ניווט אופליין בלי `|| swOfflinePage()` — respondWith(undefined) חוזר, והרתמה נופלת',
  'return first.then(function (hit) { return hit || swOfflinePage(); });',
  'return first;');

harnessFails(
  '⛔ מוטציה: swStore בלי בדיקת הסטטוס — תשובת 404 נשמרת במטמון, והרתמה נופלת',
  "if (!res || !res.ok || res.status !== 200 || res.type === 'opaque') return;",
  'if (!res) return;');

/*  ⚠️ העוגן נגזר מ-`SW_CFG.subMiss` (סבב 42ג) — ב-gius הענף שרץ בפועל הוא
 *  ה-504, ומוטציה על `Response.error()` הייתה שם **no-op**: מוטציה שאינה
 *  משנה את ההתנהגות אינה מוכיחה שהתיקון נאכף, היא רק נראית כאילו. */
const M3 = APP.cfg.subMiss === "'504'"
  ? ["  if (SW_CFG.subMiss === '504') return new Response('', { status: 504, statusText: 'Offline' });",
     "  if (SW_CFG.subMiss === '504') return swOfflinePage();"]
  : ['  try { return Response.error(); }',
     '  try { return swOfflinePage(); }'];
harnessFails(
  '⛔ מוטציה: תת-משאב חסר מקבל את דף האופליין — HTML בגוף תשובה של סקריפט, והרתמה נופלת',
  M3[0], M3[1]);

console.log(`\n${bad ? '✗' : '✓'} סבב 42ג (ליבת ה-service worker) — ${n - bad} טענות עברו, ${bad} נכשלו`);
process.exit(bad ? 1 : 0);
