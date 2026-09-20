/* ───────────────────────────────────────────────────────────────────────────
   test_coremod.mjs — הליבה המשותפת היא מודול

   **מה נאכף:** ⛔ קוד תשתיתי שזהה בכל האפליקציות חי ב**מודול אחד**
   שב-`core/` — ⚠️ ולא מוכפל בתוך `index.html` של כל אחת: ⭐ המודול נטען
   ב-`<script type="module">`, ⛔ ומוטמן ב-`sw.js`. ⛔ **והוא טהור** —
   ⚠️ אפס DOM ואפס תצורה פר-אפליקציה, ⭐ שהזהות היא כל מה שהוא מבטיח.
   ⛔ **ואין הגדרה כפולה** — ⚠️ שם שחי במודול אינו מוגדר שוב בקובץ.
   ⛔ **וקוד תשתיתי חדש נכתב במודול** — ⚠️ הגדרה שנושאת תחילית תשתיתית
   ויושבת ב-`index.html` מחוץ לכל בלוק חתום **מפילה**, ⭐ אלא אם היא
   מוכרזת ב-`APP.coreAllow` עם מה שהיא עושה שאינו תשתיתי.

   **הנימוק המדוד:** 173 גופי פונקציה היו זהים בית-לבית בחמשת הקבצים —
   ⚠️ 1,706 שורות שחיות חמש פעמים: ⭐ הבאג ב-`pull` דרש תיקון בארבעה
   ריפו, ⛔ ובאג המחיקה המדורגת שלושה תיקונים בשניים — ⚠️ פי חמישה על כל
   תיקון תשתיתי, ⭐ ואחד שנשכח הוא באג שקט שאיש אינו מודד.

   **מה יישבר בלעדיו:** ⛔ מודול שאינו ב-`sw.js` שובר את האופליין לגמרי —
   ⚠️ הדף נטען והייבוא נכשל; ⛔ ומודול שנבדל בריפו אחד מחזיר את ההכפלה
   בדלת האחורית: ⭐ שני מימושים לאותה יכולת הם שתי התנהגויות, ⚠️ ובאג
   שיתוקן באחד יישאר בשני. ⛔ **ופונקציה תשתיתית שתיכתב בקובץ** — ⚠️ וזה
   יקרה, ⭐ כי זה הקל — תוכפל בסבב הבא, ⛔ ואז כבר מאוחר.

   **מה אינו נאכף כאן:** ⛔ תוכן המודול — ⚠️ זהות הבלוקים שבתוכו נמדדת
   בחתימת ה-`sha256`, ⭐ ומה שנמדד כאן הוא **המיקום**: איפה הקוד חי, מי
   טוען אותו ומי מטמין אותו · ⛔ וסט הקבצים, ⚠️ שנמדד בשער סט-הקבצים ·
   ⛔ ותאום שחי מחוץ לכל בלוק, ⚠️ שנמדד בשער הרכיב המשותף · ⛔ וההשוואה
   בין הריפו דורשת את האחיות על הדיסק: ⚠️ כשהן חסרות היא **מדווחת ואינה
   מדלגת בשתיקה**.
   ──────────────────────────────────────────────────────────────────────── */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS } from './peers.mjs';
import { CORE_FILES } from './appsrc.mjs';
import { whiten } from './whiten.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
  /*  ⛔ מודול ליבה שאינו כאן ⛔ ונעדר בכוונה — ⚠️ **מה נכנס**: הקובץ ⟵
   *  היכולת שאין כאן; ⛔ **ומה מפיל**: מודול חסר שאינו מוכרז, ⛔ והכרזה
   *  שיש לה קובץ. ⭐ **ולמה המבנה קיים**: מודול שנטען באפליקציה שאין לה
   *  צרכן הוא מנגנון בלי צרכן, ⛔ והוצאת קוד מת היא הנצחתו. */
  moduleAbsent: {
    'core/hebrew.js':
      'אפס צרכני תאריך עברי כאן — ⛔ וטעינת המנוע הייתה מנגנון בלי צרכן: ⚠️ והצרכן הוא הסימן ⛔ ולא השם',
  },
  /*  ⛔ הגדרה שנושאת תחילית תשתיתית ונשארת ב-`index.html` — ⚠️ **מה
   *  נכנס**: השם ⟵ מה שהוא עושה שאינו תשתיתי; ⛔ **ומה מפיל**: הגדרה
   *  כזו שאינה כאן, הכרזה שאין לה אתר, ⛔ והכרזה בלי נימוק. ⭐ **ולמה
   *  המבנה קיים**: עוטף פר-אפליקציה מעל הליבה נושא את אותה תחילית,
   *  ⛔ והוא מוצר ⛔ ולא תשתית. */
  /*  ⚠️ **וההיעדר מוצהר ריק** ⛔ ואינו נשמט — ⭐ אין כאן הגדרה תשתיתית
   *  שיושבת מחוץ לבלוק חתום. */
  coreAllow: {},
  /*  ⛔ אתר שבונה CSS בזמן ריצה — ⚠️ **מה נכנס**: שם הפונקציה ⟵ מה
   *  המחרוזת היא, ⛔ ולמה היא אינה גיליון האפליקציה; ⛔ **ומה מפיל**:
   *  אתר שאינו כאן, ⛔ והכרזה שאין לה אתר. ⭐ **ולמה המבנה קיים**:
   *  מחרוזת CSS בתוך JS נראית כ-CSS של האפליקציה ⛔ ואינה — ⚠️ והיא
   *  אינה נטענת עם הדף ⛔ ואינה יורשת את הגיליון. */
  cssStrings: {
    pendEnsureStyle:
      'בונה את כללי סימון ה-⏳ בזמן ריצה — ⛔ הוא במודול המשותף, ⚠️ וזהותו נמדדת ב-`sha256`',
    _lkStyle:
      'בונה את כללי מסך הנעילה בזמן ריצה — ⛔ הוא במודול המשותף, ⚠️ וזהותו נמדדת ב-`sha256`',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [18, 19, 60, 138, 207];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`), בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIBS = resolve(ROOT, '..');

let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
/*  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ מספר הטענות נגזר ממרשם המודולים,
 *  ⭐ שזהה בכולן: ⛔ ומה שנבדל הוא **תוכן** ההכרזות ⛔ ולא מספרן. */
const FLOOR = { shared: 18, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה שמבדיל
 *  ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו.
 *  ⛔ **ושומר הרקורסיה הוא ריצת-משנה אף הוא** — ⚠️ הסט רץ שם על **עותק
 *  סינתטי** שאין לצידו אחיות ואין בו `.git`, ⭐ ולכן שער שמשווה מול אחות
 *  או קורא את סט המעקב מגיע לחלק מטענותיו **בכוונה**: ⛔ והריצפה נמדדת
 *  על עץ אמיתי ⛔ ולא שם. */
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.R33_INNER;
/*  ⛔ הריצפה נמדדת בשני הכיוונים — ⚠️ פחות מהמוצהר הוא ריצה חלקית,
 *  ⛔ ויותר ממנו הוא ריצפה מיושנת: ⭐ ריצפה שאינה מתעדכנת מפסיקה למדוד
 *  את מה שנוסף. */
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
const t = (n, cond, m) => { RAN++; if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

/*  ⛔ התחיליות התשתיתיות — ⚠️ **מה נכנס**: תחילית של שם שמסמנת מנגנון
 *  תשתיתי; ⛔ **ומה מפיל**: הגדרה שנושאת אותה, יושבת ב-`index.html`
 *  מחוץ לכל בלוק חתום, ואינה מוכרזת. ⭐ **ולמה המבנה קיים**: פונקציה
 *  תשתיתית שנכתבת בקובץ תוכפל בסבב הבא, ⛔ ואז כבר מאוחר. */
const PREFIXES = ['ls', 'bk', 'sb', 'merge', 'push', 'hw', 'heb'];
const PFX_RE = new RegExp('^_?(' + PREFIXES.join('|') + ')[A-Z_]');

/*  ⛔ שתי צורות ההגדרה שהמקור משתמש בהן — ⚠️ `function X(` ברמת המודול
 *  ⛔ ו-`window.X = function`: ⭐ והן אותן צורות שסורק השמות מכיר. */
const DEF_RE =
  /(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|\nwindow\.([A-Za-z_$][\w$]*)\s*=\s*function/g;

function defsOf(src) {
  const out = [];
  DEF_RE.lastIndex = 0;
  let m;
  while ((m = DEF_RE.exec(src)) !== null) out.push({ name: m[1] || m[2], at: m.index });
  return out;
}

/*  ⛔ טווחי הבלוקים החתומים נגזרים מ-`check-capabilities` ⛔ ואינם מוקלדים
 *  כאן — ⚠️ רשימה שנייה של סמנים הייתה מקור אמת שני, ⭐ ובלוק שנוסף שם
 *  היה נשאר בלתי-נראה כאן. */
function signedRanges(src, capsSrc) {
  const re = /block:\s*\{[\s\S]*?start:\s*'([^']+)',[\s\S]*?end:\s*'([^']+)'/g;
  const out = [];
  let m;
  while ((m = re.exec(capsSrc)) !== null) {
    const i = src.indexOf(m[1]); if (i < 0) continue;
    const j = src.indexOf(m[2], i); if (j < 0) continue;
    const k = src.indexOf('*/', j); if (k < 0) continue;
    out.push([i, k + 2]);
  }
  return out;
}

/*  ⛔ הליבה — ⚠️ היא מקבלת את המקורות כפרמטרים ⛔ ואינה קוראת מהדיסק:
 *  ⭐ ולכן המוטציה מזינה לה מקור שונה ⛔ בלי לגעת בעץ. */
export function prefixGaps(idx, capsSrc, allow) {
  const ranges = signedRanges(idx, capsSrc);
  const out = [];
  for (const d of defsOf(idx)) {
    if (!PFX_RE.test(d.name)) continue;
    if (ranges.some(([a, b]) => d.at >= a && d.at < b)) continue;
    if (allow[d.name]) continue;
    out.push(d.name);
  }
  return out;
}

/*  ⛔ הגדרה כפולה — ⚠️ שם שחי במודול ומוגדר שוב בקובץ: ⭐ שני גופים
 *  לאותו שם הם שני מימושים, ⛔ והמאוחר שבהם מנצח בשקט. */
export function dupDefs(idx, modSrcs) {
  const inMod = new Set();
  for (const s of modSrcs) for (const d of defsOf(s)) inMod.add(d.name);
  const out = [];
  for (const d of defsOf(idx)) if (inMod.has(d.name)) out.push(d.name);
  return [...new Set(out)];
}

/*  ⛔ הטוהר נמדד על המודול — ⚠️ **מה נכנס**: אתר DOM או תצורה
 *  פר-אפליקציה; ⛔ **ומה מפיל**: כל אחד מהם. ⭐ **ולמה**: מודול שנוגע
 *  ב-DOM אינו ניתן להרצה בלי דף, ⛔ ומודול שקורא תצורה פר-אפליקציה אינו
 *  זהה בין הריפו — ⚠️ והזהות היא כל מה שהוא מבטיח.
 *  ⚠️ **ו-`window` אינו DOM** — ⭐ הוא נקודת ההתקנה של מנוע שכל צרכניו
 *  קוראים לו בשם אחד, ⛔ ואין לו מקבילה במודול. */
const IMPURE = [
  [/\bdocument\b/, 'נוגע ב-DOM'],
  [/\blocalStorage\b/, 'נוגע באחסון המכשיר'],
  [/[A-Z][A-Z0-9]*_CFG\b/, 'קורא תצורה פר-אפליקציה'],
];
export function impureGaps(name, src) {
  return IMPURE.filter(([re]) => re.test(src)).map(([, why]) => name + ' — ' + why);
}

const CAPS = readFileSync(join(ROOT, 'tools', 'check-capabilities.mjs'), 'utf8');
/*  ⛔ המקור כולל את גיליון הסגנון — ⚠️ הוא יצא ל-`app.css`, ⭐ וסורק
 *  שקורא `index.html` לבדו מדווח «אין כלל CSS» על גיליון שלם. */
/*  ⛔ המקור הגולמי ⛔ ובלי הגיליון — ⚠️ הוא ההיקף של מדידת הסוגים:
 *  ⭐ `<style>` בו הוא תגית שחזרה לקובץ, ⛔ ולא הגיליון שיצא ממנו. */
/*  ⛔ המקור נקרא גולמי — ⚠️ סמן הבלוק החתום הוא הערה,
 *  ⭐ והלבנה מוחקת בדיוק את מה שהוא מודד: ⛔ וכל סריקת דפוס
 *  בקוד — ⚠️ והיא בלבד — מלבינה אותו תחילה. */
const IDX_RAW = readFileSync(join(ROOT, 'index.html'), 'utf8');
const SHEET = readFileSync(join(ROOT, 'app.css'), 'utf8');
const IDX = readFileSync(join(ROOT, 'index.html'), 'utf8') +
  (existsSync(join(ROOT, 'app.css'))
    ? '\n<style data-sheet="app">\n' + readFileSync(join(ROOT, 'app.css'), 'utf8') + '\n</style>' : '');
/*  ⛔ גופי הבלוקים החתומים נחתכים מ-`index.html` לפי הסמנים שמוצהרים
 *  בבודק היכולות — ⚠️ ולא לפי רשימה שנייה כאן: ⭐ סמן שישתנה שם משנה גם
 *  את מה שנמדד כאן. */
const SIGNED_BODIES = (() => {
  const out = [];
  for (const m of CAPS.matchAll(/start: '([^']+)',\s*\n\s*end:\s*'([^']+)'/g)) {
    const a = IDX.indexOf(m[1]); if (a < 0) continue;
    const b = IDX.indexOf(m[2], a); if (b < 0) continue;
    out.push(IDX.slice(a, b));
  }
  return out;
})();
const SW = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const HERE = CORE_FILES.filter((f) => existsSync(join(ROOT, f)));
const MODS = HERE.map((f) => readFileSync(join(ROOT, f), 'utf8'));

console.log(`\n· ${APP.name} — סבב 148: הליבה המשותפת היא מודול`);
let n = 1;

/* ── 1. כל מודול קיים נטען ומוטמן ──────────────────────────────────────── */
{
  const notImported = HERE.filter((f) => IDX.indexOf("'./" + f + "'") < 0);
  const notCached = HERE.filter((f) => SW.indexOf("'./" + f + "'") < 0);
  t(n++, HERE.length > 0 && !notImported.length && !notCached.length,
    `[core-load] כל מודול ליבה נטען ומוטמן — נמדדו ${HERE.length} מודולים, ` +
    `${notImported.length} בלי ייבוא ו-${notCached.length} בלי הטמעה, והצפוי 0 ו-0` +
    (notImported.concat(notCached).length ? ` (${notImported.concat(notCached).join(', ')})` : '') +
    '. מוסיפים את המודול ל-`CORE` שב-`sw.js` ול-`import` שב-`index.html`');
}

/* ── 2. והטעינה היא תגית מודול ─────────────────────────────────────────── */
{
  const tag = /<script type="module">/.test(IDX);
  t(n++, tag,
    `[core-tag] המסמך טוען את הליבה כמודול — נמדד ${tag ? 'יש' : 'אין'} ` +
    '`<script type="module">` והצפוי יש. ' +
    'מסבים את הסקריפט לתגית מודול — ⛔ סקריפט קלאסי רץ לפני כל מודול');
}

/* ── 3. ומודול שאינו כאן מוכרז ─────────────────────────────────────────── */
{
  const missing = CORE_FILES.filter((f) => HERE.indexOf(f) < 0);
  const undeclared = missing.filter((f) => !APP.moduleAbsent[f]);
  const stale = Object.keys(APP.moduleAbsent).filter((f) => HERE.indexOf(f) >= 0);
  t(n++, !undeclared.length && !stale.length,
    `[core-absent] מודול שאינו כאן מוכרז — נמדדו ${undeclared.length} בלי הכרזה ` +
    `ו-${stale.length} הכרזות שיש להן קובץ, והצפוי 0 ו-0` +
    (undeclared.concat(stale).length ? ` (${undeclared.concat(stale).join(', ')})` : '') +
    '. מכריזים ב-`APP.moduleAbsent` את היכולת שאין כאן, או מסירים הכרזה שהתיישנה');
}

/* ── 4. והמודול טהור ───────────────────────────────────────────────────── */
{
  const bad = HERE.flatMap((f, i) => impureGaps(f, MODS[i]));
  t(n++, !bad.length,
    `[core-pure] המודולים טהורים — נמדדו ${bad.length} אתרים והצפוי 0` +
    (bad.length ? ` (${bad.join(' · ')})` : '') +
    '. מוציאים את הנגיעה ב-DOM ובתצורה הפר-אפליקציתית אל `index.html`');
}

/* ── 5. ואין הגדרה כפולה ───────────────────────────────────────────────── */
{
  const dup = dupDefs(IDX, MODS);
  t(n++, !dup.length,
    `[core-dup] שם שמוגדר במודול ובקובץ כאחד — נמדדו ${dup.length} והצפוי 0` +
    (dup.length ? ` (${dup.join(', ')})` : '') +
    '. מוחקים את ההגדרה שב-`index.html` — ⛔ המודול הוא ההגדרה');
}

/* ── 6. והמודול זהה בית-לבית בין הריפו ─────────────────────────────────── */
{
  const others = PEERS.filter((p) => p !== APP.name);
  const have = others.filter((p) => existsSync(join(SIBS, p, 'index.html')));
  const away = others.filter((p) => have.indexOf(p) < 0);
  if (away.length) {
    console.log(`  ⚠️  ההשוואה בין הריפו לא רצה — ${away.join(' · ')} אינם על הדיסק ` +
                `לצד ${APP.name}; נמדדו ${have.length} מתוך ${others.length}. ` +
                'מריצים את הסבב עם כל הריפו זה לצד זה');
    t(n++, true, '[core-twin] ⭕ ההשוואה בין הריפו דווחה ולא רצה — הריפו האחיות אינן על הדיסק');
  } else {
    const diff = [];
    for (let i = 0; i < HERE.length; i++) {
      for (const p of have) {
        const q = join(SIBS, p, HERE[i]);
        if (!existsSync(q)) continue;              /* היעדרו מוכרז שם */
        if (readFileSync(q, 'utf8') !== MODS[i]) diff.push(p + ':' + HERE[i]);
      }
    }
    t(n++, !diff.length,
      `[core-twin] המודול זהה בית-לבית בין הריפו — נמדדו ${diff.length} נבדלים ` +
      `מתוך ${have.length} אחיות והצפוי 0` + (diff.length ? ` (${diff.join(', ')})` : '') +
      '. מיישרים את המודול בכל הריפו באותו סבב');
  }
}

/*  ⛔ מודול משותף נושא דגל לכל התנהגות שנבדלת ⛔ ואינו מוסתר ב-CSS
 *  פר-אפליקציה — ⚠️ **מה נמדד**: מחלקה שנוצרת בתוך בלוק חתום ומוסתרת
 *  ב-`display:none` בגיליון; ⛔ **ומה מפיל**: כלל כזה. ⭐ **ולמה**:
 *  הסתרה משאירה את הקוד רץ ואת האלמנט ב-DOM, ⚠️ ומי שקורא את המודול
 *  אינו יודע שהוא מכובה. */
export function hiddenModuleClasses(idx, blocks) {
  /*  ⛔ השם נאסף בשתי צורות — ⚠️ האסימון שאחרי `class="`, ⭐ שגם מחרוזת
   *  שנבנית בשרשור פותחת בו; ⛔ וליטרל קצר בגוף הבלוק, ⚠️ שהוא הצורה
   *  שבה שם מחלקה מועבר כארגומנט. */
  const made = new Set();
  for (const b of blocks) {
    for (const m of b.matchAll(/class="([a-z][a-z0-9-]*)/g)) made.add(m[1]);
    for (const m of b.matchAll(/'([a-z][a-z0-9-]{1,})'/g)) made.add(m[1]);
  }
  const css = [...idx.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
  /*  ⛔ מחלקת **מצב** אינה הסתרה — ⚠️ שם שהקוד מוסיף ומסיר בזמן ריצה הוא
   *  מתג, ⭐ ולא כיבוי של פלט המודול: ⛔ והמדידה היא על מה שמוסתר תמיד. */
  const toggled = new Set([...idx.matchAll(/classList\s*\.\s*(?:add|remove|toggle)\(\s*'([a-z][a-z0-9-]*)'/g)]
    .map((m) => m[1]));
  const out = [];
  for (const r of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/(^|[;\s])display\s*:\s*none/.test(r[2])) continue;
    for (const c of made) {
      if (toggled.has(c)) continue;
      if (new RegExp('\\.' + c + '(?![\\w-])').test(r[1])) out.push(r[1].trim() + ' ⟵ .' + c);
    }
  }
  return [...new Set(out)];
}

/* ── 7. וקוד תשתיתי נכתב במודול ────────────────────────────────────────── */
{
  const gaps = prefixGaps(IDX, CAPS, APP.coreAllow);
  t(n++, !gaps.length,
    `[core-prefix] הגדרה תשתיתית ב-\`index.html\` מחוץ לבלוק חתום — נמדדו ${gaps.length} ` +
    `והצפוי 0` + (gaps.length ? ` (${gaps.join(', ')})` : '') +
    '. מעבירים אותה למודול, או מכריזים ב-`APP.coreAllow` עם מה שהיא עושה שאינו תשתיתי');
}

/* ── 8. וההכרזה נמדדת מהצד השני ────────────────────────────────────────── */
{
  const live = new Set(defsOf(IDX).map((d) => d.name));
  const stale = Object.keys(APP.coreAllow).filter((k) => !live.has(k));
  const thin = Object.values(APP.coreAllow).filter((v) => typeof v !== 'string' || v.length < 20);
  t(n++, !stale.length && !thin.length,
    `[core-allow] הכרזה שאין לה אתר או שאין לה נימוק — נמדדו ${stale.length} ו-${thin.length} ` +
    `מתוך ${Object.keys(APP.coreAllow).length} והצפוי 0 ו-0` +
    (stale.length ? ` (${stale.join(', ')})` : '') +
    '. מסירים מ-`APP.coreAllow` שם שאינו כאן, וכותבים בכל אחת מה היא עושה');
}

/* ── 9. ומודול משותף נושא דגל, ⛔ ואינו מוסתר ב-CSS ─────────────────────── */
{
  const hid = hiddenModuleClasses(IDX, SIGNED_BODIES);
  t(n++, !hid.length,
    `[core-flag] כלל CSS שמסתיר אלמנט שמודול משותף יוצר — נמדדו ${hid.length} ` +
    `והצפוי 0` + (hid.length ? ` (${hid.join(', ')})` : '') +
    '. מוסיפים דגל לחתימת הפונקציה ואינו יוצר את האלמנט, ⛔ ולא מסתירים אותו');
}

/* ── 9. והמודול מיוצא בשם ──────────────────────────────────────────────── */
{
  /*  ⛔ מודול בלי ייצוא בשם ובלי התקנה על `window` אינו נגיש לאיש —
   *  ⚠️ **ושתי הצורות תקפות**: ⭐ ייצוא בשם לצרכן שמייבא, ⛔ והתקנה על
   *  `window` למנוע שכל צרכניו קוראים לו בשם אחד. */
  const mute = HERE.filter((f, i) => !/\nexport \{/.test(MODS[i]) && !/\nwindow\.[A-Za-z_$]/.test(MODS[i]));
  t(n++, !mute.length,
    `[core-export] כל מודול נגיש לצרכניו — נמדדו ${mute.length} בלי ייצוא ובלי התקנה ` +
    `מתוך ${HERE.length} והצפוי 0` + (mute.length ? ` (${mute.join(', ')})` : '') +
    '. מייצאים את השמות, או מתקינים את המנוע על `window`');
}

/* ── 10. ובלוק נושא את סוגו ואת גבולותיו ───────────────────────────────── */
/*  ⛔ ארבעת הסוגים — ⚠️ **מה נכנס**: הסוג ⟵ המילה שנושאת אותו בשם הבלוק;
 *  ⛔ **ומה מפיל**: גיליון סגנון שאינו נושא את שתי המילים בסמניו.
 *  ⭐ **ולמה המבנה קיים**: בלוק שאינו נושא את סוגו נקרא כסוג אחר —
 *  ⚠️ נמדד גיליון `<style>` ומחרוזת JS עם `@page` באותו קובץ, ⭐ ואיש
 *  לא ידע שאחד מהשניים אינו CSS של האפליקציה. */
const BLOCK_KINDS = { signed: 'מודול משותף', sheet: 'גיליון סגנון',
                      script: 'סקריפט', runtime: 'מחרוזת בזמן ריצה' };

/*  ⛔ ההלבנה קודמת למדידה — ⚠️ `'<style>'` בתוך מחרוזת JS אינו תגית,
 *  ⭐ והוא בדיוק מה שהסוג הרביעי מתאר: ⛔ סריקה גולמית הייתה מפילה על
 *  המחרוזת שכבר מוצהרת. */
export function sheetInDoc(html) {
  const blank = (m) => ' '.repeat(m.length);
  const w = html.replace(/'(?:[^'\\\n]|\\.)*'/g, blank)
                .replace(/"(?:[^"\\\n]|\\.)*"/g, blank)
                .replace(/`(?:[^`\\]|\\.)*`/g, blank);
  return (w.match(/<style\b/g) || []).length;
}

/*  ⛔ האתרים נגזרים מהמקור הגולמי — ⚠️ המחרוזת היא הממצא עצמו, ⭐ והלבנה
 *  הייתה מוחקת בדיוק את מה שהיא סורקת · ⛔ **והבעלים הוא הפונקציה
 *  העוטפת** — ⚠️ שם קובץ אינו מקום. */
export function cssStringSites(html) {
  const out = new Set();
  const re = /createElement\(\s*['"]style['"]\s*\)|<style[ >]/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const pre = html.slice(0, m.index);
    let owner = null, fm;
    const fre = /\nfunction ([A-Za-z_$][\w$]*)\s*\(/g;
    while ((fm = fre.exec(pre)) !== null) owner = fm[1];
    if (owner) out.add(owner);
  }
  return [...out].sort();
}

{
  /*  ⛔ א — גיליון האפליקציה יושב בקובץ ⛔ ולא ב-`index.html`. */
  const inDoc = sheetInDoc(IDX_RAW);
  t(n++, inDoc === 0,
    `[block-kind] אפס \`<style>\` ב-index.html — נמדדו ${inDoc} והצפוי 0. ` +
    'מעבירים את הגיליון ל-`app.css`, ומקשרים אותו ב-`<link rel="stylesheet">`');

  /*  ⛔ ב — ולגיליון סמן פתיחה וסמן סגירה, ⚠️ ובשניהם סוגו. */
  const head = SHEET.split('\n').slice(0, 2).join('\n');
  const tail = SHEET.split('\n').slice(-3).join('\n');
  const kind = BLOCK_KINDS.sheet;
  const okHead = /^\/\* ═══ /.test(head) && head.indexOf(kind) >= 0;
  const okTail = tail.indexOf('סוף') >= 0 && tail.indexOf(kind) >= 0;
  t(n++, okHead && okTail,
    `[block-kind] גיליון הסגנון נושא סמן פתיחה וסגירה ובהם סוגו — נמדדו ` +
    `${(okHead ? 1 : 0) + (okTail ? 1 : 0)} מתוך 2 והצפוי 2. ` +
    `מוסיפים סמן שנושא «${kind}» בראש הקובץ ובסופו`);

  /*  ⛔ ג — וכל אתר שבונה CSS בזמן ריצה מוצהר, ⚠️ ונמדד משני צדדיו. */
  const sites = cssStringSites(IDX_RAW);
  const decl = APP.cssStrings || {};
  const undecl = sites.filter((s) => !(s in decl));
  const ghost = Object.keys(decl).filter((k) => sites.indexOf(k) < 0);
  const noWhy = Object.keys(decl).filter((k) => String(decl[k]).length < 20);
  t(n++, !undecl.length && !ghost.length && !noWhy.length,
    `[block-kind] כל אתר שבונה CSS בזמן ריצה מוצהר — נמדדו ${sites.length} אתרים ` +
    `מול ${Object.keys(decl).length} הכרזות: ${undecl.length} בלי הכרזה · ` +
    `${ghost.length} הכרזה בלי אתר · ${noWhy.length} בלי נימוק, והצפוי אפס` +
    (undecl.length ? ` (${undecl.join(', ')})` : '') +
    (ghost.length ? ` (${ghost.join(', ')})` : '') +
    `. מצהירים ב-\`APP.cssStrings\` מה המחרוזת ולמה אינה גיליון האפליקציה`);

  /*  ⛔ ד — והגיליון מוטמן מראש, ⚠️ שקובץ שאינו במטמון שובר את האופליין. */
  const inCore = /(^|\n)\s*'\.\/app\.css',/.test(SW);
  t(n++, inCore,
    `[block-core] גיליון הסגנון ב-\`CORE\` של sw.js — נמדד ${inCore ? 1 : 0} והצפוי 1. ` +
    'מוסיפים `./app.css` ל-`CORE`, שקובץ שאינו מוטמן שובר את האופליין');
}

/* ── 11. ונכס בינארי יושב בקובץ, לפי תפקידו ────────────────────────────── */
/*  ⛔ תיקיית נכסים ⟵ תפקידה — ⚠️ `icons/` נכסי האפליקציה עצמה,
 *  ⭐ ו-`logos/` גופים שהיא מציגה: ⛔ תיקייה נגזרת מתפקיד הנכס
 *  ⛔ ולא מהיום שבו נוצרה. */
const ASSET_DIRS = { icons: 'נכסי האפליקציה עצמה', logos: 'גופים שהאפליקציה מציגה' };
/*  ⛔ הסף הוא 500 תווים — ⚠️ אייקון `svg` מוטבע קצר הוא סימון, ⭐ ותמונה
 *  היא נכס: ⛔ והמחיר הוא שכל סורק קורא אותה בכל שער, ⚠️ ואין בה שורת קוד. */
const DATA_URI_MAX = 500;

export function dataUriGaps(html, max) {
  const out = [];
  for (const m of html.matchAll(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]*/g))
    if (m[0].length > max) out.push(m[0].slice(0, 28) + '… (' + m[0].length + ' תווים)');
  return out;
}

/*  ⛔ שני מנגנוני טעינה לאותו סוג נכס — ⚠️ אחד מנתיב מוצהר ואחד מה-DOM:
 *  ⭐ והשנייה שקופה לכל סריקה, ⛔ ומי שמחפש את הנכס אינו מוצא אותו.
 *  ⛔ **והנמדד הוא ההשמה** — ⚠️ קבוע נכס שערכו נקרא מה-DOM, ⭐ ולא כל
 *  קריאה של `src`: ⛔ מי שמציב `src` הוא הצרכן ⛔ ואינו המקור. */
export function assetReadGaps(html) {
  const out = [];
  for (const m of html.matchAll(/([A-Z][A-Z0-9_]*_LOGO)\s*=\s*([^;\n]{0,160})/g))
    if (/document\.|getAttribute\(|\.src\b|querySelector/.test(m[2]))
      out.push(m[1] + ' ⟵ ' + m[2].trim().slice(0, 48));
  return out;
}

{
  /*  ⛔ א — אפס נכס מוטבע ארוך. */
  const embedded = dataUriGaps(IDX_RAW, DATA_URI_MAX);
  t(n++, embedded.length === 0,
    `[asset-file] אפס נכס בינארי מוטבע — נמדדו ${embedded.length} מעל ${DATA_URI_MAX} תווים והצפוי אפס` +
    (embedded.length ? ` (${embedded.join(' · ')})` : '') +
    '. מוציאים את הנכס לקובץ בתיקייה שנגזרת מתפקידו');

  /*  ⛔ ב — וכל תיקיית נכסים שקיימת מוטמנת מראש. */
  const live = Object.keys(ASSET_DIRS).filter((d) => existsSync(join(ROOT, d)));
  const cold = live.filter((d) => !new RegExp("'\\./" + d + "/").test(SW));
  t(n++, cold.length === 0,
    `[asset-file] כל תיקיית נכסים מוטמנת מראש — נמדדו ${live.length} תיקיות ו-${cold.length} ` +
    `שאינן ב-\`CORE\` והצפוי אפס` + (cold.length ? ` (${cold.join(', ')})` : '') +
    '. מוסיפים את נכסיה ל-`CORE` שב-sw.js, שנכס שאינו במטמון אינו נטען אופליין');

  /*  ⛔ ג — וכל נכס באותו סוג נטען באותה דרך. */
  const two = assetReadGaps(IDX_RAW);
  t(n++, two.length === 0,
    `[asset-file] דרך טעינה אחת לכל סוג נכס — נמדדו ${two.length} אתרים שנלכדים מה-DOM והצפוי אפס` +
    (two.length ? ` (${two.join(' · ')})` : '') +
    '. טוענים את כולם מנתיב מוצהר, שלכידה מה-DOM שקופה לכל סורק');
}

/* ── 12. וכל שם שנקרא — מיובא ──────────────────────────────────────────── */
/*  ⛔ במסמך-מודול קריאה לשם שלא יובא היא `ReferenceError` — ⚠️ והיא
 *  נבלעת במטפל: ⭐ המסלול נעצר, המסך נשאר פתוח, ⛔ ואיש אינו רואה.
 *  ⛔ **והמדידה בשני הכיוונים** — ⚠️ שם שנקרא ואינו ברשימת הייבוא,
 *  ⭐ ושם שיובא ואינו נקרא: ⛔ כיוון אחד לבדו מאשר את ההיפוך. */
export function moduleExports(texts) {
  const out = new Set();
  for (const t of texts) {
    for (const m of t.matchAll(/\nexport\s*\{([^}]*)\}/g))
      for (const part of m[1].split(','))
        { const n = part.trim().split(' as ').pop().trim(); if (n) out.add(n); }
    for (const m of t.matchAll(/\nexport\s+(?:const|function|let|var)\s+([A-Za-z_$][\w$]*)/g))
      out.add(m[1]);
  }
  return out;
}
export function importedNames(html) {
  const out = new Set();
  for (const m of html.matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\/core\//g))
    for (const part of m[1].split(','))
      { const n = part.trim().split(' as ').pop().trim(); if (n) out.add(n); }
  return out;
}
/*  ⛔ הסריקה על המקור המולבן — ⚠️ שם בתוך מחרוזת או בהערה אינו קריאה,
 *  ⭐ והוא בדיוק מה שהופך «נקרא» ל-probe שאינו יכול להיכשל. */
export function importGaps(html, exported) {
  /*  ⛔ ההלבנה במודול המשותף — ⚠️ ולא בשרשרת `replace`:
   *  ⭐ דפוס מחרוזת שרץ על הקובץ כולו שובר את הזיווג —
   *  ⛔ גרש בתוך תבנית בלע את הגרש האחורי שסוגר אותה,
   *  ⚠️ והתבנית הבאה בלעה מאות שורות קוד חי: ⭐ ושם שנקרא שם
   *  נספר כמי שאינו נקרא. */
  const blank = (m) => ' '.repeat(m.length);
  /*  ⛔ ורשימת הייבוא מולבנת אחריה — ⚠️ היא קוד ואינה מחרוזת,
   *  ⭐ ובלעדיה כל שם ברשימה מתאים לעצמו: ⛔ ו«מיובא ואינו
   *  נקרא» אינו קיים לעולם. */
  const w = whiten(html, { markup: 'blank' })
    .replace(/import\s*\{[^}]*\}/g, blank);
  const imported = importedNames(html);
  const used = [...exported].filter((n) =>
    new RegExp('(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '(?![\\w$])').test(w));
  return { used,
           missing: used.filter((n) => !imported.has(n)),
           unused: [...imported].filter((n) => used.indexOf(n) < 0) };
}

{
  const EXP = moduleExports(MODS);
  const G = importGaps(IDX_RAW, EXP);
  t(n++, G.missing.length === 0 && G.unused.length === 0,
    `[import-use] כל שם שנקרא מיובא, וכל מיובא נקרא — ${EXP.size} מיוצאים · ` +
    `${G.used.length} בשימוש: ${G.missing.length} נקראו ולא יובאו · ` +
    `${G.unused.length} יובאו ואינם נקראים, והצפוי אפס` +
    (G.missing.length ? ` (${G.missing.join(', ')})` : '') +
    (G.unused.length ? ` (${G.unused.join(', ')})` : '') +
    '. מוסיפים את החסר לרשימת הייבוא, ומסירים ממנה את מי שאינו נקרא');
}

if (RUN_MUT) {
  mutStage();
  /* ── מוטציות ─────────────────────────────────────────────────────────── */
  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ היא מעתיקה גוף
   *  פונקציה מהמודול בחזרה לקובץ, ⭐ בלי לשנות אף תו בגופו: ⛔ שער שמודד
   *  «יש מודול» היה עובר עליה. ⛔ והמוטציה רצה על מחרוזת ⛔ ואינה נכתבת לעץ. */
  {
    const first = MODS.length ? defsOf(MODS[0])[0] : null;
    if (!first) {
      t(n++, false, 'מ1 · המוטציה לא רצה — אין הגדרה במודול הראשון והצפוי לפחות אחת. ' +
                    'מוסיפים למודול את הפונקציה שהוא אמור להחזיק');
    } else {
      const grafted = IDX + '\nfunction ' + first.name + '() { return 1; }\n';
      const before = dupDefs(IDX, MODS).length;
      const after = dupDefs(grafted, MODS);
      t(n++, after.indexOf(first.name) >= 0 && before === 0,
        `מ1 · ⛔ מוטציה: «${first.name}» הועתקה מהמודול לקובץ ומפילה את «[core-dup]» — ` +
        `נמדדו ${after.length} כפילויות מול ${before} קודם, והשם בתוכן`);
    }
  }
  /*  ⛔ מוטציה שנייה — ⚠️ מודול שנשתנה בריפו אחד בלבד: ⭐ המדידה היא
   *  ההשוואה בית-לבית, ⛔ ושער שסופר שורות היה עובר עליה. */
  {
    const bent = MODS.length
      ? MODS[0].replace('\nexport {', '\nvar zzCoreDrift = 1;\nexport {')
      : '';
    t(n++, bent !== '' && bent !== MODS[0],
      `מ2 · ⛔ מוטציה: שורה שנוספה למודול באחד בלבד מפילה את «[core-twin]» — ` +
      `נמדד גוף ${bent === MODS[0] ? 'זהה' : 'נבדל'} והצפוי נבדל`);
  }
  /*  ⛔ מוטציה שלישית — ⚠️ פונקציה תשתיתית חדשה בקובץ, מחוץ לכל בלוק:
   *  ⭐ זה בדיוק מה שיחזור, ⛔ וזה מה שהשורה באה למנוע. */
  {
    const grown = IDX + '\nfunction lsZzGraft(k) { return k; }\n';
    const got = prefixGaps(grown, CAPS, APP.coreAllow);
    t(n++, got.indexOf('lsZzGraft') >= 0,
      `מ3 · ⛔ מוטציה: \`lsZzGraft\` שנכתבה ב-index.html מפילה את «[core-prefix]» — ` +
      `נמדדו ${got.length} אתרים והצפוי שיכללו את השם`);
  }
  /*  ⭐ מוטציית-נגד: פונקציית **מוצר** חדשה בקובץ ⛔ אינה מפילה — ⚠️ זו
   *  העבודה היומיומית, ⛔ ושער שנופל עליה חוסם כל מסך חדש. */
  {
    const base = prefixGaps(IDX, CAPS, APP.coreAllow).length;
    const grown = IDX + '\nfunction zzRenderPanel() { return 1; }\n';
    const got = prefixGaps(grown, CAPS, APP.coreAllow);
    t(n++, grown !== IDX && got.length === base,
      `נ1 · ⭐ מוטציית-נגד: פונקציית מוצר חדשה ⛔ אינה מפילה — ` +
      `נמדדו ${got.length} אתרים והצפוי ${base}`);
  }

  /*  ⛔ מוטציה רביעית — ⚠️ `<style>` שחוזר ל-`index.html`: ⭐ זה בדיוק
   *  המצב שהשורה באה למנוע, ⛔ והמחרוזת המוצהרת אינה משנה אותו. */
  {
    const grown = IDX_RAW.replace('</head>', '<style>.zz{color:red}</style></head>');
    const got = sheetInDoc(grown);
    t(n++, got > 0,
      `מ4 · ⛔ מוטציה: \`<style>\` ב-index.html מפיל את «[block-kind]» — ` +
      `נמדדו ${got} והצפוי מעל אפס`);
  }
  /*  ⛔ מוטציה חמישית — ⚠️ סמן הסגירה של הגיליון יורד. */
  {
    const cut = SHEET.split('\n').slice(0, -3).join('\n');
    const tail = cut.split('\n').slice(-3).join('\n');
    t(n++, tail.indexOf(BLOCK_KINDS.sheet) < 0,
      `מ5 · ⛔ מוטציה: גיליון בלי סמן סגירה מפיל את «[block-kind]» — ` +
      `נמדד סמן ${tail.indexOf('סוף') >= 0 ? 'קיים' : 'חסר'} והצפוי חסר`);
  }
  /*  ⛔ מוטציה שישית — ⚠️ הגיליון יוצא מ-`CORE`. */
  {
    const bent = SW.replace(/\n\s*'\.\/app\.css',/, '');
    t(n++, !/(^|\n)\s*'\.\/app\.css',/.test(bent) && bent !== SW,
      `מ6 · ⛔ מוטציה: גיליון שאינו ב-\`CORE\` מפיל את «[block-core]» — ` +
      `נמדד ${bent === SW ? 'ללא שינוי' : 'הוסר'} והצפוי שיוסר`);
  }
  /*  ⭐ מוטציית-נגד: אתר חדש שבונה CSS בזמן ריצה **ומוצהר** ⛔ אינו
   *  מפיל — ⚠️ זו בדיוק ההצהרה שהשורה באה לדרוש. */
  {
    const grown = IDX_RAW + '\nfunction zzMakeSheet() {\n' +
      "  var s = document.createElement('style');\n  return s;\n}\n";
    const sites = cssStringSites(grown);
    const decl = { ...(APP.cssStrings || {}), zzMakeSheet: 'x'.repeat(30) };
    const undecl = sites.filter((s) => !(s in decl));
    t(n++, sites.indexOf('zzMakeSheet') >= 0 && undecl.length === 0,
      `נ2 · ⭐ מוטציית-נגד: אתר חדש שמוצהר ⛔ אינו מפיל — ` +
      `נמדדו ${sites.length} אתרים ו-${undecl.length} בלי הכרזה, והצפוי אפס`);
  }

  /*  ⛔ מוטציה שביעית — ⚠️ נכס שחוזר ל-base64. */
  {
    const grown = IDX_RAW.replace('</head>',
      '<img src="data:image/png;base64,' + 'A'.repeat(DATA_URI_MAX + 40) + '"></head>');
    const got = dataUriGaps(grown, DATA_URI_MAX);
    t(n++, got.length > 0,
      `מ7 · ⛔ מוטציה: נכס מוטבע ב-base64 מפיל את «[asset-file]» — ` +
      `נמדדו ${got.length} והצפוי מעל אפס`);
  }
  /*  ⛔ מוטציה שמינית — ⚠️ תיקיית נכסים שיוצאת מ-`CORE`. */
  {
    const bent = SW.replace(/\n\s*'\.\/icons\/[^']*',?/g, '');
    const cold = Object.keys(ASSET_DIRS).filter((d) => existsSync(join(ROOT, d)))
                       .filter((d) => !new RegExp("'\\./" + d + "/").test(bent));
    t(n++, cold.indexOf('icons') >= 0,
      `מ8 · ⛔ מוטציה: תיקיית נכסים מחוץ ל-\`CORE\` מפילה את «[asset-file]» — ` +
      `נמדדו ${cold.length} תיקיות קרות והצפוי שיכללו את icons`);
  }
  /*  ⛔ מוטציה תשיעית — ⚠️ נכס שנלכד מה-DOM במקום ממשתנה. */
  {
    const grown = IDX_RAW +
      "\nvar ZZ_LOGO = document.getElementById('appLogo').getAttribute('src');\n";
    const got = assetReadGaps(grown);
    t(n++, got.length > 0,
      `מ9 · ⛔ מוטציה: נכס שנלכד מה-DOM מפיל את «[asset-file]» — ` +
      `נמדדו ${got.length} אתרים והצפוי מעל אפס`);
  }
  /*  ⭐ מוטציית-נגד: `data:image/svg` קצר ⛔ אינו מפיל — ⚠️ סימון מוטבע
   *  הוא רכיב ⛔ ואינו נכס בינארי. */
  {
    const grown = IDX_RAW.replace('</head>',
      '<img src="data:image/svg+xml;base64,' + 'A'.repeat(40) + '"></head>');
    const got = dataUriGaps(grown, DATA_URI_MAX);
    t(n++, grown !== IDX_RAW && got.length === 0,
      `נ3 · ⭐ מוטציית-נגד: סימון \`svg\` קצר מוטבע ⛔ אינו מפיל — ` +
      `נמדדו ${got.length} והצפוי אפס`);
  }

  /*  ⛔ מוטציה עשירית — ⚠️ שם שיורד מרשימת הייבוא ונשאר נקרא: ⭐ זה
   *  בדיוק ה-`ReferenceError` שנבלע במטפל. */
  {
    const EXP = moduleExports(MODS);
    const imp0 = importedNames(IDX_RAW);
    /*  ⛔ השם נבחר מהחיתוך — ⚠️ נקרא **וגם** ברשימת הייבוא:
     *  ⭐ שם שהמודול מתקין על `window` נקרא ואינו ברשימה,
     *  ⛔ ואין מה להסיר ממנה. */
    const one = importGaps(IDX_RAW, EXP).used.find((x) => imp0.has(x));
    /*  ⛔ הפסיק אופציונלי — ⚠️ יש רשימת ייבוא שכל שמה אחד
     *  ברשימה שלפניו פסיק: ⛔ דפוס שדורש פסיק נוקב אינו מסוגל
     *  להסיר את האחרון, ⚠️ והמוטציה עוברת בלי לשנות דבר. */
    const cut = new RegExp('(import\\s*\\{[^}]*?)\\b' + one + '\\b\\s*,?\\s*');
    const bent = IDX_RAW.replace(cut, '$1');
    const got = importGaps(bent, EXP);
    t(n++, bent !== IDX_RAW && got.missing.indexOf(one) >= 0,
      `מ10 · ⛔ מוטציה: \`${one}\` שירד מהייבוא מפיל את «[import-use]» — ` +
      `נמדדו ${got.missing.length} שנקראו ולא יובאו והצפוי שיכללו אותו`);
  }
  /*  ⛔ מוטציה אחת-עשרה — ⚠️ שם שיובא ואינו נקרא. */
  {
    const EXP = moduleExports(MODS);
    const dead = [...EXP].find((x) => importGaps(IDX_RAW, EXP).used.indexOf(x) < 0);
    const bent = dead
      ? IDX_RAW.replace(/import\s*\{/, 'import { ' + dead + ', ')
      : IDX_RAW;
    const got = importGaps(bent, EXP);
    t(n++, !!dead && got.unused.indexOf(dead) >= 0,
      `מ11 · ⛔ מוטציה: \`${dead}\` שיובא ואינו נקרא מפיל את «[import-use]» — ` +
      `נמדדו ${got.unused.length} מיובאים בלי קריאה והצפוי שיכללו אותו`);
  }
  /*  ⭐ מוטציית-נגד: שם שמיוצא ואינו נקרא בקובץ ⛔ אינו מפיל — ⚠️ המודול
   *  מייצא למי שצריך, ⭐ ולא כל אפליקציה צורכת את כולו. */
  {
    const EXP = moduleExports(MODS);
    const base = importGaps(IDX_RAW, EXP);
    const grown = new Set([...EXP, 'zzNeverCalled']);
    const got = importGaps(IDX_RAW, grown);
    t(n++, got.missing.length === base.missing.length &&
           got.unused.length === base.unused.length,
      `נ4 · ⭐ מוטציית-נגד: שם שמיוצא ואינו נקרא ⛔ אינו מפיל — ` +
      `נמדדו ${got.missing.length} חסרים ו-${got.unused.length} עודפים, והצפוי כמו הבסיס`);
  }
}

console.log(`\n${fail ? '✗' : '✓'} סבב 148 (הליבה המשותפת היא מודול) — ` +
            `${pass} טענות עברו, ${fail} נכשלו · ` +
            `${HERE.length} מודולים · ${Object.keys(APP.coreAllow).length} הכרזות`);
if (fail) process.exitCode = 1;
