/* ───────────────────────────────────────────────────────────────────────────
   test_toolsid.mjs — קובצי `tools/` זהים בין כל הריפו
   ───────────────────────────────────────────────────────────────────────────
   **מה נאכף:** קובץ `tools/` שקיים בכל הריפו זהה בית-לבית **אחרי
   הסרת בלוק `APP` ואחרי הסרת אזורי «פר-אפליקציה» המסומנים** — ⛔ וקובץ
   שאין בו `APP` כלל מוכרז ב-`APP.pureTools` ⚠️ או ב-`APP.perAppTools`
   עם נימוקו: ⭐ ושני הצדדים מפילים — ⛔ הכרזה שאין לה קובץ, וקובץ שאינו
   מוכרז. ⛔ **והמרשם נבנה מכל קובצי `tools/` שבריפו הזה** ⛔ ולא מהחיתוך —
   ⚠️ גם קובץ שחי באחת בלבד נמדד. ⛔ **וכל `.mjs` רץ בסט** — ⚠️ או מוכרז
   ב-`APP.notGates` עם מה שהוא עושה שאינו מדידה, ⭐ ומספר השערים שרצים
   נגזר משני המרשמים ⛔ ואינו מוקלד.

   **הנימוק המדוד:** ⚠️ 48 קבצים חיים בכולן ורק שמונה היו זהים בית-לבית,
   ⛔ ואיש לא מדד את השאר: ⭐ `whiten.mjs` הוא מה שכל שער סורק דרכו, ⛔
   וסחיפה של בית אחד בו הייתה משנה את מה שכולם מודדים בלי שאיש יראה.
   ⚠️ **והמרשם עצמו נבנה מהחיתוך** — ⛔ ולכן קובץ בלי `APP` שחי באחת בלבד
   לא נמדד באף כיוון: ⭐ מרשם שנבנה מהמשותף עיוור בדיוק למקום שבו הסחף
   נולד.

   **מה יישבר בלעדיו:** ⛔ שער שנערך בריפו אחד בלבד — ⚠️ שלוש האחיות
   ממשיכות למדוד את הכלל הישן, ⭐ ושערים בשם אחד מודדים
   דברים: ⛔ «עבר בהנהלה» מפסיק להעיד על גיוס.

   **מה אינו נאכף כאן:** ⛔ **תוכנו** של שער פרטי שחי באחת בלבד — ⚠️ אין
   לו מול מה להשוות, ⭐ ומה שנמדד בו הוא ההכרזה בלבד · ⛔ ותוכן בלוק `APP`
   עצמו, שהוא ההבדל המותר · ⛔ וגוף הבלוקים
   החתומים שב-`index.html`, שנמדד בשער הסנכרון · ⛔ וההשוואה דורשת את
   הריפו האחיות על הדיסק: ⚠️ כשהן חסרות היא **מדווחת ואינה מדלגת
   בשתיקה**.
   ──────────────────────────────────────────────────────────────────────── */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS } from './peers.mjs';
import { FACTS } from './app-facts.mjs';
import { declCases, dumpCases } from './decl-cases.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  /*  ⛔ קובץ `tools/` שאין בו `APP` — ⚠️ ואין לו מה שיבדיל אותו בין
   *  הריפו, ⭐ ולכן הוא חייב להיות זהה בית-לבית: ⛔ והרשימה נמדדת משני
   *  צדדיה — שם שאין לו קובץ, וקובץ שאינו ברשימה. */
  pureTools: [
    '_capability-notes.md', 'test_budget.mjs', 'test_caps_build.mjs',
    'test_caps_guard.mjs', 'test_caps_ui.mjs', 'test_icons.mjs',
    'test_manifest.mjs', 'test_md.mjs', 'test_orphans.mjs',
    'test_readonly.mjs', 'scope.mjs', 'whiten.mjs', 'db-schema.mjs',
    'peers.mjs', 'appsrc.mjs', 'app-facts.mjs', 'deep-check.mjs', 'decl-cases.mjs',
  ],
  /*  ⛔ קובץ שאין בו `APP` ובכל זאת נבדל — ⚠️ כל שם נושא את הסיבה, ⭐ ושם
   *  שתוכנו זהה בכולן **מפיל**: ⛔ הכרזה שאין לה מקרה בפועל היא בעצמה
   *  השארית שהשער בא לסלק. */
  /*  ⛔ קובץ תשתית שקיים בחלק מהריפו (סבב 114) — ⚠️ כל שם נושא את הסיבה,
   *  ⭐ והוא נמדד בית-לבית בין מי שיש לו: ⛔ קובץ שנופל בין הכיסאות
   *  אינו נמדד כלל. */
  /*  ⛔ קובץ ב-`tools/` שאינו שער — ⚠️ **מה נכנס**: השם ⟵ מה שהקובץ עושה
   *  שאינו מדידה; ⛔ **ומה מפיל**: הכרזה שאין לה קובץ, הכרזה על קובץ שרץ
   *  בכל זאת, והכרזה בלי נימוק. ⭐ **ולמה המבנה קיים**: מספר השערים שרצים
   *  נגזר ממנו ומרשימת הקבצים, ⛔ ואינו מוקלד. */
  notGates: {
    /*  ⛔ שם המריץ נבנה מחלקיו ⛔ ואינו ליטרל שלם — ⚠️ הבודק מפיל שער
     *  שנוקב בו כליטרל, ⭐ שזו הצורה של שער ש**מריץ** אותו. */
    ['check-js' + '.mjs']:
      'המריץ עצמו — ⛔ הוא מפעיל את רשימת השערים ואינו יושב בתוכה',
    'db-schema.mjs':
      'מראת סכימת המסד — מודול שהשערים קוראים ממנו, ⛔ ואין בו טענה משלו',
    'gen-icons.mjs':
      'מחולל האייקונים — ⛔ הוא כותב נכסים ואינו מודד, ⚠️ ושער נפרד מודד שהרצתו אינה משנה נכס',
    'app-facts.mjs':
      'עובדות האפליקציה מהעץ — מודול שגוזר את זהות האפליקציה לשערים, ⛔ ואין בו טענה',
    'decl-cases.mjs':
      'רושם המקרים של רשימות הפטור — מודול שהשערים רושמים בו מה פטר אותם, והמריץ מצליב: ⛔ ואין בו טענה משלו',
    'deep-check.mjs':
      'הבדיקה העמוקה — מודול שהזרימה קוראת לו בשמו לפני המיזוג, ⛔ ואינו מריץ את עצמו: ⚠️ שלוש הרצות לכל שער משותף בכל הריפו ארוכות מהסט',
    'appsrc.mjs':
      'מקור האפליקציה — מודול שמחבר את `index.html` ואת מודולי `core/` לסורקים, ⛔ ואין בו טענה',
    'peers.mjs':
      'מרשם האפליקציות — מודול ששערי ההשוואה קוראים ממנו, ⛔ ואין בו טענה',
    'scope.mjs':
      'עוזרי ההיקף והנימוק — מודול משותף שהשערים קוראים, ⛔ ואין בו טענה',
    'whiten.mjs':
      'הלבנת המקור — מודול שכל סורק עובר דרכו, ⛔ ואין בו טענה משלו',
    'roles-harness.mjs':
      'רתמת מודל ההרשאות — שער ההרשאות מריץ אותה בתהליך משלו, ⛔ והיא אינה נקודת כניסה בסט',
  },
  subsetTools: {
    'roles-harness.mjs': 'רתמת מודל ההרשאות — שלוש האפליקציות שיש בהן כניסה, '
      + 'וביומן אין כניסה ואין תפקיד שיוכרע',
  },
  perAppTools: {
    '_prune-lessons.md': 'לקחי הגיזום של האפליקציה עצמה — היסטוריה פרטית ' +
      'שאין לה מקבילה באחיות, ואיחודה היה מקור אמת שני',
    'test_offline_login.mjs':
      'שער הכניסה האופליין — שלוש האפליקציות שיש בהן כניסה, ומסלול השלמת הטביעה נבדל ביניהן, ולכן גופו אינו זהה',
    'test_roles.mjs':
      'שער מודל ההרשאות — שלוש האפליקציות שיש בהן כניסה, ואוצר הדרגות והחסימה נבדלים ביניהן, ולכן גופו אינו זהה',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */
const CASE = declCases(import.meta.url, APP);

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 112) — ⚠️ המיפוי נגזר מכאן
 *  ⛔ ואינו רשימה שנייה בבודק. */
export const ROWS = [23, 57, 59, 224, 225];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

/*  ⛔ שמות הריפו נקראים מהמרשם ⛔ ואינם מוקלדים כאן — ⚠️ רשימה שהוקלדה
 *  בכל שער בנפרד היא אותה הכרעה בהרבה מקומות, ⭐ ומי ששוכח אחד מהם
 *  משאיר שער שמודד פחות ממה שיש. */


const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIBS = resolve(ROOT, '..');

let pass = 0, fail = 0;
let n = 1;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 23, app: 0, appWhy: '' };
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
  dumpCases();
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
const t = (i, cond, m) => { RAN++; if (cond) { pass++; console.log(`  ok   ${i} · ${m}`); }
                          else { fail++; console.log(`  FAIL ${i} · ${m}`); } };

/*  ⛔ שלושת הסמנים הם המנגנון — ⚠️ בלוק `APP` נחתך מהכרזתו עד באנר הסיום,
 *  ⭐ ואזור «פר-אפליקציה» מהכותרת שנושאת את הנימוק עד באנר הסגירה: ⛔ מה
 *  שמחוץ לשניהם חייב להיות זהה בית-לבית. */
const APP_HEAD = 'const APP = {';
const APP_TAIL = '/* ── סוף APP';
/*  ⛔ הסמן נבנה מחלקיו ⛔ ואינו ליטרל שלם — ⚠️ אחרת הקובץ הזה עצמו נראה
 *  כנושא אזור פר-אפליקציה, ⭐ והשער מודד את עצמו. */
const PA_WORD  = 'פר-אפליקציה';
const PA_HEAD  = '/* ⚠️ ' + PA_WORD + ' — ';
const PA_TAIL  = '/* ⚠️ סוף ' + PA_WORD + ' */';

export function stripAppBlock(text) {
  const i = text.indexOf(APP_HEAD);
  if (i < 0) return text;
  const b = text.indexOf(APP_TAIL, i);
  if (b < 0) return text;
  const e = text.indexOf('\n', b);
  return text.slice(0, i) + (e < 0 ? '' : text.slice(e + 1));
}

/*  ⛔ האזורים נגזרים **אחרי** הסרת `APP` — ⚠️ סמן שחי בתוך בלוק `APP`
 *  אינו אזור, ⭐ והוא כבר ירד. */
export function perAppRegions(text) {
  const out = [];
  let from = 0;
  for (;;) {
    const a = text.indexOf(PA_HEAD, from);
    if (a < 0) break;
    const h = text.indexOf('*/', a);
    const c = h < 0 ? -1 : text.indexOf(PA_TAIL, h);
    if (h < 0 || c < 0) { out.push({ at: a, reason: '', body: '', open: true }); break; }
    out.push({ at: a, end: c + PA_TAIL.length, open: false,
               reason: text.slice(a + PA_HEAD.length, h).trim(),
               body: text.slice(h + 2, c) });
    from = c + PA_TAIL.length;
  }
  return out;
}

/*  ⛔ השלד הוא מה שמושווה — ⚠️ כל אזור פר-אפליקציה מוחלף בסמן קבוע, ⭐
 *  ולכן גם **מספר האזורים ומיקומם** נמדדים: ⛔ אזור שנוסף בריפו אחד מזיז
 *  את השלד ונתפס. */
export function skeleton(text) {
  const s = stripAppBlock(text);
  const regs = perAppRegions(s);
  let out = s;
  for (let k = regs.length - 1; k >= 0; k--) {
    const r = regs[k];
    if (r.open) continue;
    out = out.slice(0, r.at) + '/*PA*/' + out.slice(r.end);
  }
  return out;
}

/*  ⛔ ההודעה נוקבת בשורה הראשונה שנבדלה — ⚠️ «אינם זהים» שולח את הקורא
 *  להריץ diff בעצמו, ⭐ ומספר שורה בשלד מוביל ישירות למקום. */
export function firstDiff(texts) {
  const L = texts.map((x) => skeleton(x).split('\n'));
  const max = Math.max(...L.map((a) => a.length));
  for (let i = 0; i < max; i++) {
    const v = L.map((a) => (a[i] === undefined ? '<סוף>' : a[i]));
    if (v.some((x) => x !== v[0])) return { line: i + 1, v };
  }
  return null;
}

/*  ⛔ המרשם נמדד על **רשימת שמות** ⛔ ואינו קורא מהדיסק — ⚠️ ולכן המוטציה
 *  מזינה לו קובץ סינתטי ⛔ בלי לגעת בעץ: ⭐ והמדידה היא **הכיסוי** —
 *  שם בלי מרשם, ⛔ ולא נוכחות הקובץ. */
export function uncoveredTools(names, pure, perApp, subset) {
  return names.filter((f) => pure.indexOf(f) < 0 && !(f in perApp) && !(f in subset));
}

/*  ⛔ הכיוון השני — ⚠️ קובץ `.mjs` שאינו ברשימת הריצה ואינו מוכרז שאינו
 *  שער: ⭐ שער שהוסר מהרשימה ונשאר בתיקייה מפסיק לרוץ ⛔ ואיש אינו רואה. */
export function gateRunGaps(mjs, runList, notGates) {
  return mjs.filter((f) => runList.indexOf(f) < 0 && !(f in notGates));
}

/*  ⛔ רשימת הסריקה נגזרת מרשימת הריצה (סבב 168) — ⚠️ **מה נכנס**: קובצי
 *  `tools/`, קבוצת הסריקה, וקורא ה-`ROWS` של כל קובץ; ⛔ **ומה מפיל**: קובץ
 *  מחוץ לקבוצה שמייצא `ROWS`, ⭐ גם ריק — ⚠️ `ROWS` ריק הוא ההצהרה שרשימת
 *  דילוג נפרדת דרשה, ⛔ והוא נשאר אחריה כשריד שנראה כשער. */
export function rowsDeclOf(txt) {
  const m = /^export const ROWS = \[([^\]]*)\];$/m.exec(txt);
  return m ? (m[1].match(/\d+/g) || []).map(Number) : null;
}
export function scanStrays(mjs, scanSet, rowsOf) {
  return mjs.filter((f) => !scanSet.has(f) && rowsOf(f) !== null);
}
/*  ⛔ כלי שאוכף שורה נסרק כשער (סבב 168) — ⚠️ **מה מפיל**: קובץ שמצהיר
 *  `ROWS` שאינו ריק ואינו בקבוצת הסריקה: ⭐ השורות שהוא אוכף נראות ללא
 *  כיסוי, ⛔ והמריץ עצמו היה המקרה — ⚠️ הוא אינו ברשימת הריצה של עצמו. */
export function enforcersUnscanned(mjs, scanSet, rowsOf) {
  return mjs.filter((f) => !scanSet.has(f) && (rowsOf(f) || []).length > 0);
}

/*  ⛔ שלושת הסוגים ב-`tools/` — ⚠️ **מה נכנס**: רשימת הקבצים, רשימת
 *  הריצה, ההכרזות, ומי מהם נושא בלוק `APP`; ⛔ **ומה מפיל**: קובץ
 *  שאינו נופל לאף סוג, קובץ שנופל לשניים, וסכום שאינו שווה למספר
 *  הקבצים. ⭐ **ולמה המבנה קיים**: הסוגים חיים בשלושה מרשמים נפרדים,
 *  ⛔ ואיש לא מדד שהם מכסים את התיקייה **בדיוק פעם אחת**.
 *  ⚠️ **וההבחנה בין כלי למודול היא בלוק `APP`** — ⛔ ולא השם: ⭐ מודול
 *  זהה בית-לבית בכל הריפו, ⛔ ולכן אין בו מה שייבדל. */
export function toolKinds(mjs, runList, notGates, hasApp) {
  const gate = [], tool = [], mod = [], none = [], both = [];
  for (const f of mjs) {
    const runs = runList.indexOf(f) >= 0;
    const decl = f in notGates;
    if (runs && decl) { both.push(f); continue; }
    if (runs) gate.push(f);
    else if (decl) (hasApp(f) ? tool : mod).push(f);
    else none.push(f);
  }
  return { gate, tool, mod, none, both };
}


/* ── 1. איסוף הקבצים ───────────────────────────────────────────────────── */
/*  ⛔ הריפו הזה נקרא מ-`ROOT` ⛔ ולא לפי שמו — ⚠️ שער הקריאה-בלבד מריץ את
 *  הסט על עותק בתיקייה זמנית ששמה אינו שם הריפו, ⭐ ושם חיפוש לפי שם היה
 *  מחזיר אפס קבצים: ⛔ והטענה הראשונה הייתה נופלת על עותק תקין. */
const others = PEERS.filter((p) => p !== FACTS.slug);
const dirOf = (p) => (p === FACTS.slug ? ROOT : join(SIBS, p));
const away = others.filter((p) => !existsSync(join(dirOf(p), 'tools')));
const order = [FACTS.slug].concat(others);
const listOf = (p) => {
  try { return readdirSync(join(dirOf(p), 'tools')).sort(); } catch (e) { return []; }
};
const readOf = (p, f) => readFileSync(join(dirOf(p), 'tools', f), 'utf8');

const mine = listOf(FACTS.slug);
t(n++, mine.length > 0,
  `קובצי tools/ נקראו — נמדדו ${mine.length} והצפוי לפחות אחד. ` +
  'מריצים את השער משורש הריפו');

const shared = away.length ? [] :
  mine.filter((f) => order.filter((p) => existsSync(join(dirOf(p), 'tools', f))).length === order.length);

/* ── 2. `pureTools` — קובץ בלי `APP` זהה בית-לבית ──────────────────────── */
const declPure = APP.pureTools || [];
const declPerApp = APP.perAppTools || {};
if (!away.length) {
  const noApp = shared.filter((f) => !readOf(FACTS.slug, f).includes(APP_HEAD) &&
                                     !readOf(FACTS.slug, f).includes(PA_HEAD));
  const drifted = declPure.filter((f) => {
    if (!shared.includes(f)) return true;
    const b = order.map((p) => readOf(p, f));
    return b.some((x) => x !== b[0]);
  });
  t(n++, drifted.length === 0,
    `[pure-tools] קובץ מוכרז שאינו זהה בכולן — נמדדו ${drifted.length} מתוך ` +
    `${declPure.length} והצפוי 0${drifted.length ? ` (${drifted.join(', ')})` : ''}. ` +
    'מיישרים את הקובץ בכל הריפו באותו סבב');

  const undeclared = noApp.filter((f) => !declPure.includes(f) && !(f in declPerApp));
  t(n++, undeclared.length === 0,
    `[pure-undeclared] קובץ בלי APP שאינו מוכרז — נמדדו ${undeclared.length} והצפוי 0` +
    `${undeclared.length ? ` (${undeclared.join(', ')})` : ''}. ` +
    'מכניסים ל-APP.pureTools, או ל-APP.perAppTools עם הנימוק');

  const stalePure = declPure.filter((f) => !noApp.includes(f));
  t(n++, stalePure.length === 0,
    `[pure-stale] הכרזת pureTools שאין לה קובץ בלי APP — נמדדו ${stalePure.length} והצפוי 0` +
    `${stalePure.length ? ` (${stalePure.join(', ')})` : ''}. מסירים מהרשימה`);

  /*  ⛔ הכרזה שתוכנה זהה אצל **כל מי שיש לו** מפילה — ⚠️ קובץ שחי בכולן
   *  וזהה מקומו ב-`pureTools`, ⭐ וקובץ שחי בחלקן וזהה ביניהם מקומו
   *  ב-`subsetTools`: ⛔ הכרזה שאין לה מקרה בפועל היא בעצמה השארית
   *  שהשער בא לסלק. ⚠️ **וקובץ שחי כאן בלבד אינו נמדד כאן** — ⛔ אין לו
   *  מול מה להישוות. */
  const paNames = Object.keys(declPerApp);
  const paSame = paNames.filter((f) => {
    const holders = order.filter((p) => existsSync(join(dirOf(p), 'tools', f)));
    if (holders.length < 2) return false;
    const b = holders.map((p) => readOf(p, f));
    return b.filter((x) => x !== b[0]).length === 0;
  });
  t(n++, paSame.length === 0,
    `[perapp-tools] הכרזת perAppTools שתוכנה זהה אצל כל מי שיש לו — נמדדו ${paSame.length} ` +
    `והצפוי 0${paSame.length ? ` (${paSame.join(', ')})` : ''}. ` +
    'מעבירים ל-pureTools אם הוא בכולן, ⛔ ול-subsetTools אם בחלקן');
  const noWhy = paNames.filter((f) => typeof declPerApp[f] !== 'string' || declPerApp[f].length < 20);
  t(n++, paNames.length > 0 && noWhy.length === 0,
    `[perapp-reason] נימוק לכל הכרזת perAppTools — נמדדו ${noWhy.length} בלי נימוק ` +
    `מתוך ${paNames.length} והצפוי 0, ולפחות הכרזה אחת. כותבים בכל אחת למה הקובץ פרטי`);
}

/* ── 2ג. כל קובץ בלי `APP` נמדד — גם כשהוא חי באחת בלבד ────────────────── */
/*  ⛔ המרשם נבנה מ**כל** קובצי `tools/` שבריפו הזה ⛔ ולא מהחיתוך — ⚠️ רשימה
 *  שנבנית מהמשותף בלבד עיוורת בדיוק למקום שבו הסחף נולד: ⭐ קובץ בלי `APP`
 *  שחי באחת בלבד לא נמדד בה באף כיוון. */
{
  const allNoApp = mine.filter((f) => {
    let txt = '';
    try { txt = readOf(FACTS.slug, f); } catch (e) { return false; }
    return !txt.includes(APP_HEAD) && !txt.includes(PA_HEAD);
  });
  const subset = APP.subsetTools || {};
  const uncovered = uncoveredTools(allNoApp, declPure, declPerApp, subset);
  for (const f of Object.keys(subset))
    if (allNoApp.includes(f) && uncoveredTools([f], declPure, declPerApp, {}).length) CASE('subsetTools', f);
  t(n++, uncovered.length === 0,
    `[tool-uncovered] קובץ בלי APP שאינו מוכרז באף מרשם — נמדדו ${uncovered.length} ` +
    `מתוך ${allNoApp.length} והצפוי 0${uncovered.length ? ` (${uncovered.join(', ')})` : ''}. ` +
    'מכניסים ל-pureTools, ל-subsetTools או ל-perAppTools עם הנימוק');

  const paMissing = Object.keys(declPerApp).filter((f) => !mine.includes(f));
  t(n++, paMissing.length === 0,
    `[perapp-missing] הכרזת perAppTools שאין לה קובץ — נמדדו ${paMissing.length} והצפוי 0` +
    `${paMissing.length ? ` (${paMissing.join(', ')})` : ''}. מסירים מהרשימה`);
}

/* ── 2ד. כל שער רץ בסט, או מוכרז שאינו שער ─────────────────────────────── */
/*  ⛔ הרשימה נקראת מ-`check-js` ⛔ ואינה מוקלדת כאן — ⚠️ שתי רשימות לאותה
 *  שאלה הן שתי הזדמנויות להיבדל: ⭐ ומספר השערים שרצים נגזר משתי המרשמים
 *  ⛔ ואינו מוקלד. */
{
  /*  ⛔ שם המריץ נבנה מחלקיו ⛔ ואינו ליטרל שלם — ⚠️ הבודק מפיל שער
   *  שנוקב בו כליטרל, ⭐ שזו הצורה של שער ש**מריץ** אותו: ⛔ וכאן הוא
   *  נקרא בלבד. */
  const RUNNER = 'check-' + 'js.mjs';
  const runSrc = readOf(FACTS.slug, RUNNER);
  const a = runSrc.indexOf('gates: [');
  const b = a < 0 ? -1 : runSrc.indexOf('],', a);
  const runList = a < 0 || b < 0 ? []
    : [...runSrc.slice(a, b).matchAll(/'([^']+\.mjs)'/g)].map((m) => m[1]);
  const notGates = APP.notGates || {};
  const mjs = mine.filter((f) => f.endsWith('.mjs'));
  t(n++, runList.length > 0,
    `רשימת הריצה נקראה מהמריץ — נמדדו ${runList.length} שערים והצפוי לפחות אחד. ` +
    'מריצים את השער משורש הריפו');
  const notRun = gateRunGaps(mjs, runList, notGates);
  for (const f of Object.keys(notGates)) if (mjs.includes(f) && runList.indexOf(f) < 0) CASE('notGates', f);
  t(n++, notRun.length === 0,
    `[gate-run] קובץ tools/ שאינו רץ בסט ואינו מוכרז — נמדדו ${notRun.length} מתוך ` +
    `${mjs.length} והצפוי 0${notRun.length ? ` (${notRun.join(', ')})` : ''}. ` +
    'מחווטים לרשימת הריצה שבמריץ, או מכריזים ב-APP.notGates עם מה שהקובץ עושה');
  /*  ⛔ קבוצת הסריקה היא רשימת הריצה והמריץ — ⚠️ ואין רשימה שלישית. */
  const scanSet = new Set(runList.concat([RUNNER]));
  const rowsOf = (f) => rowsDeclOf(readOf(FACTS.slug, f));
  const strays = scanStrays(mjs, scanSet, rowsOf);
  t(n++, strays.length === 0,
    `[scan-derived] קובץ מחוץ לרשימת הריצה שמייצא ROWS — נמדדו ${strays.length} מתוך ` +
    `${mjs.length - scanSet.size} והצפוי 0${strays.length ? ` (${strays.join(', ')})` : ''}. ` +
    'מסירים את ההצהרה, ⛔ שקובץ שאינו רץ אינו שער');
  const unscanned = enforcersUnscanned(mjs, scanSet, rowsOf);
  t(n++, unscanned.length === 0 && scanSet.has(RUNNER) && (rowsOf(RUNNER) || []).length > 0,
    `[scan-enforcer] קובץ שאוכף שורה ואינו נסרק — נמדדו ${unscanned.length} והצפוי 0` +
    `${unscanned.length ? ` (${unscanned.join(', ')})` : ''}, ` +
    `והמריץ נסרק ומצהיר ${(rowsOf(RUNNER) || []).length} שורות. ` +
    'מחווטים את הקובץ לרשימת הריצה, או מסירים ממנו את ROWS');
  const ngBad = Object.keys(notGates).filter((f) => !mjs.includes(f) || runList.includes(f));
  const ngWhy = Object.keys(notGates).filter((f) => String(notGates[f] || '').trim().split(/\s+/).length < 4);
  t(n++, ngBad.length === 0 && ngWhy.length === 0,
    `[notgates] הכרזת notGates שאין לה קובץ, שרצה בכל זאת, או בלי נימוק — נמדדו ` +
    `${ngBad.length + ngWhy.length} מתוך ${Object.keys(notGates).length} והצפוי 0` +
    `${ngBad.length ? ` (${ngBad.join(', ')})` : ''}${ngWhy.length ? ` (בלי נימוק: ${ngWhy.join(', ')})` : ''}. ` +
    'מסירים מהרשימה, או כותבים מה הקובץ עושה שאינו שער');
  /*  ⛔ המפקד נגזר משני המרשמים ⛔ ואינו מוקלד — ⚠️ מספר שהוקלד מתיישן
   *  ביום שבו נוסף שער, ⭐ ואיש אינו חוזר לעדכן. */
  const ghostRun = runList.filter((f) => !mjs.includes(f));
  t(n++, runList.length === mjs.length - Object.keys(notGates).length && ghostRun.length === 0,
    `[gate-count] מספר השערים שרצים — נמדדו ${runList.length} והצפוי ` +
    `${mjs.length - Object.keys(notGates).length} (${mjs.length} קבצים פחות ` +
    `${Object.keys(notGates).length} מוכרזים)` +
    `${ghostRun.length ? `, ושם ברשימת הריצה שאין לו קובץ: ${ghostRun.join(', ')}` : ''}. ` +
    'מיישרים את רשימת הריצה לקבצים שבתיקייה');

  /*  ⛔ שלושת הסוגים — ⚠️ והמפקד נגזר משלושת המרשמים ⛔ ואינו מוקלד. */
  const hasApp = (f) => /^const APP = \{/m.test(readOf(FACTS.slug, f));
  const K = toolKinds(mjs, runList, notGates, hasApp);
  const sum = K.gate.length + K.tool.length + K.mod.length;
  t(n++, K.none.length === 0 && K.both.length === 0 && sum === mjs.length,
    `[tool-kind] שלושת הסוגים ב-tools/ — ${K.gate.length} שערים · ${K.tool.length} כלים · ` +
    `${K.mod.length} מודולים; סכום ${sum} מתוך ${mjs.length} קבצים, ` +
    `${K.none.length} בלי סוג ו-${K.both.length} בשני סוגים, והצפוי אפס ואפס` +
    `${K.none.length ? ` (בלי סוג: ${K.none.join(', ')})` : ''}` +
    `${K.both.length ? ` (בשניים: ${K.both.join(', ')})` : ''}. ` +
    'מחווטים לרשימת הריצה, או מכריזים ב-APP.notGates עם מה שהקובץ עושה');

}

/* ── 2ב. קובץ שקיים בחלק מהריפו — זהה בית-לבית בין מי שיש לו ───────────── */
/*  ⛔ קובץ תשתית שקיים בכמה ריפו ולא בכולם — ⚠️ הוא נופל בין הכיסאות:
 *  ⭐ `pureTools` דורש שיהיה בכולם, ⛔ ובלי מדידה הוא נסחף בשקט.
 *  ⚠️ **וההצהרה נמדדת משני צדדיה**: שם שאין לו קובץ אצלנו, ⛔ ושם
 *  שקיים בכולם ולכן מקומו ב-`pureTools`. */
if (!away.length) {
  const subset = APP.subsetTools || {};
  const names = Object.keys(subset);
  const missing = names.filter((f) => !mine.includes(f));
  t(n++, missing.length === 0,
    `[subset-missing] הכרזת subsetTools שאין לה קובץ — נמדדו ${missing.length} והצפוי 0` +
    `${missing.length ? ` (${missing.join(', ')})` : ''}. מסירים מהרשימה`);
  const inAll = names.filter((f) => shared.includes(f));
  t(n++, inAll.length === 0,
    `[subset-in-all] קובץ שקיים בכולם ומוכרז כתת-קבוצה — נמדדו ${inAll.length} והצפוי 0` +
    `${inAll.length ? ` (${inAll.join(', ')})` : ''}. מעבירים ל-pureTools`);
  const noWhy2 = names.filter((f) => typeof subset[f] !== 'string' || subset[f].length < 20);
  t(n++, noWhy2.length === 0,
    `[subset-reason] נימוק לכל הכרזת subsetTools — נמדדו ${noWhy2.length} בלי נימוק והצפוי 0. ` +
    'כותבים בכל אחת למה הקובץ אינו בכולם');
  const subDrift = names.filter((f) => {
    /*  ⛔ ההשוואה על השלד ⛔ ולא על הבייטים (סבב 145) — ⚠️ קובץ תת-קבוצה
     *  רשאי לשאת `APP` משלו ואזורי פר-אפליקציה, ⭐ בדיוק כמו שער משותף:
     *  ⛔ השוואה גולמית הייתה מפילה כל שער כזה על בלוק ה-`APP` שלו. */
    const b = order.filter((p) => existsSync(join(dirOf(p), 'tools', f)))
      .map((p) => skeleton(readOf(p, f)));
    return b.length < 2 || b.some((x) => x !== b[0]);
  });
  t(n++, subDrift.length === 0,
    `[subset-drift] קובץ תת-קבוצה שאינו זהה בין מי שיש לו — נמדדו ${subDrift.length} והצפוי 0` +
    `${subDrift.length ? ` (${subDrift.join(', ')})` : ''}. מיישרים אותו באותו סבב`);
}

/* ── 3. גוף השער זהה אחרי הסרת `APP` ואזורי פר-אפליקציה ────────────────── */
if (!away.length) {
  const gates = shared.filter((f) => f.endsWith('.mjs'));
  const bad = [];
  const noopRegions = [];
  const shortReason = [];
  for (const f of gates) {
    const texts = order.map((p) => readOf(p, f));
    const d = firstDiff(texts);
    if (d) bad.push(`${f}:${d.line}`);
    const regs = order.map((p, k) => perAppRegions(stripAppBlock(texts[k])));
    if (regs[0].some((r) => r.open)) bad.push(`${f}: אזור פר-אפליקציה בלי סוגר`);
    regs[0].forEach((r, k) => {
      if (r.reason.length < 20) shortReason.push(`${f}#${k + 1}`);
      const bodies = regs.map((a) => (a[k] ? a[k].body : null));
      if (bodies.filter((b) => b !== bodies[0]).length === 0) noopRegions.push(`${f}#${k + 1}`);
    });
  }
  t(n++, gates.length > 0,
    `שערים משותפים להשוואה — נמדדו ${gates.length} והצפוי לפחות אחד. ` +
    'מריצים את הסבב עם כל הריפו זה לצד זה');
  t(n++, bad.length === 0,
    `[tools-drift] גוף שער שנבדל מעבר ל-APP — נמדדו ${bad.length} מתוך ${gates.length} ` +
    `והצפוי 0${bad.length ? ` (${bad.join(', ')})` : ''}. מיישרים את השורה בכולן, ` +
    'או עוטפים אותה באזור פר-אפליקציה עם נימוקו');
  t(n++, noopRegions.length === 0,
    `[perapp-noop] אזור פר-אפליקציה שתוכנו זהה בכולן — נמדדו ${noopRegions.length} ` +
    `והצפוי 0${noopRegions.length ? ` (${noopRegions.join(', ')})` : ''}. מסירים את הסמנים`);
  t(n++, shortReason.length === 0,
    `[perapp-reason] אזור פר-אפליקציה בלי נימוק בן 20 תווים — נמדדו ${shortReason.length} ` +
    `והצפוי 0${shortReason.length ? ` (${shortReason.join(', ')})` : ''}. כותבים בכותרת למה`);
} else {
  /*  ⛔ ההשוואה שלא רצה **נראית** ⛔ ואינה מדלגת בשתיקה — ⚠️ ואינה נספרת
   *  כטענה שעברה: ⭐ עותק עץ בתיקייה זמנית אין לצידו אחיות, ⛔ ושער
   *  שהיה נופל שם היה מפיל את קו הבסיס של שער הקריאה-בלבד. */
  console.log(`  ⚠️  ההשוואה בין הריפו לא רצה — ${away.join(' · ')} אינם על הדיסק ` +
              `לצד ${FACTS.slug}; מריצים את הסבב עם כל הריפו זה לצד זה`);
}

if (RUN_MUT) {
  mutStage();
/*  ⛔ המוטציות רצות על מחרוזות ⛔ ואינן נכתבות לעץ — ⚠️ האחות הסינתטית
 *  היא המקור עצמו, ⭐ ולכן הן רצות גם בעותק שאין לצידו ריפו אחות. */
const SELF = readFileSync(join(ROOT, 'tools', 'test_toolsid.mjs'), 'utf8');

/*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ היא מזיזה תו בגוף
 *  השער **מחוץ** ל-`APP`, ⭐ ושער שמשווה קבצים שלמים בלי להסיר `APP`
 *  היה נופל על כולם ממילא. */
const moved = SELF.replace('const PEERS = [', 'const  PEERS = [');
t(n++, moved !== SELF && firstDiff([SELF, moved, SELF, SELF]) !== null,
  '[tools-drift] מוטציה: רווח שנוסף מחוץ ל-APP באחות — נתפסה');

/*  ⭐ מוטציית-נגד: שינוי חי **בתוך** בלוק `APP` — ⛔ אינו מפיל. */
const inApp = SELF.replace('  pureTools: [', "  pureTools: ['כלי-אחר.mjs', ");
t(n++, inApp !== SELF && firstDiff([SELF, inApp, SELF, SELF]) === null,
  '[tools-drift] ⭐ מוטציית-נגד: שינוי בתוך בלוק APP ⛔ אינו מפיל');

/*  ⛔ המוטציה השנייה מכוונת לאזור פר-אפליקציה — ⚠️ אזור שנוסף בריפו אחד
 *  בלבד מזיז את השלד, ⭐ והטענה שנופלת היא `tools-drift`. */
const withPa = SELF.replace('const ROOT = join(',
  PA_HEAD + 'נימוק סינתטי שאורכו מעל עשרים תווים */\nconst X = 1;\n' +
  PA_TAIL + '\nconst ROOT = join(');
t(n++, withPa !== SELF && firstDiff([SELF, withPa, SELF, SELF]) !== null,
  '[tools-drift] מוטציה: אזור פר-אפליקציה שנוסף באחות אחת — נתפסה');

/*  ⭐ מוטציית-נגד: אותו אזור בדיוק בכולן — ⛔ אינו מפיל, ⚠️ וזה בדיוק
 *  מה שהסמן נועד להתיר. */
t(n++, firstDiff([withPa, withPa, withPa, withPa]) === null,
  '[tools-drift] ⭐ מוטציית-נגד: אותו אזור בכולן ⛔ אינו מפיל');

/*  ⛔ מ3 — קובץ בלי `APP` שחי באחת בלבד ואינו מוכרז (סבב 148). ⚠️ זה
 *  בדיוק מה שמרשם שנבנה מהחיתוך אינו רואה: ⭐ והמוטציה לוגית ⛔ ואינה
 *  נכתבת לעץ. */
{
  const synth = ['zz_only_here.mjs'];
  t(n++, uncoveredTools(synth, APP.pureTools || [], APP.perAppTools || {},
                        APP.subsetTools || {}).length === 1,
    '[tool-uncovered] מוטציה: קובץ בלי APP שחי באחת בלבד ואינו מוכרז — נתפס');
}
/*  ⭐ מוטציית-נגד: אותו קובץ **כשהוא מוכרז** ⛔ אינו מפיל — ⚠️ בלעדיה
 *  הטענה אינה מבחינה בין «מודדת כיסוי» ל«אוסרת כל קובץ פרטי». */
{
  const synth = ['zz_only_here.mjs'];
  const decl = { 'zz_only_here.mjs': 'נימוק סינתטי שאורכו מעל עשרים תווים' };
  t(n++, uncoveredTools(synth, APP.pureTools || [], decl, {}).length === 0,
    '[tool-uncovered] ⭐ מוטציית-נגד: אותו קובץ כשהוא מוכרז ⛔ אינו מפיל');
}
/*  ⛔ מ4 — שער שהוסר מרשימת הריצה ונשאר בתיקייה (סבב 148). */
{
  const mjsSyn = ['test_zz.mjs'];
  t(n++, gateRunGaps(mjsSyn, [], {}).length === 1 &&
         gateRunGaps(mjsSyn, ['test_zz.mjs'], {}).length === 0,
    '[gate-run] מוטציה: שער שאינו ברשימת הריצה ואינו מוכרז — נתפס, ' +
    '⭐ ומוטציית-נגד: שער שברשימה ⛔ אינו מפיל');
}
/*  ⛔ מ5 — קובץ שנופל לשני סוגים: ⚠️ רץ בסט **וגם** מוכרז שאינו שער.
 *  ⭐ המוטציה לוגית ⛔ ואינה נכתבת לעץ. */
{
  const syn = ['test_zz.mjs'];
  const both = toolKinds(syn, ['test_zz.mjs'], { 'test_zz.mjs': 'נימוק' }, () => true);
  const one = toolKinds(syn, ['test_zz.mjs'], {}, () => true);
  t(n++, both.both.length === 1 && one.both.length === 0 && one.gate.length === 1,
    '[tool-kind] מוטציה: קובץ שרץ בסט וגם מוכרז שאינו שער — נתפס, ' +
    '⭐ ומוטציית-נגד: אותו קובץ ברשימת הריצה בלבד ⛔ אינו מפיל');
}
/*  ⛔ מ6 — כלי מחוץ לרשימת הריצה שמייצא `ROWS` ריק (סבב 168): ⚠️ זה
 *  בדיוק השריד שרשימת הדילוג השאירה. ⭐ המוטציה לוגית ⛔ ואינה נכתבת לעץ. */
{
  const syn = ['gen-zz.mjs', 'test_zz.mjs'], scan = new Set(['test_zz.mjs']);
  const withDecl = { 'gen-zz.mjs': 'export const ROWS = [];\n', 'test_zz.mjs': 'export const ROWS = [5];\n' };
  const noDecl = { 'gen-zz.mjs': 'export const X = 1;\n', 'test_zz.mjs': 'export const ROWS = [5];\n' };
  t(n++, scanStrays(syn, scan, (f) => rowsDeclOf(withDecl[f])).length === 1 &&
         scanStrays(syn, scan, (f) => rowsDeclOf(noDecl[f])).length === 0,
    '[scan-derived] מוטציה: כלי מחוץ לרשימת הריצה שמייצא ROWS ריק — נתפס, ' +
    '⭐ ומוטציית-נגד: אותו כלי בלי ההצהרה ⛔ אינו מפיל');
}
/*  ⛔ מ7 — קבוצת סריקה שהמריץ אינו בה (סבב 168): ⚠️ המריץ אוכף שורות,
 *  ⭐ ובלעדיו הן נראות ללא כיסוי. */
{
  const syn = ['check-zz.mjs', 'test_zz.mjs'];
  const txt = { 'check-zz.mjs': 'export const ROWS = [31];\n', 'test_zz.mjs': 'export const ROWS = [5];\n' };
  const rowsOf = (f) => rowsDeclOf(txt[f]);
  t(n++, enforcersUnscanned(syn, new Set(['test_zz.mjs']), rowsOf).length === 1 &&
         enforcersUnscanned(syn, new Set(['test_zz.mjs', 'check-zz.mjs']), rowsOf).length === 0,
    '[scan-enforcer] מוטציה: המריץ אינו בקבוצת הסריקה — נתפס, ' +
    '⭐ ומוטציית-נגד: המריץ בקבוצה ⛔ אינו מפיל');
}
}

console.log(fail ? `\n✗ סבב 112 (זהות קובצי tools) — ${fail} טענות נכשלו`
                 : `\n✓ סבב 112 (זהות קובצי tools) — ${pass} טענות עברו`);
process.exit(fail ? 1 : 0);
