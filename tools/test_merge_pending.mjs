#!/usr/bin/env node
/*  test_merge_pending.mjs — מנוע המיזוג: הליבה המשותפת והגנת ה-⏳
 *  (סבב 72: מוזג).
 *
 *  **מה נאכף:** (א) הגנת ה-⏳ — רשומה מקומית מסומנת מנצחת במיזוג ללא
 *  תלות בחותמת, והיא נחשבת תמיד «לדחיפה»; (ב) הליבה המשותפת קיימת
 *  ב-`index.html`, וכלל ההכרעה מופיע בה **פעם אחת בלבד**; (ג) שובר
 *  השוויון (ענן מנצח), שרידת רשומה מקומית-בלבד, וידיות המדיניות
 *  שהמעטפת מעבירה לליבה.
 *
 *  **הנימוק המדוד:** ארבעה עותקים של כלל הכרעה הם ארבע הזדמנויות
 *  שאחד מהם ייסחף — ⚠️ ההגנה על ⏳ אכן הייתה קיימת בשתיים מארבע במשך
 *  שמונה-עשר סבבים. ⛔ ומאותה סיבה בדיוק אין טעם בשני שערים על אותו
 *  מנוע: שניהם חותכים את אותן פונקציות ומריצים אותן באותה רתמה.
 *
 *  **מה יישבר בלעדיו:** עריכה מקומית שטרם עלתה לענן נדרסת בשקט ע"י
 *  גרסה שמכשיר אחר דחף אחריה — ⛔ אובדן נתונים בלי שום סימן.
 *
 *  **מה אינו נאכף כאן:** ⛔ שהאיחוד לא שינה התנהגות — זו נמדדה פעם אחת
 *  בדיפרנציאל של 125,000 מקרים מול המימוש שהוחלף, ⚠️ והמימוש הישן אינו
 *  קיים עוד בעץ ואי אפשר להריץ אותה מחדש.
 *
 *  הקובץ מריץ את **מנוע המיזוג האמיתי** (נחתך מ-`index.html` בהתאמת
 *  סוגריים) ברתמת `vm`. זהה בית-לבית בארבעת הריפו פרט לבלוק `APP`.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

/* ── APP — הדבר היחיד שנבדל בין הריפו (schar-limud) ────────────────────── */
const APP = {
  app: 'schar-limud',
  names: ['slTs', 'slKey', '_mergePick', 'mergeCore', 'slMerge'],
  vars: [],
  globals: {},
  offlineFn: 'slVerifyOffline',
  // ⭐ סבב 38 — כלל ההכרעה עבר לליבה המשותפת, ולכן גם המוטציה מכוונת
  //    לשם. ⛔ הטענה לא נחלשה: היא עדיין דורשת שהסרת סעיף ה-⏳ תפיל את
  //    טענת הבסיס — רק שעכשיו זה קורה **בארבע האפליקציות בבת אחת**.
  mutFn: '_mergePick',
  guard: /isPend \|\| tsOf\(loc\) > tsOf\(rem\)/,
  mutate: (fn) => fn.replace('isPend || tsOf(loc) > tsOf(rem)', 'tsOf(loc) > tsOf(rem)'),
  rec: (id, ts, tag) => ({ client_id: id, updated_at: new Date(ts * 1000).toISOString(), name: tag }),
  keyOf: (r) => r.client_id,
  tag: (r) => r && r.name,
  pendKey: (id) => 'c:' + id,
  merge: (sb, local, remote) => sb.slMerge(local, remote, (k) => sb.pendIs(k), sb.slKey),
  /*  ⭐ שכבת ליבת המיזוג (סבב 72) — ⚠️ השמות, המעטפת והרשומה נבדלים
   *  מאלה שמעליהם, ⛔ ולכן הם יושבים בקבוצה משלהם ואינם מתמזגים בהם. */
  core: {
    app: 'schar-limud',
    names: ['slTs', 'slKey', '_mergePick', 'mergeCore', 'slMerge'],
    globals: {},
    wrapFn: 'slMerge',
    // ⛔ `dedupe: false` — ⚠️ **וזו הידית החשובה כאן, כי מדובר בכסף** (סבב 38):
    //    איחוד היה מכווץ שתי שורות כספיות לאחת, בשקט.
    knobs: ['dedupe: false', "keyless: 'keep-remote'", "localPick: 'last'"],
    knobFlip: 'dedupe: true',
    rec: (id, ts, tag) => ({ client_id: id, updated_at: new Date(ts * 1000).toISOString(), name: tag }),
    tag: (r) => r && r.name,
    merge: (sb, local, remote, pend) =>
      sb.slMerge(local, remote, (k) => pend.indexOf(String(k).replace('c:', '')) !== -1, sb.slKey),
    dupCase: { l: [], r: [{ client_id: 'a', updated_at: new Date(5000).toISOString(), name: 'ראשון' },
                          { client_id: 'a', updated_at: new Date(9000).toISOString(), name: 'שני' }] },
  },
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

/* ── 1 · ההגנה כתובה בקוד ──────────────────────────────────────────────── */
const FN = cut(APP.mutFn, SRC);
assert(APP.guard.test(FN),
  '1 · ⛔ סעיף ה-⏳ קיים ב-' + APP.mutFn + '() — רשומה מסומנת מנצחת ללא תלות בחותמת');

/* ── 2 · ההתנהגות ──────────────────────────────────────────────────────── */
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

/* ── 3 · המוטציה — הסרת ההגנה חייבת להיתפס ─────────────────────────────── */
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
   4 · חסימת משתמש מושבת בכניסה אופליין (שורה 25 במטריצה)
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
   *  הבדיקה מודדת משהו אחר — מוטציה שאינה מפילה אינה מוכיחה דבר.        */
  const OFN = cut(APP.offlineFn, SRC);
  const OMUT = OFN.replace(/\s*\|\|\s*\w+\.active !== true/, '');
  assert(OMUT !== OFN, '7ג · המוטציה מצאה את סעיף ה-active והסירה אותו');
  let caught7 = false;
  try { caught7 = (await runVerify(SRC.replace(OFN, OMUT), OFF)) !== 'bad'; }
  catch (e) { caught7 = true; }
  assert(caught7,
    '7ד · ⛔ מוטציה שמסירה את בדיקת ה-active מפילה את טענה 7א — משתמש מושבת היה נכנס');
}


/* ══ ליבת המיזוג המשותפת (סבב 72: מוזג לכאן) ═════════════════════════════ */
/*  ⛔ סביבה נפרדת משל הגנת ה-⏳ (סבב 72) — ⚠️ רשימת השמות והמעטפת
 *  נבדלות, ⛔ ורתמה אחת לשתיהן הייתה מריצה כאן קוד שאינו נחתך שם. */
const C = APP.core;
function coreBuild(src) {
  const ctx = Object.assign({ console, Number, String, Array, Object, isFinite, Date, JSON, Math },
                            C.globals || {});
  vm.createContext(ctx);
  vm.runInContext(C.names.map((x) => cut(x, src)).join('\n'), ctx);
  return ctx;
}
const sb = coreBuild(SRC);
const T = (r) => JSON.stringify((r || []).map(C.tag));

console.log('· ליבת המיזוג המשותפת (' + APP.app + ')');

/* ── 4 · הבלוק המשותף ──────────────────────────────────────────────────── */
assert(SRC.indexOf('/* ═══ מיזוג רשומות — מודול משותף (סבב 38)') !== -1,
  '1 · הבלוק המשותף קיים ב-index.html');
assert(SRC.indexOf('/* ═══════════════ סוף מודול המיזוג') !== -1,
  '2 · וסמן הסגירה שלו קיים');
assert(/function\s+_mergePick\s*\(/.test(SRC) && /function\s+mergeCore\s*\(/.test(SRC),
  '3 · שתי הפונקציות מוגדרות');
{
  // ⛔ כלל ההכרעה יושב **פעם אחת** — שכפול שלו הוא בדיוק הכשל שהאיחוד בא
  //    למנוע, ולכן הוא נספר ולא רק נמצא.
  const n = (SRC.match(/isPend \|\| tsOf\(loc\) > tsOf\(rem\)/g) || []).length;
  assert(n === 1, '4 · ⛔ כלל ההכרעה מופיע בקוד פעם אחת בלבד (נמצא ' + n + ')');
}

/* ── 5 · כלל ההכרעה ────────────────────────────────────────────────────── */
const ts = (x) => x.t;
const L = { t: 10, n: 'מקומי' }, R = { t: 20, n: 'ענן' };
assert(sb._mergePick(L, R, 'k', true, ts, null) === L,
  '5 · ⭐ מסומן ⏳ מנצח גם כשחותמתו **ישנה יותר**');
assert(sb._mergePick(L, R, 'k', false, ts, null) === R,
  '6 · בלי סימון — החדש מנצח');
assert(sb._mergePick({ t: 30 }, { t: 20 }, 'k', false, ts, null).t === 30,
  '7 · מקומי חדש יותר מנצח');
assert(sb._mergePick({ t: 20, n: 'l' }, { t: 20, n: 'r' }, 'k', false, ts, null).n === 'r',
  '8 · ⛔ שוויון → הענן (שובר-שוויון דטרמיניסטי)');
{
  let got = null;
  const pair = (a, b, k, p) => { got = { a: a.n, b: b.n, k: k, p: p }; return a; };
  sb._mergePick(L, R, 'kk', true, ts, pair);
  assert(got && got.a === 'מקומי' && got.b === 'ענן' && got.k === 'kk' && got.p === true,
    '9 · `mergePair` מקבל את ההכרעה כפרמטר ואת שני הצדדים בסדר (מקומי, ענן)');
}

/* ── 6 · שלושת כללי ברזל 6, דרך המעטפת האמיתית ─────────────────────────── */
{
  const out = C.merge(sb, [C.rec('a', 5, 'מקומי-ישן')], [C.rec('a', 9, 'ענן-חדש')], ['a']);
  assert(T(out) === JSON.stringify(['מקומי-ישן']),
    '10 · ⭐ דרך המעטפת: מסומן ⏳ מנצח ענן חדש יותר');
}
{
  const out = C.merge(sb, [C.rec('a', 5, 'מקומי')], [C.rec('a', 9, 'ענן')], []);
  assert(T(out) === JSON.stringify(['ענן']),
    '11 · ⚠️ בלי סימון — ההגנה צרה ואינה דורסת LWW');
}
{
  const out = C.merge(sb, [C.rec('b', 5, 'רק-מקומי')], [C.rec('a', 9, 'ענן')], []);
  assert(T(out).indexOf('רק-מקומי') !== -1,
    '12 · ⛔ רשומה מקומית-בלבד שורדת — היעדרות אינה מחיקה');
}

/* ── 7 · ידיות המדיניות — נמדדות מהמעטפת ───────────────────────────────── */
{
  const w = cut(C.wrapFn, SRC);
  assert(/mergeCore\(/.test(w), '13 · המעטפת קוראת לליבה');
  C.knobs.forEach((k, i) => assert(w.indexOf(k) !== -1,
    '14.' + (i + 1) + ' · ידית מדיניות כמתועד: `' + k + '`'));
}

/* ── 8 · מוטציות הליבה ─────────────────────────────────────────────────── */
console.log('  — מוטציות —');
{
  const mut = coreBuild(SRC.replace('isPend || tsOf(loc) > tsOf(rem)', 'tsOf(loc) > tsOf(rem)'));
  assert(mut._mergePick(L, R, 'k', true, ts, null) === R,
    '15 · מוטציה: הסרת סעיף ה-⏳ מפילה את טענה 5');
  const out = C.merge(mut, [C.rec('a', 5, 'מקומי-ישן')], [C.rec('a', 9, 'ענן-חדש')], ['a']);
  assert(T(out) === JSON.stringify(['ענן-חדש']),
    '16 · ⛔ ובמוטנט העריכה שטרם עלתה נדרסת — טענה 10 הייתה נכשלת');
}
{
  const mut = coreBuild(SRC.replace('isPend || tsOf(loc) > tsOf(rem)', 'isPend || tsOf(loc) >= tsOf(rem)'));
  assert(mut._mergePick({ t: 20, n: 'l' }, { t: 20, n: 'r' }, 'k', false, ts, null).n === 'l',
    '17 · מוטציה: היפוך שובר-השוויון מפיל את טענה 8');
}
{
  const w = cut(C.wrapFn, SRC);
  const flipped = w.replace(C.knobs[0], C.knobFlip);
  assert(flipped !== w, '18 · מוטציית ידית המדיניות שינתה את המעטפת בפועל');
  const mut = coreBuild(SRC.replace(w, flipped));
  const before = T(C.merge(sb, C.dupCase.l, C.dupCase.r, []));
  const after = T(C.merge(mut, C.dupCase.l, C.dupCase.r, []));
  assert(before !== after,
    '19 · ⛔ היפוך `' + C.knobs[0] + '` משנה את התוצאה — הידית אמיתית ולא קישוט' +
    ' (' + before + ' → ' + after + ')');
}

console.log(failed ? `\n✗ סבב 72 (מנוע המיזוג) — ${failed} טענות נכשלו`
                   : '\n✓ סבב 72 (מנוע המיזוג — ליבה והגנת ⏳) — כל הטענות עברו');
process.exit(failed ? 1 : 0);
