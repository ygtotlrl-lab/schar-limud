#!/usr/bin/env node
/*  test_matrix_src.mjs — המטריצה נאכפת על קלט המקור: ⛔ קוד האפליקציה.
 *
 *  **מה נאכף:** ⛔ probe שמודד **ערך** ⛔ ולא שם — ⚠️ אופק ה-tombstone,
 *  סף הפינוי היזום ומבנה ה-`tier`, שם החודש בצורה אחת, ⭐ וכיסוי סולם
 *  נקודות השבירה: ⛔ כל אחד ממוטט במקור, ⚠️ והבודק האמיתי רץ עליו בסינון
 *  «src» כשהמוטציה כולה במקור.
 *
 *  **הנימוק המדוד:** ⛔ היפוך התא לבדו אינו מבחין בין «מודד ערך» ל«מודד
 *  שם» — ⚠️ אופק ה-tombstone נבדק על השם בלבד, ⛔ ושינויו מ-90 יום ל-9 לא
 *  הפיל דבר.
 *
 *  **מה יישבר בלעדיו:** ⛔ ערך שהטבלה מצהירה ישתנה, ⚠️ והתא ימשיך להצהיר
 *  את הישן.
 *
 *  **מה אינו נאכף כאן:** ⛔ היפוך תאי הטבלה ומוטציות בקוד הכלים —
 *  ⚠️ כל קלט נמדד בחלק שלו, ⭐ ושם החלק אומר איזה.
 *
 *  ⛔ אין להחליף את הרצת-הבודק-האמיתי בסימולציה — ⚠️ בדיקה שאינה מריצה את
 *  השער עצמו אינה מוכיחה עליו דבר.
 *  זהה בית-לבית בכל הריפו פרט לבלוק APP ולאזור הריצפה.
 */

import fs from 'node:fs';
import os from 'node:os';
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
/* ⚠️ פר-אפליקציה — הריצפה הפרטית של השער נבדלת ביניהן לפי היכולת שכל אחת נושאת, והנימוק בשדה עצמו */
const FLOOR = { shared: 21, app: 0, appWhy: '' };
/* ⚠️ סוף פר-אפליקציה */
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות (סבב 119) — ⚠️ `null` הוא תהליך
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
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.R33_INNER;
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


/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ שורה אחת נאכפת כאן — ⚠️ «בדיקה מוצהרת לפי הקלט שהיא קוראת»:
 *  ⭐ ההצהרה עצמה נסרקת ב-`check-capabilities`, ⛔ והצד השני — שמוטציה
 *  בקלט הזה עדיין מפילה אחרי הסינון — נמדד כאן. */
export const ROWS = [29];

/*  ⛔ עוגן ההזרקה הוא תגית המודול ⛔ ואינו `<script>` עירום — ⚠️ המסמך
 *  טוען את הליבה כמודול, ⭐ ותגית עירומה אינה קיימת בכל הריפו:
 *  ⛔ החלפה שאינה מחליפה דבר היא מוטציה שאינה משנה קוד. */
const MODULE_TAG = '<script type="module">';

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

if (process.env.R33_INNER) {
  console.log(`${GATE_ID}: ריצה פנימית — ⛔ מדלג, והשער אינו נמדד כאן (מניעת רקורסיה)`);
  process.exit(0);
}

/*  ⛔ כל גופו של השער הזה הוא מוטציה ובדיקת שלמות (סבב 92) — ⚠️ ולכן
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

function copyRepo() {
  /*  ⛔ כותב על עותק — ⚠️ מוטציה בגוף הבודק עצמו, ⛔ וייבוא חדש קורא את הקובץ מהדיסק. */
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), FACTS.slug + '-r37-'));
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
let spin = 0;
const CLEAN_CAP_TXT = fs.readFileSync(CAP_FILE, 'utf8');
const CAP_MOD = await import(CHECKER);
const capRun = CAP_MOD.run;
/*  ⛔ החלק נגזר מאות הקטגוריה שבטבלה (סבב 137) — ⚠️ הבודק מפוצל לשערים
 *  לפי נושא, ⭐ והיפוך תא מפיל את השער שהשורה שייכת לו: ⛔ הרצת החלק
 *  הלא-נכון הייתה מדווחת «לא נפל» על היפוך שכן נתפס. */
const partOf = CAP_MOD.partOfRow;
function callRun(runFn, over, changed, part) {
  const lg = console.log, er = console.error, out = [];
  console.log = (...a) => out.push(a.join(' '));
  console.error = (...a) => out.push(a.join(' '));
  try { return { held: runFn(over, changed, part) === 0, out }; }
  catch (e) { out.push('❌ ' + (e && e.message)); return { held: false, out }; }
  finally { console.log = lg; console.error = er; }
}
/*  ⛔ מוטציה שכולה במקור נמסרת כארגומנט ורצה בסינון «src» — ⚠️ הבקרה
 *  הנקייה שלמטה ממלאת את הערכים שבדיקה שקלטה לא זז מקבלת, ⭐ ומוטציה
 *  שנתפסת בסינון מוכיחה שהסינון אינו משתיק את הבדיקה שאמורה לתפוס אותה.
 *  ⛔ **ומוטציה שנוגעת בבודק עצמו נכתבת לעותק ונטענת מחדש** — ⚠️ המודול
 *  הוא מה שמוטט, ⭐ ובייבוא טרי אין ערך שמור: ⛔ שם הכל רץ, ובלי סינון. */
const SRC_ONLY = ['src'];
function why(files, part) {
  const over = {};
  let disk = false;
  for (const [p, , text] of files) {
    const rel = path.relative(WORK, p).split(path.sep).join('/');
    if (rel.indexOf('tools/') === 0) disk = true;
    over[rel] = text;
  }
  if (disk) return withDisk(files, undefined, part);
  return { ...callRun(capRun, over, SRC_ONLY, part), filtered: true };
}
/*  ⛔ מוטציה שאינה בטבלה נכתבת לעותק ונטענת מחדש — ⚠️ **המודול עצמו** הוא
 *  מה שמוטט בחלקן, ⭐ והעץ משוחזר מיד אחריה: ⛔ גם כשהמדידה זרקה. */
async function withDisk(files, over, part) {
  for (const [p, , text] of files) fs.writeFileSync(p, text);
  try {
    const mod = await import(`${CHECKER}?flip=${spin++}`);
    return callRun(mod.run, over, undefined, part);
  } catch (e) { return { held: false, out: ['❌ ' + (e && e.message)] }; }
  finally { for (const [p, clean] of files) fs.writeFileSync(p, clean); }
}

/*  ⛔ הרצה נקייה בכל החלקים לפני המוטציות — ⚠️ היא ממלאת את הערכים
 *  שהריצה המסוננת מחזירה, ⭐ ובלעדיה הסינון מריץ הכל. ⛔ ועץ שאינו נקי
 *  עוצר כאן — ⚠️ מוטציה שנתפסת על עץ שבור אינה אכיפה. */
for (const pt of CAP_MOD.PART_NAMES) {
  const { held, out } = callRun(capRun, undefined, undefined, pt);
  if (!held) {
    console.error(`❌ ${GATE_ID}: הבודק נכשל על העץ הנקי בחלק ${pt} — נמדדו ` +
      `${out.filter((l) => l.indexOf('❌') === 0).length} כשלים והצפוי 0. ` +
      'מתקנים את העץ לפני שממוטטים אותו');
    process.exit(1);
  }
}

const DOC = path.join(ROOT, 'CLAUDE.md');
const rows = [];
{
  const docLines = fs.readFileSync(DOC, 'utf8').split('\n');
  const head = docLines.findIndex((l) => /^\|\s*#\s*\|\s*שם\s*\|/.test(l));
  for (let k = head + 1; head >= 0 && k < docLines.length; k++) {
    if (!/^\|/.test(docLines[k])) break;
    const m = /^\|\s*(\d+)\s*\|/.exec(docLines[k]);
    if (m) rows.push({ row: Number(m[1]), line: docLines[k], at: k });
  }
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
    return r ? r.line.split('|')[3 + FACTS.col] : '';
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
  /*  ⛔ החלק נמסר במפורש (סבב 137) — ⚠️ מוטציית-נגד אינה נושאת שורה,
   *  ⭐ והיא חייבת לרוץ בחלק של המוטציה שהיא מאזנת: ⛔ חלק אחר לא היה
   *  מריץ את ה-probe כלל, ⚠️ ו«אינה מפילה» היה מתקיים מעצמו. */
  const run = async (label, files, mustFall, row, part) => {
    let changed = false;
    for (const [, clean, text] of files) if (text !== clean) changed = true;
    ok('המוטציה «' + label + '» שינתה את הקוד שנמסר לריצה', changed);
    const { held, out, filtered } = await why(files, part || (row ? partOf(row) : undefined));
    if (!mustFall) { ok('⭐ מוטציית-נגד: ' + label + ' ⛔ אינה מפילה', held); return; }
    ok('⛔ מוטציה: ' + label + ' מפילה את שורה ' + row + (filtered ? ' בסינון «src»' : ''),
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
        : [[IDX, CLEAN_IDX, CLEAN_IDX.replace(MODULE_TAG,
            MODULE_TAG + '\nvar TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;')]],
    true, ROW_TOMB);
  /*  ⭐ מוטציית-נגד חיה: ⛔ קבוע **חדש** בשם שכן ובאותו ערך — ⚠️ ה-probe
   *  נעול על השם המדויק, ⛔ ואינו נגרר אחרי מי שדומה לו. */
  await run('קבוע שכן בשם דומה ובאותו ערך',
    [[IDX, CLEAN_IDX, CLEAN_IDX.replace(MODULE_TAG,
      MODULE_TAG + '\nvar TOMBSTONE_TTL_DOC = 90 * 24 * 60 * 60 * 1000;')]], false,
    null, partOf(ROW_TOMB));

  /*  ⛔ סף הפינוי היזום — ⚠️ 60% מהקיבולת, ⛔ ותא ❌ נשבר מהצד השני:
   *  ⭐ הסרת הבדיקה על השכבה השנייה הופכת את ה-probe לאמת מול תא «אין». */
  await run('סף הפינוי היזום שאינו 60%',
    cellOf(ROW_SWEEP).indexOf('✅') >= 0
      ? [[CAP2, CLEAN_CAP, CLEAN_CAP.replace('const LS_SWEEP_PCT = 0.60;', 'const LS_SWEEP_PCT = 0.90;')]]
      : cellOf(ROW_SWEEP).indexOf('⭕') >= 0
        ? [[CAP2, CLEAN_CAP, dropGap(CLEAN_CAP, ROW_SWEEP)]]
        /*  ⛔ הזרוע ל-❌ מחלישה את ה-probe (סבב 117) — ⚠️ העוגן הקודם היה
         *  ביטוי שכבר אינו בקוד, ⭐ והחלפה שאינה מחליפה דבר עוברת תמיד. */
        : [[CAP2, CLEAN_CAP, CLEAN_CAP.replace(
            "if (!/\\bkey\\s*:/.test(it) || !/\\bsyncedThrough\\s*:/.test(it)) bad++;",
            "if (!/\\bkey\\s*:/.test(it)) bad++;")]],
    true, ROW_SWEEP);
  /*  ⭐ מוטציית-נגד חיה: ⛔ קבוע חדש בשם שכן — ⚠️ אותה טענה בדיוק, ⛔ ובכיוון
   *  שאסור לו להפיל. */
  await run('סף שכן בשם דומה ובערך אחר',
    [[IDX, CLEAN_IDX, CLEAN_IDX.replace(MODULE_TAG, MODULE_TAG + '\nvar LS_SWEEP_PCT_DOC = 0.90;')]], false,
    null, partOf(ROW_SWEEP));

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
      "tier1: [{ key: 'x_mut', syncedThrough: function () { return 0; } },")]], false,
    null, partOf(ROW_SWEEP));
}

/* ────── ⛔ שם החודש בצורה אחת ───────────────────────────────────────────────
   ⛔ מה נאכף: שם אדר נושא גרש עברי אחד — ⚠️ ושני הצדדים ממוטטים: ⭐ סימן
   שגוי, ⛔ וסימן שהוסר כליל. ⛔ הנימוק המדוד: שתי צורות הן שני דליים
   בארכיון. ⛔ מה יישבר בלעדיו: צורה שנייה תיכנס בשקט. ⛔ מה אינו נאכף
   כאן: **איזה** איות נבחר — ⭐ הנמדד הוא הסימן ⛔ ולא השם.
   ──────────────────────────────────────────────────────────────────────── */
{
  const CLEAN3 = CLEAN_CAP_TXT;
  const runOver = (label, file, clean, text, mustFall, claim) => {
    ok('המוטציה «' + label + '» שינתה את הקוד שנמסר לריצה', text !== clean);
    const { held, out } = callRun(capRun, { [file]: text }, SRC_ONLY);
    if (!mustFall) { ok('⭐ מוטציית-נגד: ' + label + ' ⛔ אינה מפילה', held); return; }
    ok('⛔ מוטציה: ' + label + ' מפילה את «' + claim + '»',
       !held && out.some((l) => l.indexOf('❌') === 0 && l.indexOf(claim) >= 0));
  };
  /*  ⛔ שם החודש בצורה אחת (סבב 108) — ⚠️ ושני הצדדים ממוטטים: ⭐ סימן
   *  שגוי, ⛔ וסימן שהוסר כליל. */
  /*  ⛔ המערכים חיים במודול ⛔ ולא ב-`index.html` (סבב 154) — ⚠️ מוטציה
   *  שנכתבת לקובץ הייתה מוטטת טקסט שאינו שם: ⭐ והקובץ הוא מה שהשער קורא. */
  const HEB_REL = 'core/hebrew.js';
  const HEB_ABS = path.join(WORK, 'core', 'hebrew.js');
  const CLEAN_IDX3 = fs.existsSync(HEB_ABS)
    ? fs.readFileSync(path.join(WORK, 'core', 'hebrew.js'), 'utf8') : '';
  if (/MONTHS_HEB_LEAP\s*=\s*\[/.test(CLEAN_IDX3)) {
    runOver('אפוסטרוף במקום גרש עברי בשם החודש', HEB_REL, CLEAN_IDX3,
      CLEAN_IDX3.replace(/אדר א׳/g, "אדר א'"), true, 'monthFormGaps');
    runOver('שם אדר בלי סימן כלל', HEB_REL, CLEAN_IDX3,
      CLEAN_IDX3.replace(/אדר א׳/g, 'אדר א').replace(/אדר ב׳/g, 'אדר ב'),
      true, 'monthFormGaps');
    /*  ⭐ מוטציית-נגד חיה: ⛔ שם חודש שהוחלף באיות אחר — ⚠️ ערך חי בשני
     *  המערכים, ⭐ ואין בו סימן: ⛔ הנמדד הוא הסימן ⛔ ולא השם.
     *  ⚠️ **והמערכים יושבים בבלוק חתום** — ⛔ ולכן כל שינוי בהם מפיל את
     *  החתימה: ⭐ והטענה כאן היא ש**`monthFormGaps` עצמה אינה נופלת**,
     *  ⛔ ולא שהריצה כולה עוברת. */
    {
      const HEB_SPELL = CLEAN_IDX3.replace(/"סיון"/g, '"סיוון"');
      ok('המוטציה «איות אחר לשם חודש בלי סימן» שינתה את הקוד שנמסר לריצה',
         HEB_SPELL !== CLEAN_IDX3);
      const { out } = callRun(capRun, { [HEB_REL]: HEB_SPELL }, SRC_ONLY);
      ok('⭐ מוטציית-נגד: איות אחר לשם חודש בלי סימן ⛔ אינו מפיל את «monthFormGaps»',
         !out.some((l) => l.indexOf('❌') === 0 && l.indexOf('monthFormGaps') >= 0));
    }
  } else {
    /*  ⛔ אין כאן מערך חודשים ⛔ ואין מה למוטט — ⚠️ והדילוג נמדד: ⭐ ההיעדר
     *  מוצהר ב-`skipCaps` של הבודק, ⛔ ואינו הנחה. */
    ok('⭐ אין כאן מערך חודשים ⛔ ואין מה למוטט — וההיעדר מוצהר ב-skipCaps',
       /skipCaps:[^}]*\bhebdate:/.test(CLEAN3));
  }
}

/* ────── ⛔ סולם נקודות השבירה (סבב 155) ─────────────────────────────────────
   ⛔ מה נאכף: הסולם נמדד בכיסוי — ⚠️ כל נקודה שבו יש לה כלל חי בגיליון,
   ⭐ או הצהרה בשמה: ⛔ ואיתה מיקום של אלמנט צף שנגזר מחצי המסך.
   ⛔ הנימוק המדוד: ה-probe מדד את **הכיוון ואת האסימונים** ⛔ ולא את
   הכיסוי — ⚠️ והשורה הייתה ✅ בחמישה בזמן שבאחת מהן חיה נקודה אחת:
   ⭐ וכל מסך מעליה נראה זהה.
   ⛔ מה יישבר בלעדיו: סולם חלקי ימשיך להיראות כסולם, ⚠️ וכפתור שמחושב
   מחצי המסך ימשיך לשאת בתוכו רוחב עמודה שקובע לנצח.
   ⛔ מה אינו נאכף כאן: **איך הפריסה נראית** בכל נקודה — ⚠️ זו עין ולא
   מדידה, ⭐ והיא נבדקת בדפדפן בסוף הסבב.
   ──────────────────────────────────────────────────────────────────────── */
{
  const SHEET = path.join(WORK, 'app.css');
  const CLEAN_SHEET = fs.readFileSync(SHEET, 'utf8');
  /*  ⛔ מספר השורה נגזר **משמה** ⛔ ואינו מוקלד — ⚠️ מספור מחדש מזיז את
   *  השורות, ⭐ ומוטציה שמחפשת מספר מוקלד נופלת על העץ התקין. */
  const bpRow = rows.find((x) => x.line.split('|')[2].trim() === 'פריסה במסכי טלפון וטאבלט');
  if (!bpRow) throw new Error('שורת הפריסה אינה בטבלה — ⛔ עדכן את השם או את הטבלה');
  const ROW_BP = bpRow.row;
  /*  ⛔ המוטציה נבדקת מול **שם השורה שנפלה** ⛔ ולא מול «נפל» — ⚠️ שער
   *  שנופל מסיבה אחרת נראה כאכיפה ⭐ ואינו אוכף דבר. */
  const bpMut = async (label, files, mustFall) => {
    let changed = false;
    for (const [, clean, text] of files) if (text !== clean) changed = true;
    ok('המוטציה «' + label + '» שינתה את הקוד שנמסר לריצה', changed);
    const { held, out, filtered } = await why(files, partOf(ROW_BP));
    if (!mustFall) { ok('⭐ מוטציית-נגד: ' + label + ' ⛔ אינה מפילה', held); return; }
    ok('⛔ מוטציה: ' + label + ' מפילה את שורה ' + ROW_BP + (filtered ? ' בסינון «src»' : ''),
       !held && out.some((l) => l.indexOf('❌ שורה ' + ROW_BP + ' ') === 0));
  };
  /*  ⛔ הנקודה שמוסרת נגזרת מהגיליון ⛔ ואינה מוקלדת — ⚠️ הסולם זהה
   *  בחמישה, ⭐ והנקודות שיש להן כלל חי אינן: ⛔ מוטציה שנוקבת במספר
   *  הייתה עוברת בריפו שאין בו הכלל הזה. */
  const live = [...CLEAN_SHEET.matchAll(/@media[^{]*?\(min-width\s*:\s*(\d+)px\)/g)]
    .map((m) => Number(m[1])).sort((a, b) => a - b);
  const gone = live[live.length - 1], kept = live[0];
  const dropped = CLEAN_SHEET.split('(min-width:' + gone + 'px)')
    .join('(min-width:' + kept + 'px)');
  await bpMut('נקודת השבירה ' + gone + 'px יורדת מהגיליון', [[SHEET, CLEAN_SHEET, dropped]], true);
  await bpMut('`max-width` בשאילתת פריסה',
    [[SHEET, CLEAN_SHEET, CLEAN_SHEET + '\n@media (max-width:' + kept + 'px){main{margin:0}}\n']], true);
  await bpMut('אלמנט צף שממוקם מחצי המסך',
    [[SHEET, CLEAN_SHEET, CLEAN_SHEET +
      '\n.zz-mut-float{position:fixed;inset-inline-end:calc(50% - 195px)}\n']], true);
  /*  ⭐ מוטציית-נגד: אותה הסרה בדיוק, ⛔ והנקודה מוצהרת בשמה — ⚠️ שינוי
   *  חי בשני הקבצים ⛔ ולא הערה: ⭐ וההצהרה היא מה שמחזיק את השורה. */
  const withDecl = CLEAN_CAP_TXT.replace('  bpNoRule: {',
    '  bpNoRule: {\n    ' + gone + ": 'הוצהרה במוטציית-הנגד — ⚠️ נקודה שאין בה מה להשתנות',");
  await bpMut('נקודה שירדה מהגיליון ומוצהרת בשמה',
    [[SHEET, CLEAN_SHEET, dropped], [CAP_FILE, CLEAN_CAP_TXT, withDecl]], false);
}

process.chdir(ROOT);
fs.rmSync(WORK, { recursive: true, force: true });

console.log(failed ? `\n✗ ${GATE_ID} (מטריצה · src) — ${failed} נכשלו, ${passed} עברו`
                   : `\n✓ ${GATE_ID} (מטריצה · src) — ${passed} טענות עברו`);
process.exit(failed ? 1 : 0);
