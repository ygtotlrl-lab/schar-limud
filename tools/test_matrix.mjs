#!/usr/bin/env node
/*  test_matrix.mjs — המטריצה נאכפת, ⛔ ולא מוצהרת.
 *
 *  **מה נאכף:** ⛔ כל תא בטבלת התשתית **נהפך בתורו** בעותק זמני של העץ,
 *  ⛔ ובודק היכולות האמיתי רץ עליו — ⚠️ ודורש שכל היפוך ייתפס, בשני
 *  הכיוונים: ✅ בלי probe מפיל, ⛔ ו-❌ עם probe מפיל גם כן.
 *
 *  **הנימוק המדוד:** בודק היכולות הורחב משלוש שורות ל**כל** השורות,
 *  ⛔ ואיש לא מדד שההרחבה אכן אוכפת — ⚠️ טענה שמסתפקת בקיום השם מאשרת
 *  קוד מת.
 *
 *  **מה יישבר בלעדיו:** ⛔ מטריצה שאיש אינו הופך היא הצהרה, ⚠️ ושורה
 *  שסימונה שגוי שולחת סבב עתידי לבנות מחדש משהו שכבר קיים.
 *
 *  **מה אינו נאכף כאן:** ⛔ שורות שאכיפתן יושבת בשער אחר או בנימוק כתוב
 *  מוחרגות במפורש — ⚠️ הרשימה נגזרת ומושווית, ⛔ ואינה מתארכת בשקט;
 *  ⭐ ושתי שורות מוחרגות כ**עובדת מסד** שאין דרך לראות מהריפו.
 *
 *  ⛔ אין להחליף את הרצת-הבודק-האמיתי בסימולציה — ⚠️ בדיקה שאינה מריצה את
 *  השער עצמו אינה מוכיחה עליו דבר. ⛔ וההיפוכים רצים **בתהליך אחד**:
 *  ⚠️ תהליך חדש לכל תא עלה עשר שניות מכל הרצת שער.
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

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

if (process.env.R33_INNER) {
  console.log('test_matrix: ריצה פנימית — מדלג (מניעת רקורסיה)');
  process.exit(0);
}

/*  ⛔ כל גופו של השער הזה הוא מוטציה ובדיקת שלמות (סבב 92) — ⚠️ ולכן
 *  הוא כולו מדלג ברמה המהירה, ⛔ ורץ ברמה המלאה בלבד. */
if (!RUN_MUT) {
  console.log('test_matrix: המוטציות רצות ברמה המלאה (--full) — מדלג');
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
const DB_FACT_EXEMPT = [53, 137];
const EXEMPT = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 22, 24, 25, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 61, 62, 65,
  80, 79, 88, 89, 91, 92, 90, 93, 96, 97, 101, 102, 104, 105, 106, 108, 109, 111, 112, 113, 116, 118, 120, 123, 126,
  129, 133, 135, 137, 141, 130, 131, 132, 146, 149, 77, 57, 153, 157, 159, 161, 163, 165, 166, 167, 168, 172
];

function copyRepo() {
  /*  ⛔ כותב על עותק — ⚠️ מוטציה בגוף הבודק עצמו, ⛔ וייבוא חדש קורא את הקובץ מהדיסק. */
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
const CAP_FILE = path.join(WORK, 'tools', 'check-capabilities.mjs');
const DOC_IN_WORK = path.join(WORK, 'CLAUDE.md');
let spin = 0;
/*  ⛔ ייבוא אחד (סבב 107) — ⚠️ הבודק חושף `run(over)`, ⭐ ו-`over` היא מפת
 *  נתיב⟵תוכן שגוברת על הדיסק: ⛔ ההיפוך נמסר כארגומנט ⛔ ואינו נכתב לעץ,
 *  ⚠️ ואינו דורש ייבוא טרי — ⭐ הנימוק המדוד: 684 היפוכים היו 684 כתיבות
 *  ו-684 ייבואים, ⛔ וכל ייבוא קרא את העץ כולו מחדש.
 *  ⛔ **ומדידה שנקטעת אינה משאירה שארית** — ⚠️ אין מה לשחזר. */
const CLEAN_CAP_TXT = fs.readFileSync(CAP_FILE, 'utf8');
const capRun = (await import(CHECKER)).run;
function callRun(runFn, over) {
  const lg = console.log, er = console.error, out = [];
  console.log = (...a) => out.push(a.join(' '));
  console.error = (...a) => out.push(a.join(' '));
  try { return { held: runFn(over) === 0, out }; }
  catch (e) { out.push('❌ ' + (e && e.message)); return { held: false, out }; }
  finally { console.log = lg; console.error = er; }
}
const runChecker = (over) => callRun(capRun, over).held;
const docOver = (text) => ({ 'CLAUDE.md': text });
/*  ⛔ **הטבלה לבדה עוברת כארגומנט** — ⚠️ וזו אינה עצלות: ⭐ `over` גובר
 *  על `readOnce` בלבד, ⛔ ושתי השכבות שהבודק מייבא — שכבת האייקונים
 *  ושכבת הקלט — קוראות את העץ בעצמן: ⚠️ מוטציה שהייתה עוברת להן
 *  כארגומנט הייתה נמדדת על הקובץ הנקי, ⛔ וזה בדיוק «probe שאינו יכול
 *  להיכשל». ⭐ **והטבלה היא החריג היחיד** — ⛔ קוראה היחיד הוא
 *  `readOnce`, ⚠️ והיא זו שנהפכת שורה-שורה. */
function why(files) {
  const over = {};
  const onDisk = [];
  for (const f of files) {
    if (path.relative(WORK, f[0]) === 'CLAUDE.md') over['CLAUDE.md'] = f[2];
    else onDisk.push(f);
  }
  return onDisk.length ? withDisk(onDisk, over) : callRun(capRun, over);
}
/*  ⛔ מוטציה שאינה בטבלה נכתבת לעותק ונטענת מחדש — ⚠️ **המודול עצמו** הוא
 *  מה שמוטט בחלקן, ⭐ והעץ משוחזר מיד אחריה: ⛔ גם כשהמדידה זרקה. */
async function withDisk(files, over) {
  for (const [p, , text] of files) fs.writeFileSync(p, text);
  try {
    const mod = await import(`${CHECKER}?flip=${spin++}`);
    return callRun(mod.run, over);
  } catch (e) { return { held: false, out: ['❌ ' + (e && e.message)] }; }
  finally { for (const [p, clean] of files) fs.writeFileSync(p, clean); }
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
  const stillPasses = runChecker(docOver(lines.join('\n')));
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
  const held = runChecker(docOver(lines.join('\n')));
  ok(`⭐ מוטציית-נגד: ריפוד התא בשורה ${target.row} ברווחים ⛔ אינו מפיל`, held);
}

/*  ⭐ שורה שכמה שערים אוכפים אותה (סבב 72) — ⛔ המוטציה מסירה שער
 *  אחד מ-`claims` בעוד הוא ממשיך להצהיר עליה ב-`ROWS`, ⚠️ והטענה
 *  שאמורה ליפול היא «אי-התאמה בין ROWS ל-claims». */
{
  const clean = CLEAN_CAP_TXT;
  const cut = clean.replace(", 'check-comments': 'מכריז היעדר'", '');
  ok('המוטציה שינתה את גוף check-capabilities בעותק', cut !== clean);
  const stillPasses = (await withDisk([[CAP_FILE, CLEAN_CAP_TXT, cut]])).held;
  ok('⛔ מוטציה: שער שהוסר מ-claims וממשיך להצהיר ב-ROWS ' +
     'מפיל את «אי-התאמה בין ROWS ל-claims»', !stillPasses);
  const anti = clean.replace(/\bmismatch\b/g, 'pairGap');
  ok('מוטציית-הנגד שינתה את הקוד', anti !== clean);
  const held = (await withDisk([[CAP_FILE, CLEAN_CAP_TXT, anti]])).held;
  ok('⭐ מוטציית-נגד: החלפת שם המשתנה בעקביות ⛔ אינה מפילה', held);
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
  /*  הסרת שורה מ-`gapRows` — ⛔ המוטציה של תא ⭕: ⚠️ המרשם הוא מה שמוציא
   *  את השורה מהמדידה, ⭐ ובלעדיו ה-probe שלה רץ ונופל. */
  const dropGap = (text, row) => text.replace(/(gapRows: \[)([^\]]*)\]/,
    (m, head, list) => head + list.split(',').map((x) => x.trim())
      .filter((x) => x && Number(x) !== row).join(', ') + ']');
  const run = async (label, files, mustFall, row) => {
    let changed = false;
    for (const [, clean, text] of files) if (text !== clean) changed = true;
    ok('המוטציה «' + label + '» שינתה את הקוד שנמסר לריצה', changed);
    const { held, out } = await why(files);
    if (!mustFall) { ok('⭐ מוטציית-נגד: ' + label + ' ⛔ אינה מפילה', held); return; }
    ok('⛔ מוטציה: ' + label + ' מפילה את שורה ' + row,
       !held && out.some((l) => l.indexOf('❌ שורה ' + row + ' ') === 0));
  };

  /*  ⛔ אופק ה-tombstone — ⚠️ הערך הוא 90 יום, ⛔ והשם לבדו אינו הערך:
   *  ⭐ תא ✅ מקבל ערך קנוני אחר, ותא ❌ מקבל את הקבוע שאין לו. */
  /*  ⛔ ותא ⭕ נשבר מצד שלישי (סבב 79) — ⚠️ שורה מנומקת אינה נמדדת
   *  ב-probe כלל, ⛔ ולכן מוטציה על הערך אינה יכולה להפיל אותה: ⭐ מה
   *  שנמדד הוא **המרשם** — הסרתה מ-`gapRows` מחזירה אותה למדידה, ⛔ והקוד
   *  שאינו מקיים אותה מפיל. */
  await run('אופק ה-tombstone שאינו 90 יום',
    cellOf(ROW_TOMB).indexOf('✅') >= 0
      ? [[CAP2, CLEAN_CAP, CLEAN_CAP.replace('const TOMB_TTL_MS = 90 *', 'const TOMB_TTL_MS = 9 *')]]
      : cellOf(ROW_TOMB).indexOf('⭕') >= 0
        ? [[CAP2, CLEAN_CAP, dropGap(CLEAN_CAP, ROW_TOMB)]]
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
      : cellOf(ROW_SWEEP).indexOf('⭕') >= 0
        ? [[CAP2, CLEAN_CAP, dropGap(CLEAN_CAP, ROW_SWEEP)]]
        : [[CAP2, CLEAN_CAP, CLEAN_CAP.replace('/tier2\\s*[:=]\\s*\\[\\s*\\{/', '/tier2\\s*[:=]\\s*\\[/')]],
    true, ROW_SWEEP);
  /*  ⭐ מוטציית-נגד חיה: ⛔ קבוע חדש בשם שכן — ⚠️ אותה טענה בדיוק, ⛔ ובכיוון
   *  שאסור לו להפיל. */
  await run('סף שכן בשם דומה ובערך אחר',
    [[IDX, CLEAN_IDX, CLEAN_IDX.replace('<script>', '<script>\nvar LS_SWEEP_PCT_DOC = 0.90;')]], false);

  /*  ⛔ מבנה ה-`tier` (סבב 96ד) — ⚠️ פריט בלי `syncedThrough` משלו מחזיר
   *  את העֵד לכניסה לרשימה, ⭐ וזה בדיוק המימוש השני שהתקן אישר בשקט. */
  await run('פריט ב-tier1 בלי עֵד משלו',
    cellOf(ROW_SWEEP).indexOf('✅') >= 0
      ? [[IDX, CLEAN_IDX, CLEAN_IDX.replace('tier1: [', "tier1: [{ key: 'x_mut' },")]]
      : [[CAP2, CLEAN_CAP, dropGap(CLEAN_CAP, ROW_SWEEP)]],
    true, ROW_SWEEP);
  /*  ⭐ מוטציית-נגד חיה: ⛔ פריט **תקין** שנוסף לאותה רשימה — ⚠️ קוד שנוסף
   *  ⛔ ולא הערה, ⭐ והמבנה נשמר. */
  await run('פריט תקין שנוסף ל-tier1',
    [[IDX, CLEAN_IDX, CLEAN_IDX.replace('tier1: [',
      "tier1: [{ key: 'x_mut', syncedThrough: function () { return 0; } },")]], false);
}


/* ────── ⛔ שלוש טענות המבנה של הטבלה (סבב 106) ──────────────────────────────
   ⛔ מה נאכף: הצהרת כל בלוק חתום בשורה · שם שורה שנפתח בסימן · וסדר הפנים
   שכותרת הקטגוריה מצהירה — ⚠️ שלושתן נמדדות ב-check-capabilities,
   ⛔ ואף אחת מהן אינה נמדדת בהיפוך תא: ⭐ ההיפוך מודד **סימון**, ⛔ והן
   מודדות **מבנה**. ⛔ הנימוק המדוד: רכיב «מידע טכני» היה בלוק חתום שאף
   שורה לא נקבה בו, ⛔ ושלוש שורות ישבו בקטגוריה של המנגנון שאוכף אותן.
   ⛔ מה יישבר בלעדיו: probe שנוסף ואינו מוטט הוא probe שאיש לא הוכיח
   שהוא מפיל. ⛔ מה אינו נאכף כאן: תוכן השלבים — ⭐ «למה שורה שייכת לשלב»
   היא קריאת משמעות, ⚠️ והמרשם הוא מה שנמדד.
   ⚠️ כל מוטציה נוקבת בשם הטענה שתיפול ⛔ ונבדק שהיא זו שנפלה.
   ──────────────────────────────────────────────────────────────────────── */
{
  const CAP3 = CAP_FILE;
  const CLEAN3 = CLEAN_CAP_TXT;
  const CLEAN_TXT = CLEAN_DOC.toString('utf8');
  const runClaim = async (label, files, mustFall, claim) => {
    let changed = false;
    for (const [, clean, text] of files) if (text !== clean) changed = true;
    ok('המוטציה «' + label + '» שינתה את הקוד שנמסר לריצה', changed);
    const { held, out } = await why(files);
    if (!mustFall) { ok('⭐ מוטציית-נגד: ' + label + ' ⛔ אינה מפילה', held); return; }
    ok('⛔ מוטציה: ' + label + ' מפילה את «' + claim + '»',
       !held && out.some((l) => l.indexOf('❌') === 0 && l.indexOf(claim) >= 0));
  };

  /*  ⛔ בלוק חתום שאין לו שורה — ⚠️ ההצהרה יורדת, ⛔ והבלוק נשאר: ⭐ בדיוק
   *  המצב שהיה עד היום, ⛔ ואיש לא ידע. */
  await runClaim('הסרת docRows מבלוק חתום',
    [[CAP3, CLEAN3, CLEAN3.replace(/\n    docRows: \[[^\]]*\],/, '')]],
    true, 'בלוקים שאינם מוצהרים בטבלה');
  /*  ⛔ שם שורה שנפתח בסימן — ⚠️ הסימן נכנס לשם ⛔ ולא לתקן. */
  await runClaim('סימן פותח בשם שורה',
    [[DOC_IN_WORK, CLEAN_TXT, CLEAN_TXT.replace(/^\| (\d+) \| ([^|⛔⚠️⭐])/m, '| $1 | ⛔ $2')]],
    true, 'שמות שורה שנפתחים בסימן');
  /*  ⭐ מוטציית-נגד לשתי הטענות בהרצה אחת — ⛔ שני השמות מוחלפים
   *  בעקביות: ⚠️ שינוי חי ⛔ ולא הערה, ⭐ ושם הטענה שב-`GATES` נגרר איתו.
   *  ⛔ **ושתיהן בהרצה אחת ⛔ ולא בשתיים** — ⚠️ כל הרצה כאן היא ייבוא
   *  נוסף של הבודק, ⭐ והשער הזה יושב על המסלול הארוך של הבריכה. */
  await runClaim('החלפת שמות blockRowGaps ו-NAME_SIGN בעקביות',
    [[CAP3, CLEAN3, CLEAN3.replace(/blockRowGaps/g, 'blockDocGaps')
                          .replace(/NAME_SIGN/g, 'ROW_SIGN')]], false);

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
  await runClaim('שורה שהוזזה לשלב אחר בקטגוריה',
    [[DOC_IN_WORK, CLEAN_TXT, moved]], true, 'סדר הפנים בקטגוריות');
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
  await runClaim('החלפת מקום בין שתי שורות באותו שלב',
    [[DOC_IN_WORK, CLEAN_TXT, swapped]], false);

  /*  ⛔ מוטציה שכל קוראיה עוברים ב-`readOnce` נמסרת כארגומנט (סבב 108) —
   *  ⚠️ ואינה נכתבת לדיסק ואינה דורשת ייבוא טרי: ⭐ הנימוק המדוד — ייבוא
   *  אחד בהנהלה הוא כחמש שניות, ⛔ ושש מוטציות דיסק היו שלושים.
   *  ⛔ **ומה שאינו עובר ב-`readOnce` נשאר בדיסק** — ⚠️ `APP` הוא אובייקט
   *  של המודול, ⭐ ורק ייבוא טרי מחליף אותו. */
  const runOver = (label, file, clean, text, mustFall, claim) => {
    ok('המוטציה «' + label + '» שינתה את הקוד שנמסר לריצה', text !== clean);
    const over = {}; over[file] = text;
    const { held, out } = callRun(capRun, over);
    if (!mustFall) { ok('⭐ מוטציית-נגד: ' + label + ' ⛔ אינה מפילה', held); return; }
    ok('⛔ מוטציה: ' + label + ' מפילה את «' + claim + '»',
       !held && out.some((l) => l.indexOf('❌') === 0 && l.indexOf(claim) >= 0));
  };

  /*  ⛔ שער שכותב ואינו מצהיר (סבב 107) — ⚠️ ההצהרה יורדת, ⛔ והכתיבה
   *  נשארת: ⭐ בדיוק המצב שהתקן אישר עד היום, ⛔ ששני הענפים היו שווים בו. */
  const WG_REL = 'tools/test_manifest.mjs';
  const CLEAN_WG = fs.readFileSync(path.join(WORK, WG_REL), 'utf8');
  const WG_DECL = /^.*⛔ כותב על עותק — .*$\n/m;
  runOver('הסרת הצהרת הכתיבה משער שכותב', WG_REL, CLEAN_WG,
    CLEAN_WG.replace(WG_DECL, ''), true, 'שערים שכותבים');
  /*  ⭐ מוטציית-נגד חיה: ⛔ אותה הצהרה בנימוק אחר — ⚠️ טקסט שהוחלף
   *  בעקביות ⛔ ולא הערה שנוספה, ⭐ והמרשם עצמו נשמר. */
  runOver('נימוק אחר לאותה הצהרת כתיבה', WG_REL, CLEAN_WG,
    CLEAN_WG.replace(WG_DECL, (m) =>
      m.replace(/— .*\*\//, '— ⚠️ המוטציה נמסרת לשער אמיתי שרץ בתהליך נפרד וקורא מהדיסק. */')),
    false);

  /*  ⛔ שם החודש בצורה אחת (סבב 108) — ⚠️ ושני הצדדים ממוטטים: ⭐ סימן
   *  שגוי, ⛔ וסימן שהוסר כליל. */
  const CLEAN_IDX3 = fs.readFileSync(path.join(WORK, 'index.html'), 'utf8');
  if (/MONTHS_HEB_LEAP\s*=\s*\[/.test(CLEAN_IDX3)) {
    runOver('אפוסטרוף במקום גרש עברי בשם החודש', 'index.html', CLEAN_IDX3,
      CLEAN_IDX3.replace(/אדר א׳/g, "אדר א'"), true, 'monthFormGaps');
    runOver('שם אדר בלי סימן כלל', 'index.html', CLEAN_IDX3,
      CLEAN_IDX3.replace(/אדר א׳/g, 'אדר א').replace(/אדר ב׳/g, 'אדר ב'),
      true, 'monthFormGaps');
    /*  ⭐ מוטציית-נגד חיה: ⛔ שם חודש שהוחלף באיות אחר — ⚠️ ערך חי בשני
     *  המערכים, ⭐ ואין בו סימן: ⛔ הנמדד הוא הסימן ⛔ ולא השם. */
    runOver('איות אחר לשם חודש בלי סימן', 'index.html', CLEAN_IDX3,
      CLEAN_IDX3.replace(/"סיון"/g, '"סיוון"'), false);
  } else {
    /*  ⛔ אין כאן מערך חודשים ⛔ ואין מה למוטט — ⚠️ והדילוג נמדד: ⭐ ההיעדר
     *  מוצהר ב-`skipCaps` של הבודק, ⛔ ואינו הנחה. */
    ok('⭐ אין כאן מערך חודשים ⛔ ואין מה למוטט — וההיעדר מוצהר ב-skipCaps',
       /skipCaps:[^\]]*'hebdate'/.test(CLEAN3));
  }

  /*  ⛔ סוג השער (סבב 108) — ⚠️ וארבע ההפרות ממוטטות: ⭐ שתיים בקוד השער
   *  עצמו, ⛔ ושתיים בהצהרה שב-`APP`. */
  const TG_REL = 'tools/test_md.mjs';
  const CLEAN_TG = fs.readFileSync(path.join(WORK, TG_REL), 'utf8');
  runOver('שער שמוכרז text ומריץ תהליך', TG_REL, CLEAN_TG,
    CLEAN_TG + '\nfunction _mdProc(a){ return spawnSync(a); }\nvar _mdSeen = _mdProc;\n',
    true, 'gateKindGaps');
  const BG_REL = 'tools/test_removals.mjs';
  const CLEAN_BG = fs.readFileSync(path.join(WORK, BG_REL), 'utf8');
  runOver('שער שמוכרז behavior ואין בו תהליך', BG_REL, CLEAN_BG,
    CLEAN_BG.replace(/execFileSync\(/g, 'gitRun('), true, 'gateKindGaps');
  await runClaim('הסרת הצהרת סוג משער',
    [[CAP3, CLEAN3, CLEAN3.replace(/\n    'test_readonly':\s*'behavior[^\n]*\n/, '\n')]],
    true, 'gateKindGaps');
  await runClaim('behavior בלי נימוק',
    [[CAP3, CLEAN3, CLEAN3.replace(/('test_readonly':\s*)'behavior — [^']*'/, "$1'behavior — כי'")]],
    true, 'gateKindGaps');
  /*  ⭐ מוטציית-נגד חיה: ⛔ נימוק אחר לאותו שער — ⚠️ טקסט שהוחלף,
   *  ⭐ והסוג עצמו נשמר: ⛔ הנמדד הוא הסוג והנימוק, ⚠️ ולא ניסוחו. */
  await runClaim('נימוק אחר לאותו behavior',
    [[CAP3, CLEAN3, CLEAN3.replace(/('test_readonly':\s*)'behavior — [^']*'/,
      "$1'behavior — מודד שהסט האמיתי נופל, ובזיכרון לא היה מה למדוד'")]], false);
}

process.chdir(ROOT);
fs.rmSync(WORK, { recursive: true, force: true });

console.log(failed ? `\n✗ סבב 37 (מטריצה) — ${failed} נכשלו, ${passed} עברו`
                   : `\n✓ סבב 37 (מטריצה) — ${passed} טענות עברו`);
process.exit(failed ? 1 : 0);
