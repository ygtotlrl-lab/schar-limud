#!/usr/bin/env node
/*  test_lists.mjs — שקילות שתי רשימות המודולים המשותפים.
 *
 *  **מה נאכף:** ⛔ שתי הרשימות שמתארות «אלה הבלוקים המשותפים
 *  שב-`index.html`» **נגזרות מהמקור ומושוות דו-כיוונית** — ⛔ וכל הבדל
 *  מפיל, למעט שניים מדודים ומוצהרים כאן.
 *
 *  **הנימוק המדוד:** שני מודולים ישבו ברשימת החתימות של בודק היכולות
 *  ⛔ ולא ברשימת הבלוקים של בודק ההערות — ⚠️ כלומר הליבה שלהם נאכפה
 *  בחתימה, ובודק ההערות ספר אותם כ**קוד פרטי**.
 *
 *  **מה יישבר בלעדיו:** ⛔ קיום שקט באחת ולא בשנייה — ⚠️ בלוק שנחשב פרטי
 *  נערך פר-אפליקציה, ⭐ והחתימה נשברת בריפו אחד בזמן שהשער מאשר בשלושה.
 *
 *  **מה אינו נאכף כאן:** ⛔ תוכן הבלוקים — ⚠️ הוא נאכף בחתימות ה-`sha256`,
 *  ⭐ וכאן נמדדת **רשימת השמות** בלבד.
 *
 *  ⭐ **למה גזירה ולא ייבוא:** בודק היכולות הוא **סקריפט** שרץ מיד ומסתיים
 *  ביציאה, ⛔ ולכן ייבוא ממנו היה מריץ אותו ויוצא באמצע בודק ההערות;
 *  ⚠️ וחילוץ לקובץ חמישי היה מוסיף קובץ שורש שמחייב חריגה מוצהרת ומשכתב
 *  שני בודקים זהים בית-לבית — ⛔ רדיוס פגיעה גדול מהפער שהוא סוגר.
 *  ⚠️ **מפתח הזהות הוא סמן הסוף המנורמל** ⛔ ולא סמן הפתיחה: ⭐ שתי הרשימות
 *  כותבות את הפתיחה בצורות שונות, ⛔ והסוף זהה בשתיהן.
 */

import fs from 'node:fs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = { app: 'schar-limud' };
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

const CAPS_FILE = 'tools/check-capabilities.mjs';
const CMT_FILE  = 'tools/check-comments.mjs';

/*  ⛔ ההבדל היחיד המותר — ורק הוא (סבב 91).
 *  `swcore` יושב ב-`sw.js`, ו-`check-comments.mjs` סורק את ה-JS המוטבע
 *  שב-`index.html` בלבד; הוא מזוהה ב-`block.file` ומנוכה **בגזירה** ולא
 *  ברשימת חריגים — כלומר בלוק חיצוני עתידי ינוכה מאליו.
 *  ⚠️ «מידע טכני» ישב כאן עד סבב 91 — ⛔ ומאז יש לו בלוק חתום ב-`CAPS`.
 *  ⛔ **והחרגה שאין לה מקרה בפועל מפילה.** */
const CMT_ONLY = [];

let failures = 0, checks = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בארבעת הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 8, app: 0, appWhy: '' };
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
const pass = (m) => { RAN++; checks++; console.log('  ✅ ' + m); };
const fail = (m) => { RAN++; checks++; failures++; console.log('  ❌ ' + m); };

/*  נרמול סמן: מסיר את פתיחת ההערה, את תווי המסגרת ואת הרווחים העודפים.
 *  ⛔ שם, מרכאות ותוכן **אינם** מנורמלים (סבב 45ב) — נרמול שלהם היה הופך
 *  שני מודולים שונים לאותו מפתח. */
const norm = (s) => s.replace(/\/\*/g, ' ').replace(/\*\//g, ' ')
                     .replace(/═+/g, ' ').replace(/\s+/g, ' ').trim();

/*  גזירת סמני הסוף מ-`CAPS`: כל `end:` שאינו של בלוק עם `file:`.
 *  ⚠️ הסריקה היא על גוף ה-`block` — בין `block: {` לבין ה-`}` שסוגר אותו —
 *  כדי ש-`file:` ו-`end:` של אותו בלוק ייקראו יחד. */
function capsEnds(src) {
  const out = [];
  const re = /block\s*:\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length, depth = 1;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const body = src.slice(m.index, i);
    const end = body.match(/end\s*:\s*'([^']*)'/);
    if (!end) continue;
    if (/\bfile\s*:/.test(body)) continue;
    out.push(norm(end[1]));
  }
  return out;
}

/*  גזירת סמני הסוף מ-`SHARED_BLOCKS`: האיבר השני בכל זוג. */
function cmtEnds(src) {
  const i0 = src.indexOf('const SHARED_BLOCKS = [');
  if (i0 < 0) return null;
  const i1 = src.indexOf('\n];', i0);
  if (i1 < 0) return null;
  const out = [];
  for (const line of src.slice(i0, i1).split('\n')) {
    const m = line.match(/\[\s*'([^']*)'\s*,\s*'([^']*)'\s*\]/);
    if (m) out.push(norm(m[2]));
  }
  return out;
}

console.log('\n🔎 שקילות רשימות המודולים המשותפים — ' + APP.app + '\n');

const capsSrc = fs.readFileSync(CAPS_FILE, 'utf8');
const cmtSrc  = fs.readFileSync(CMT_FILE,  'utf8');
const caps = capsEnds(capsSrc);
const cmt  = cmtEnds(cmtSrc);

/*  1 — שתי הרשימות נגזרו בפועל. ⛔ רשימה ריקה היא כישלון ולא «אין הבדל»
 *  (סבב 45ב) — שינוי פורמט שמפיל את הגזירה היה הופך את הבדיקה
 *  לעוברת-תמיד, כלומר לשער שאינו נועל דבר. */
if (caps.length >= 6) pass('נגזרו ' + caps.length + ' מודולים מ-CAPS (בלי בלוקים חיצוניים)');
else fail('גזירת CAPS החזירה ' + caps.length + ' מודולים — הפורמט השתנה, והבדיקה עיוורת');

if (cmt && cmt.length >= 6) pass('נגזרו ' + cmt.length + ' מודולים מ-SHARED_BLOCKS');
else fail('גזירת SHARED_BLOCKS החזירה ' + (cmt ? cmt.length : 'null') + ' מודולים — הפורמט השתנה');

/*  2 — אין כפילויות בתוך רשימה. */
for (const [nm, list] of [['CAPS', caps], ['SHARED_BLOCKS', cmt || []]]) {
  const dup = list.filter((x, i) => list.indexOf(x) !== i);
  if (dup.length) fail(nm + ': סמן סוף כפול — ' + [...new Set(dup)].join(' · '));
  else pass(nm + ': אין סמן סוף כפול');
}

/*  3 — שקילות דו-כיוונית, אחרי ניכוי ההבדל המוצהר. */
const allowed = CMT_ONLY.map(norm);
const capsSet = new Set(caps);
const cmtSet  = new Set(cmt || []);
const missingInCmt  = caps.filter((x) => !cmtSet.has(x));
const missingInCaps = (cmt || []).filter((x) => !capsSet.has(x) && !allowed.includes(x));

if (!missingInCmt.length) pass('כל מודול שב-CAPS נמצא גם ב-SHARED_BLOCKS');
else fail('מודולים שב-CAPS ונעדרים מ-SHARED_BLOCKS — נספרים כקוד פרטי: ' + missingInCmt.join(' · '));

if (!missingInCaps.length) pass('כל מודול שב-SHARED_BLOCKS נמצא גם ב-CAPS (או מוצהר כחריג)');
else fail('מודולים שב-SHARED_BLOCKS ונעדרים מ-CAPS — ליבתם אינה נאכפת בחתימה: ' + missingInCaps.join(' · '));

/*  4 — ההבדל המוצהר קיים בפועל. ⛔ חריג רשום שאינו קיים הופך בעצמו לשריד
 *  (סבב 45ב) — בדיוק מה שרשימת-היתר שהתיישנה עושה ב-`check-structure.mjs`. */
for (const a of allowed) {
  if (cmtSet.has(a) && !capsSet.has(a)) pass('החריג המוצהר «' + a + '» קיים ב-SHARED_BLOCKS ואינו ב-CAPS');
  else fail('החריג המוצהר «' + a + '» אינו במצב שהוצהר — רשימת-היתר שהתיישנה');
}

/*  5 — שני המודולים שהסבב הזה הוסיף נמצאים בשתי הרשימות. */
for (const need of ['סוף מודול מזהי הרשומות', 'סוף מודול מזהה המכשיר']) {
  const n = norm(need);
  if (capsSet.has(n) && cmtSet.has(n)) pass('«' + need + '» בשתי הרשימות');
  else fail('«' + need + '» חסר ב-' + (capsSet.has(n) ? 'SHARED_BLOCKS' : 'CAPS'));
}

/*  ⛔ מכאן ולמטה מוטציות ובדיקות שלמות (סבב 92) — ⚠️ הן רצות ברמה
 *  המלאה בלבד: ⛔ הרמה המהירה עוצרת כאן עם קוד היציאה של הטענות
 *  שכבר רצו, ⭐ והכיסוי שלהן אינו יורד. */
mutStage();
if (!RUN_MUT) {
  console.log('\n⏭ test_lists: המוטציות רצות ברמה המלאה (--full)');
  process.exit(failures ? 1 : 0);
}
/*  6 — מוטציות. ⛔ רצות על עותק בזיכרון ולא על העץ (סבב 45ב, הלקח של
 *  סבב 42ג) — מוטציה שנכתבת לקובץ האמיתי מותירה את הריפו שבור אם
 *  התהליך נהרג באמצע. */
const mutCmtDrop = (marker) => cmtSrc.split('\n')
  .filter((l) => !(l.includes("['") && l.includes(marker))).join('\n');

function mutCapsDrop(marker) {
  const i = capsSrc.indexOf(marker);
  if (i < 0) return capsSrc;
  return capsSrc.slice(0, i) + '__GONE__' + capsSrc.slice(i + marker.length);
}

function equiv(cSrc, mSrc) {
  const a = capsEnds(cSrc), b = cmtEnds(mSrc) || [];
  const as = new Set(a), bs = new Set(b);
  return !a.filter((x) => !bs.has(x)).length &&
         !b.filter((x) => !as.has(x) && !allowed.includes(x)).length;
}

if (!equiv(capsSrc, mutCmtDrop('סוף מודול מזהה המכשיר')))
  pass('מוטציה: הסרת מודול מ-SHARED_BLOCKS בלבד — מפילה');
else fail('מוטציה: הסרת מודול מ-SHARED_BLOCKS בלבד **לא** הפילה');

if (!equiv(mutCapsDrop('סוף מודול מזהי הרשומות'), cmtSrc))
  pass('מוטציה: הסרת מודול מ-CAPS בלבד — מפילה');
else fail('מוטציה: הסרת מודול מ-CAPS בלבד **לא** הפילה');

/*  ⭐ ומוטציה שלישית, בכיוון ההפוך: בלוק שיושב בקובץ אחר מנוכה **בגזירה**
 *  ולא ברשימת חריגים, ולכן הסרת ה-`file:` שלו חייבת להפיל. */
if (!equiv(capsSrc.replace(/file:\s*'sw\.js',\s*/, ''), cmtSrc))
  pass('מוטציה: בלוק חיצוני שאיבד את `file:` — מפיל');
else fail('מוטציה: בלוק חיצוני בלי `file:` **לא** הפיל');

/*  ⭐ מוטציית-נגד: **סדר** הרשימה אינו חלק מהטענה — ⚠️ השקילות היא בין
 *  קבוצות, ⛔ ולא בין רצפים: ⭐ שער שהיה נופל על סדר היה כופה סנכרון של
 *  שתי רשימות שאין ביניהן קשר סדר. */
{
  const reorder = (s) => s.replace(/(\n\s*\{ *end: *'[^']*'[\s\S]*?\},)(\n\s*\{ *end: *'[^']*'[\s\S]*?\},)/,
                                   (all, a, b) => b + a);
  const shuffled = reorder(cmtSrc);
  if (shuffled === cmtSrc || equiv(capsSrc, shuffled))
    pass('נ1 · ⭐ מוטציית-נגד: היפוך סדר שני איברים ברשימה ⛔ אינו מפיל — נמדדת קבוצה, לא רצף');
  else fail('נ1 · ⭐ מוטציית-נגד: היפוך סדר ברשימה **הפיל** — הטענה מודדת רצף במקום קבוצה');
}

console.log(failures ? '\n❌ שקילות רשימות המודולים נכשלה (' + failures + '/' + checks + ')'
                     : '\n✅ שקילות רשימות המודולים עברה (' + checks + ' טענות)');
process.exit(failures ? 1 : 0);
