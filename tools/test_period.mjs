/* ───────────────────────────────────────────────────────────────────────────
   test_period.mjs — התקופה נגזרת, ואוצר המילים אחד
   ───────────────────────────────────────────────────────────────────────────
   **מה נאכף:** ⛔ אין טבלה ואין מפתח אחסון ששמם נושא תקופה — ⚠️ החודש
   והשנה מחושבים מתאריך הרשומה, ⭐ וטבלה שנושאת **ערך** לתקופה מוכרזת
   ב-`APP.periodAllow` עם נימוקה. ⛔ **והלוח מוצהר ב-`APP.calendar`** —
   ⚠️ עם נימוק תפקידי, ⭐ ומוצלב למנוע שבמקור: ⛔ ואין מנוע עברי שני.
   ⛔ **ומרשם `APP.coreVerbs` מלא בארבעת הפעלים** — ⚠️ וכל פועל שיש לו
   מימוש כאן נושא את שמו הקנוני, ⭐ וכל פועל שאין לו נושא נימוק:
   ⛔ **ואפס שם ישן ואפס איות משובש**.

   **הנימוק המדוד:** ⛔ «הקופה» החזיקה טבלת חודשים שממלאים ביד — ⚠️ ושבע
   טבלאותיה היו ריקות במסד: ⭐ המסך הראשון נפתח לשלד, ⛔ והאפליקציה לא
   הייתה ניתנת להתקנה. ⚠️ ואותה שאלה בדיוק — «מה מפתח החודש של הרשומה» —
   נענתה בארבעה שמות שונים בארבע אפליקציות, ⛔ ואיש לא ראה שארבעתם אותה
   עבודה.

   **מה יישבר בלעדיו:** ⛔ אפליקציה תאחסן תקופה שוב — ⚠️ אחסון קל
   מחישוב, ⭐ והטבלה נשברת בהתקנה טרייה ובכל תקופה שלא הוזנה ·
   ⛔ ושם חדש ייכתב לעבודה קיימת, ⚠️ והוצאת המנגנון למודול תיחסם.

   **מה אינו נאכף כאן:** ⛔ **נכונות החישוב** — ⚠️ מה שנמדד הוא השם
   ורשימת הטבלאות, ⭐ ולא מה שהפונקציה מחזירה · ⛔ ופונקציה שעושה עבודה
   אחרת שומרת את שמה — ⚠️ `hebLabel` · `acadYearOf` · `ysSchoolYear` ·
   `getDaysInMonth` אינן בכלל הזה · ⛔ ושורת «התקנה טרייה עובדת» נמדדת
   בדפדפן אמיתי ⛔ ולא כאן.
   ──────────────────────────────────────────────────────────────────────── */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DB_SCHEMA } from './db_schema.mjs';
import { CORE_FILES } from './appsrc.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
  file: 'index.html',
  tablePrefix: 'sl_',
  /*  ⛔ הלוח שהאפליקציה מונה בו — ⚠️ **מה נכנס**: `hebrew` או `gregorian`
   *  ⟵ התפקיד שמחייב אותו; ⛔ **ומה מפיל**: לוח שאינו אחד משניהם, ונימוק
   *  שאינו אומר מה התפקיד. ⭐ **ולמה המבנה קיים**: «כך זה תמיד היה» אינו
   *  נימוק, ⛔ והוא מה שהשאיר שלוש קבוצות בלי הצהרה. */
  calendar: { kind: 'gregorian',
    why: 'החיוב הוא חודש לועזי — ⚠️ שנת הלימודים היא ספטמבר עד אוגוסט, ⭐ וההורה משלם לפי החודש שבלוח שלו' },
  /*  ⛔ טבלה או מפתח ששמם נושא תקופה ונשארים בכוונה — ⚠️ **מה נכנס**:
   *  השם ⟵ הערך שהוא נושא ולמה הוא אינו טבלת תקופה; ⛔ **ומה מפיל**: שם
   *  שאין לו טבלה ואין לו מפתח. ⭐ **ולמה ריק**: נמדד ואין. */
  periodAllow: {},
  /*  ⛔ ארבעת הפעלים — ⚠️ **מה נכנס**: הפועל הקנוני ⟵ שמו כאן, או `null`
   *  עם נימוק תפקידי; ⛔ **ומה מפיל**: מרשם חסר, שם שאינו הקנוני, ופועל
   *  `null` בלי נימוק. ⭐ **ולמה המבנה קיים**: פעולה שחוזרת ביותר מריפו
   *  אחד נושאת אותו שם ⛔ גם כשהמימוש נבדל. */
  coreVerbs: {
    monthKeyOf: { name: 'monthKeyOf',
      why: 'מפתח החודש של רשומה — ⚠️ וכאן הוא `YYYY-MM` של תאריכה, ⭐ והוא ממוין כרונולוגית כמחרוזת' },
    monthLabel: { name: 'monthLabel',
      why: 'תווית החודש לתצוגה — ⚠️ וכאן הקלט הוא שנה וחודש של שנת הלימודים, ⭐ שהטבלה החודשית נבנית מהם' },
    monthsWithData: { name: null,
      why: 'החודשים שיש בהם רשומות — ⛔ וכאן החודשים הם שנים-עשר חודשי שנת הלימודים והם קבועים: ⚠️ ואין חודש שנולד מרשומה' },
    yearOf: { name: null,
      why: 'השנה של רשומה — ⛔ וכאן היא שנת לימודים ולא שנת לוח: ⚠️ `acadYearOf` גוזרת אותה מספטמבר, ⭐ ושם שיאמר «השנה» היה מטעה' },
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [45, 114];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`), בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה.
 *  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ המרשם מונה את אותם ארבעה פעלים בכולן,
 *  ⭐ ופועל שאין לו מימוש כאן נמדד בהצהרתו ⛔ ולא בהיעדרו. */
const FLOOR = { shared: 10, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
const SUBRUN = !!process.env.GATE_SUBRUN;
/*  ⛔ הריצפה נמדדת בשני הכיוונים — ⚠️ פחות מהמוצהר הוא ריצה חלקית,
 *  ⛔ ויותר ממנו הוא ריצפה מיושנת. */
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

/*  ⛔ מקור האפליקציה הוא הקובץ **ומודולי הליבה** — ⚠️ קוד שיצא למודול
 *  אינו מפסיק להיות קוד האפליקציה: ⭐ שער שסורק את הקובץ בלבד מדווח
 *  «אפס אתרים» על קוד שרץ. */
const SRC = [APP.file].concat(CORE_FILES)
  .filter((f) => existsSync(join(ROOT, f)))
  .map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n');

/*  ⛔ ארבעת הפעלים — ⚠️ **מה נכנס**: השם הקנוני ⟵ מה הוא עושה;
 *  ⛔ **ומה מפיל**: מרשם שאינו מונה את ארבעתם, ⛔ ושם שאינו הקנוני.
 *  ⭐ **ולמה המבנה קיים**: ארבעה שמות לשאלה אחת מסתירים שארבעתם אותה
 *  עבודה, ⚠️ ומונעים הוצאה למודול. */
const VERBS = ['monthKeyOf', 'monthLabel', 'monthsWithData', 'yearOf'];

/*  ⛔ השמות שירדו — ⚠️ **מה נכנס**: שם שעשה את עבודת אחד מארבעת הפעלים
 *  בשם אחר; ⛔ **ומה מפיל**: אתר הגדרה או קריאה שנשאר. ⭐ **ולמה
 *  המבנה קיים**: שם ישן ששרד הוא אוצר מילים שני לאותו מושג. */
const OLD_VERBS = ['monthOf', 'monthKey', 'curMonthKey', 'monthKeyForDate',
                   'normHMonth', 'getMonthsWithData'];
/*  ⛔ ואיות משובש של מונח שאול — ⚠️ בשתי השפות: ⭐ איות משובש אינו נמצא
 *  בחיפוש, ⛔ ומייצר אוצר מילים שני לאותו מושג. */
const BAD_SPELL = ['pleziash', 'פלעזדש'];

/*  ⛔ המילים שמסמנות תקופה בשם — ⚠️ בשתי השפות, ⭐ ובשם טבלה או במפתח
 *  אחסון: ⛔ טבלת תקופות היא תחליף למנוע שחסר. */
const PERIOD_WORDS = ['month', 'year', 'period', 'חודש', 'שנה', 'תקופה'];

/*  ⛔ הליבה מקבלת את מה שהיא מודדת כארגומנט ⛔ ואינה קוראת מהדיסק —
 *  ⚠️ ולכן המוטציה מזינה לה קלט אחר, ⭐ בלי לגעת בעץ. */
export function periodTableHits(tables, prefix, allow) {
  return tables.filter((n) => n.indexOf(prefix) === 0)
    .filter((n) => PERIOD_WORDS.some((w) => n.indexOf(w) >= 0))
    .filter((n) => !Object.prototype.hasOwnProperty.call(allow || {}, n));
}
/*  ⛔ מפתח אחסון ששמו נושא תקופה — ⚠️ הוא נמדד על ליטרלי המחרוזת שבמקור,
 *  ⭐ **ובתחילית הטבלאות של האפליקציה בלבד**: ⛔ `start_month` הוא עמודה
 *  שנושאת **ערך** לתקופה, ⚠️ ואינו טבלת תקופה ואינו מפתח אחסון שלה.
 *  ⛔ **וההערות נחתכות לפני המדידה** — ⚠️ הערה שמסבירה **למה** מפתח אינו
 *  נמשך עוד נוקבת בשמו, ⭐ והיא עדות שהמפתח ירד ⛔ ולא שהוא חי. */
export function periodKeyHits(src, prefix, allow) {
  const out = [];
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const m of code.matchAll(/['"]([a-z][a-z0-9]*(?:_[a-z0-9]+)+)['"]/g)) {
    const k = m[1];
    if (k.indexOf(prefix) !== 0) continue;
    if (!/_(months?|years?|periods?)$/.test(k)) continue;
    if (Object.prototype.hasOwnProperty.call(allow || {}, k)) continue;
    out.push(k);
  }
  return [...new Set(out)];
}
/*  ⛔ אתר של שם ישן — ⚠️ **הגבול משני הצדדים ובצורת קריאה**: ⭐ `.monthKey`
 *  הוא שדה ולא פונקציה, ⛔ ושם שהוא תחילית של שם אחר אינו אתר. */
export function oldVerbHits(src, names) {
  const out = [];
  for (const nm of names) {
    const re = new RegExp('(?<![\\w$.])' + nm + '\\s*\\(', 'g');
    if (re.test(src)) out.push(nm);
  }
  return out;
}
/*  ⛔ והגדרה ברמת המודול — ⚠️ שלוש הצורות שהתקן מונה, ⭐ ולא אזכור
 *  בתוך מחרוזת. */
export function definesFn(src, nm) {
  return new RegExp('(?:function\\s+' + nm + '\\s*\\(|(?:var|const|let)\\s+' +
                    nm + '\\s*=|window\\.' + nm + '\\s*=)').test(src);
}
/*  ⛔ המרשם נמדד משני צדדיו — ⚠️ פועל שאינו במרשם, ⛔ ומפתח שאינו פועל:
 *  ⭐ מרשם ריק אינו אכיפה. */
export function verbRegistryGaps(reg, src) {
  const out = [];
  const keys = Object.keys(reg || {});
  for (const v of VERBS) if (keys.indexOf(v) < 0) out.push('[חסר] ' + v);
  for (const k of keys) if (VERBS.indexOf(k) < 0) out.push('[זר] ' + k);
  for (const v of VERBS) {
    const e = (reg || {})[v];
    if (!e) continue;
    if (e.name === null) { if (!e.why || e.why.length < 20) out.push('[בלי נימוק] ' + v); continue; }
    if (e.name !== v) out.push('[שם אחר] ' + v + ' ⟵ ' + e.name);
    else if (!definesFn(src, v)) out.push('[בלי גוף] ' + v);
  }
  return out;
}

console.log(`· ${APP.name} — התקופה נגזרת, ואוצר המילים אחד`);
let n = 1;

/* ── א · התקופה אינה מאוחסנת ───────────────────────────────────────────── */
const MY_TABLES = DB_SCHEMA.filter((r) => r.t.indexOf(APP.tablePrefix) === 0).map((r) => r.t);
{
  const hits = periodTableHits(MY_TABLES, APP.tablePrefix, APP.periodAllow);
  t(n++, hits.length === 0,
    `[period-store] טבלה ששמה נושא תקופה — נמדדו ${hits.length} מתוך ${MY_TABLES.length} ` +
    `טבלאות והצפוי אפס${hits.length ? ' (' + hits.join(', ') + ')' : ''}. ` +
    'גוזרים את התקופה מתאריך הרשומה, או מכריזים ב-`APP.periodAllow` עם נימוקה');
}
{
  const hits = periodKeyHits(SRC, APP.tablePrefix, APP.periodAllow);
  t(n++, hits.length === 0,
    `[period-store] מפתח אחסון ששמו נושא תקופה — נמדדו ${hits.length} והצפוי אפס` +
    `${hits.length ? ' (' + hits.join(', ') + ')' : ''}. ` +
    'גוזרים את התקופה מתאריך הרשומה, או מכריזים ב-`APP.periodAllow` עם נימוקה');
}
{
  const live = new Set([...MY_TABLES, ...periodKeyHits(SRC, APP.tablePrefix, {})]);
  const ghost = Object.keys(APP.periodAllow).filter((k) => !live.has(k));
  t(n++, ghost.length === 0,
    `[period-store] הכרזה שאין לה אתר — נמדדו ${ghost.length} מתוך ` +
    `${Object.keys(APP.periodAllow).length} הכרזות והצפוי אפס` +
    `${ghost.length ? ' (' + ghost.join(', ') + ')' : ''}. ` +
    'מסירים מ-`APP.periodAllow` שם שאין לו טבלה ואין לו מפתח');
}

/* ── ב · והלוח מוצהר ───────────────────────────────────────────────────── */
{
  const c = APP.calendar || {};
  const okKind = c.kind === 'hebrew' || c.kind === 'gregorian';
  const okWhy = typeof c.why === 'string' && c.why.length >= 20;
  t(n++, okKind && okWhy,
    `[period-calendar] הלוח מוצהר עם נימוק תפקידי — נמדד «${c.kind}» ונימוק באורך ` +
    `${(c.why || '').length} והצפוי `+'`hebrew` או `gregorian` ונימוק בן 20 תווים לפחות. ' +
    'מצהירים ב-`APP.calendar` את הלוח ואת התפקיד שמחייב אותו');
}
{
  /*  ⛔ ההצהרה מוצלבת למנוע שבמקור — ⚠️ ומנוע שני הוא שני מקורות אמת
   *  לאותה שאלה: ⭐ והספירה היא על אתר ההגדרה ⛔ ולא על הקריאה. */
  const engines = (SRC.match(/window\.ysHebDate\s*=\s*function/g) || []).length;
  const want = APP.calendar.kind === 'hebrew' ? 1 : 0;
  t(n++, engines === want,
    `[period-calendar] מנוע התאריך העברי מול הלוח המוצהר — נמדדו ${engines} אתרי הגדרה ` +
    `והצפוי ${want} ללוח «${APP.calendar.kind}». ` +
    'מיישרים את `APP.calendar` למנוע שבמקור, ⛔ ואין מנוע שני');
}

/* ── ג · ואוצר מילים אחד ───────────────────────────────────────────────── */
{
  const keys = Object.keys(APP.coreVerbs || {});
  t(n++, keys.length === VERBS.length && VERBS.every((v) => keys.indexOf(v) >= 0),
    `[verb-registry] המרשם מונה את ארבעת הפעלים — נמדדו ${keys.length} מפתחות והצפוי ` +
    `${VERBS.length} (${VERBS.join(' · ')}). מוסיפים ל-\`APP.coreVerbs\` פועל שחסר`);
}
{
  const gaps = verbRegistryGaps(APP.coreVerbs, SRC);
  const named = gaps.filter((g) => g.indexOf('[שם אחר]') === 0 || g.indexOf('[בלי גוף]') === 0);
  t(n++, named.length === 0,
    `[verb-registry] פועל מוצהר שאין לו גוף בשמו הקנוני — נמדדו ${named.length} והצפוי אפס` +
    `${named.length ? ' (' + named.join(' · ') + ')' : ''}. ` +
    'מיישרים את שם הפונקציה שבמקור לשם הקנוני');
}
{
  const gaps = verbRegistryGaps(APP.coreVerbs, SRC).filter((g) => g.indexOf('[בלי נימוק]') === 0);
  const absent = VERBS.filter((v) => (APP.coreVerbs[v] || {}).name === null);
  t(n++, gaps.length === 0,
    `[verb-registry] פועל שאין לו מימוש כאן נושא נימוק — נמדדו ${absent.length} פעלים ` +
    `מוצהרים \`null\` ו-${gaps.length} בלי נימוק, והצפוי אפס. ` +
    'כותבים ב-`why` מה הפועל עושה ולמה אין לתפקיד מקבילה כאן');
}
{
  const hits = oldVerbHits(SRC, OLD_VERBS);
  t(n++, hits.length === 0,
    `[verb-old-name] שם ישן ששרד — נמדדו ${hits.length} מתוך ${OLD_VERBS.length} ` +
    `שמות והצפוי אפס${hits.length ? ' (' + hits.join(', ') + ')' : ''}. ` +
    'משנים את שם הפונקציה ואת כל קוראיה לשם הקנוני');
}
{
  const hits = BAD_SPELL.filter((s) => SRC.indexOf(s) >= 0);
  t(n++, hits.length === 0,
    `[verb-old-name] איות משובש של מונח שאול — נמדדו ${hits.length} מתוך ` +
    `${BAD_SPELL.length} והצפוי אפס${hits.length ? ' (' + hits.join(', ') + ')' : ''}. ` +
    'כותבים את המונח באיותו הנכון, בשתי השפות');
}

/* ── מוטציות ───────────────────────────────────────────────────────────── */
mutStage();
if (RUN_MUT) {
  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ והיא רצה על קלט
   *  בזיכרון, ⭐ ואינה נכתבת לעץ. */
  {
    const got = periodTableHits([...MY_TABLES, APP.tablePrefix + 'periods'],
                                APP.tablePrefix, APP.periodAllow);
    t(n++, got.length === 1,
      'מ1 · ⛔ מוטציה: טבלת `' + APP.tablePrefix + 'periods` מפילה את «[period-store]» — ' +
      `נמדדו ${got.length} אתרים והצפוי 1`);
  }
  {
    const got = oldVerbHits('function monthOf(iso) { return iso; }\n', OLD_VERBS);
    t(n++, got.length === 1,
      'מ2 · ⛔ מוטציה: `monthOf` חדש מפיל את «[verb-old-name]» — ' +
      `נמדדו ${got.length} שמות והצפוי 1`);
  }
  {
    const c = { kind: '', why: '' };
    const okKind = c.kind === 'hebrew' || c.kind === 'gregorian';
    t(n++, !okKind,
      'מ3 · ⛔ מוטציה: `APP.calendar` חסר מפיל את «[period-calendar]» — ' +
      `נמדד «${c.kind}» והצפוי שייפול`);
  }
  {
    const two = SRC + '\nwindow.ysHebDate = function (d) { return d; };\n';
    const got = (two.match(/window\.ysHebDate\s*=\s*function/g) || []).length;
    const want = APP.calendar.kind === 'hebrew' ? 1 : 0;
    t(n++, got !== want,
      'מ4 · ⛔ מוטציה: מנוע עברי שני מפיל את «[period-calendar]» — ' +
      `נמדדו ${got} אתרי הגדרה והצפוי ${want}`);
  }
  {
    const got = verbRegistryGaps({ monthKeyOf: { name: 'monthKeyOf' }, monthLabel: { name: 'monthLabel' },
                                   monthsWithData: { name: 'monthsWithData' } }, SRC);
    t(n++, got.some((g) => g.indexOf('[חסר] yearOf') === 0),
      'מ5 · ⛔ מוטציה: מרשם בלי אחד מארבעת הפעלים מפיל את «[verb-registry]» — ' +
      `נמדדו ${got.length} פערים והצפוי שיכללו «yearOf»`);
  }

  /*  ⛔ מוטציית-נגד היא שינוי חי שאסור לו להפיל — ⚠️ שם שעושה עבודה
   *  אחרת שומר את שמו, ⭐ ואינו נמדד כאן. */
  {
    const got = oldVerbHits('var x = hebLabel(iso) + acadYearOf(iso);\n', OLD_VERBS);
    t(n++, got.length === 0,
      'נ1 · ⭐ מוטציית-נגד: `hebLabel` ו-`acadYearOf` ⛔ אינם מפילים — ' +
      `נמדדו ${got.length} שמות ישנים והצפוי 0`);
  }
  {
    const got = periodTableHits([APP.tablePrefix + 'pledges', APP.tablePrefix + 'entries'],
                                APP.tablePrefix, APP.periodAllow);
    t(n++, got.length === 0,
      'נ2 · ⭐ מוטציית-נגד: טבלה ששמה אומר **ערך** ⛔ אינה מפילה — ' +
      `נמדדו ${got.length} אתרים והצפוי 0`);
  }
  {
    const got = periodKeyHits("var a = 'start_month'; var b = '" + APP.tablePrefix + "entries';\n",
                              APP.tablePrefix, {});
    t(n++, got.length === 0,
      'נ3 · ⭐ מוטציית-נגד: עמודה שנושאת ערך לתקופה ⛔ אינה מפילה — ' +
      `נמדדו ${got.length} מפתחות והצפוי 0`);
  }
}

console.log(`\n${fail ? '✗' : '✓'} ${APP.name} — התקופה נגזרת ואוצר המילים אחד: ` +
            `${pass} טענות עברו, ${fail} נכשלו · ${MY_TABLES.length} טבלאות · ` +
            `${VERBS.length} פעלים`);
if (fail) process.exitCode = 1;
