#!/usr/bin/env node
/*  test_matrix.mjs — סבב 37: המטריצה נאכפת, ולא מוצהרת.
 *
 *  `check-capabilities.mjs` הורחב בסבב 37 משלוש שורות ל**כל** שורות
 *  מטריצת היכולות, בשני הכיוונים: ✅ בלי probe מפיל, ו-❌ עם probe מפיל
 *  גם כן. הקובץ הזה מוכיח שזה לא הצהרה — הוא **הופך כל תא בתורו** בעותק
 *  זמני של העץ ומריץ את הבודק האמיתי, ודורש שכל היפוך ייתפס.
 *
 *  ⛔ אין להחליף את הרצת-הבודק-האמיתי בסימולציה (סבב 37) — בדיקה שאינה
 *  מריצה את השער עצמו אינה מוכיחה עליו דבר.
 *
 *  ⛔ וההיפוכים רצים **בתהליך אחד** (סבב 72) — ⚠️ תהליך חדש לכל תא עלה
 *  עשר שניות מכל הרצת שער. ⭐ ההיפוך נוגע ב-`CLAUDE.md` בלבד, ולכן עותק
 *  אחד מספיק, והבודק מיובא מחדש עם מפתח מטמון חדש בכל סיבוב.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = { app: 'schar-limud', col: 3 };
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

if (process.env.R33_INNER || process.env.R37_INNER) {
  console.log('test_matrix: ריצה פנימית — מדלג (מניעת רקורסיה)');
  process.exit(0);
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const ok = (msg, cond) => {
  if (cond) { passed++; console.log('✅ ' + msg); }
  else      { failed++; console.error('❌ ' + msg); }
};

/*  ⛔ שתי השורות האלה מוחרגות מהמוטציה, וזו אינה השמטה (סבב 37) — שתיהן
 *  מצהירות על **עובדת מסד** שאין דרך לראות מהריפו: 21 («הגיבוי קורא
 *  מטבלאות מובנות») תלויה בכך שהטבלאות נוצרו, ו-22 («משימת pg_cron»)
 *  בכך שהמשימה רשומה. הצד שכן ניתן לבדיקה נאכף ב-test_cron.mjs.
 *  ⚠️ הרשימה חייבת להישאר קצרה — כל שורה נוספת כאן היא שורה שאיש אינו
 *  שומר עליה.                                                            */
/*  ⛔ אין להאריך את הרשימה מעבר ל-`GATES` (סבב 69) — כל שורה כאן נאכפת בשער אחר או
 *  נושאת נימוק כתוב שם (`GATES`), ⛔ ולכן היפוך התא שלהן אינו אמור
 *  להפיל אותו. ⛔ הרשימה חייבת להישאר נגזרת מ-`GATES` ולא להתארך מעבר לו,
 *  ⛔ **פרט לשורות ש-`DB_FACT_EXEMPT` מונה במפורש**. */
/*  ⛔ שתי השורות שאינן ב-`GATES` ובכל זאת מוחרגות — ומוצהרות כרשימה
 *  ולא כמשפט בהערה (סבב 71): ⚠️ שער אחר משווה את `EXEMPT` ל-`GATES`,
 *  ⛔ ורשימה שחיה בהערה אינה ניתנת להשוואה. ⭐ שתיהן מצהירות על **עובדת
 *  מסד** שאין דרך לראות מהריפו: שטבלת הגיבוי נוצרה, ושמשימת ה-`pg_cron`
 *  רשומה — ⛔ והצד שכן ניתן לבדיקה נאכף ב-test_cron. */
const DB_FACT_EXEMPT = [47, 92];
const EXEMPT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 47, 56, 60, 62, 65, 66, 67, 68, 69, 70, 71, 73, 75, 76, 78, 80, 82, 86, 89, 90, 92, 97, 98, 101, 102, 104, 106, 107, 109, 110, 111, 112, 113, 114, 115, 116, 118, 119];

function copyRepo() {
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), APP.app + '-r37-'));
  fs.cpSync(ROOT, dst, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(ROOT, src);
      return !rel.split(path.sep).includes('.git') &&
             !rel.split(path.sep).includes('node_modules');
    },
  });
  return dst;
}

/*  ⛔ `CAP_INPROC` מבטל את `process.exit` שבסופו של הבודק — ⚠️ בלעדיו
 *  הייבוא הראשון היה עוצר את השער הזה עצמו. */
process.env.CAP_INPROC = '1';
const WORK = copyRepo();
process.chdir(WORK);
const CHECKER = pathToFileURL(path.join(WORK, 'tools', 'check-capabilities.mjs')).href;
const DOC_IN_WORK = path.join(WORK, 'CLAUDE.md');
let spin = 0;
async function runChecker() {
  const lg = console.log, er = console.error;
  console.log = () => {}; console.error = () => {};
  try {
    const mod = await import(`${CHECKER}?flip=${spin++}`);
    return mod.capFailures === 0;
  } catch (e) {
    return false;
  } finally { console.log = lg; console.error = er; }
}

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

const CLEAN_DOC = fs.readFileSync(DOC_IN_WORK);
ok('בקרה חיובית: check-capabilities עובר על העץ כמות שהוא', await runChecker());

/*  ⚠️ הטבלה מאותרת לפי **שורת הכותרת שלה** ולא לפי «כל שורה שמתחילה
 *  במספר» (סבב 37) — ב-schar-limud יושבת מעליה טבלת מצב המיגרציות, ששורותיה
 *  `| 001 | … |` נקראות כ-1..12 ויש להן פחות עמודות. הסריקה נעצרת בשורה
 *  הראשונה שאינה שורת טבלה.                                             */
const DOC = path.join(ROOT, 'CLAUDE.md');
const docLines = fs.readFileSync(DOC, 'utf8').split('\n');
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
for (const r of rows) {
  if (EXEMPT.indexOf(r.row) >= 0) continue;
  const lines = CLEAN_DOC.toString('utf8').split('\n');
  const flipped = flipCell(lines[r.at], APP.col);
  if (flipped === null || flipped === lines[r.at]) {
    ok(`שורה ${r.row}: המוטציה לא הצליחה לשנות את התא`, false);
    continue;
  }
  lines[r.at] = flipped;
  fs.writeFileSync(DOC_IN_WORK, lines.join('\n'));
  const stillPasses = await runChecker();
  fs.writeFileSync(DOC_IN_WORK, CLEAN_DOC);
  ok(`שורה ${r.row}: היפוך התא מפיל את check-capabilities`, !stillPasses);
  covered++;
}

ok(`כל השורות שאינן מוחרגות נבדקו במוטציה (${covered}; מוחרגות: ${EXEMPT.join(', ')})`,
   covered === rows.length - EXEMPT.length && covered > 0);

/*  ⭐ מוטציית-נגד — ⛔ בלעדיה ההיפוכים אינם מבחינות בין «מודד ערך»
 *  ל«סופר תווים» (סבב 68): ריפוד התא ברווחים **אינו** משנה את הערך
 *  שהמטריצה מצהירה, ⛔ ולכן `check-capabilities` חייב להמשיך לעבור. */
{
  const target = rows.find((r) => EXEMPT.indexOf(r.row) < 0);
  const lines = CLEAN_DOC.toString('utf8').split('\n');
  const parts = lines[target.at].split('|');
  parts[3 + APP.col] = '  ' + parts[3 + APP.col].trim() + '   ';
  lines[target.at] = parts.join('|');
  fs.writeFileSync(DOC_IN_WORK, lines.join('\n'));
  const held = await runChecker();
  fs.writeFileSync(DOC_IN_WORK, CLEAN_DOC);
  ok(`⭐ מוטציית-נגד: ריפוד התא בשורה ${target.row} ברווחים ⛔ אינו מפיל`, held);
}

/*  ⭐ שורה שכמה שערים אוכפים אותה (סבב 72) — ⛔ המוטציה מסירה שער
 *  אחד מ-`claims` בעוד הוא ממשיך להצהיר עליה ב-`ROWS`, ⚠️ והטענה
 *  שאמורה ליפול היא «אי-התאמה בין ROWS ל-claims». */
{
  const CAP = path.join(WORK, 'tools', 'check-capabilities.mjs');
  const clean = fs.readFileSync(CAP, 'utf8');
  const cut = clean.replace(", 'check-comments': 'מכריז היעדר'", '');
  ok('המוטציה שינתה את גוף check-capabilities בעותק', cut !== clean);
  fs.writeFileSync(CAP, cut);
  const stillPasses = await runChecker();
  ok('⛔ מוטציה: שער שהוסר מ-claims וממשיך להצהיר ב-ROWS ' +
     'מפיל את «אי-התאמה בין ROWS ל-claims»', !stillPasses);
  const anti = clean.replace(/\bmismatch\b/g, 'pairGap');
  ok('מוטציית-הנגד שינתה את הקוד', anti !== clean);
  fs.writeFileSync(CAP, anti);
  const held = await runChecker();
  fs.writeFileSync(CAP, clean);
  ok('⭐ מוטציית-נגד: החלפת שם המשתנה בעקביות ⛔ אינה מפילה', held);
}

/*  ⭐ הכיוון ההפוך — כלל ⟵ שורה (סבב 72): ⛔ המוטציה מוסיפה סעיף כלל
 *  שאין לו שורה, ⚠️ והטענה שאמורה ליפול היא «כל כלל מיוצג בטבלה». */
{
  const CAP = path.join(WORK, 'tools', 'check-capabilities.mjs');
  const capClean = fs.readFileSync(CAP, 'utf8');
  const doc = CLEAN_DOC.toString('utf8');
  const HEAD = '### ⛔ תקן עמודת ההערות';
  const added = doc.replace(HEAD, '### ⛔ כלל חדש שאין לו שורה\n\n' + HEAD);
  ok('המוטציה הוסיפה סעיף כלל לעותק', added !== doc);
  fs.writeFileSync(DOC_IN_WORK, added);
  ok('⛔ מוטציה: סעיף כלל בלי שורה מפיל את «כל כלל מיוצג בטבלה»', !(await runChecker()));

  /*  ⭐ מוטציית-נגד — שינוי חי ועקבי: ⛔ שם הסעיף מוחלף בקובץ ובמפה יחד,
   *  ⚠️ ואסור לו להפיל: ⭐ המפה מודדת ייצוג ולא מחרוזת. */
  const ren = '### ⛔ תקן עמודת ההערות שבטבלה';
  fs.writeFileSync(DOC_IN_WORK, doc.replace(HEAD, ren));
  fs.writeFileSync(CAP, capClean.replace("'⛔ תקן עמודת ההערות':", "'⛔ תקן עמודת ההערות שבטבלה':"));
  ok('⭐ מוטציית-נגד: שינוי שם סעיף בקובץ ובמפה יחד ⛔ אינו מפיל', await runChecker());
  fs.writeFileSync(CAP, capClean);

  /*  ⭐ ו-🔲 אינו קבוע — ⛔ המוטציה מציבה 🔲 בשורה שאינה נמדדת ב-MATRIX:
   *  ⚠️ כך הטענה שתיפול היא «🔲 אינו קבוע» ולא היפוך תא. */
  const lines = doc.split('\n');
  const at = lines.findIndex((l) => /^\|\s*44\s*\|/.test(l));
  ok('שורת המוטציה ל-🔲 נמצאה', at >= 0);
  const parts = lines[at].split('|');
  parts[3 + APP.col] = ' 🔲 ';
  lines[at] = parts.join('|');
  fs.writeFileSync(DOC_IN_WORK, lines.join('\n'));
  ok('⛔ מוטציה: תא 🔲 בשורה ותיקה מפיל את «🔲 אינו קבוע»', !(await runChecker()));

  fs.writeFileSync(CAP, capClean.replace('const FRESH_BOX = {};', 'const FRESH_BOX = { 44: 72 };'));
  ok('⭐ מוטציית-נגד: 🔲 שהוכרז בסבב הנוכחי ⛔ אינו מפיל', await runChecker());
  fs.writeFileSync(CAP, capClean);
  fs.writeFileSync(DOC_IN_WORK, CLEAN_DOC);
}

process.chdir(ROOT);
fs.rmSync(WORK, { recursive: true, force: true });

console.log(failed ? `\n✗ סבב 37 (מטריצה) — ${failed} נכשלו, ${passed} עברו`
                   : `\n✓ סבב 37 (מטריצה) — ${passed} טענות עברו`);
process.exit(failed ? 1 : 0);
