#!/usr/bin/env node
/*  test_matrix_doc.mjs — המטריצה נאכפת על קלט התיעוד: ⛔ הטבלה עצמה.
 *
 *  **מה נאכף:** ⛔ כל תא בטבלת התשתית **נהפך בתורו**, ⛔ ובודק היכולות
 *  האמיתי רץ עליו בסינון «doc» — ⚠️ ודורש שכל היפוך ייתפס, בשני הכיוונים:
 *  תא ✅ בלי probe מפיל, ⛔ ותא ❌ עם probe מפיל גם כן. ⭐ ואיתו מבנה הטבלה —
 *  שם שורה שנפתח בסימן, ⛔ וסדר הפנים שכותרת הקטגוריה מצהירה.
 *
 *  **הנימוק המדוד:** בודק היכולות הורחב משלוש שורות ל**כל** השורות,
 *  ⛔ ואיש לא מדד שההרחבה אכן אוכפת — ⚠️ טענה שמסתפקת בקיום השם מאשרת
 *  קוד מת.
 *
 *  **מה יישבר בלעדיו:** ⛔ מטריצה שאיש אינו הופך היא הצהרה, ⚠️ ושורה
 *  שסימונה שגוי שולחת סבב עתידי לבנות מחדש משהו שכבר קיים.
 *
 *  **מה אינו נאכף כאן:** ⛔ מוטציות במקור האפליקציה ובקוד הכלים —
 *  ⚠️ כל קלט נמדד בחלק שלו, ⭐ ושם החלק אומר איזה. ⛔ ושורות שאכיפתן
 *  יושבת בשער אחר או בנימוק כתוב מוחרגות במפורש — ⚠️ הרשימה נגזרת
 *  ומושווית, ⛔ ואינה מתארכת בשקט.
 *
 *  ⛔ אין להחליף את הרצת-הבודק-האמיתי בסימולציה — ⚠️ בדיקה שאינה מריצה את
 *  השער עצמו אינה מוכיחה עליו דבר. ⛔ וההיפוכים רצים **בתהליך אחד**
 *  ⛔ ובלי לכתוב דבר — ⚠️ ההיפוך נמסר לבודק כארגומנט.
 *  זהה בית-לבית בכל הריפו פרט לבלוק APP.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FACTS } from './app-facts.mjs';

/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
/*  ⚠️ **ואין כאן ריצפה פרטית** — ⛔ מספר התאים נגזר מהטבלה, ⭐ והטבלה
 *  משותפת בית-לבית: כל תא מוסיף טענה אחת בכל אחת מהן. */
const FLOOR = { shared: 186, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך
 *  שלא הגיע לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה
 *  שמבדיל ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו.
 *  ⛔ **ושומר הרקורסיה הוא ריצת-משנה אף הוא** — ⚠️ הסט רץ שם על **עותק
 *  סינתטי** שאין לצידו אחיות ואין בו `.git`, ⭐ ולכן שער שמשווה מול אחות
 *  או קורא את סט המעקב מגיע לחלק מטענותיו **בכוונה**: ⛔ והריצפה נמדדת
 *  על עץ אמיתי ⛔ ולא שם. */
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.GATE_INNER;
/*  ⛔ הריצפה נמדדת בשני הכיוונים — ⚠️ **מה נכנס**: מספר הטענות
 *  שרצו עד שלב המוטציות; ⛔ **ומה מפיל**: פחות מהמוצהר — ריצה חלקית —
 *  ⛔ ויותר ממנו — ריצפה מיושנת. ⭐ **ולמה שני הכיוונים**: ריצפה שאינה
 *  מתעדכנת מפסיקה למדוד את מה שנוסף. ⛔ **וההשהיה על שלב המוטציות בלבד**
 *  — ⚠️ `mutStage` לוכדת את המונה בכניסה אליו, ⭐ ומה שהוא
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
  /*  ⛔ אפס שנמדד בכניסה לשלב המוטציות הוא דילוג מוצהר —
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


/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ שורה אחת נאכפת כאן — ⚠️ «בדיקה מוצהרת לפי הקלט שהיא קוראת»:
 *  ⭐ ההצהרה עצמה נסרקת ב-`check-capabilities`, ⛔ והצד השני — שמוטציה
 *  בקלט הזה עדיין מפילה אחרי הסינון — נמדד כאן. */
export const ROWS = [29];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

if (process.env.GATE_INNER) {
  console.log(`${GATE_ID}: ריצה פנימית — ⛔ מדלג, והשער אינו נמדד כאן (מניעת רקורסיה)`);
  process.exit(0);
}

/*  ⛔ כל גופו של השער הזה הוא מוטציה ובדיקת שלמות — ⚠️ ולכן
 *  הוא כולו מדלג ברמה המהירה, ⛔ ורץ ברמה המלאה בלבד. */
mutStage();
if (!RUN_MUT) {
  console.log(`${GATE_ID}: המוטציות רצות ברמה המלאה (--full) — ⛔ מדלג, ואינן נמדדות כאן`);
  process.exit(0);
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const ok = (msg, cond) => { RAN++;
  if (cond) { passed++; console.log('✅ ' + msg); }
  else      { failed++; console.error('❌ ' + msg); }
};

/*  ⛔ השורות שהיפוך התא שלהן אינו נמדד — ⚠️ **מה נכנס**: שורה
 *  שהיפוך התא שלה אינו מפיל אף חלק של הבודק, ⭐ וזה נמדד בהיפוך כל
 *  השורות בכל הריפו; ⛔ **ומה מפיל**: שורה שאינה ברשימה והיפוכה עובר,
 *  ⚠️ ושורה שברשימה והיפוך התא הירוק שלה נתפס — ⭐ החרגה שחדלה להתקיים.
 *  ⭐ **ולמה המבנה קיים**: הרשימה נגזרה מ-`GATES`, ⛔ ואמרה «נאכפת במקום
 *  אחר» ⛔ ולא «אינה נמדדת כאן» — ⚠️ ושורות שהיפוכן נתפס ישבו בה ולא
 *  נבדקו. ⛔ **והרשימה זהה בית-לבית בכולן** — ⚠️ ולכן החרגה שחדלה נמדדת
 *  רק על תא ירוק: ⭐ תא ⭕ שהתהפך לירוק נתפס בגלל הנימוק שלו, ⛔ ולא
 *  בגלל שהשורה נמדדת. ⛔ ומספר בהערה בגוף הרשימה נקרא כשורה. */
const EXEMPT = [
  18, 19, 23, 24, 25, 30, 33, 34, 35, 39, 40, 44, 45, 47, 49, 51, 54, 58, 60,
  61, 62, 68, 73, 85, 91, 92, 96, 106, 107, 115, 118, 121, 122, 123, 124, 125,
  126, 138, 139, 141, 144, 159, 168, 170, 172, 180, 181, 184, 192, 193, 199,
  204, 211, 213, 214, 216, 217, 218, 222, 223, 224, 232
];

/*  ⛔ `CAP_INPROC` מבטל את `process.exit` שבסופו של הבודק — ⚠️ בלעדיו
 *  הייבוא הראשון היה עוצר את השער הזה עצמו. ⛔ **ואין עותק** — ⚠️ החלק
 *  הזה אינו כותב: ⭐ ההיפוך נמסר כארגומנט, ⛔ ואינו נוגע בדיסק. */
process.env.CAP_INPROC = '1';
process.chdir(ROOT);
const DOC = path.join(ROOT, 'CLAUDE.md');
/*  ⛔ ייבוא אחד — ⚠️ הבודק חושף `run(over)`, ⭐ ו-`over` היא מפת
 *  נתיב⟵תוכן שגוברת על הדיסק: ⛔ ההיפוך נמסר כארגומנט ⛔ ואינו נכתב לעץ,
 *  ⚠️ ואינו דורש ייבוא טרי — ⭐ הנימוק המדוד: 684 היפוכים היו 684 כתיבות
 *  ו-684 ייבואים, ⛔ וכל ייבוא קרא את העץ כולו מחדש.
 *  ⛔ **ומדידה שנקטעת אינה משאירה שארית** — ⚠️ אין מה לשחזר. */
const CAP_MOD = await import(pathToFileURL(path.join(ROOT, 'tools', 'check-capabilities.mjs')).href);
const capRun = CAP_MOD.run;
/*  ⛔ החלק נגזר מאות הקטגוריה שבטבלה — ⚠️ הבודק מפוצל לשערים
 *  לפי נושא, ⭐ והיפוך תא מפיל את השער שהשורה שייכת לו: ⛔ הרצת החלק
 *  הלא-נכון הייתה מדווחת «לא נפל» על היפוך שכן נתפס. */
const partOf = CAP_MOD.partOfRow;
const CORE = CAP_MOD.CORE_PART;
function callRun(runFn, over, changed, part) {
  const lg = console.log, er = console.error, out = [];
  console.log = (...a) => out.push(a.join(' '));
  console.error = (...a) => out.push(a.join(' '));
  try { return { held: runFn(over, changed, part) === 0, out }; }
  catch (e) { out.push('❌ ' + (e && e.message)); return { held: false, out }; }
  finally { console.log = lg; console.error = er; }
}
/*  ⛔ ההיפוך מצהיר **מה השתנה** — ⚠️ הטבלה בלבד, ⭐ ולכן
 *  הבודק מריץ מחדש את הבדיקות שקוראות אותה ואת אלה שקוראות יותר
 *  ממשפחה אחת: ⛔ ובדיקה שקלטה לא זז מקבלת את הערך שנמדד בהרצה הנקייה
 *  שלמעלה — ⚠️ הבקרה החיובית היא זו שממלאת אותו, ⛔ ובלעדיה אין מה
 *  להחזיר והכל רץ. */
const DOC_ONLY = ['doc'];
const runChecker = (over, changed, part) => callRun(capRun, over, changed, part).held;
const docOver = (text) => ({ 'CLAUDE.md': text });

/*  היפוך תא: ✅↔❌, וכל ערך אחר (־«לא רלוונטי», «אין», «טביעה»,
 *  «רב-משתמשים») הופך ל-✅. כל אחד מאלה הוא שקר על הקוד, ולכן חייב
 *  להיתפס.                                                               */
function flipCell(line, col) {
  const parts = line.split('|');
  const i = 3 + col;
  if (i >= parts.length) return null;
  const cur = parts[i];
  parts[i] = cur.indexOf('✅') >= 0 ? ' ❌ ' : ' ✅ ';
  return parts.join('|');
}

const CLEAN_DOC = fs.readFileSync(DOC);
/*  ⛔ הבקרה החיובית על **כל** החלקים — ⚠️ חלק שנשבר על העץ
 *  הנקי היה מדווח «המוטציה נתפסה» על כל היפוך שנמסר לו: ⭐ «נפל» שאינו
 *  בגלל המוטציה אינו אכיפה. */
ok('בקרה חיובית: check-capabilities עובר על העץ כמות שהוא בכל חלקיו',
   CAP_MOD.PART_NAMES.every((pt) => runChecker(undefined, undefined, pt)));

/*  ⚠️ הטבלה מאותרת לפי **שורת הכותרת שלה** ולא לפי «כל שורה שמתחילה
 *  במספר» — ב-schar-limud יושבת מעליה טבלת מצב המיגרציות, ששורותיה
 *  `| 001 | … |` נקראות כ-1..12 ויש להן פחות עמודות. הסריקה נעצרת בשורה
 *  הראשונה שאינה שורת טבלה.                                             */
const docLines = CLEAN_DOC.toString('utf8').split('\n');
const head = docLines.findIndex((l) => /^\|\s*#\s*\|\s*שם\s*\|/.test(l));
const rows = [];
if (head >= 0) {
  for (let k = head + 1; k < docLines.length; k++) {
    if (!/^\|/.test(docLines[k])) break;
    const m = /^\|\s*(\d+)\s*\|/.exec(docLines[k]);
    if (m) rows.push({ row: Number(m[1]), line: docLines[k], at: k });
  }
}
ok('שורת הכותרת של טבלת התשתית נמצאה ב-CLAUDE.md', head >= 0);

ok(`טבלת התשתית נקראה מ-CLAUDE.md — ${rows.length} שורות`, rows.length >= 90);

let covered = 0;
const stale = [];
for (const r of rows) {
  const exempt = EXEMPT.indexOf(r.row) >= 0;
  const lines = CLEAN_DOC.toString('utf8').split('\n');
  const flipped = flipCell(lines[r.at], FACTS.col);
  if (flipped === null || flipped === lines[r.at]) {
    ok(`שורה ${r.row}: המוטציה לא הצליחה לשנות את התא`, false);
    continue;
  }
  lines[r.at] = flipped;
  /*  ⛔ ההיפוך נתפס בשער של השורה, ⛔ או בשער הליבה — ⚠️ שורה
   *  שנושאת נימוק חריגה אינה נמדדת ב-probe כלל, ⭐ ומה שתופס אותה הוא
   *  טענת המבנה שבליבה: «❌ בלי הערה». ⛔ והליבה נבדקת רק כשהשער של
   *  השורה החזיק — ⚠️ שתי ריצות לכל שורה היו מחזירות את הזמן שנחסך. */
  const over = docOver(lines.join('\n'));
  const mine = partOf(r.row);
  let caught = !runChecker(over, DOC_ONLY, mine) ? mine : '';
  if (!caught && mine !== CORE) caught = !runChecker(over, DOC_ONLY, CORE) ? CORE : '';
  if (exempt) {
    if (caught && r.line.split('|')[3 + FACTS.col].indexOf('✅') >= 0) stale.push(r.row);
    continue;
  }
  ok(`שורה ${r.row}: היפוך התא מפיל את ${caught || mine}`, !!caught);
  covered++;
}
ok(`[exempt-stale] שורה מוחרגת שהיפוך התא הירוק שלה נתפס — נמדדו ${stale.length} ` +
   `והצפוי 0${stale.length ? ` (${stale.join(', ')})` : ''}. מסירים אותה מ-EXEMPT`,
   stale.length === 0);

ok(`כל השורות שאינן מוחרגות נבדקו במוטציה (${covered}; מוחרגות: ${EXEMPT.length})`,
   covered === rows.filter((r) => EXEMPT.indexOf(r.row) < 0).length && covered > 0);

/* ────── ⛔ הסינון נמדד מול הריצה המלאה ──────────────────────────────────────
   ⛔ מה נאכף: היפוך תא נותן את **אותו פסק דין** בריצה המסוננת ובריצה
   המלאה. ⛔ הנימוק המדוד: הסינון הוא מה שהופך בדיקה שסווגה שגוי לבדיקה
   שאינה רצה על ההיפוך שאמור להפיל אותה — ⚠️ והיא מדווחת «עבר».
   ⛔ מה יישבר בלעדיו: סיווג שיסחף יעבור בשקט, ⭐ והמוטציות ימדדו פחות
   ממה שהן מצהירות. ⚠️ מה אינו נאכף כאן: **כל** ההיפוכים — ⛔ מדגם
   מוצהר ומנומק: ⭐ גודלו נגזר מתקציב הזמן של הסט ⛔ ואינו נבחר — ⚠️ ריצה
   מלאה אחת עולה כשלוש שניות, ⛔ ותקרת הסט קובעת כמה מהן נכנסות.
   ⭐ **והלולאה שמעל כבר מכסה את כולן בכיוון האחר** — ⚠️ היפוך שאינו
   מפיל בריצה המסוננת נתפס שם, ⛔ ולכן נשאר כאן הכיוון ההפוך בלבד.
   ──────────────────────────────────────────────────────────────────────── */
/*  ⛔ גודל המדגם נגזר מתקרת הסט ⛔ ואינו נבחר — ⚠️ כל היפוך הוא **שתי**
 *  ריצות של הבודק, ⭐ ותקרת הסט היא 105 שניות: ⛔ המספר הנמדד יושב
 *  בעמודת ההערות שבטבלה. */
const FILTER_SAMPLE = 2;
{
  const cand = rows.filter((r) => EXEMPT.indexOf(r.row) < 0);
  /*  ⛔ **המדגם מסתובב** ⛔ ואינו קבוע — ⚠️ מדגם קבוע בודק את אותן שתי
   *  שורות לנצח, ⭐ ומסתובב מכסה את כולן: ⛔ והנקודה נגזרת ממספר הסבב
   *  ⛔ ואינה מוקלדת. */
  const round = Number((/עודכן לאחרונה: סבב (\d+)/.exec(CLEAN_DOC.toString('utf8')) || [])[1]) || 0;
  const start = cand.length ? (round * FILTER_SAMPLE) % cand.length : 0;
  let seen = 0, same = 0, hit = [];
  for (let n = 0; n < cand.length && seen < FILTER_SAMPLE; n++) {
    const r = cand[(start + n) % cand.length];
    const lines = CLEAN_DOC.toString('utf8').split('\n');
    const flipped = flipCell(lines[r.at], FACTS.col);
    if (flipped === null || flipped === lines[r.at]) continue;
    lines[r.at] = flipped;
    const over = docOver(lines.join('\n'));
    const filtered = runChecker(over, DOC_ONLY, partOf(r.row));
    const full = runChecker(over, null, partOf(r.row));
    seen++; hit.push(r.row);
    if (filtered === full) same++;
    else ok(`שורה ${r.row}: הסינון «doc» מסכים עם הריצה המלאה`, false);
  }
  ok(`מדגם הסינון — ${same} מתוך ${seen} היפוכים נותנים אותו פסק דין ` +
     `מלא ומסונן (שורות ${hit.join('·')}, נקודת הפתיחה נגזרת מסבב ${round})`,
     seen > 0 && same === seen);
}

/*  ⭐ מוטציית-נגד — ⛔ בלעדיה ההיפוכים אינם מבחינות בין «מודד ערך»
 *  ל«סופר תווים»: ריפוד התא ברווחים **אינו** משנה את הערך
 *  שהמטריצה מצהירה, ⛔ ולכן `check-capabilities` חייב להמשיך לעבור. */
{
  const target = rows.find((r) => EXEMPT.indexOf(r.row) < 0);
  const lines = CLEAN_DOC.toString('utf8').split('\n');
  const parts = lines[target.at].split('|');
  parts[3 + FACTS.col] = '  ' + parts[3 + FACTS.col].trim() + '   ';
  lines[target.at] = parts.join('|');
  const held = runChecker(docOver(lines.join('\n')), DOC_ONLY, partOf(target.row));
  ok(`⭐ מוטציית-נגד: ריפוד התא בשורה ${target.row} ברווחים ⛔ אינו מפיל`, held);
}

/* ────── ⛔ שתי טענות המבנה של הטבלה ─────────────────────────────────────────
   ⛔ מה נאכף: שם שורה שנפתח בסימן · וסדר הפנים שכותרת הקטגוריה מצהירה —
   ⚠️ שתיהן נמדדות ב-check-capabilities, ⛔ ואף אחת מהן אינה נמדדת בהיפוך
   תא: ⭐ ההיפוך מודד **סימון**, ⛔ והן מודדות **מבנה**. ⛔ הנימוק המדוד:
   שלוש שורות ישבו בקטגוריה של המנגנון שאוכף אותן. ⛔ מה יישבר בלעדיו:
   probe שנוסף ואינו מוטט הוא probe שאיש לא הוכיח שהוא מפיל. ⛔ מה אינו
   נאכף כאן: תוכן השלבים — ⭐ «למה שורה שייכת לשלב» היא קריאת משמעות,
   ⚠️ והמרשם הוא מה שנמדד.
   ⚠️ כל מוטציה נוקבת בשם הטענה שתיפול ⛔ ונבדק שהיא זו שנפלה.
   ──────────────────────────────────────────────────────────────────────── */
{
  const CLEAN_TXT = CLEAN_DOC.toString('utf8');
  const runClaim = (label, text, mustFall, claim) => {
    ok('המוטציה «' + label + '» שינתה את הקוד שנמסר לריצה', text !== CLEAN_TXT);
    const { held, out } = callRun(capRun, docOver(text));
    if (!mustFall) { ok('⭐ מוטציית-נגד: ' + label + ' ⛔ אינה מפילה', held); return; }
    ok('⛔ מוטציה: ' + label + ' מפילה את «' + claim + '»',
       !held && out.some((l) => l.indexOf('❌') === 0 && l.indexOf(claim) >= 0));
  };

  /*  ⛔ שם שורה שנפתח בסימן — ⚠️ הסימן נכנס לשם ⛔ ולא לתקן. */
  runClaim('סימן פותח בשם שורה',
    CLEAN_TXT.replace(/^\| (\d+) \| ([^|⛔⚠️⭐])/m, '| $1 | ⛔ $2'),
    true, 'שמות שורה שנפתחים בסימן');
  /*  ⛔ שורה שהוזזה לשלב אחר — ⚠️ «אחסון מקומי» עולה לפני שורות המסך,
   *  ⭐ והמספור נגזר מחדש: ⛔ מה שמופר הוא הסדר שהכותרת הצהירה ⛔ ולא
   *  המספור — ⚠️ מוטציה שמשאירה מספור שבור מפילה טענה אחרת. */
  const moved = (() => {
    const L = CLEAN_TXT.split('\n');
    const i = L.findIndex((l) => (l.split('|')[2] || '').trim() === 'אחסון מקומי');
    const j = L.findIndex((l) => (l.split('|')[2] || '').trim() === 'מסך מציג מיד ומרענן ברקע');
    if (i < 0 || j < 0 || j > i) return CLEAN_TXT;
    const cut = L.splice(i, 1)[0];
    L.splice(j, 0, cut);
    let n = 0;
    return L.map((l) => (/^\|\s*\d+\s*\|/.test(l)
      ? l.replace(/^\|\s*\d+\s*\|/, () => { n++; return '| ' + n + ' |'; }) : l)).join('\n');
  })();
  runClaim('שורה שהוזזה לשלב אחר בקטגוריה', moved, true, 'סדר הפנים בקטגוריות');
  /*  ⭐ מוטציית-נגד חיה: ⛔ שתי שורות **באותו שלב** מחליפות מקום — ⚠️ שינוי
   *  חי בטבלה עצמה ⛔ ולא הערה: ⭐ הסדר בין שכנות בתוך שלב אינו נגזר
   *  מהטקסט, ⚠️ ולכן החלפתן אינה מפילה. */
  const swapped = (() => {
    const L = CLEAN_TXT.split('\n');
    const at = (nm) => L.findIndex((l) => (l.split('|')[2] || '').trim() === nm);
    const i = at('מפרידי `═` ברוחב 74'), j = at('מפרידים ב-`tools`');
    if (i < 0 || j < 0) return CLEAN_TXT;
    const a = L[i].split('|'), b = L[j].split('|');
    const t2 = a[2], t3 = a[3];
    a[2] = b[2]; a[3] = b[3]; b[2] = t2; b[3] = t3;
    L[i] = a.join('|'); L[j] = b.join('|');
    return L.join('\n');
  })();
  runClaim('החלפת מקום בין שתי שורות באותו שלב', swapped, false);
  /*  ⛔ פסקית התנאי יורדת משורת ערכת הנושא — ⚠️ השורה נמצאת **בשמה**
   *  ⛔ ולא במספרה: ⭐ התנאי הוא מה שמתיר את השאילתה, ⛔ ובלעדיו
   *  `prefers-color-scheme` הוא תנאי שאין לו שורה. */
  const THEME = 'ערכת נושא — בהיר וכהה';
  const noClause = CLEAN_TXT.split('\n').map((l) => ((l.split('|')[2] || '').trim() === THEME
    ? l.replace(/ · ⛔ \*\*ותנאי ה-`@media` שלה — [^*]*\*\*/, '') : l)).join('\n');
  /*  ⚠️ הריצה בחלק שבו השורה נמדדת — ⛔ ריצה בלי חלק מריצה את הליבה בלבד,
   *  ⭐ ורשומת ה-MATRIX של השורה אינה בה. */
  const themeRow = +(CLEAN_TXT.split('\n').find((l) => (l.split('|')[2] || '').trim() === THEME) || '|0|').split('|')[1];
  ok('המוטציה «פסקית התנאי יורדת משורת ערכת הנושא» שינתה את הקוד שנמסר לריצה', noClause !== CLEAN_TXT);
  {
    const { held, out } = callRun(capRun, docOver(noClause), undefined, partOf(themeRow));
    ok('⛔ מוטציה: פסקית התנאי יורדת משורת ערכת הנושא מפילה את שורה ' + themeRow,
       !held && out.some((l) => l.indexOf('❌ שורה ' + themeRow + ' ') === 0));
  }
}

/*  ⛔ הצהרת קלט הבדיקות — ⚠️ התווית שב-`APP.probeInput` היא מה שקובע אילו
 *  בדיקות רצות שוב כשהטבלה מתהפכת, ⭐ וכל היפוך למעלה רץ בסינון «doc»:
 *  ⛔ היפוך שעבר שם היה בדיקה שהסינון השתיק. */
ok(`⛔ הצהרת קלט הבדיקות — ${covered} היפוכי תא רצו בסינון «doc» וכולם הפילו`,
   covered > 0 && failed === 0);

console.log(failed ? `\n✗ ${GATE_ID} (מטריצה · doc) — ${failed} נכשלו, ${passed} עברו`
                   : `\n✓ ${GATE_ID} (מטריצה · doc) — ${passed} טענות עברו`);
process.exit(failed ? 1 : 0);
