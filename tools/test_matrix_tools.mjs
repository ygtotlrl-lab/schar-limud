#!/usr/bin/env node
/*  test_matrix_tools.mjs — המטריצה נאכפת על קלט הכלים: ⛔ הבודק והשערים.
 *
 *  **מה נאכף:** ⛔ מנגנוני הבודק שאינם תא בטבלה — ⚠️ אי-התאמה בין `ROWS`
 *  ל-`claims`, עוזר דילוג שאינו סופר, בלוק חתום בלי שורה, שער שכותב ואינו
 *  מצהיר, סוג שער שאינו תואם למה שהוא עושה, ⛔ ותווית קלט שאינה תואמת
 *  לקריאה בפועל: ⭐ כל אחד ממוטט בקוד הכלים, ⛔ והבודק האמיתי רץ עליו.
 *
 *  **הנימוק המדוד:** ⛔ היפוך תא מודד **סימון** — ⚠️ ואינו מגיע לקוד
 *  שמכריע את הסימון: ⭐ טענה בבודק שאיש אינו מוטט היא טענה שאיש לא הוכיח
 *  שהיא מפילה.
 *
 *  **מה יישבר בלעדיו:** ⛔ בודק שנחלש בשקט ממשיך לדווח «עבר», ⚠️ וכל
 *  השורות שהוא אוכף נראות מכוסות.
 *
 *  **מה אינו נאכף כאן:** ⛔ היפוך תאי הטבלה ומוטציות במקור האפליקציה —
 *  ⚠️ כל קלט נמדד בחלק שלו, ⭐ ושם החלק אומר איזה.
 *
 *  ⛔ אין להחליף את הרצת-הבודק-האמיתי בסימולציה — ⚠️ בדיקה שאינה מריצה את
 *  השער עצמו אינה מוכיחה עליו דבר. ⛔ ומוטציה בגוף הבודק נכתבת לעותק
 *  ונטענת מחדש: ⭐ המודול עצמו הוא מה שמוטט.
 *  זהה בית-לבית בכל הריפו פרט לבלוק APP.
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
/*  ⚠️ **ואין כאן ריצפה פרטית** — ⛔ המנגנונים שממוטטים כאן משותפים לכולן, ⭐ וכל אחד מוסיף
 *  את אותן טענות בכל אחת מהן. */
const FLOOR = { shared: 30, app: 0, appWhy: '' };
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

function copyRepo() {
  /*  ⛔ כותב על עותק — ⚠️ מוטציה בגוף הבודק עצמו, ⛔ וייבוא חדש קורא את הקובץ מהדיסק. */
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), FACTS.slug + '-matrix-'));
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
/*  ⛔ ייבוא אחד — ⚠️ הבודק חושף `run(over)`, ⭐ ו-`over` היא מפת
 *  נתיב⟵תוכן שגוברת על הדיסק: ⛔ ההיפוך נמסר כארגומנט ⛔ ואינו נכתב לעץ,
 *  ⚠️ ואינו דורש ייבוא טרי — ⭐ הנימוק המדוד: 684 היפוכים היו 684 כתיבות
 *  ו-684 ייבואים, ⛔ וכל ייבוא קרא את העץ כולו מחדש.
 *  ⛔ **ומדידה שנקטעת אינה משאירה שארית** — ⚠️ אין מה לשחזר. */
const CLEAN_CAP_TXT = fs.readFileSync(CAP_FILE, 'utf8');
const CAP_MOD = await import(CHECKER);
const capRun = CAP_MOD.run;
/*  ⛔ החלק נגזר מאות הקטגוריה שבטבלה — ⚠️ הבודק מפוצל לשערים
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

/*  ⭐ שורה שכמה שערים אוכפים אותה — ⛔ המוטציה מסירה שער
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

/* ────── ⛔ הדילוג נספר ככל תוצאה ────────────────────────────────────────────
   ⛔ מה נאכף: עוזר הדילוג בבודק התיעוד מקדם את מונה הטענות — ⚠️ תוצאה
   שהוכרעה כדילוג היא תוצאה: ⭐ השער שאל אם יש בסיס להשוואה וענה «אין».
   ⛔ הנימוק המדוד: מונה שאינו סופר אותה מדווח ריצה חלקית, ⚠️ ומפיל שער
   שרץ במלואו — ⛔ והבאנר שלו מצהיר במפורש שהדילוג אינו מפיל.
   ⛔ מה יישבר בלעדיו: החזרת הספירה הישנה עוברת בשקט, ⚠️ והשינוי הסמנטי
   של הסבב הקודם נשחק בלי שאיש יראה.
   ⛔ מה אינו נאכף כאן: **מתי מותר לדלג** — ⚠️ זו הכרעת השער עצמו.
   ──────────────────────────────────────────────────────────────────────── */
{
  const DOCS_FILE = path.join(WORK, 'tools', 'check-docs.mjs');
  const cleanDocs = fs.readFileSync(DOCS_FILE, 'utf8');
  /*  ⛔ המוטציה מסירה את הקידום ⛔ ולא את העוזר — ⚠️ זו בדיוק הספירה
   *  הישנה, ⭐ והטענה שאמורה ליפול היא «עוזר הדילוג אינו מקדם את המונה». */
  /*  ⛔ הדפוס נבנה מחלקיו ⛔ ואינו ליטרל שלם — ⚠️ אחרת גוף השער הזה נראה
   *  כעוזר דילוג, ⭐ והבודק מפיל אותו על עצמו. */
  const SKIP_RE = new RegExp('(const skip' + 'ped = \\([^)]*\\) =>\\s*\\{)\\s*RAN\\+\\+;');
  const back = cleanDocs.replace(SKIP_RE, '$1');
  ok('המוטציה החזירה את הספירה הישנה בעותק', back !== cleanDocs);
  const stillOk = (await withDisk([[DOCS_FILE, cleanDocs, back]])).held;
  ok('⛔ מוטציה: עוזר דילוג שאינו מקדם את המונה מפיל את «שער מריץ את כל טענותיו»',
     !stillOk);
  /*  ⭐ מוטציית-נגד: שינוי חי בגוף העוזר — ⛔ אינו מפיל. */
  const KEEP_RE = new RegExp('(const skip' + 'ped = \\([^)]*\\) =>\\s*\\{\\s*RAN\\+\\+;)');
  const anti2 = cleanDocs.replace(KEEP_RE, '$1 void 0;');
  ok('מוטציית-הנגד שינתה את הקוד', anti2 !== cleanDocs);
  const held2 = (await withDisk([[DOCS_FILE, cleanDocs, anti2]])).held;
  ok('⭐ מוטציית-נגד: קוד שנוסף בגוף עוזר הדילוג ⛔ אינו מפיל', held2);
}

/* ────── ⛔ בלוק חתום שאין לו שורה ───────────────────────────────────────────
   ⛔ מה נאכף: הצהרת כל בלוק חתום בשורה — ⚠️ נמדדת ב-check-capabilities,
   ⛔ ואינה נמדדת בהיפוך תא: ⭐ ההיפוך מודד **סימון**, ⛔ והיא מודדת
   **מבנה**. ⛔ הנימוק המדוד: בלוק חתום שאף שורה אינה נוקבת בו עובר
   בשתיקה. ⛔ מה יישבר בלעדיו: probe שנוסף ואינו מוטט הוא probe שאיש לא
   הוכיח שהוא מפיל. ⛔ מה אינו נאכף כאן: **איזו** שורה נוקבת בבלוק —
   ⭐ זו קריאת משמעות, ⚠️ והמרשם הוא מה שנמדד.
   ⚠️ כל מוטציה נוקבת בשם הטענה שתיפול ⛔ ונבדק שהיא זו שנפלה.
   ──────────────────────────────────────────────────────────────────────── */
{
  const CAP3 = CAP_FILE;
  const CLEAN3 = CLEAN_CAP_TXT;
  const runClaim = async (label, files, mustFall, claim) => {
    let changed = false;
    for (const [, clean, text] of files) if (text !== clean) changed = true;
    ok('המוטציה «' + label + '» שינתה את הקוד שנמסר לריצה', changed);
    const { held, out } = await withDisk(files);
    if (!mustFall) { ok('⭐ מוטציית-נגד: ' + label + ' ⛔ אינה מפילה', held); return; }
    ok('⛔ מוטציה: ' + label + ' מפילה את «' + claim + '»',
       !held && out.some((l) => l.indexOf('❌') === 0 && l.indexOf(claim) >= 0));
  };

  /*  ⛔ בלוק חתום שאין לו שורה — ⚠️ ההצהרה יורדת, ⛔ והבלוק נשאר: ⭐ בדיוק
   *  המצב שהיה עד היום, ⛔ ואיש לא ידע. */
  await runClaim('הסרת docRows מבלוק חתום',
    [[CAP3, CLEAN3, CLEAN3.replace(/\n    docRows: \[[^\]]*\],/, '')]],
    true, 'בלוקים שאינם מוצהרים בטבלה');
  /*  ⭐ מוטציית-נגד — ⛔ שני השמות מוחלפים בעקביות: ⚠️ שינוי חי ⛔ ולא
   *  הערה, ⭐ ושם הטענה שב-`GATES` נגרר איתו. */
  await runClaim('החלפת שמות blockRowGaps ו-NAME_SIGN בעקביות',
    [[CAP3, CLEAN3, CLEAN3.replace(/blockRowGaps/g, 'blockDocGaps')
                          .replace(/NAME_SIGN/g, 'ROW_SIGN')]], false);

  /*  ⛔ מוטציה שכל קוראיה עוברים ב-`readOnce` נמסרת כארגומנט —
   *  ⚠️ ואינה נכתבת לדיסק ואינה דורשת ייבוא טרי: ⭐ הנימוק המדוד — ייבוא
   *  אחד בהנהלה הוא כחמש שניות, ⛔ ושש מוטציות דיסק היו שלושים.
   *  ⛔ **ומה שאינו עובר ב-`readOnce` נשאר בדיסק** — ⚠️ `APP` הוא אובייקט
   *  של המודול, ⭐ ורק ייבוא טרי מחליף אותו. */
  /*  ⚠️ `file` הוא שם קובץ, ⛔ או מפה של קבצים — ⭐ מוטציה בגוף בלוק חתום
   *  דורשת גם את החתימה: ⛔ בלעדיה החתימה היא שנופלת ⛔ ולא הטענה הנמדדת. */
  const runOver = (label, file, clean, text, mustFall, claim) => {
    const over = (typeof file === 'string') ? { [file]: text } : file;
    ok('המוטציה «' + label + '» שינתה את הקוד שנמסר לריצה',
       (typeof file === 'string') ? text !== clean : true);
    const { held, out } = callRun(capRun, over);
    if (!mustFall) { ok('⭐ מוטציית-נגד: ' + label + ' ⛔ אינה מפילה', held); return; }
    ok('⛔ מוטציה: ' + label + ' מפילה את «' + claim + '»',
       !held && out.some((l) => l.indexOf('❌') === 0 && l.indexOf(claim) >= 0));
  };

  /*  ⛔ שער שכותב ואינו מצהיר — ⚠️ ההצהרה יורדת, ⛔ והכתיבה
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

  /*  ⛔ סוג השער — ⚠️ וארבע ההפרות ממוטטות: ⭐ שתיים בקוד השער
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

/* ────── ⛔ הצהרת קלט הבדיקות ────────────────────────────────────────────────
   ⛔ מה נאכף: התווית שב-`APP.probeInput` היא מה שקובע אילו בדיקות רצות
   שוב כשהטבלה מתהפכת — ⚠️ ולכן תווית שגויה אינה טעות תיעוד: ⭐ היא הופכת
   שורה לבדיקה שאינה יכולה להיכשל. ⛔ הנימוק המדוד: בלי הסינון רצו כל
   הבדיקות בכל היפוך, ⚠️ ורובן אינן פותחות את הטבלה כלל. ⛔ מה יישבר
   בלעדיו: הצהרה שנסחפה מהקוד תשתיק בדיקה בלי שאיש יראה. ⛔ מה אינו
   נאכף כאן: **מהו** הקלט של כל בדיקה — ⭐ אותו מודד `check-capabilities`
   מול הקריאות בפועל.
   ⚠️ המוטציה נוקבת בשם הטענה שתיפול ⛔ ונבדק שהיא זו שנפלה.
   ──────────────────────────────────────────────────────────────────────── */
{
  const clean = CLEAN_CAP_TXT;
  /*  ⛔ הפיכת תווית `mixed` ל-`src` — ⚠️ בדיקה שקוראת יותר ממשפחה אחת
   *  מוכרזת כאילו היא קוראת את המקור בלבד, ⛔ וזה בדיוק הסיווג שמשתיק. */
  /*  ⛔ החלק נגזר מהמפתח שהוחלף — ⚠️ ההצהרה נמדדת בשער של
   *  השורה, ⭐ ושער אחר אינו מריץ את הבדיקה כלל: ⛔ «לא נפל» היה מתקיים
   *  מעצמו. */
  const MIXED_RE = /'(\d+)\|[^']*': 'mixed',/;
  const badRow = Number((MIXED_RE.exec(clean) || [])[1]);
  const bad = clean.replace(MIXED_RE, (m) => m.replace("'mixed',", "'src',"));
  ok('המוטציה «תווית mixed שהוחלפה ב-src» שינתה את גוף check-capabilities', bad !== clean);
  const r1 = await withDisk([[CAP_FILE, CLEAN_CAP_TXT, bad]], undefined, partOf(badRow));
  ok('⛔ מוטציה: תווית קלט שאינה תואמת לקריאה בפועל מפילה את «הצהרת קלט הבדיקות»',
     !r1.held && r1.out.some((l) => l.indexOf('❌') === 0 && l.indexOf('הצהרת קלט הבדיקות') >= 0));
  /*  ⭐ מוטציית-נגד חיה: ⛔ שם השדה מוחלף בעקביות בשני צדדיו — ⚠️ שינוי
   *  חי ⛔ ולא הערה, ⭐ והמנגנון עצמו נשמר. */
  const anti = clean.replace(/probeInput/g, 'probeReads');
  ok('מוטציית-הנגד שינתה את הקוד', anti !== clean);
  const r2 = await withDisk([[CAP_FILE, CLEAN_CAP_TXT, anti]]);
  ok('⭐ מוטציית-נגד: החלפת שם השדה בעקביות ⛔ אינה מפילה', r2.held);
}

process.chdir(ROOT);
fs.rmSync(WORK, { recursive: true, force: true });

console.log(failed ? `\n✗ ${GATE_ID} (מטריצה · tools) — ${failed} נכשלו, ${passed} עברו`
                   : `\n✓ ${GATE_ID} (מטריצה · tools) — ${passed} טענות עברו`);
process.exit(failed ? 1 : 0);
