#!/usr/bin/env node
/*  test_round37_merge_pending.mjs — סבב 37: הגנת ה-⏳ במנוע המיזוג.
 *
 *  כלל ברזל 6 קובע ש**רשומה מקומית מסומנת ⏳ מנצחת במיזוג ללא תלות
 *  בחותמת**, ושהיא נחשבת תמיד «לדחיפה». עד סבב 37 הכלל היה מיושם בשני
 *  מקומות בלבד מארבעה: `slMerge` ב-schar-limud ו-`mergeRows` ב-gius.
 *  ב-yoman וב-hanhala המיזוג הכריע לפי חותמת בלבד — כלומר עריכה מקומית
 *  שטרם עלתה לענן נדרסה בשקט ע"י גרסה שמכשיר אחר דחף אחריה.
 *
 *  הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו. הוא מריץ את
 *  **מנוע המיזוג האמיתי** (נחתך מ-`index.html` בהתאמת סוגריים) ברתמת `vm`,
 *  ומסיים במוטציה: הסרת סעיף ה-⏳ חייבת להפיל טענה.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

/* ── APP — הדבר היחיד שנבדל בין הריפו (schar-limud) ────────────────────── */
const APP = {
  app: 'schar-limud',
  names: ['slTs', 'slKey', 'slMerge'],
  vars: [],
  globals: {},
  offlineFn: 'slVerifyOffline',
  mutFn: 'slMerge',
  guard: /\(isPending && isPending\(k\)\) \|\| slTs\(l\) > slTs\(r\)/,
  mutate: (fn) => fn.replace('(isPending && isPending(k)) || slTs(l) > slTs(r)', 'slTs(l) > slTs(r)'),
  rec: (id, ts, tag) => ({ client_id: id, updated_at: new Date(ts * 1000).toISOString(), name: tag }),
  keyOf: (r) => r.client_id,
  tag: (r) => r && r.name,
  pendKey: (id) => 'c:' + id,
  merge: (sb, local, remote) => sb.slMerge(local, remote, (k) => sb.pendIs(k), sb.slKey),
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'index.html'), 'utf8');

let failed = 0;
const ok = (m) => console.log('  ok   ' + m);
const bad = (m) => { failed++; console.error('  FAIL ' + m); };
const assert = (cond, m) => (cond ? ok(m) : bad(m));

/* ── חיתוך פונקציה מהמקור לפי שם, בהתאמת סוגריים ───────────────────────── */
function cut(name, src) {
  const re = new RegExp('\\n(async )?function ' + name + '\\s*\\(', 'g');
  const m = re.exec(src);
  if (!m) throw new Error('הפונקציה ' + name + ' לא נמצאה ב-index.html');
  const start = m.index + 1;
  let i = src.indexOf('{', m.index + m[0].length - 1), d = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') { d--; if (!d) return src.slice(start, i + 1); }
  }
  throw new Error('הפונקציה ' + name + ' אינה סגורה');
}
/*  ⚠️ ההצהרה נחתכת עד ה-`;` שברמת העומק 0 ולא עד סוף השורה — `PEND_KV_PREFIX`
 *  בהנהלה משתרעת על ארבע שורות, וחיתוך לפי שורה היה מחזיר `{` לבדו. */
function cutVar(decl, src) {
  const i = src.indexOf('\n' + decl);
  if (i < 0) throw new Error('ההצהרה «' + decl + '» לא נמצאה');
  let d = 0, q = '';
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = ''; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{' || c === '[' || c === '(') d++;
    else if (c === '}' || c === ']' || c === ')') d--;
    else if (c === ';' && d === 0) return src.slice(i + 1, j + 1);
  }
  throw new Error('ההצהרה «' + decl + '» אינה נסגרת');
}

/*  רתמה: מריצה את מנוע המיזוג האמיתי בהקשר נקי. `pending` היא קבוצת
 *  המפתחות המסומנים ⏳, ו-`pendHas` שבסביבה קוראת ממנה — בדיוק כפי
 *  שהמודול המשותף עושה מול localStorage.                                */
function harness(src, pending) {
  const set = pending || new Set();
  const sandbox = {
    console, JSON, Date, Math, String, Number, Array, Object, Boolean,
    isFinite, parseInt, parseFloat, Promise, RegExp, Error,
    pendHas: (k) => set.has(k),
    pendIs: (k) => set.has(k),
  };
  Object.assign(sandbox, APP.globals || {});
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const v of (APP.vars || [])) vm.runInContext(cutVar(v, src), sandbox);
  for (const n of APP.names) vm.runInContext(cut(n, src), sandbox, { filename: n + '.js' });
  // ⚠️ פונקציית הכניסה האופליין נחתכת גם היא (סבב 37) — הצהרת פונקציה אינה
  //    מריצה את הגוף, ולכן העוזרים שהיא קוראת להם (גזירת PBKDF2) אינם
  //    נדרשים בסביבה כל עוד הבדיקה עוצרת לפניהם.
  if (APP.offlineFn) vm.runInContext(cut(APP.offlineFn, src), sandbox, { filename: APP.offlineFn + '.js' });
  return sandbox;
}

/*  שלושה תרחישים, כולם על אותו מפתח `1`:
 *    · מקומי ישן ומסומן ⏳  מול ענן חדש  ⇒ המקומי חייב לנצח.
 *    · מקומי ישן **בלי** סימון מול ענן חדש ⇒ הענן מנצח (ההגנה צרה).
 *    · מקומי חדש בלי סימון מול ענן ישן ⇒ המקומי מנצח (התנהגות שלא השתנתה).
 *  ובנוסף: רשומה שקיימת רק מקומית שורדת תמיד — היעדר אצל הצד השני אינו
 *  מחיקה, וזה הכלל שאסור שההגנה החדשה תשבור.                             */
function scenario(src, marked) {
  const sb = harness(src, marked ? new Set([APP.pendKey('1')]) : new Set());
  const local = [APP.rec('1', 100, 'LOCAL'), APP.rec('2', 100, 'ONLY-LOCAL')];
  const remote = [APP.rec('1', 900, 'CLOUD')];
  const out = APP.merge(sb, local, remote);
  const byKey = {};
  out.forEach((r) => { byKey[String(APP.keyOf(r))] = r; });
  return { out, one: byKey['1'], two: byKey['2'] };
}

console.log('· ' + APP.app + ' — סבב 37: הגנת ⏳ במנוע המיזוג');

/* ── 1 · ההגנה כתובה בקוד ─────────────────────────────────────────────── */
const FN = cut(APP.mutFn, SRC);
assert(APP.guard.test(FN),
  '1 · ⛔ סעיף ה-⏳ קיים ב-' + APP.mutFn + '() — רשומה מסומנת מנצחת ללא תלות בחותמת');

/* ── 2 · ההתנהגות ─────────────────────────────────────────────────────── */
const marked = scenario(SRC, true);
assert(marked.one && APP.tag(marked.one) === 'LOCAL',
  '2א · ⭐ מקומי מסומן ⏳ עם חותמת **ישנה יותר** מנצח את הענן');
assert(!!marked.two,
  '2ב · ⛔ ורשומה מקומית-בלבד שורדת — היעדר אצל הצד השני אינו מחיקה');

const plain = scenario(SRC, false);
assert(plain.one && APP.tag(plain.one) === 'CLOUD',
  '3 · ⚠️ בלי סימון — הענן החדש יותר מנצח, כלומר ההגנה צרה ואינה דורסת LWW');

const newerLocal = (() => {
  const sb = harness(SRC, new Set());
  const out = APP.merge(sb, [APP.rec('1', 900, 'LOCAL')], [APP.rec('1', 100, 'CLOUD')]);
  return out[0];
})();
assert(APP.tag(newerLocal) === 'LOCAL',
  '4 · מקומי חדש יותר בלי סימון ממשיך לנצח (התנהגות שלא נגעה)');

const tie = (() => {
  const sb = harness(SRC, new Set());
  const out = APP.merge(sb, [APP.rec('1', 500, 'LOCAL')], [APP.rec('1', 500, 'CLOUD')]);
  return out[0];
})();
assert(APP.tag(tie) === 'CLOUD',
  '5 · שובר-השוויון נשאר דטרמיניסטי — בשוויון הענן מנצח');

/* ── 3 · המוטציה — הסרת ההגנה חייבת להיתפס ────────────────────────────── */
const MUT = SRC.replace(FN, APP.mutate(FN));
assert(MUT !== SRC, '6א · המוטציה שינתה את המקור בפועל');
let caught = false;
try {
  const sb = harness(MUT, new Set([APP.pendKey('1')]));
  const out = APP.merge(sb, [APP.rec('1', 100, 'LOCAL')], [APP.rec('1', 900, 'CLOUD')]);
  caught = APP.tag(out[0]) !== 'LOCAL';
} catch (e) { caught = true; }
assert(caught,
  '6ב · ⛔ מוטציה שמסירה את סעיף ה-⏳ מפילה את טענה 2א — ההגנה נאכפת ולא מוצהרת');

/* ══════════════════════════════════════════════════════════════════════════
   4 · חסימת משתמש מושבת בכניסה אופליין (שורה 24 במטריצה)
   ══════════════════════════════════════════════════════════════════════════
   ⚠️ הבדיקה נמנעת מ-PBKDF2 בכוונה: משתמש **בלי** טביעה מחזיר `'no-fp'`
   כשאין הגנה, ו-`'bad'` כשההגנה קיימת — כלומר ההבדל בין שתי ההתנהגויות
   נמדד בלי לגזור מפתח ובלי לתלות את הבדיקה ב-`crypto.subtle`.
   ══════════════════════════════════════════════════════════════════════════ */
if (!APP.offlineFn) {
  ok('7 · «לא רלוונטי» — אין כאן כניסה, אין משתמשים ואין מה לחסום');
} else {
  const runVerify = async (src, user) => {
    const sb = harness(src, new Set());
    return await sb[APP.offlineFn](user, 'x');
  };
  const OFF = { username: 'x', active: false };   // מושבת, ובלי טביעה
  const ON = { username: 'x', active: true };     // פעיל, ובלי טביעה

  const guarded = await runVerify(SRC, OFF);
  assert(guarded === 'bad',
    '7א · ⭐ משתמש מושבת נחסם אופליין — ' + APP.offlineFn + '() החזירה ' + guarded);
  const live = await runVerify(SRC, ON);
  assert(live === 'no-fp',
    '7ב · ⚠️ ומשתמש פעיל אינו נחסם — הבדיקה חוסמת השבתה ולא היעדר טביעה (' + live + ')');

  /*  המוטציה: הסרת סעיף ה-`active` בלבד. ⛔ אם היא אינה מפילה את 7א,
   *  הבדיקה מודדת משהו אחר.                                              */
  const OFN = cut(APP.offlineFn, SRC);
  const OMUT = OFN.replace(/\s*\|\|\s*\w+\.active !== true/, '');
  assert(OMUT !== OFN, '7ג · המוטציה מצאה את סעיף ה-active והסירה אותו');
  let caught7 = false;
  try { caught7 = (await runVerify(SRC.replace(OFN, OMUT), OFF)) !== 'bad'; }
  catch (e) { caught7 = true; }
  assert(caught7,
    '7ד · ⛔ מוטציה שמסירה את בדיקת ה-active מפילה את טענה 7א — משתמש מושבת היה נכנס');
}

console.log(failed ? `\n✗ סבב 37 — ${failed} טענות נכשלו` : '\n✓ סבב 37 — כל הטענות עברו');
process.exit(failed ? 1 : 0);
