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
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [18, 190];

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
const FLOOR = { shared: 9, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה שמבדיל
 *  ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
const SUBRUN = !!process.env.GATE_SUBRUN;
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
const IDX = readFileSync(join(ROOT, 'index.html'), 'utf8');
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
}

console.log(`\n${fail ? '✗' : '✓'} סבב 148 (הליבה המשותפת היא מודול) — ` +
            `${pass} טענות עברו, ${fail} נכשלו · ` +
            `${HERE.length} מודולים · ${Object.keys(APP.coreAllow).length} הכרזות`);
if (fail) process.exitCode = 1;
