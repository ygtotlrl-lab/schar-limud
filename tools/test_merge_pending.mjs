#!/usr/bin/env node
/*  test_merge_pending.mjs — מנוע המיזוג: הליבה המשותפת והגנת ה-⏳
 *  (סבב 72: מוזג).
 *
 *  **מה נאכף:** (א) כלל ההכרעה — החותמת החדשה מנצחת, ו-⏳ שובר שוויון
 *  ⛔ ואינו גובר על חותמת חדשה יותר; (ב) הליבה המשותפת קיימת
 *  ב-`index.html`, וכלל ההכרעה מופיע בה **פעם אחת בלבד**; (ג) שרידת
 *  רשומה מקומית-בלבד, וידיות המדיניות שהמעטפת מעבירה לליבה.
 *
 *  **הנימוק המדוד:** כל העותקים של כלל הכרעה הם הזדמנויות
 *  שאחד מהם ייסחף — ⚠️ ההגנה על ⏳ אכן הייתה קיימת בשתיים מהן במשך
 *  שמונה-עשר סבבים. ⛔ ומאותה סיבה בדיוק אין טעם בשני שערים על אותו
 *  מנוע: שניהם חותכים את אותן פונקציות ומריצים אותן באותה רתמה.
 *
 *  **מה יישבר בלעדיו:** ⏳ שמנצח תמיד מוחק עריכה מאוחרת יותר — ⚠️ א׳ ערך
 *  ב-08:00 ולא דחף, ב׳ ערך ב-10:00 וסנכרן, וא׳ עלה ב-14:00: ⛔ עריכת
 *  ה-10:00 נעלמת בלי שום סימן.
 *
 *  **מה אינו נאכף כאן:** ⛔ שהאיחוד לא שינה התנהגות — זו נמדדה פעם אחת
 *  בדיפרנציאל של 125,000 מקרים מול המימוש שהוחלף, ⚠️ והמימוש הישן אינו
 *  קיים עוד בעץ ואי אפשר להריץ אותה מחדש.
 *
 *  הקובץ מריץ את **מנוע המיזוג האמיתי** (נחתך מ-`index.html` בהתאמת
 *  סוגריים) ברתמת `vm`. זהה בית-לבית בכל הריפו פרט לבלוק `APP`.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { appSrc } from './appsrc.mjs';
import { whitenJs } from './whiten.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /*  ⛔ עידן הנתונים — ⚠️ **מה נכנס**: הבסיס שזהה בכל הריפו, העידן
   *  שבמקור, והנימוק להפרש; ⛔ **ומה מפיל**: עידן שאינו מה שבמקור,
   *  הפרש בלי נימוק, ⛔ ונימוק בלי הפרש. ⭐ **ולמה המבנה קיים**:
   *  קידום עידן מוחק עותק מקומי במכשירים חיים, ⛔ והוא נעשה רק כשצורת
   *  השורה השתנתה. */
  dataEra: { base: 1, era: 2, why: 'שכבת האימוץ ירדה בסבב 148 — ⚠️ ורשומת מראה שנכתבה לפניה נושאת שמות מזהים שאין להם קורא: ⭐ הצורה השתנתה, ⛔ והעותק המקומי נזרק פעם אחת' },
  names: ['slTs', 'slKey', 'tombStamp', 'prunePastTombstones', 'tombPruneMerged', '_mergePick', 'mergeCore', 'slMerge'],
  vars: ['var TOMBSTONE_TTL_MS = ', 'var _tombPrunePending = '],
  /*  ⛔ גלובלים שהארגז חול צריך מעבר לבדלים המשותפים — ⚠️ **מה נכנס**:
   *  שם ⟵ ערך. ⛔ **ומה מפיל**: הרצה שנופלת ב-`ReferenceError`.
   *  ⭐ **ולמה היא קיימת**: ליבת המיזוג נשענת על מודולים שאינם בה —
   *  ⛔ **וכאן אין צורך כזה**, ⚠️ וההצהרה ריקה ואינה נשמטת. */
  globals: {},
  offlineFn: 'slVerifyOffline',
  // ⭐ סבב 38 — כלל ההכרעה עבר לליבה המשותפת, ולכן גם המוטציה מכוונת
  //    לשם. ⛔ הטענה לא נחלשה: היא עדיין דורשת שהסרת סעיף ה-⏳ תפיל את
  //    טענת הבסיס — רק שעכשיו זה קורה **בכל האפליקציות בבת אחת**.
  mutFn: '_mergePick',
  guard: /tsOf\(loc\) === tsOf\(rem\) && isPend/,
  mutate: (fn) => fn.replace('tsOf(loc) === tsOf(rem) && isPend ? loc : rem', 'rem'),
  rec: (id, ts, tag) => ({ client_id: id, updated_at: ts * 1000, name: tag }),
  keyOf: (r) => r.client_id,
  tag: (r) => r && r.name,
  pendKey: (id) => 'c:' + id,
  merge: (sb, local, remote) => sb.slMerge(local, remote, (k) => sb.pendIs(k), sb.slKey),
  /*  ⭐ שכבת ליבת המיזוג (סבב 72) — ⚠️ השמות, המעטפת והרשומה נבדלים
   *  מאלה שמעליהם, ⛔ ולכן הם יושבים בקבוצה משלהם ואינם מתמזגים בהם. */
  core: {
    app: 'schar-limud',
    names: ['slTs', 'slKey', 'tombStamp', 'prunePastTombstones', 'tombPruneMerged', '_mergePick', 'mergeCore', 'slMerge'],
    vars: ['var TOMBSTONE_TTL_MS = ', 'var _tombPrunePending = '],
    globals: {},
    wrapFn: 'slMerge',
    // ⛔ `dedupe: false` — ⚠️ **וזו הידית החשובה כאן, כי מדובר בכסף** (סבב 38):
    //    איחוד היה מכווץ שתי שורות כספיות לאחת, בשקט.
    knobs: ['dedupe: false', "keyless: 'keep-remote'", "localPick: 'last'"],
    knobFlip: 'dedupe: true',
    rec: (id, ts, tag) => ({ client_id: id, updated_at: ts * 1000, name: tag }),
    tag: (r) => r && r.name,
    merge: (sb, local, remote, pend) =>
      sb.slMerge(local, remote, (k) => pend.indexOf(String(k).replace('c:', '')) !== -1, sb.slKey),
    dupCase: { l: [], r: [{ client_id: 'a', updated_at: 5000, name: 'ראשון' },
                          { client_id: 'a', updated_at: 9000, name: 'שני' }] },
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/*  ⛔ המקור הוא `index.html` **ומודולי הליבה** — ⚠️ מנוע המיזוג יצא
 *  למודול והעוטפים נשארו בקובץ: ⭐ שער שקורא צד אחד בלבד אינו מוצא
 *  את הצד השני. */
const SRC = appSrc(ROOT);

let failed = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 20, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות (סבב 119) — ⚠️ `null` הוא תהליך
 *  שלא הגיע לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה
 *  שמבדיל ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
const SUBRUN = !!process.env.GATE_SUBRUN;
/*  ⛔ הריצפה נמדדת בשני הכיוונים (סבב 118) — ⚠️ **מה נכנס**: מספר הטענות
 *  שרצו עד שלב המוטציות; ⛔ **ומה מפיל**: פחות מהמוצהר — ריצה חלקית —
 *  ⛔ ויותר ממנו — ריצפה מיושנת. ⭐ **ולמה שני הכיוונים**: ריצפה שאינה
 *  מתעדכנת מפסיקה למדוד את מה שנוסף. ⛔ **וההשהיה על שלב המוטציות בלבד
 *  (סבב 119)** — ⚠️ `mutStage` לוכדת את המונה בכניסה אליו, ⭐ ומה שהוא
 *  מוסיף אינו נספר בתקרה: ⛔ השהיה על הרמה המלאה כולה השאירה תשעה שערים
 *  בלי מדידה באף כיוון. ⚠️ ושער שמספרו משתנה גם בלי המוטציות מוכרז
 *  ב-`APP.floorRange` ומקבל את הטווח ב-`GATE_FLOOR_RANGE`. */
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  /*  ⚠️ שער שיובא לתהליך של שער אחר אינו סוגר — ⛔ הספירה שלו לא רצה.
   *  ⛔ וגם ריצת-משנה מוצהרת אינה סוגרת — ⚠️ שער שמריץ את עצמו בעץ
   *  סינתטי מגיע לחלק מטענותיו בכוונה, ⭐ והרצפה נמדדת על עץ אמיתי. */
  if (!process.argv[1] || !process.argv[1].endsWith(GATE_ID)) return;
  if (SUBRUN) return;
  /*  ⛔ אפס שנמדד בכניסה לשלב המוטציות הוא דילוג מוצהר (סבב 119) —
   *  ⚠️ שער שכל גופו מוטציות אינו רץ ברמה המהירה, ⭐ ואפס כזה אינו
   *  ריצה חלקית: ⛔ ו-`null` — תהליך שלא הגיע לשם — כן. */
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

/* ── חיתוך פונקציה מהמקור לפי שם, בהתאמת סוגריים ───────────────────────── */
function cut(name, src) {
  const re = new RegExp('\\n(async )?function ' + name + '\\s*\\(', 'g');
  const m = re.exec(src);
  if (!m) throw new Error('הפונקציה ' + name + ' לא נמצאה במקור האפליקציה');
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

/*  שלושת המקרים שהתקן מכריע, כולם על אותו מפתח `1`:
 *    · מקומי ישן ומסומן ⏳ מול ענן חדש ⇒ **הענן מנצח** — ⏳ אינו גובר על
 *      חותמת חדשה יותר.
 *    · שוויון חותמות ו-⏳ מקומי ⇒ המקומי מנצח — ⏳ הוא שובר השוויון.
 *    · מקומי חדש יותר ⇒ המקומי מנצח, בלי תלות בסימון.
 *  ובנוסף: רשומה שקיימת רק מקומית שורדת תמיד — היעדר אצל הצד השני אינו
 *  מחיקה, וזה הכלל שאסור שכלל ההכרעה ישבור.                              */
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
  '1 · ⛔ סעיף שובר-השוויון קיים ב-' + APP.mutFn + '() — ⏳ מנצח **בשוויון בלבד**');

/* ── 2 · ההתנהגות ──────────────────────────────────────────────────────── */
const marked = scenario(SRC, true);
assert(marked.one && APP.tag(marked.one) === 'CLOUD',
  '2א · ⛔ מקרה א: מקומי מסומן ⏳ וישן יותר — **הענן מנצח**, ⏳ אינו גובר על חותמת');
assert(!!marked.two,
  '2ב · ⛔ ורשומה מקומית-בלבד שורדת — היעדר אצל הצד השני אינו מחיקה');

const plain = scenario(SRC, false);
assert(plain.one && APP.tag(plain.one) === 'CLOUD',
  '3 · ⚠️ ובלי סימון גם כן — הענן החדש יותר מנצח');

const tiePend = (() => {
  const sb = harness(SRC, new Set([APP.pendKey('1')]));
  const out = APP.merge(sb, [APP.rec('1', 500, 'LOCAL')], [APP.rec('1', 500, 'CLOUD')]);
  return out[0];
})();
assert(APP.tag(tiePend) === 'LOCAL',
  '3ב · ⭐ מקרה ב: שוויון חותמות ו-⏳ מקומי — המקומי מנצח');

const newerLocal = (() => {
  const sb = harness(SRC, new Set());
  const out = APP.merge(sb, [APP.rec('1', 900, 'LOCAL')], [APP.rec('1', 100, 'CLOUD')]);
  return out[0];
})();
assert(APP.tag(newerLocal) === 'LOCAL',
  '4 · ⭐ מקרה ג: מקומי חדש יותר מנצח, בלי תלות בסימון');

const tie = (() => {
  const sb = harness(SRC, new Set());
  const out = APP.merge(sb, [APP.rec('1', 500, 'LOCAL')], [APP.rec('1', 500, 'CLOUD')]);
  return out[0];
})();
assert(APP.tag(tie) === 'CLOUD',
  '5 · שוויון **בלי** ⏳ — הענן מנצח, ושובר-השוויון נשאר דטרמיניסטי');

/*  ⛔ מכאן ולמטה מוטציות ובדיקות שלמות (סבב 92) — ⚠️ הן רצות ברמה
 *  המלאה בלבד: ⛔ הרמה המהירה עוצרת כאן עם קוד היציאה של הטענות
 *  שכבר רצו, ⭐ והכיסוי שלהן אינו יורד. */

/* ══════════════════════════════════════════════════════════════════════════
   עידן הנתונים — המנגנון, ולא ההצהרה
   ══════════════════════════════════════════════════════════════════════════
   ⛔ הזריקה היא הפעולה ההרסנית היחידה במערכת — ⚠️ ולכן נמדד כאן
   **המנגנון**: שלושת התנאים רצים בארגז חול על הקוד שנחתך מהמקור, ⭐ וכל
   אחד מהם מופל בנפרד. ⛔ ומה שנמדד בטקסט הוא רק מה שאין לו התנהגות —
   ⚠️ שם החותמת, ההצהרה על העידן, ודפוס האימוץ שירד.
   ══════════════════════════════════════════════════════════════════════════ */
const ERA_FNS = ['eraMayThrow', 'eraResetKey', 'eraStamp', 'eraBehind', 'eraThrow'];
/*  ⛔ ארגז חול לפונקציות העידן — ⚠️ הן טהורות, ⭐ והמוחק והשומר נמסרים
 *  להן: ⛔ ולכן אפשר להריץ אותן על טקסט ממוטט בלי לגעת בעץ. */
function eraBox(src) {
  const sandbox = { console, JSON, Date, Math, String, Number, Array, Object,
                    Boolean, isFinite, parseInt };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const n of ERA_FNS) vm.runInContext(cut(n, src), sandbox, { filename: n + '.js' });
  return sandbox;
}
/*  ⛔ מכשיר מדומה — ⚠️ **מה נכנס**: העידן שעל הדיסק, העידן בענן, ושלושת
 *  התנאים; ⛔ **ומה מפיל**: זריקה שלא הייתה צריכה לקרות, ⭐ ומחיקה
 *  שקרתה בלי שהעידן קודם. ⚠️ **ולמה המבנה קיים**: הוא מודד את התוצאה
 *  על הדיסק ⛔ ולא את ערך ההחזרה בלבד. */
function eraRun(sb, o) {
  const disk = { era: o.era, rows: ['ישן'], stamp: null };
  let wipes = 0, err = null, threw = null;
  try {
    threw = sb.eraThrow({
      local: disk.era, cloud: o.cloud, prefix: 'x_',
      online: o.online, push: o.push, pending: o.pending,
      wipe: function () { wipes++; disk.rows = []; if (o.crash) throw new Error('נקטע'); },
      save: function (era, key, stamp) { disk.era = era; disk.stampKey = key; disk.stamp = stamp; },
    });
  } catch (e) { err = e.message; }
  return { disk, threw, wipes, err };
}
const ERA_OK_PUSH = { ok: true, still: [] };
/*  ⛔ דפוס האימוץ — ⚠️ «השדה החדש ריק והישן מלא» הוא בדיוק מה שהעידן
 *  מחליף: ⭐ קורא לצורה ישנה שאין לו עידן נשאר לנצח, ⛔ כי איש אינו יכול
 *  להוכיח שאין מכשיר שעוד מחזיק אותה. ⚠️ **והסריקה על קוד מולבן** —
 *  ⛔ הדפוס חי בהערות שמסבירות אותו. */
const ERA_ADOPT = /\b([A-Za-z_$][\w$]*)(?:\.[\w$]+|\[[^\]]{1,20}\])\s*==\s*null\s*&&\s*\1(?:\.[\w$]+|\[[^\]]{1,20}\])\s*!=\s*null/;
function eraAdoptSites(src) {
  const w = whitenJs(src);
  const out = [];
  w.split('\n').forEach((l, i) => { if (ERA_ADOPT.test(l)) out.push('index.html:' + (i + 1)); });
  return out;
}
/*  ⛔ ההצהרה על העידן נמדדת משני צדדיה — ⚠️ עידן שנבדל מהבסיס בלי נימוק,
 *  ⛔ ונימוק לעידן שאינו נבדל: ⭐ «נבדל» הוא המדידה ⛔ ואינו הנימוק. */
function eraDeclGaps(src) {
  const d = APP.dataEra || {};
  const out = [];
  const m = /\bvar DATA_ERA = (\d+);/.exec(src);
  if (!m) return ['`DATA_ERA` אינו מוגדר במקור'];
  const inSrc = Number(m[1]);
  if (inSrc !== d.era) out.push(`המקור מצהיר ${inSrc} ו-APP.dataEra מצהיר ${d.era}`);
  if (!(d.base > 0)) out.push('`APP.dataEra.base` אינו מספר חיובי');
  const differs = d.era !== d.base;
  const why = String(d.why || '').trim();
  if (differs && why.length < 20) out.push('עידן שנבדל מהבסיס בלי נימוק כתוב');
  if (!differs && why.length) out.push('נימוק לעידן שאינו נבדל מהבסיס');
  return out;
}

console.log('\n· ' + APP.app + ' — סבב 148: עידן הנתונים');
{
  const g = eraDeclGaps(SRC);
  assert(g.length === 0,
    'ע1 · ⛔ [era-decl] העידן מוצהר ונמדד משני צדדיו — נמדדו ' + g.length +
    ' פערים והצפוי 0' + (g.length ? ' (' + g.join(' · ') + ')' : '') +
    '. מיישרים את `APP.dataEra` למקור, או כותבים את הנימוק');
}
{
  const n = eraAdoptSites(SRC).length;
  assert(n === 0,
    'ע2 · ⛔ [era-adopt] אפס דפוס אימוץ במקור — נמדדו ' + n + ' אתרים והצפוי 0. ' +
    'מסירים את ההסבה ומקדמים את `DATA_ERA` באותו סבב');
}
{
  const sb = eraBox(SRC);
  const key = sb.eraResetKey('x_');
  assert(key === 'x_era_reset',
    'ע3 · ⛔ [era-stamp] סימן הזריקה נגזר מהתחילית ונגמר ב-`_era_reset` — נמדד «' +
    key + '» והצפוי «x_era_reset». מיישרים את `eraResetKey`');
  const clean = eraRun(sb, { era: 1, cloud: 2, online: true, push: ERA_OK_PUSH, pending: {} });
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(String(clean.disk.stamp));
  assert(clean.threw === true && clean.disk.rows.length === 0 && clean.disk.era === 2 && iso,
    'ע4 · ⛔ [era-clean] מכשיר נקי נזרק, והסימן חותמת ISO — נמדד זריקה=' + clean.threw +
    ' שורות=' + clean.disk.rows.length + ' עידן=' + clean.disk.era +
    ' חותמת=' + clean.disk.stamp + ' והצפוי true/0/2/ISO');
  assert(clean.disk.stampKey === 'x_era_reset',
    'ע5 · ⛔ [era-stamp-key] החותמת נכתבת במפתח שנגזר — נמדד «' + clean.disk.stampKey +
    '» והצפוי «x_era_reset»');
  const off = eraRun(sb, { era: 1, cloud: 2, online: false, push: ERA_OK_PUSH, pending: {} });
  assert(off.threw === false && off.wipes === 0,
    'ע6 · ⛔ [era-net] אין רשת ⟵ אינו נזרק — נמדד זריקה=' + off.threw +
    ' מחיקות=' + off.wipes + ' והצפוי false/0');
  const stl = eraRun(sb, { era: 1, cloud: 2, online: true,
                           push: { ok: true, still: ['t:9'] }, pending: {} });
  assert(stl.threw === false && stl.wipes === 0,
    'ע7 · ⛔ [era-still] שורה שנשארה בדחיפה ⟵ אינו נזרק — נמדד זריקה=' + stl.threw +
    ' מחיקות=' + stl.wipes + ' והצפוי false/0');
  const nok = eraRun(sb, { era: 1, cloud: 2, online: true,
                           push: { ok: false, still: [] }, pending: {} });
  assert(nok.threw === false && nok.wipes === 0,
    'ע8 · ⛔ [era-ok] דחיפה שלא החזירה `ok` ⟵ אינו נזרק — נמדד זריקה=' + nok.threw +
    ' מחיקות=' + nok.wipes + ' והצפוי false/0');
  const q = eraRun(sb, { era: 1, cloud: 2, online: true, push: ERA_OK_PUSH,
                         pending: { 'k:1': 7 } });
  assert(q.threw === false && q.wipes === 0,
    'ע9 · ⛔ [era-queue] תור שאינו ריק ⟵ אינו נזרק — נמדד זריקה=' + q.threw +
    ' מחיקות=' + q.wipes + ' והצפוי false/0');
  const same = eraRun(sb, { era: 2, cloud: 2, online: true, push: ERA_OK_PUSH, pending: {} });
  assert(same.threw === false && same.wipes === 0,
    'ע10 · ⛔ [era-behind] עידן שאינו מאחור ⟵ אינו נזרק — נמדד זריקה=' + same.threw +
    ' והצפוי false');
  const nul = eraRun(sb, { era: 1, cloud: null, online: true, push: ERA_OK_PUSH, pending: {} });
  assert(nul.threw === false && nul.wipes === 0,
    'ע11 · ⛔ [era-closed] עידן ענני שלא נקרא ⟵ נכשל סגור — נמדד זריקה=' + nul.threw +
    ' והצפוי false');
  const cut1 = eraRun(sb, { era: 1, cloud: 2, online: true, push: ERA_OK_PUSH,
                            pending: {}, crash: true });
  const next = eraRun(sb, { era: cut1.disk.era, cloud: 2, online: true,
                            push: ERA_OK_PUSH, pending: {} });
  assert(cut1.disk.era === 1 && cut1.disk.stamp === null && next.threw === true,
    'ע12 · ⛔ [era-resume] זריקה שנקטעה ⟵ העלייה הבאה זורקת ומושכת — נמדד עידן=' +
    cut1.disk.era + ' חותמת=' + cut1.disk.stamp + ' ובעלייה הבאה זריקה=' + next.threw +
    ' והצפוי 1/null/true');
}
{
  const w = whitenJs(SRC);
  const kick = (w.match(/(?:^|[^\w$.])eraKick\s*\(/g) || []).length;
  assert(kick >= 2,
    'ע13 · ⛔ [era-wired] נקודת ההפעלה חיה — נמדדו ' + kick +
    ' אתרים ל-`eraKick` והצפוי לפחות שניים (הגדרה וקריאה מהעלייה). מחווטים אותה לעלייה');
}

mutStage();
if (!RUN_MUT) {
  console.log('\n⏭ test_merge_pending: המוטציות רצות ברמה המלאה (--full) — ⛔ ואינן נמדדות כאן');
  process.exit(failed ? 1 : 0);
}
/* ── 3 · המוטציה — הסרת ההגנה חייבת להיתפס ─────────────────────────────── */
const MUT = SRC.replace(FN, APP.mutate(FN));
assert(MUT !== SRC, '6א · המוטציה שינתה את המקור בפועל');
let caught = false;
try {
  const sb = harness(MUT, new Set([APP.pendKey('1')]));
  const out = APP.merge(sb, [APP.rec('1', 500, 'LOCAL')], [APP.rec('1', 500, 'CLOUD')]);
  caught = APP.tag(out[0]) !== 'LOCAL';
} catch (e) { caught = true; }
assert(caught,
  '6ב · ⛔ מוטציה שמסירה את שובר-השוויון מפילה את טענה 3ב — ההגנה נאכפת ולא מוצהרת');

/* ══════════════════════════════════════════════════════════════════════════
   4 · חסימת משתמש מושבת בכניסה אופליין (שורת הכניסה האופליין במטריצה)
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
  /*  ⛔ ההצהרות קודמות לפונקציות (סבב 93) — ⚠️ מודול גריעת ה-tombstones
   *  נשען על דגל ברמת הקובץ, ⭐ ופונקציה שנחתכת בלעדיו זורקת
   *  `ReferenceError` בתוך הרתמה: ⛔ הכשל נראה כשבירה של מנוע המיזוג
   *  ⚠️ ואינו כזה. */
  for (const v of (C.vars || [])) vm.runInContext(cutVar(v, src), ctx);
  vm.runInContext(C.names.map((x) => cut(x, src)).join('\n'), ctx);
  return ctx;
}
const sb = coreBuild(SRC);
const T = (r) => JSON.stringify((r || []).map(C.tag));

console.log('· ליבת המיזוג המשותפת (' + APP.app + ')');

/* ── 4 · הבלוק המשותף ──────────────────────────────────────────────────── */
assert(SRC.indexOf('/* ═══ מיזוג רשומות — מודול משותף (סבב 38)') !== -1,
  '1 · הבלוק המשותף קיים במקור האפליקציה');
assert(SRC.indexOf('/* ═══════════════ סוף מודול המיזוג') !== -1,
  '2 · וסמן הסגירה שלו קיים');
assert(/function\s+_mergePick\s*\(/.test(SRC) && /function\s+mergeCore\s*\(/.test(SRC),
  '3 · שתי הפונקציות מוגדרות');
{
  // ⛔ כלל ההכרעה יושב **פעם אחת** — שכפול שלו הוא בדיוק הכשל שהאיחוד בא
  //    למנוע, ולכן הוא נספר ולא רק נמצא.
  const n = (SRC.match(/tsOf\(loc\) === tsOf\(rem\) && isPend/g) || []).length;
  assert(n === 1, '4 · ⛔ כלל ההכרעה מופיע בקוד פעם אחת בלבד (נמצא ' + n + ')');
}

/* ── 5 · כלל ההכרעה ────────────────────────────────────────────────────── */
const ts = (x) => x.t;
const L = { t: 10, n: 'מקומי' }, R = { t: 20, n: 'ענן' };
assert(sb._mergePick(L, R, 'k', true, ts, null) === R,
  '5 · ⛔ מקרה א: מסומן ⏳ וישן יותר — הענן מנצח');
assert(sb._mergePick(L, R, 'k', false, ts, null) === R,
  '6 · בלי סימון — החדש מנצח');
assert(sb._mergePick({ t: 30 }, { t: 20 }, 'k', false, ts, null).t === 30,
  '7 · ⭐ מקרה ג: מקומי חדש יותר מנצח');
assert(sb._mergePick({ t: 20, n: 'l' }, { t: 20, n: 'r' }, 'k', true, ts, null).n === 'l',
  '7ב · ⭐ מקרה ב: שוויון + ⏳ — המקומי מנצח');
assert(sb._mergePick({ t: 20, n: 'l' }, { t: 20, n: 'r' }, 'k', false, ts, null).n === 'r',
  '8 · ⛔ שוויון בלי ⏳ → הענן (שובר-שוויון דטרמיניסטי)');
{
  let got = null;
  const pair = (a, b, k, p) => { got = { a: a.n, b: b.n, k: k, p: p }; return a; };
  sb._mergePick(L, R, 'kk', true, ts, pair);
  assert(got && got.a === 'מקומי' && got.b === 'ענן' && got.k === 'kk' && got.p === true,
    '9 · `mergePair` מקבל את ההכרעה כפרמטר ואת שני הצדדים בסדר (מקומי, ענן)');
}

/* ── 6 · שלושת כללי המיזוג, דרך המעטפת האמיתית ─────────────────────────── */
{
  const out = C.merge(sb, [C.rec('a', 5, 'מקומי-ישן')], [C.rec('a', 9, 'ענן-חדש')], ['a']);
  assert(T(out) === JSON.stringify(['ענן-חדש']),
    '10 · ⛔ דרך המעטפת: ⏳ אינו גובר על חותמת חדשה יותר');
  const tieOut = C.merge(sb, [C.rec('a', 7, 'מקומי')], [C.rec('a', 7, 'ענן')], ['a']);
  assert(T(tieOut) === JSON.stringify(['מקומי']),
    '10ב · ⭐ ובשוויון דרך המעטפת — ⏳ המקומי מנצח');
}
{
  const out = C.merge(sb, [C.rec('a', 5, 'מקומי')], [C.rec('a', 9, 'ענן')], []);
  assert(T(out) === JSON.stringify(['ענן']),
    '11 · ⚠️ בלי סימון — החדש מנצח, כלומר ההכרעה נשארת LWW');
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
  const mut = coreBuild(SRC.replace('tsOf(loc) === tsOf(rem) && isPend ? loc : rem', 'rem'));
  assert(mut._mergePick({ t: 20, n: 'l' }, { t: 20, n: 'r' }, 'k', true, ts, null).n === 'r',
    '15 · מוטציה: הסרת שובר-השוויון מפילה את טענה 7ב');
  const out = C.merge(mut, [C.rec('a', 7, 'מקומי')], [C.rec('a', 7, 'ענן')], ['a']);
  assert(T(out) === JSON.stringify(['ענן']),
    '16 · ⛔ ובמוטנט הרשומה שטרם עלתה מפסידה בשוויון — טענה 10ב הייתה נכשלת');
}
{
  const mut = coreBuild(SRC.replace('tsOf(loc) > tsOf(rem) ? loc', 'tsOf(loc) >= tsOf(rem) ? loc'));
  assert(mut._mergePick({ t: 20, n: 'l' }, { t: 20, n: 'r' }, 'k', false, ts, null).n === 'l',
    '17 · מוטציה: היפוך שובר-השוויון מפיל את טענה 8');
}
/*  ⭐ מוטציית-נגד: שם הפרמטר שהוחלף **בעקביות** בליבה — ⚠️ שינוי חי שאסור
 *  לו להפיל: ⛔ הליבה מודדת **מי מנצח**, ⛔ ולא איך קוראים לצדדים. */
{
  const renamed = SRC.replace(/\bisPend\b/g, 'isWaiting');
  assert(renamed !== SRC, 'נ1א · המוטציית-נגד אכן מחליפה את שם הפרמטר בעקביות');
  const anti = coreBuild(renamed);
  const before = T(C.merge(coreBuild(SRC), [C.rec('a', 7, 'מקומי')], [C.rec('a', 7, 'ענן')], ['a']));
  const after = T(C.merge(anti, [C.rec('a', 7, 'מקומי')], [C.rec('a', 7, 'ענן')], ['a']));
  assert(before === after,
    'נ1ב · ⭐ שם פרמטר שהוחלף בעקביות ⛔ אינו מפיל — נמדד המנגנון, לא השם');
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


/* ── מוטציות העידן — שש, וכולן חייבות להפיל ────────────────────────────── */
/*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ היא מסירה תנאי שלם
 *  מגוף `eraMayThrow`, ⭐ והמדידה היא **שהמכשיר שלא היה צריך להיזרק
 *  נזרק**: ⛔ והיא רצה על מחרוזת ⛔ ואינה נכתבת לעץ. */
console.log('  — מוטציות העידן —');
{
  const body = cut('eraResetKey', SRC);
  const mut = SRC.replace(body, body.replace("+ 'era_reset'", "+ 'era'"));
  assert(mut !== SRC, 'ע-מ1א · המוטציה שינתה את המקור בפועל');
  assert(eraBox(mut).eraResetKey('x_') !== 'x_era_reset',
    'ע-מ1ב · ⛔ מוטציה: הסרת הסיומת מפילה את «[era-stamp] סימן הזריקה נגזר מהתחילית» — ' +
    'נמדד «' + eraBox(mut).eraResetKey('x_') + '» והצפוי שיתהפך');
}
{
  const body = cut('eraMayThrow', SRC);
  const mut = SRC.replace(body, body.replace('  if (!s.online) return false;\n', ''));
  assert(mut !== SRC, 'ע-מ2א · המוטציה שינתה את המקור בפועל');
  const r = eraRun(eraBox(mut), { era: 1, cloud: 2, online: false,
                                  push: ERA_OK_PUSH, pending: {} });
  assert(r.threw === true,
    'ע-מ2ב · ⛔ מוטציה: הסרת תנאי הרשת מפילה את «[era-net] אין רשת ⟵ אינו נזרק» — ' +
    'נמדד זריקה=' + r.threw + ' והצפוי שתתהפך ל-true');
}
{
  const body = cut('eraMayThrow', SRC);
  const mut = SRC.replace(body, body.replace(
    '  if (!Array.isArray(s.push.still) || s.push.still.length !== 0) return false;\n', ''));
  assert(mut !== SRC, 'ע-מ3א · המוטציה שינתה את המקור בפועל');
  const r = eraRun(eraBox(mut), { era: 1, cloud: 2, online: true,
                                  push: { ok: true, still: ['t:9'] }, pending: {} });
  assert(r.threw === true,
    'ע-מ3ב · ⛔ מוטציה: הסרת תנאי ה-`still` מפילה את «[era-still] שורה שנשארה בדחיפה» — ' +
    'נמדד זריקה=' + r.threw + ' והצפוי שתתהפך ל-true');
}
{
  const body = cut('eraMayThrow', SRC);
  const mut = SRC.replace(body, body.replace(
    '  if (Object.keys(s.pending).length !== 0) return false;\n', ''));
  assert(mut !== SRC, 'ע-מ4א · המוטציה שינתה את המקור בפועל');
  const r = eraRun(eraBox(mut), { era: 1, cloud: 2, online: true,
                                  push: ERA_OK_PUSH, pending: { 'k:1': 7 } });
  assert(r.threw === true,
    'ע-מ4ב · ⛔ מוטציה: הסרת תנאי התור מפילה את «[era-queue] תור שאינו ריק» — ' +
    'נמדד זריקה=' + r.threw + ' והצפוי שתתהפך ל-true');
}
{
  const at = SRC.lastIndexOf('</script>');
  const mut = SRC.slice(0, at) +
    '\nfunction zzEraGraft(r) { if (r.newKey == null && r.oldKey != null) r.newKey = r.oldKey; }\n' +
    SRC.slice(at);
  const n = eraAdoptSites(mut).length;
  assert(n > 0,
    'ע-מ5 · ⛔ מוטציה: דפוס אימוץ שנוסף מפיל את «[era-adopt] אפס דפוס אימוץ» — ' +
    'נמדדו ' + n + ' אתרים והצפוי לפחות אחד');
}
{
  const m = /\bvar DATA_ERA = (\d+);/.exec(SRC);
  const mut = SRC.replace(m[0], 'var DATA_ERA = ' + (Number(m[1]) + 7) + ';');
  const n = eraDeclGaps(mut).length;
  assert(n > 0,
    'ע-מ6 · ⛔ מוטציה: עידן שנבדל מההצהרה מפיל את «[era-decl] העידן מוצהר» — ' +
    'נמדדו ' + n + ' פערים והצפוי לפחות אחד');
}
/*  ⭐ מוטציית-נגד: עידן זהה בין הריפו ⛔ אינו מפיל — ⚠️ זה המצב הרגיל
 *  בשלוש שלא היה בהן שינוי צורה, ⛔ ושער שנופל עליו חוסם כל אפליקציה
 *  שאינה מקדמת. */
{
  const saved = { era: APP.dataEra.era, why: APP.dataEra.why };
  APP.dataEra.era = APP.dataEra.base;
  APP.dataEra.why = '';
  const mut = SRC.replace(/\bvar DATA_ERA = \d+;/, 'var DATA_ERA = ' + APP.dataEra.base + ';');
  const n = eraDeclGaps(mut).length;
  APP.dataEra.era = saved.era;
  APP.dataEra.why = saved.why;
  assert(n === 0,
    'ע-נ1 · ⭐ מוטציית-נגד: עידן זהה לבסיס ובלי נימוק ⛔ אינו מפיל — ' +
    'נמדדו ' + n + ' פערים והצפוי 0');
}

console.log(failed ? `\n✗ סבב 72 (מנוע המיזוג) — ${failed} טענות נכשלו`
                   : '\n✓ סבב 72 (מנוע המיזוג — ליבה והגנת ⏳) — כל הטענות עברו');
process.exit(failed ? 1 : 0);
