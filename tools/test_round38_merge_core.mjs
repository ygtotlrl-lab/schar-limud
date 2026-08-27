#!/usr/bin/env node
/*  test_round38_merge_core.mjs — סבב 38: ליבת המיזוג המשותפת.
 *
 *  עד סבב 38 חיו כאן ארבעה מנועי מיזוג נפרדים שמימשו את אותם שלושה כללים
 *  של כלל ברזל 6. ⛔ וזו בדיוק הסיבה שההגנה על ⏳ הייתה קיימת בשתיים
 *  מארבע במשך שמונה-עשר סבבים: ארבעה עותקים של כלל הכרעה הם ארבע
 *  הזדמנויות שאחד מהם ייסחף. מעכשיו הכלל יושב ב-`_mergePick` בלבד.
 *
 *  הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו. הוא מריץ את
 *  **הליבה והמעטפת האמיתיות** (נחתכות מ-`index.html`) ברתמת `vm`.
 *
 *  ⚠️ מה שהבדיקה הזו **אינה**: הוכחה שהאיחוד לא שינה התנהגות. זו נמדדה
 *  פעם אחת, בדיפרנציאל של 125,000 מקרים מול המימוש שהוחלף (`git HEAD`),
 *  ונרשמה כמדידה בפרק הסבב — ⛔ ולא כשער (כלל ברזל 8 סעיף 6), מפני
 *  שהמימוש הישן אינו קיים עוד בעץ ואי אפשר להריץ אותה מחדש.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

/* ── APP — הדבר היחיד שנבדל בין הריפו (schar-limud) ────────────────────── */
const APP = {
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
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'index.html'), 'utf8');

let failed = 0;
const ok = (m) => console.log('  ok   ' + m);
const bad = (m) => { failed++; console.error('  FAIL ' + m); };
const assert = (c, m) => (c ? ok(m) : bad(m));

function cut(name, src) {
  const re = new RegExp('\\n(async )?function ' + name + '\\s*\\(', 'g');
  const m = re.exec(src);
  if (!m) throw new Error('הפונקציה ' + name + ' לא נמצאה');
  const start = m.index + 1;
  let i = src.indexOf('{', m.index + m[0].length - 1), d = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') { d--; if (!d) return src.slice(start, i + 1); }
  }
  throw new Error('הפונקציה ' + name + ' אינה סגורה');
}
function build(src) {
  const ctx = Object.assign({ console, Number, String, Array, Object, isFinite, Date, JSON, Math },
                            APP.globals || {});
  vm.createContext(ctx);
  vm.runInContext(APP.names.map((n) => cut(n, src)).join('\n'), ctx);
  return ctx;
}
const sb = build(SRC);
const T = (r) => JSON.stringify((r || []).map(APP.tag));

console.log('· סבב 38 — ליבת המיזוג המשותפת (' + APP.app + ')');

/* ── א. הבלוק המשותף ───────────────────────────────────────────────────── */
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

/* ── ב. כלל ההכרעה ─────────────────────────────────────────────────────── */
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

/* ── ג. שלושת כללי ברזל 6, דרך המעטפת האמיתית ──────────────────────────── */
{
  const out = APP.merge(sb, [APP.rec('a', 5, 'מקומי-ישן')], [APP.rec('a', 9, 'ענן-חדש')], ['a']);
  assert(T(out) === JSON.stringify(['מקומי-ישן']),
    '10 · ⭐ דרך המעטפת: מסומן ⏳ מנצח ענן חדש יותר');
}
{
  const out = APP.merge(sb, [APP.rec('a', 5, 'מקומי')], [APP.rec('a', 9, 'ענן')], []);
  assert(T(out) === JSON.stringify(['ענן']),
    '11 · ⚠️ בלי סימון — ההגנה צרה ואינה דורסת LWW');
}
{
  const out = APP.merge(sb, [APP.rec('b', 5, 'רק-מקומי')], [APP.rec('a', 9, 'ענן')], []);
  assert(T(out).indexOf('רק-מקומי') !== -1,
    '12 · ⛔ רשומה מקומית-בלבד שורדת — היעדרות אינה מחיקה');
}

/* ── ד. ידיות המדיניות — נמדדות מהמעטפת ────────────────────────────────── */
{
  const w = cut(APP.wrapFn, SRC);
  assert(/mergeCore\(/.test(w), '13 · המעטפת קוראת לליבה');
  APP.knobs.forEach((k, i) => assert(w.indexOf(k) !== -1,
    '14.' + (i + 1) + ' · ידית מדיניות כמתועד: `' + k + '`'));
}

/* ── ה. מוטציות ────────────────────────────────────────────────────────── */
console.log('  — מוטציות —');
{
  const mut = build(SRC.replace('isPend || tsOf(loc) > tsOf(rem)', 'tsOf(loc) > tsOf(rem)'));
  assert(mut._mergePick(L, R, 'k', true, ts, null) === R,
    '15 · מוטציה: הסרת סעיף ה-⏳ מפילה את טענה 5');
  const out = APP.merge(mut, [APP.rec('a', 5, 'מקומי-ישן')], [APP.rec('a', 9, 'ענן-חדש')], ['a']);
  assert(T(out) === JSON.stringify(['ענן-חדש']),
    '16 · ⛔ ובמוטנט העריכה שטרם עלתה נדרסת — טענה 10 הייתה נכשלת');
}
{
  const mut = build(SRC.replace('isPend || tsOf(loc) > tsOf(rem)', 'isPend || tsOf(loc) >= tsOf(rem)'));
  assert(mut._mergePick({ t: 20, n: 'l' }, { t: 20, n: 'r' }, 'k', false, ts, null).n === 'l',
    '17 · מוטציה: היפוך שובר-השוויון מפיל את טענה 8');
}
{
  const w = cut(APP.wrapFn, SRC);
  const flipped = w.replace(APP.knobs[0], APP.knobFlip);
  assert(flipped !== w, '18 · מוטציית ידית המדיניות שינתה את המעטפת בפועל');
  const mut = build(SRC.replace(w, flipped));
  const before = T(APP.merge(sb, APP.dupCase.l, APP.dupCase.r, []));
  const after = T(APP.merge(mut, APP.dupCase.l, APP.dupCase.r, []));
  assert(before !== after,
    '19 · ⛔ היפוך `' + APP.knobs[0] + '` משנה את התוצאה — הידית אמיתית ולא קישוט' +
    ' (' + before + ' → ' + after + ')');
}

console.log((failed ? '✗' : '✓') + ` סבב 38 (ליבת המיזוג) — ${failed ? '' : 'כל ה'}טענות ${failed ? 'לא ' : ''}עברו`);
process.exit(failed ? 1 : 0);
