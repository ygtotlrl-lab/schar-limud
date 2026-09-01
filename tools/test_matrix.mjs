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
const DB_FACT_EXEMPT = [
  52, 108,
];
const EXEMPT = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29,
  30, 31, 32, 33, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 52, 61, 65, 68,
  71, 72, 73, 74, 75, 76, 77, 78, 80, 82, 83, 85, 86, 88, 89, 90, 92, 94, 96, 99, 102, 105, 107,
  108, 112, 115, 116, 117, 118, 122, 124, 126, 128, 129, 130, 132, 133, 134, 135, 136, 140,
];

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
  /*  ⛔ העוגן נגזר מהקובץ ⛔ ואינו כותרת קשיחה — ⚠️ סעיף שיורד לעמודת
   *  התקן מותיר מוטציה שאינה מוצאת את מה שהיא מחליפה, ⭐ והיא «עוברת»
   *  בלי לשנות דבר. */
  const HEAD = (/^### ⛔[^\n]*$/m.exec(doc) || [''])[0];
  const added = doc.replace(HEAD, '### ⛔ כלל חדש שאין לו שורה\n\n' + HEAD);
  ok('המוטציה הוסיפה סעיף כלל לעותק', added !== doc);
  fs.writeFileSync(DOC_IN_WORK, added);
  ok('⛔ מוטציה: סעיף כלל בלי שורה מפיל את «כל כלל מיוצג בטבלה»', !(await runChecker()));

  /*  ⛔ סימון הלולאה — ⚠️ המוטציה משאירה את הסעיף **ואת** שורתו, ⛔ ורק
   *  מהפכת את הסימן: ⭐ ◇ הוא זוג פתוח מצד אחד, ⛔ והשער מפיל עליו גם
   *  כשהמפה עצמה שלמה. */
  fs.writeFileSync(DOC_IN_WORK, doc.replace(HEAD, HEAD.replace(/[◆⧉]$/, '◇')));
  ok('⛔ מוטציה: היפוך ◆ ל-◇ מפיל את «סימון הלולאה»', !(await runChecker()));
  /*  ⭐ מוטציית-נגד חיה: ⛔ שני סעיפים סמוכים מחליפים מקום — ⚠️ הזוגות
   *  נשארים סגורים והמפה אינה זזה, ⛔ ולכן אסור לה להפיל: ⭐ הסימון מודד
   *  ייצוג, ⛔ ולא את סדר הסעיפים בקובץ. */
  const two = [...doc.matchAll(/^### ⛔[^\n]*$/gm)].slice(0, 2).map((m) => m[0]);
  ok('מוטציית-הנגד מצאה שני סעיפים להחלפה', two.length === 2 && two[0] !== two[1]);
  fs.writeFileSync(DOC_IN_WORK,
    doc.replace(two[0], '\u0000').replace(two[1], two[0]).replace('\u0000', two[1]));
  ok('⭐ מוטציית-נגד: החלפת מקום בין שני סעיפים ⛔ אינה מפילה את «סימון הלולאה»',
     await runChecker());

  /*  ⭐ מוטציית-נגד — שינוי חי ועקבי: ⛔ שם הסעיף מוחלף בקובץ ובמפה יחד,
   *  ⚠️ ואסור לו להפיל: ⭐ המפה מודדת ייצוג ולא מחרוזת. */
  /*  ⛔ הסימן ◆ יושב **בסוף** הכותרת, ⚠️ ולכן שם חדש נכנס לפניו ⛔ ולא
   *  אחריו — סימן שאינו אחרון אינו נחתך, ⭐ והוא הופך לחלק מהמפתח. */
  const mk = /\s+[◆◇⧉]$/.exec(HEAD);
  const key = HEAD.replace(/^###\s+/, '').replace(/\s+[◆◇⧉]$/, '');
  const ren = `### ${key} שבטבלה${mk ? mk[0] : ''}`;
  fs.writeFileSync(DOC_IN_WORK, doc.replace(HEAD, ren));
  fs.writeFileSync(CAP, capClean.replace(`'${key}':`, `'${key} שבטבלה':`));
  ok('⭐ מוטציית-נגד: שינוי שם סעיף בקובץ ובמפה יחד ⛔ אינו מפיל', await runChecker());
  fs.writeFileSync(CAP, capClean);

  /*  ⛔ והצד השני של הזוג — הסימן שבשורה (סבב 73ב): ⚠️ עד היום הוא הודבק
   *  על הסעיף בלבד, ⛔ ומחיקתו מהשורה לא הפילה דבר. ⭐ המוטציה מסירה את
   *  הסימן מסוף תא השם, ⛔ ומשאירה את הסעיף ואת המפה שלמים. */
  const marked = doc.split('\n').findIndex((l) => /^\|\s*\d+\s*\|[^|]*[◆⧉] \|/.test(l));
  ok('שורת המוטציה לסימן הלולאה נמצאה', marked >= 0);
  {
    const ls2 = doc.split('\n');
    ls2[marked] = ls2[marked].replace(/([◆⧉]) \|/, '|');
    fs.writeFileSync(DOC_IN_WORK, ls2.join('\n'));
  }
  ok('⛔ מוטציה: הסרת הסימן משורת הטבלה מפילה את «סימון הלולאה בטבלה»',
     !(await runChecker()));
  /*  ⭐ מוטציית-נגד חיה: ⛔ אותה שורה מקבלת רווח נוסף לפני הסימן — ⚠️ הסימן
   *  נשאר אחרון, ⛔ ולכן אסור לה להפיל: ⭐ הטענה מודדת סימן, ולא ריווח. */
  {
    const ls2 = doc.split('\n');
    ls2[marked] = ls2[marked].replace(/([◆⧉]) \|/, ' $1 |');
    fs.writeFileSync(DOC_IN_WORK, ls2.join('\n'));
  }
  ok('⭐ מוטציית-נגד: ריווח נוסף לפני הסימן ⛔ אינו מפיל', await runChecker());

  fs.writeFileSync(DOC_IN_WORK, CLEAN_DOC);
}

/* ────── ⛔ שתי שורות שה-probe שלהן מודד ערך ולא שם (סבב 75) ─────────────────
   ⛔ מה נאכף: היפוך התא לבדו אינו מבחין בין «מודד ערך» ל«מודד שם» — ⚠️ שתי
   השורות האלה נמדדו עד סבב 75 בקיום המזהה בלבד, ⛔ ושינוי הערך עבר בשקט.
   ⛔ הנימוק המדוד: אופק ה-tombstone נבדק על השם בלבד, ⛔ ושינויו מ-90 יום
   ל-9 לא הפיל דבר; וסף הפינוי היזום חי בקוד האפליקציה ⛔ ואף שער לא הזכיר
   אותו. ⛔ מה יישבר בלעדיו: ערך שהטבלה מצהירה ישתנה, ⚠️ והתא ימשיך להצהיר
   את הישן. ⛔ מה אינו נאכף כאן: **קיום** היכולת — ⭐ אותו מודד היפוך התא.
   ⚠️ המוטציה נוקבת בשם הטענה שתיפול ⛔ ונבדק שהיא זו שנפלה: ⭐ «נפל» לבדו
   אינו אכיפה כשלעץ יש שערי חתימה — ⛔ מוטציה בתוך בלוק משותף מפילה את
   ה-`sha` ולא את השורה, ⚠️ וזה נמדד כאן ולכן הערך אינו נגוע בעץ עצמו.
   ⚠️ והכיוון נגזר מהתא ⛔ ואינו מדלג: תא שמצהיר ✅ נשבר בקלקול הערך
   הקנוני, ⛔ ותא שמצהיר ❌ נשבר בהסרת הבדיקה — ⭐ שני הכיוונים מפילים את
   **אותה** שורה.
   ──────────────────────────────────────────────────────────────────────── */
{
  const CAP2 = path.join(WORK, 'tools', 'check-capabilities.mjs');
  const CLEAN_CAP = fs.readFileSync(CAP2, 'utf8');
  const IDX = path.join(WORK, 'index.html');
  const CLEAN_IDX = fs.readFileSync(IDX, 'utf8');
  const cellOf = (n) => {
    const r = rows.find((x) => x.row === n);
    return r ? r.line.split('|')[3 + APP.col] : '';
  };
  /*  ⛔ מספר השורה נגזר **משמה** ⛔ ואינו מוקלד (סבב 76) — ⚠️ מספור מחדש
   *  הזיז את השורות, ⛔ והמוטציה המשיכה לחפש טענה במספר שכבר שייך לשורה
   *  אחרת: ⭐ היא נפלה על העץ התקין, וזה בדיוק ההפך ממה שמוטציה מוכיחה. */
  const rowOf = (name) => {
    const r = rows.find((x) => x.line.split('|')[2].trim() === name);
    if (!r) throw new Error(`שורה בשם «${name}» אינה בטבלה — ⛔ עדכן את השם או את הטבלה`);
    return r.row;
  };
  const ROW_TOMB = rowOf('`tombstones`'), ROW_SWEEP = rowOf('אסטרטגיית `localStorage`');
  /*  ⛔ המוטציה נבדקת מול **שם הטענה** ולא מול «נפל» (סבב 75) — ⚠️ שער
   *  שנופל מסיבה אחרת נראה כאכיפה ⛔ ואינו אוכף דבר. */
  const why = async () => {
    const lg = console.log, er = console.error, out = [];
    console.log = (...a) => out.push(a.join(' '));
    console.error = (...a) => out.push(a.join(' '));
    try {
      const mod = await import(`${CHECKER}?flip=${spin++}`);
      return { held: mod.capFailures === 0, out };
    } catch (e) { return { held: false, out }; }
    finally { console.log = lg; console.error = er; }
  };
  const run = async (label, files, mustFall, row) => {
    let changed = false;
    for (const [p, clean, text] of files) { if (text !== clean) changed = true; fs.writeFileSync(p, text); }
    ok('המוטציה «' + label + '» שינתה קוד בעותק', changed);
    const { held, out } = await why();
    for (const [p, clean] of files) fs.writeFileSync(p, clean);
    if (!mustFall) { ok('⭐ מוטציית-נגד: ' + label + ' ⛔ אינה מפילה', held); return; }
    ok('⛔ מוטציה: ' + label + ' מפילה את שורה ' + row,
       !held && out.some((l) => l.indexOf('❌ שורה ' + row + ' ') === 0));
  };

  /*  ⛔ אופק ה-tombstone — ⚠️ הערך הוא 90 יום, ⛔ והשם לבדו אינו הערך:
   *  ⭐ תא ✅ מקבל ערך קנוני אחר, ותא ❌ מקבל את הקבוע שאין לו. */
  await run('אופק ה-tombstone שאינו 90 יום',
    cellOf(ROW_TOMB).indexOf('✅') >= 0
      ? [[CAP2, CLEAN_CAP, CLEAN_CAP.replace('const TOMB_TTL_MS = 90 *', 'const TOMB_TTL_MS = 9 *')]]
      : [[IDX, CLEAN_IDX, CLEAN_IDX.replace('<script>',
          '<script>\nvar TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;')]],
    true, ROW_TOMB);
  /*  ⭐ מוטציית-נגד חיה: ⛔ קבוע **חדש** בשם שכן ובאותו ערך — ⚠️ ה-probe
   *  נעול על השם המדויק, ⛔ ואינו נגרר אחרי מי שדומה לו. */
  await run('קבוע שכן בשם דומה ובאותו ערך',
    [[IDX, CLEAN_IDX, CLEAN_IDX.replace('<script>',
      '<script>\nvar TOMBSTONE_TTL_DOC = 90 * 24 * 60 * 60 * 1000;')]], false);

  /*  ⛔ סף הפינוי היזום — ⚠️ 60% מהקיבולת, ⛔ ותא ❌ נשבר מהצד השני:
   *  ⭐ הסרת הבדיקה על השכבה השנייה הופכת את ה-probe לאמת מול תא «אין». */
  await run('סף הפינוי היזום שאינו 60%',
    cellOf(ROW_SWEEP).indexOf('✅') >= 0
      ? [[CAP2, CLEAN_CAP, CLEAN_CAP.replace('const LS_SWEEP_PCT = 0.60;', 'const LS_SWEEP_PCT = 0.90;')]]
      : [[CAP2, CLEAN_CAP, CLEAN_CAP.replace('/tier2\\s*[:=]\\s*\\[\\s*\\{/', '/tier2\\s*[:=]\\s*\\[/')]],
    true, ROW_SWEEP);
  /*  ⭐ מוטציית-נגד חיה: ⛔ קבוע חדש בשם שכן — ⚠️ אותה טענה בדיוק, ⛔ ובכיוון
   *  שאסור לו להפיל. */
  await run('סף שכן בשם דומה ובערך אחר',
    [[IDX, CLEAN_IDX, CLEAN_IDX.replace('<script>', '<script>\nvar LS_SWEEP_PCT_DOC = 0.90;')]], false);
}

process.chdir(ROOT);
fs.rmSync(WORK, { recursive: true, force: true });

console.log(failed ? `\n✗ סבב 37 (מטריצה) — ${failed} נכשלו, ${passed} עברו`
                   : `\n✓ סבב 37 (מטריצה) — ${passed} טענות עברו`);
process.exit(failed ? 1 : 0);
