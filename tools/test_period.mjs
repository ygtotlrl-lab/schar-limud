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

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DB_SCHEMA } from './db-schema.mjs';
import { PEERS } from './peers.mjs';
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
  /*  ⛔ ההגירה המקומית שנוקבת בתחילית הישנה — ⚠️ **מה נכנס**: התחילית
   *  שירדה ⟵ שם ההגירה שמעבירה ממנה, והסבב שבו רצה; ⛔ **ומה מפיל**:
   *  אתר שנוקב בה מחוץ לגוף ההגירה, הכרזה שאין לה פונקציה, והכרזה בלי
   *  סבב. ⭐ **ולמה ריק**: נמדד ואין — התחילית כאן נגזרת משם הריפו
   *  מלכתחילה, ⛔ ואין תחילית שירדה. */
  prefixLegacy: {},
  /*  ⛔ הקבוע שנושא את שם טבלת ההגדרות — ⚠️ **מה נכנס**: כל ערך שהקבוע
   *  מקבל ⟵ התפקיד שמחייב אותו; ⛔ **ומה מפיל**: ערך שבמקור ואינו כאן,
   *  הצהרה שאין לה ערך במקור, ושם שאינו טבלה חיה. ⭐ **ולמה המבנה
   *  קיים**: שם פזור אינו ניתן לשינוי ממקום אחד. */
  kvTable: { names: ['sl_settings'],
    why: 'הטבלה שההגדרות נקראות ונכתבות אליה — ⭐ מוסד אחד, ⛔ ולכן שם אחד' },
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
export const ROWS = [45, 115, 118];

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
const FLOOR = { shared: 21, app: 0, appWhy: '' };
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

/*  ⛔ והיקף שם הטבלה נגזר מהעץ — ⚠️ מקור האפליקציה כולו, ⭐ ולא
 *  `index.html` לבדו: ⛔ שם פזור במודול הוא אתר פזור לכל דבר. */
const KV_FILES = kvScope(treeFiles(''));
const KV_SRC = KV_FILES.map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n');

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

/*  ⛔ תחיליות הבעלים — ⚠️ **מה נכנס**: התחילית של כל אפליקציה;
 *  ⛔ **ומה מפיל**: כלום — ⭐ טבלה שאינה נושאת אף אחת מהן אינה נמדדת
 *  כאן: ⚠️ היא משותפת לפרויקט, ⛔ ואין לה בעלים יחיד שהתפקיד נמדד מולו. */
const OWNER_PFX = ['ya_', 'hr_', 'sl_', 'g_', 'k_'];

/*  ⛔ תפקיד שנושא יותר משם אחד — ⚠️ **מה נכנס**: הסיומת החורגת ⟵
 *  התפקיד שמצדיק אותה; ⛔ **ומה מפיל**: סיומת חורגת שאינה כאן, והכרזה
 *  שאין לה סיומת חיה. ⭐ **ולמה המבנה קיים**: שני שמות לאותו תפקיד
 *  מכריחים כל קורא לזכור איזה שם שייך לאיזו אפליקציה, ⛔ ואין מי
 *  שיצליב ביניהם — ⚠️ והמרשם משותף, ⭐ שהסכימה שממנה הוא נגזר משותפת. */
const ROLE_ALLOW = {
  settings_rishon:    'הגדרות היומן למוסד «ראשון לציון» — ⭐ ליומן שתי ישיבות ולשאר אחת: ⛔ ההפרדה היא טבלה למוסד ⛔ ולא עמודה',
  settings_ramataviv: 'הגדרות היומן למוסד «רמת אביב» — ⭐ ליומן שתי ישיבות ולשאר אחת: ⛔ ההפרדה היא טבלה למוסד ⛔ ולא עמודה',
};

/*  ⛔ התפקיד הוא חתימת העמודות ⛔ ולא השם — ⚠️ שני שמות נרדפים לאותו
 *  תפקיד אינם נגזרים מהטקסט, ⭐ והחתימה היא מה שכן: ⛔ והיא נמדדת על
 *  הסכימה המוצהרת ⛔ ולא על המסד, ⚠️ שאין להריץ מסד בשער.
 *  ⭐ **והשם הקנוני הוא הסיומת הנפוצה בתפקיד** — ⛔ ואינו נבחר. */
export function rolesOf(schema) {
  const bySig = new Map();
  for (const r of schema) {
    const p = OWNER_PFX.find((x) => r.t.indexOf(x) === 0);
    if (!p) continue;
    const sig = r.c.split(',').map((s) => s.trim()).sort().join(',');
    if (!bySig.has(sig)) bySig.set(sig, []);
    bySig.get(sig).push({ p, suf: r.t.slice(p.length) });
  }
  const out = [];
  for (const list of bySig.values()) {
    if (new Set(list.map((x) => x.p)).size < 2) continue;
    const cnt = new Map();
    for (const x of list) cnt.set(x.suf, (cnt.get(x.suf) || 0) + 1);
    let canon = null;
    for (const [s, k] of cnt) {
      if (canon === null || k > cnt.get(canon) || (k === cnt.get(canon) && s < canon)) canon = s;
    }
    out.push({ canon, sufs: [...cnt.keys()] });
  }
  return out;
}
/*  ⛔ הכיוון הראשון — ⚠️ תפקיד שנושא שני שמות, ⭐ ואחד מהם אינו במרשם. */
export function roleGaps(roles, allow) {
  const out = [];
  for (const r of roles) {
    for (const s of r.sufs) {
      if (s === r.canon) continue;
      if (Object.prototype.hasOwnProperty.call(allow || {}, s)) continue;
      out.push(r.canon + ' ⟵ ' + s);
    }
  }
  return out;
}
/*  ⛔ והכיוון השני — ⚠️ הכרזה שאין לה סיומת חורגת חיה: ⭐ היתר שלא נסגר. */
export function roleGhosts(roles, allow) {
  const live = new Set();
  for (const r of roles) for (const s of r.sufs) if (s !== r.canon) live.add(s);
  return Object.keys(allow || {}).filter((k) => !live.has(k));
}
/*  ⛔ ההיקף הוא מקור האפליקציה ⛔ ולא העץ כולו — ⚠️ מיגרציה שכבר רצה
 *  היא היסטוריה, ⭐ והשם שבתוכה מתאר את מה שהיה בזמן שהיא רצה · ⚠️ וקובץ
 *  ב-`tools/` נושא את הסכימה המוצהרת עצמה, ⭐ ושם בתוכו הוא המרשם
 *  ⛔ ואינו אתר פזור. */
export function kvScope(files) {
  return files.filter((f) => /\.(?:html|js|mjs|sql)$/.test(f))
              .filter((f) => !/^(?:migrations|tools)\//.test(f));
}
/*  ⛔ תחילית שאינה ראשי התיבות — ⚠️ **מה נכנס**: שם הריפו ⟵ התחילית שהוא
 *  נושא בפועל והנימוק לה; ⛔ **ומה מפיל**: תחילית חיה שאינה נגזרת ואינה
 *  כאן · הכרזה שאין לה ריפו · הכרזה שתחיליתה נגזרת בכל זאת · והכרזה בלי
 *  נימוק. ⭐ **ולמה המבנה קיים**: תחילית שכבר חיה במסד אינה ניתנת לשינוי
 *  בלי מיגרציה והגירה מקומית, ⛔ וההכרזה היא מה שמונע «יישור» בתום לב
 *  שיפיל כל שאילתה · ⚠️ **והמרשם משותף**, ⭐ שהסכימה שממנה הוא נגזר משותפת. */
/*  ⚠️ **ולמה ריק**: נמדד ואין — ⭐ כל תחילית חיה עקבית עם שם הריפו שלה,
 *  ⛔ והאחרונה שלא הייתה הוסבה בסבב שבו ההכרזה ירדה. */
const PREFIX_MOVING = {};
/*  ⛔ הסבב הנוכחי נגזר מכותרת הטבלה ⛔ ואינו מוקלד — ⚠️ הכרזת מעבר שסבבה
 *  חלף **מפילה**: ⭐ וזה מה שהופך אותה למעבר ⛔ ולא לחריגה שנשארת. */
export function movingRound(root) {
  try {
    const m = /עודכן לאחרונה: סבב (\d+)/.exec(readFileSync(join(root, 'CLAUDE.md'), 'utf8'));
    return m ? Number(m[1]) : 0;
  } catch { return 0; }
}
/*  ⛔ הכרזת מעבר בלי סבב, או שסבבה חלף — ⚠️ **מה מפיל**: נימוק בלי
 *  `(סבב N)`, ⛔ ו-`N` שאינו הסבב הנוכחי: ⭐ הכרזה שנשארת אחרי שהסעיף
 *  רץ היא היתר שלא נסגר. */
export function movingStale(allow, now) {
  const out = [];
  for (const [slug, v] of Object.entries(allow || {})) {
    const m = /\(סבב (\d+)\)/.exec(String((v || {}).why || ''));
    if (!m) { out.push('[בלי סבב] ' + slug); continue; }
    if (Number(m[1]) !== now) out.push('[סבב שחלף] ' + slug + ' (' + m[1] + '≠' + now + ')');
  }
  return out;
}

/*  ⛔ העקביות נמדדת ⛔ ואינה גזירה — ⚠️ ה״א הידיעה אינה ניתנת לזיהוי
 *  מכני: ⭐ «הנהלה» נותנת `h` ו«הקופה» נותנת `k`, ⛔ אותה אות ושתי
 *  משמעויות — ⚠️ וזו מורפולוגיה ⛔ ולא ביטוי.
 *  ⛔ **ולכן הנמדד הוא תת-סדרה**: ⚠️ כל אות בתחילית היא אות פותחת של
 *  מילה בשם הריפו, **בסדר** ⛔ ולא ברצף.
 *  ⚠️ **והוא מתיר יותר מאחת** — ⭐ `hk_` · `h_` · `k_` לקופה כולם עוברים:
 *  ⛔ הוא מודד **עקביות** ⛔ ולא **ייחודיות**, ⚠️ והייחודיות נאכפת
 *  בשורת «כל טבלה נושאת את תחילית בעליה». */
export function prefixConsistent(slug, pfx) {
  const heads = String(slug).split('-').filter(Boolean).map((w) => w.charAt(0));
  const want = String(pfx).replace(/_$/, '').split('');
  if (!want.length) return false;
  let i = 0;
  for (const c of want) { i = heads.indexOf(c, i); if (i < 0) return false; i++; }
  return true;
}
/*  ⛔ הבעלים של תחילית חיה — ⚠️ הריפו הראשון שהיא עקבית איתו, ⭐ והכרזת
 *  מעבר גוברת: ⛔ תחילית שאין לה בעלים היא פער. */
export function prefixOwner(peers, pfx, moving) {
  for (const [slug, v] of Object.entries(moving || {})) if (v && v.pfx === pfx) return slug;
  return peers.find((s) => prefixConsistent(s, pfx)) || '';
}
/*  ⛔ התחיליות שבפועל נגזרות מהסכימה המוצהרת — ⚠️ כל טבלה שאינה משותפת
 *  נושאת את תחילית בעליה, ⭐ ו-`sh_` הוא המשותף: ⛔ ואין לו בעלים יחיד
 *  שראשי התיבות שלו יימדדו מולו. */
export function livePrefixes(schema) {
  const out = new Set();
  for (const r of schema) {
    const m = /^([a-z]{1,4}_)/.exec(r.t);
    if (m && m[1] !== 'sh_') out.add(m[1]);
  }
  return [...out].sort();
}
/*  ⛔ הכיוון הראשון — ⚠️ תחילית חיה שאינה ראשי התיבות של אף ריפו, ⭐ ואינה
 *  מוכרזת: ⛔ תחילית שאינה נגזרת אינה ניתנת לניחוש. */
export function prefixGaps(peers, schema, allow) {
  const decl = new Set(Object.values(allow || {}).map((v) => (v || {}).pfx));
  return livePrefixes(schema).filter((p) =>
    !decl.has(p) && !peers.some((s) => prefixConsistent(s, p)));
}
/*  ⛔ והכיוון השני — ⚠️ הכרזה שאין לה ריפו · שתחיליתה נגזרת בכל זאת ·
 *  בלי נימוק · ⛔ ושאין לה טבלה חיה: ⭐ היתר שלא נסגר. */
export function prefixGhosts(peers, schema, allow) {
  const out = [];
  const live = new Set(livePrefixes(schema));
  for (const [slug, v] of Object.entries(allow || {})) {
    if (peers.indexOf(slug) < 0) { out.push('[בלי ריפו] ' + slug); continue; }
    if (!v || !v.pfx) { out.push('[בלי תחילית] ' + slug); continue; }
    if (prefixConsistent(slug, v.pfx)) { out.push('[עקבית בכל זאת] ' + slug); continue; }
    if (!v.why || String(v.why).trim().length < 20) { out.push('[בלי נימוק] ' + slug); continue; }
    if (!live.has(v.pfx)) out.push('[בלי טבלה חיה] ' + slug);
  }
  return out;
}
/*  ⛔ תחילית אחת לבעלים — ⚠️ שתיים הן שתי משפחות שאיש אינו מצליב, ⭐ ושינוי
 *  שם נעשה בהן פעמיים: ⛔ והמדידה על התחיליות החיות בלבד. */
export function prefixDoubles(peers, schema, allow) {
  const per = new Map();
  for (const p of livePrefixes(schema)) {
    const o = prefixOwner(peers, p, allow);
    if (o) per.set(o, (per.get(o) || 0) + 1);
  }
  return [...per.entries()].filter((e) => e[1] > 1).map((e) => e[0] + '×' + e[1]);
}
/*  ⛔ התחילית הישנה חיה במקום אחד בלבד בקוד החי — ⚠️ גוף ההגירה המקומית:
 *  ⭐ והיא מוצהרת עם סבבה, ⛔ ו-`migrations/` מוחרג בהיקף עצמו — ⚠️ מיגרציה
 *  שכבר רצה מתארת את המסד כפי שהיה בשעה שהיא רצה. */
export function legacyPfxHits(src, legacy) {
  const out = [];
  for (const [pfx, v] of Object.entries(legacy || {})) {
    const fn = (v || {}).fn || '';
    const body = fn ? (extractFnBody(src, fn) || '') : '';
    let i = -1;
    while ((i = src.indexOf(pfx, i + 1)) >= 0) {
      if (body && body.indexOf(pfx) >= 0 && inBody(src, fn, i)) continue;
      out.push(pfx + '@' + i);
    }
  }
  return out;
}
/*  ⛔ ההכרזה נמדדת משני צדדיה — ⚠️ הכרזה שאין לה גוף בשמה, ⛔ והכרזה בלי
 *  הסבב שבו רצה: ⭐ נימוק בלי סבב נקרא כקבוע, ⛔ והוא מדידה שחלפה. */
export function legacyPfxGhosts(src, legacy) {
  const out = [];
  for (const [pfx, v] of Object.entries(legacy || {})) {
    if (!v || !v.fn) { out.push('[בלי גוף] ' + pfx); continue; }
    if (!extractFnBody(src, v.fn)) { out.push('[בלי פונקציה] ' + pfx); continue; }
    if (!v.why || !/\(סבב \d+\)/.test(String(v.why))) out.push('[בלי סבב] ' + pfx);
  }
  return out;
}
/*  ⛔ גוף פונקציה בהתאמת סוגריים — ⚠️ חלון תווים קבוע חותך גוף ארוך ממנו,
 *  ⭐ ומסווג את המדידה להיקף שאינו שלה. */
function fnRange(src, name) {
  const m = new RegExp('function\\s+' + name + '\\s*\\(').exec(src);
  if (!m) return null;
  let i = src.indexOf('{', m.index);
  if (i < 0) return null;
  let d = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (!d) return [m.index, j + 1]; }
  }
  return null;
}
function extractFnBody(src, name) { const r = fnRange(src, name); return r ? src.slice(r[0], r[1]) : ''; }
function inBody(src, name, i) { const r = fnRange(src, name); return !!r && i >= r[0] && i < r[1]; }

/*  ⛔ ההערות נחתכות לפני המדידה — ⚠️ הערה שנוקבת בשם אינה אתר קריאה,
 *  ⭐ ו-`//` שאחרי נקודתיים הוא כתובת ⛔ ולא הערה. */
function codeOf(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
            .replace(/(?<!:)\/\/[^\n]*/g, ' ');
}
/*  ⛔ הערכים שהקבוע מקבל — ⚠️ **כל שורת השמה**, ⭐ ולא ההגדרה בלבד:
 *  ⛔ ערך שנקבע בהחלפת הקשר הוא ערך של הקבוע לכל דבר · ⚠️ **והצורה היא
 *  שם טבלה** — ⛔ תחילית בעלים ואחריה קו תחתון: ⭐ שורת ההשמה נושאת גם
 *  את התנאי שבחר בין הערכים, ⛔ והליטרל שבתוכו אינו שם טבלה. */
export function kvNames(src) {
  const out = [];
  for (const line of codeOf(src).split('\n')) {
    if (!/\bKV_TABLE\s*=[^=]/.test(line)) continue;
    for (const m of line.matchAll(/'([a-z]{1,3}_[a-z0-9_]+)'/g)) out.push(m[1]);
  }
  return [...new Set(out)];
}
/*  ⛔ שם טבלה שמופיע בקוד מחוץ לקבוע — ⚠️ **הגבול משני הצדדים**:
 *  ⭐ `hr_settings_meta` אינו `hr_settings`, ⛔ ושם שהוא תחילית של שם
 *  אחר אינו אתר. */
export function kvLooseHits(src, names) {
  const out = [];
  const lines = codeOf(src).split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/\bKV_TABLE\s*=[^=]/.test(lines[i])) continue;
    for (const nm of names) {
      if (new RegExp('(?<![\\w])' + nm + '(?![\\w])').test(lines[i])) out.push((i + 1) + ':' + nm);
    }
  }
  return out;
}
/*  ⛔ רשימת הקבצים נגזרת מהעץ ⛔ ואינה מוקלדת — ⚠️ קובץ מקור שייכתב מחר
 *  נסרק אף הוא, ⭐ ורשימה מוקלדת עיוורת בדיוק אליו. */
function treeFiles(rel) {
  const out = [];
  for (const e of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
    if (e.name.charAt(0) === '.' || e.name === 'node_modules') continue;
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...treeFiles(r));
    else out.push(r);
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

/* ── ד · ותחילית הטבלאות היא ראשי התיבות של השם העברי ──────────────────── */
{
  /*  ⛔ הכרזת מעבר נופלת מעצמה — ⚠️ היא נושאת את סבבה, ⭐ והיא מפילה
   *  ביום שבו הסבב מתקדם והסעיף שמסב לא רץ. */
  const stale = movingStale(PREFIX_MOVING, movingRound(ROOT));
  t(n++, stale.length === 0,
    `[prefix-derived] הכרזת מעבר נושאת את סבבה — נמדדו ${stale.length} מתוך ` +
    `${Object.keys(PREFIX_MOVING).length} הכרזות והצפוי אפס` +
    `${stale.length ? ' (' + stale.join(' · ') + ')' : ''}. ` +
    'מריצים את הסעיף שמסב את התחילית, או מעדכנים את הסבב בהכרזה');
}
{
  /*  ⛔ והכיוון השני על התחילית המוצהרת — ⚠️ `APP.tablePrefix` הוא **מקור
   *  האמת**, ⭐ והוא נמדד מול שם הריפו ומול הסכימה החיה: ⛔ הצהרה שאין לה
   *  טבלה היא תחילית שאיש אינו נושא. */
  const mine = APP.tablePrefix;
  const consistent = prefixConsistent(APP.name, mine) ||
    Object.values(PREFIX_MOVING).some((v) => (v || {}).pfx === mine);
  const live = livePrefixes(DB_SCHEMA).indexOf(mine) >= 0;
  t(n++, consistent && live,
    `[prefix-derived] \`APP.tablePrefix\` = \`${mine}\` — עקבית עם \`${APP.name}\`: ` +
    `${consistent ? 'כן' : 'לא'} · חיה בסכימה: ${live ? 'כן' : 'לא'}, והצפוי שניהם. ` +
    'מיישרים את ההצהרה לתחילית שבמסד, או מכריזים אותה כמעבר');
}
{
  const gaps = prefixGaps(PEERS, DB_SCHEMA, PREFIX_MOVING);
  t(n++, gaps.length === 0,
    `[prefix-derived] תחילית שאינה עקבית עם שם הריפו — נמדדו ${gaps.length} מתוך ` +
    `${livePrefixes(DB_SCHEMA).length} תחיליות חיות והצפוי אפס` +
    `${gaps.length ? ' (' + gaps.join(', ') + ')' : ''}. ` +
    'מיישרים את התחילית לאותיות הפותחות של שם הריפו, או מכריזים אותה כמעבר עם סבבה');
}
{
  const ghosts = prefixGhosts(PEERS, DB_SCHEMA, PREFIX_MOVING);
  t(n++, ghosts.length === 0,
    `[prefix-derived] הכרזת תחילית נמדדת משני צדדיה — נמדדו ${ghosts.length} מתוך ` +
    `${Object.keys(PREFIX_MOVING).length} הכרזות והצפוי אפס` +
    `${ghosts.length ? ' (' + ghosts.join(' · ') + ')' : ''}. ` +
    'מסירים הכרזה שאין לה ריפו או שתחיליתה עקבית בכל זאת, ומוסיפים לה נימוק');
}
{
  const dbl = prefixDoubles(PEERS, DB_SCHEMA, PREFIX_MOVING);
  t(n++, dbl.length === 0,
    `[prefix-derived] תחילית אחת לבעלים — נמדדו ${dbl.length} בעלים עם יותר מאחת והצפוי אפס` +
    `${dbl.length ? ' (' + dbl.join(', ') + ')' : ''}. ` +
    'מאחדים את שתי המשפחות לתחילית אחת');
}
{
  const hits = legacyPfxHits(SRC, APP.prefixLegacy);
  t(n++, hits.length === 0,
    `[prefix-legacy] תחילית ישנה מחוץ להגירה המקומית — נמדדו ${hits.length} אתרים מתוך ` +
    `${Object.keys(APP.prefixLegacy || {}).length} הכרזות והצפוי אפס` +
    `${hits.length ? ' (' + hits.slice(0, 6).join(', ') + ')' : ''}. ` +
    'מעבירים את השם לתחילית החדשה, או מכריזים ב-`APP.prefixLegacy` עם סבבה');
}
{
  const ghosts = legacyPfxGhosts(SRC, APP.prefixLegacy);
  t(n++, ghosts.length === 0,
    `[prefix-legacy] הכרזת תחילית ישנה נמדדת משני צדדיה — נמדדו ${ghosts.length} מתוך ` +
    `${Object.keys(APP.prefixLegacy || {}).length} הכרזות והצפוי אפס` +
    `${ghosts.length ? ' (' + ghosts.join(' · ') + ')' : ''}. ` +
    'מצהירים ב-`APP.prefixLegacy` את שם ההגירה ואת הסבב שבו רצה');
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

/* ── ד · ושם הטבלה נגזר מתפקידה, וחי בקבוע אחד ─────────────────────────── */
const ROLES = rolesOf(DB_SCHEMA);
{
  const gaps = roleGaps(ROLES, ROLE_ALLOW);
  t(n++, gaps.length === 0,
    `[table-role] תפקיד שנושא שם שאינו מוצהר — נמדדו ${gaps.length} פערים ב-${ROLES.length} ` +
    `תפקידים חוצי-אפליקציה והצפוי אפס${gaps.length ? ' (' + gaps.join(' · ') + ')' : ''}. ` +
    'מיישרים את שם הטבלה לתפקידה, או מכריזים את הסיומת עם התפקיד שמצדיק אותה');
}
{
  const ghost = roleGhosts(ROLES, ROLE_ALLOW);
  t(n++, ghost.length === 0,
    `[table-role] הכרזה שאין לה סיומת חורגת חיה — נמדדו ${ghost.length} מתוך ` +
    `${Object.keys(ROLE_ALLOW).length} הכרזות והצפוי אפס` +
    `${ghost.length ? ' (' + ghost.join(', ') + ')' : ''}. מסירים אותה מהמרשם`);
}
{
  const got = kvNames(SRC), want = APP.kvTable.names;
  const live = new Set(DB_SCHEMA.map((r) => r.t));
  const miss = want.filter((x) => got.indexOf(x) < 0);
  const extra = got.filter((x) => want.indexOf(x) < 0);
  const dead = want.filter((x) => !live.has(x));
  const why = APP.kvTable.why || '';
  t(n++, !miss.length && !extra.length && !dead.length && why.length >= 20,
    `[table-const] ערכי \`KV_TABLE\` מול ההצהרה — נמדדו ${got.length} ערכים במקור מול ` +
    `${want.length} מוצהרים: ${miss.length} חסרים · ${extra.length} זרים · ${dead.length} ` +
    `שאינם טבלה חיה, ונימוק באורך ${why.length} — והצפוי אפס פערים ונימוק בן 20 תווים ` +
    'לפחות. מיישרים את `APP.kvTable` לערכים שבמקור');
}
{
  const hits = kvLooseHits(KV_SRC, APP.kvTable.names);
  t(n++, hits.length === 0,
    `[table-const] שם טבלה שמופיע בקוד מחוץ לקבוע — נמדדו ${hits.length} אתרים ב-` +
    `${KV_FILES.length} קובצי מקור והצפוי אפס${hits.length ? ' (' + hits.join(', ') + ')' : ''}. ` +
    'קוראים את השם מ-`KV_TABLE` — שם פזור אינו ניתן לשינוי ממקום אחד');
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

  {
    const bad = DB_SCHEMA.map((r) => (r.t === 'hr_settings' ? { p: r.p, t: 'hr_config', c: r.c } : r));
    const got = roleGaps(rolesOf(bad), ROLE_ALLOW);
    t(n++, got.length === 1,
      'מ6 · ⛔ מוטציה: שם טבלה שהוסב באחת מפיל את «[table-role]» — ' +
      `נמדדו ${got.length} פערים והצפוי 1`);
  }
  {
    const sig = (DB_SCHEMA.find((r) => r.t === 'hr_settings') || {}).c;
    const got = roleGaps(rolesOf(DB_SCHEMA.concat([{ p: 'kupa', t: 'k_prefs', c: sig }])), ROLE_ALLOW);
    t(n++, got.length === 1,
      'מ7 · ⛔ מוטציה: טבלה שתפקידה כפול ואינה מוצהרת מפילה את «[table-role]» — ' +
      `נמדדו ${got.length} פערים והצפוי 1`);
  }
  {
    const got = kvLooseHits("  var rows = sbFrom('" + APP.kvTable.names[0] + "').select();\n",
                            APP.kvTable.names);
    t(n++, got.length === 1,
      'מ8 · ⛔ מוטציה: שם טבלה שנכתב ישירות בקוד מפיל את «[table-const]» — ' +
      `נמדדו ${got.length} אתרים והצפוי 1`);
  }
  {
    const got = kvNames(SRC.replace(/\bKV_TABLE\s*=/g, 'KV_GONE ='));
    t(n++, got.length === 0,
      'מ9 · ⛔ מוטציה: הסרת `KV_TABLE` מפילה את «[table-const]» — ' +
      `נמדדו ${got.length} ערכים במקור והצפוי 0, ומולם ${APP.kvTable.names.length} מוצהרים`);
  }


  {
    const got = prefixGaps(PEERS, DB_SCHEMA.concat([{ p: 'kupa', t: 'zz_prefs', c: 'key,value' }]),
                           PREFIX_MOVING);
    t(n++, got.length === 1 && got[0] === 'zz_',
      'מ10 · ⛔ מוטציה: תחילית שאינה עקבית מפילה את «[prefix-derived]» — ' +
      `נמדדו ${got.length} תחיליות והצפוי 1`);
  }
  {
    /*  ⛔ והכיוון ההפוך על אותו קלט — ⚠️ ההכרזה היא מה שמשתיק את הפער:
     *  ⭐ בלעדיה `zz_` נופל, ⛔ ואיתה הוא אינו — ⚠️ וזו הראיה שהמרשם נקרא. */
    const rogue = DB_SCHEMA.concat([{ p: 'kupa', t: 'zz_prefs', c: 'key,value' }]);
    const decl = { 'ha-kupa': { pfx: 'zz_', why: 'הכרזה מסונתזת למדידה (סבב 148)' } };
    const off = prefixGaps(PEERS, rogue, {});
    const on = prefixGaps(PEERS, rogue, decl);
    t(n++, off.length === 1 && off[0] === 'zz_' && on.length === 0,
      'מ11 · ⛔ מוטציה: הסרת ההכרזה מ-`PREFIX_MOVING` מפילה את «[prefix-derived]» — ' +
      `נמדדו ${off.length} תחיליות בלי ההכרזה ו-${on.length} איתה, והצפוי 1 ו-0`);
  }
  {
    const got = prefixGhosts(PEERS, DB_SCHEMA,
      Object.assign({}, PREFIX_MOVING, { 'no-such-repo': { pfx: 'zz_', why: 'הכרזה מסונתזת למדידה (סבב 148)' } }));
    t(n++, got.length === 1,
      'מ12 · ⛔ מוטציה: הכרזה שאין לה ריפו מפילה את «[prefix-derived]» — ' +
      `נמדדו ${got.length} פערים והצפוי 1`);
  }
  {
    /*  ⛔ והמנגנון שמפיל הכרזה שסבבה חלף — ⚠️ בלי המוטציה הזו הטענה
     *  רצה על מרשם ריק ⛔ ואינה יכולה להיכשל: ⭐ והכרזה שנשארה בשקט
     *  הייתה חיה לנצח — ⚠️ וזה בדיוק «probe שאינו יכול להיכשל». */
    const now = movingRound(ROOT);
    const stale = movingStale({ 'ha-kupa': { pfx: 'zz_', why: 'הכרזה מסונתזת (סבב ' + (now - 1) + ')' } }, now);
    const none = movingStale({ 'ha-kupa': { pfx: 'zz_', why: 'הכרזה מסונתזת (סבב ' + now + ')' } }, now);
    const noRound = movingStale({ 'ha-kupa': { pfx: 'zz_', why: 'הכרזה בלי סבב נקוב' } }, now);
    t(n++, stale.length === 1 && noRound.length === 1 && none.length === 0,
      'מ12ב · ⛔ מוטציה: הכרזת מעבר שסבבה חלף מפילה את «[prefix-derived]» — ' +
      `נמדדו ${stale.length} לסבב שחלף · ${noRound.length} בלי סבב · ${none.length} לסבב הנוכחי, ` +
      'והצפוי 1 · 1 · 0');
  }
  {
    const pfx = Object.keys(APP.prefixLegacy || {})[0];
    const fake = pfx ? "var x = '" + pfx + "entries';\n" : '';
    const got = pfx ? legacyPfxHits(fake, APP.prefixLegacy) : ['—'];
    t(n++, got.length >= 1,
      'מ13 · ⛔ מוטציה: תחילית ישנה מחוץ להגירה מפילה את «[prefix-legacy]» — ' +
      `נמדדו ${got.length} אתרים והצפוי לפחות 1`);
  }
  {
    const got = legacyPfxGhosts(SRC, { 'zz_': { fn: 'noSuchFn', why: 'נימוק (סבב 148)' } });
    t(n++, got.length === 1,
      'מ14 · ⛔ מוטציה: הכרזת הגירה שאין לה פונקציה מפילה את «[prefix-legacy]» — ' +
      `נמדדו ${got.length} פערים והצפוי 1`);
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

  {
    const got = roleGaps(ROLES, ROLE_ALLOW);
    const all = roleGaps(ROLES, {});
    t(n++, got.length === 0 && all.length === Object.keys(ROLE_ALLOW).length,
      'נ4 · ⭐ מוטציית-נגד: שני שמות התפקיד המוצהרים ⛔ אינם מפילים — ' +
      `נמדדו ${got.length} פערים עם המרשם ו-${all.length} בלעדיו, והצפוי 0 ומספר ההכרזות`);
  }
  {
    const got = kvScope(['index.html', 'core/sync.js',
                         'migrations/000_initial_schema.sql', 'tools/db-schema.mjs']);
    t(n++, got.length === 2 && !got.some((f) => /^migrations\//.test(f)),
      'נ5 · ⭐ מוטציית-נגד: שם טבלה בתוך מיגרציה ⛔ אינו מפיל — ' +
      `נמדדו ${got.length} קבצים בהיקף והצפוי 2, ואפס תחת \`migrations/\``);
  }

  {
    const got = prefixGaps(PEERS, DB_SCHEMA.concat([
      { p: 'shared', t: 'ya_settings_rishon', c: 'key,value' },
      { p: 'shared', t: 'sh_backup', c: 'id,key' }]), PREFIX_MOVING);
    t(n++, got.length === 0,
      'נ6 · ⭐ מוטציית-נגד: תוספת אחרי התפקיד ו-`sh_` המשותף ⛔ אינם מפילים — ' +
      `נמדדו ${got.length} תחיליות והצפוי 0`);
  }
  {
    const got = prefixDoubles(PEERS, DB_SCHEMA, PREFIX_MOVING);
    t(n++, got.length === 0,
      'נ7 · ⭐ מוטציית-נגד: חמש התחיליות החיות ⛔ אינן מפילות — ' +
      `נמדדו ${got.length} בעלים כפולים והצפוי 0, מתוך ${livePrefixes(DB_SCHEMA).length} תחיליות`);
  }
}

console.log(`\n${fail ? '✗' : '✓'} ${APP.name} — התקופה נגזרת ואוצר המילים אחד: ` +
            `${pass} טענות עברו, ${fail} נכשלו · ${MY_TABLES.length} טבלאות · ` +
            `${VERBS.length} פעלים · ${ROLES.length} תפקידים`);
if (fail) process.exitCode = 1;
