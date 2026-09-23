#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
   test_scanscan.mjs — כל דפוס מוכרז נושא מוטציה (סבב 141)

   **מה נאכף:** ⛔ לכל סורק — כל דפוס שהוא מכריז נושא מוטציה · ⚠️ וכל מוטציה
   נוקבת בדפוס מוכרז · ⭐ ולכל סורק מוטציית-נגד · ⛔ והיקף החילוץ
   נבדק על קלט שנושא תבנית `regex` · מחרוזת עם סוגר · והערה עם סוגר.

   **הנימוק המדוד:** ⚠️ חמש הסריקות מכריזות דפוסים ⛔ ואיש לא מדד שלכל דפוס יש
   מוטציה: ⭐ ומונה הסוגריים נמתח מעל סוף הגוף מפני שלא דילג על
   תבנית — ⛔ ושלוש מוטציות חשפו probe שלא יכול היה להיכשל, ⚠️ במקרה.

   **מה יישבר בלעדיו:** ⛔ דפוס בלי מוטציה נשחק בשקט — ⚠️ הסורק ממשיך להכריז עליו,
   ⭐ והוא כבר אינו נמדד: ⛔ הצהרה בלבוש של אכיפה.

   **מה אינו נאכף כאן:** ⚠️ **האם הדפוס עצמו נכון** — ⛔ זו קריאת משמעות · ⛔ ותוכן
   הסורק, שנמדד בשער שלו.
   ──────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bodyOf, scopeOf } from './scope.mjs';
import { FACTS } from './app-facts.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  /*  ⛔ הסורקים שהסבב הוסיף — ⚠️ **מה נכנס**: שם קובץ שער שמכריז דפוסים
   *  ומייצא `PATTERNS` ו-`MUTS`; ⛔ **ומה מפיל**: רשימה ריקה, שם שאין לו
   *  קובץ, ושם שאינו מחווט. ⭐ **ולמה המבנה קיים**: רשימה ריקה הופכת את
   *  שלוש הבדיקות שמעליה לבדיקות שאינן יכולות להיכשל. */
  scanners: ['test_visual.mjs', 'test_codescan.mjs', 'test_dbfacts.mjs',
             'test_dbscan.mjs',
             'test_textscan.mjs', 'test_declscan.mjs', 'test_scanscan.mjs',
             'test_rowscan.mjs'],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [40];

/*  ⛔ המרשם שהסורק מכריז — ⚠️ **מה נכנס**: שם הדפוס שהשער אוכף;
 *  ⛔ **ומה מפיל**: דפוס שאין לו מוטציה, ומוטציה שנוקבת בדפוס שאינו כאן.
 *  ⭐ **ולמה גם כאן**: סורק שאינו מוצלב בעצמו הוא בדיוק ההצהרה שהוא בא
 *  לתפוס — ⚠️ ולכן הוא ברשימת הסורקים שלו. */
export const PATTERNS = ['pattern-no-mut', 'mut-no-pattern', 'no-anti', 'scope'];
export const MUTS = ['pattern-no-mut', 'mut-no-pattern', 'no-anti', 'scope'];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
/*  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ כל טענה שאין לה מה למדוד בריפו הזה
 *  נושאת שורת נימוק ⛔ ואינה מדולגת: ⭐ המספר זהה בכולן. */
const FLOOR = { shared: 7, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו.
 *  ⛔ **ושומר הרקורסיה הוא ריצת-משנה אף הוא** — ⚠️ הסט רץ שם על **עותק
 *  סינתטי** שאין לצידו אחיות ואין בו `.git`, ⭐ ולכן שער שמשווה מול אחות
 *  או קורא את סט המעקב מגיע לחלק מטענותיו **בכוונה**: ⛔ והריצפה נמדדת
 *  על עץ אמיתי ⛔ ולא שם. */
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.R33_INNER;
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
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — עדכן את \`FLOOR\`.`);
    process.exitCode = 1;
  }
});
const t = (c, m) => { RAN++; if (c) { pass++; console.log('  ok   ' + m); }
                      else { fail++; console.error('  FAIL ' + m); } };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/*  ⛔ הסורקים המוכרזים — ⚠️ **מה נכנס**: שם קובץ שער שמכריז דפוסים;
 *  ⛔ **ומה מפיל**: רשימה ריקה, שם שאין לו קובץ, ושם שאינו מחווט.
 *  ⭐ **ולמה המבנה קיים**: רשימה ריקה הופכת את שלוש הבדיקות שמעליה
 *  לבדיקות שאינן יכולות להיכשל. */
const js = rd('tools/check-js.mjs');
const wired = new Set([...((/gates: \[([\s\S]*?)\],/.exec(js) || ['', ''])[1])
  .matchAll(/'([a-z_-]+)\.mjs'/g)].map((m) => m[1] + '.mjs'));

{
  const absent = APP.scanners.filter((g) => !fs.existsSync(path.join(ROOT, 'tools', g)));
  const idle = APP.scanners.filter((g) => !absent.includes(g) && !wired.has(g));
  t(APP.scanners.length > 0 && absent.length === 0 && idle.length === 0,
    `הסורקים המוכרזים — נמדדו ${APP.scanners.length} סורקים, ${absent.length} שאינם קיימים ` +
    `ו-${idle.length} שאינם מחווטים; והצפוי לפחות אחד וכולם קיימים ורצים` +
    (absent.length || idle.length ? `: ${[...absent, ...idle].join(' · ')}. מוסיפים את הקובץ, או מחווטים אותו` : ''));
}

/*  ⛔ המרשמים נקראים מגוף הסורק — ⚠️ `PATTERNS` הוא מה שהוא מכריז,
 *  ⛔ ו-`MUTS` הוא מה שהוא מוטט: ⭐ וסורק שאינו מייצא אותם אינו ניתן
 *  להצלבה, ⚠️ והוא בדיוק «הצהרה בלבוש של אכיפה». */
function listOf(src, name) {
  const m = new RegExp('export const ' + name + ' = \\[([\\s\\S]*?)\\];').exec(src);
  if (!m) return null;
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/* ── א · כל דפוס מוכרז — יש לו מוטציה ──────────────────────────────────── */
/* ── ב · וכל מוטציה נוקבת בדפוס מוכרז, ובו בלבד ────────────────────────── */
/* ── ג · ולכל סורק מוטציית-נגד ─────────────────────────────────────────── */
{
  const noReg = [], noMut = [], stray = [], noAnti = [];
  for (const g of APP.scanners) {
    const p = path.join(ROOT, 'tools', g);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    const pats = listOf(src, 'PATTERNS');
    const muts = listOf(src, 'MUTS');
    if (!pats || !muts) { noReg.push(g); continue; }
    for (const x of pats) if (!muts.includes(x)) noMut.push(`${g}::${x}`);
    for (const x of muts) if (!pats.includes(x)) stray.push(`${g}::${x}`);
    if (!/מוטציית-נגד/.test(src)) noAnti.push(g);
  }
  t(noReg.length === 0,
    `הסורקים מייצאים מרשם — נמדדו ${noReg.length} בלי \`PATTERNS\`/\`MUTS\` והצפוי אפס` +
    (noReg.length ? `: ${noReg.join(' · ')}. מייצאים את שני המרשמים — ⛔ סורק שאינו מייצא אותם אינו ניתן להצלבה` : ''));
  t(noMut.length === 0,
    `א · כל דפוס מוכרז נושא מוטציה — נמדדו ${noMut.length} בלי מוטציה והצפוי אפס` +
    (noMut.length ? `: ${noMut.slice(0, 8).join(' · ')}. מוסיפים מוטציה לדפוס — ⛔ דפוס בלי מוטציה הוא הצהרה ולא אכיפה` : ''));
  t(stray.length === 0,
    `ב · כל מוטציה נוקבת בדפוס מוכרז — נמדדו ${stray.length} שאין להן דפוס והצפוי אפס` +
    (stray.length ? `: ${stray.slice(0, 8).join(' · ')}. מיישרים את השם למרשם הדפוסים` : ''));
  t(noAnti.length === 0,
    `ג · לכל סורק מוטציית-נגד — נמדדו ${noAnti.length} בלעדיה והצפוי אפס` +
    (noAnti.length ? `: ${noAnti.join(' · ')}. מוסיפים שינוי חי שאסור לו להפיל` : ''));
}

/* ── ד · היקף החילוץ נבדק על קלט עוין ──────────────────────────────────── */
{
  /*  ⛔ שלושת סוגי הטקסט שנושאים סוגריים שאינם מבנה — ⚠️ תבנית `regex` ·
   *  מחרוזת · והערה: ⭐ הנימוק המדוד — מונה שאינו מדלג על תבנית נמתח מעל
   *  סוף הגוף, ⛔ ומסווג את הבדיקה להיקף שאינו שלה. */
  const CASES = [
    ['תבנית regex עם סוגר פותח', 'function f(){ var r = /\\.toast\\{/; var x=1; } function g(){ var y=2; }'],
    ['מחרוזת עם סוגר פותח',      'function f(){ var s = "a{b"; var x=1; } function g(){ var y=2; }'],
    ['הערה עם סוגר סוגר',        'function f(){ /* } */ var x=1; } function g(){ var y=2; }'],
    ['תבנית עם אינטרפולציה',     'function f(){ var s = `a${1}b`; var x=1; } function g(){ var y=2; }'],
    ['regex עם סוגר במחלקת תווים', 'function f(){ var r = /[{]/; var x=1; } function g(){ var y=2; }'],
    ['חלוקה שאינה תבנית',        'function f(){ var a=4,b=2,c=a/b; var x=1; } function g(){ var y=2; }'],
  ];
  const bad = CASES.filter(([, src]) => {
    const b = bodyOf(src, 'f');
    return !(b.includes('x=1') && !b.includes('y=2'));
  }).map(([n]) => n);
  t(bad.length === 0,
    `ד · \`bodyOf\` על קלט עוין — נמדדו ${bad.length} מתוך ${CASES.length} שנמתחו מעל הגוף והצפוי אפס` +
    (bad.length ? `: ${bad.join(' · ')}. מוסיפים דילוג על הסוג שנמתח` : ''));

  const many = scopeOf('<div class="k">A</div><span>x</span><div class="k">B</div>', '.k');
  const voidT = scopeOf('<input class="q"><p>tail</p>', '.q');
  t(many.includes('A') && many.includes('B') && !many.includes('<span>') && !voidT.includes('tail'),
    'ד · `scopeOf` — כל האלמנטים שמתאימים, ⛔ ותגית בלי סוגר נעצרת בעצמה');
}

mutStage();
if (RUN_MUT) {
  /*  ⛔ המוטציות בזיכרון — ⚠️ הן מחליפות את **הטקסט** של סורק אחד,
   *  ⭐ ואינן כותבות לעץ ⛔ ואינן פותחות תהליך. */
  const G = APP.scanners[0];
  const SRC = G ? rd('tools/' + G) : '';
  const listIn = (src, name) => {
    const m = new RegExp('export const ' + name + ' = \\[([\\s\\S]*?)\\];').exec(src);
    return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : null;
  };
  /*  ⛔ הבדיקות מופעלות על טקסט שהוחלף — ⚠️ אותה פונקציה בדיוק, ⭐ וההבדל
   *  הוא הקלט: ⛔ מוטציה שמריצה קוד אחר אינה מודדת את מה שרץ בפועל. */
  const check = (src) => {
    const pats = listIn(src, 'PATTERNS') || [];
    const muts = listIn(src, 'MUTS') || [];
    return { noMut: pats.filter((x) => !muts.includes(x)),
             stray: muts.filter((x) => !pats.includes(x)),
             anti: /מוטציית-נגד/.test(src) };
  };
  const base = check(SRC);
  t(!!G && base.noMut.length === 0 && base.stray.length === 0 && base.anti,
    `קו הבסיס — הסורק «${G || 'אין'}» מוצלב נקי`);

  /*  מ1 · דפוס מוכרז שאין לו מוטציה */
  {
    const pats = listIn(SRC, 'PATTERNS') || [];
    const hurt = SRC.replace(/(export const PATTERNS = \[)/, "$1\n  'zzNoMutation',");
    t(pats.length > 0 && check(hurt).noMut.length > base.noMut.length,
      'מ1 · דפוס מוכרז שאין לו מוטציה **מפיל** את «א»');
  }
  /*  מ2 · מוטציה שנוקבת בדפוס שאינו מוכרז */
  {
    const hurt = SRC.replace(/(export const MUTS = \[)/, "$1\n  'zzNoPattern',");
    t(check(hurt).stray.length > base.stray.length,
      'מ2 · מוטציה בלי דפוס מוכרז **מפילה** את «ב»');
  }
  /*  מ3 · סורק בלי מוטציית-נגד */
  {
    const hurt = SRC.split('מוטציית-נגד').join('מוטציית_נגד_שאינה');
    t(check(hurt).anti === false, 'מ3 · סורק בלי מוטציית-נגד **מפיל** את «ג»');
  }
  /*  מ4 · מונה סוגריים שאינו מדלג על תבנית */
  {
    /*  ⛔ מונה נאיבי — ⚠️ בדיוק הצורה ששרדה לפני שהמודול נכתב: ⭐ הוא
     *  נמתח מעל סוף הגוף כשיש בו תבנית `regex`. */
    const naive = (src, mark) => {
      const at = src.indexOf('function ' + mark + '(');
      if (at < 0) return '';
      const from = src.indexOf('{', at);
      let d = 0;
      for (let i = from; i < src.length; i++) {
        if (src[i] === '{') d++;
        else if (src[i] === '}') { d--; if (!d) return src.slice(from, i + 1); }
      }
      return '';
    };
    const probe = 'function f(){ var r = /\\.toast\\{/; var x=1; } function g(){ var y=2; }';
    /*  ⛔ הנמדד הוא **שהתשובות נבדלות** — ⚠️ המונה הנאיבי נמתח מעל הגוף
     *  ואינו נסגר כלל, ⭐ והמודול חותך בדיוק: ⛔ «הוא מכיל את השני» אינו
     *  הצורה היחידה שבה מונה שבור נכשל. */
    const naiveOut = naive(probe, 'f'), realOut = bodyOf(probe, 'f');
    t(naiveOut !== realOut && realOut.includes('x=1') && !realOut.includes('y=2'),
      'מ4 · מונה שאינו מדלג על תבנית אינו חותך כמו המודול — ⛔ והמודול חותך נכון');
  }
  /*  ⭐ מוטציית-נגד: שם דפוס שהוחלף **בשני המרשמים** ⛔ אינו מפיל — ⚠️ הנמדד
   *  הוא ההצלבה בין שני המרשמים, ⛔ ולא שם הדפוס עצמו. */
  {
    const pats = listIn(SRC, 'PATTERNS') || [];
    const k = pats[0];
    const hurt = k ? SRC.split("'" + k + "'").join("'" + k + "Z'") : SRC;
    const r = check(hurt);
    t(!k || (r.noMut.length === base.noMut.length && r.stray.length === base.stray.length),
      'נ1 · שם דפוס שהוחלף בעקביות בשני המרשמים — ⛔ אינו מפיל');
  }
}

if (fail) {
  console.error(`\n❌ ${GATE_ID}: ${fail} כשלים מתוך ${pass + fail}`);
  process.exit(1);
}
console.log(`\n✅ ${GATE_ID}: ${pass} טענות`);
