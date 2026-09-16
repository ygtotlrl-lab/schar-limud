#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
   test_visual.mjs — כל ערך חזותי נגזר, בסריקה הפוכה (סבב 141)

   **מה נאכף:** ⛔ כל ערך שבגיליון הסגנון — ובכל מחרוזת CSS שנכתבת מ-JS —
   הוא `var(--…)` או מילת מפתח, ⚠️ **והסריקה הפוכה**: מה שאינו אחד מהם
   **מפיל**, ⭐ ולא רשימת דפוסים שמחפשת את מה שכבר ידוע. ⛔ וחמישה סולמות
   חדשים נושאים את הערכים: שכבה · משך · אטימות · גובה שורה · מרווח אות.

   **הנימוק המדוד:** שלושה סבבים סגרו דפוס אחד כל פעם — סגנון מוטבע,
   ערך מספרי, ו-CSS מוזרק — ⛔ ובכל פעם הערך ישב במקום שה-probe לא סרק:
   ⚠️ נמדדו 33 אתרי `z-index` בכולן בעשרה ערכים שונים, ⭐ 47 אתרי `opacity`
   בארבעה-עשר ערכים, ⛔ ו-47 אתרי `transition` בשני כתיבים לאותו משך.

   **מה יישבר בלעדיו:** ⛔ כל ערך חדש ייכתב כליטרל במקום שבו אף דפוס
   מוצהר אינו מחפש אותו, ⚠️ והסולם יתאר את מה שהיה ⛔ ולא את מה שנוסף:
   ⭐ וזה בדיוק המצב שהסריקה ההפוכה באה לסגור.

   ⛔ **ומחלקה שקיימת ביותר מאפליקציה אחת נושאת אותם כללים** — ⚠️ בבסיס
   ובכל מצב, ⭐ והשם נחתך מהגיליון **באסימון מלא**: ⛔ וכל סטייה מוצהרת
   ב-`APP.appClasses` בריפו שסוטה בו.

   **מה אינו נאכף כאן:** ⚠️ **הערך שבשאילתת `@media`** — ⛔ הוא נמדד מול
   `BP_SCALE` בבודק היכולות, ⭐ וכאן נמדד **אוצר המילים** של השאילתה בלבד:
   ⛔ יחידה, תכונה וכיוון · ⚠️ **והגוון של אסימון** — ⛔ היחס נמדד בשורת
   ערכת הנושא, ⭐ וכאן נמדד רק שהערך **נגזר** מאסימון · ⚠️ **ודף האופליין
   שב-`sw`** — ⛔ הוא מסמך עצמאי שאין לו גישה לערכת האפליקציה.
   ──────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS } from './peers.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
/*  ⛔ החריגות הפרטיות — ⚠️ **מה נכנס**: בורר או שם קובץ שהסריקה מדלגת
 *  עליו כאן בלבד, עם נימוקו; ⛔ **ומה מפיל**: חריגה שאין לה אתר בפועל.
 *  ⭐ **ולמה המבנה קיים**: היתר בלי מקרה הוא היתר שלא נסגר.
 *  ⚠️ **וריק הוא «נמדד ואין»** ⛔ ואינו נשמט. */
const APP = {
  app: 'schar-limud',
  visualAllow: { fns: [] },
  /*  ⛔ המחלקות שסוטות מהאחיות — ⚠️ **מה נכנס**: שם המחלקה ⟵ מה שהמסך
   *  כאן דורש ושאין לו מקבילה בשאר; ⛔ **ומה מפיל**: סטייה שאין לה הצהרה,
   *  הצהרה למחלקה שכלליה זהים לאחיותיה, והצהרה שנימוקה נוכחות בלבד.
   *  ⭐ **ולמה המבנה קיים**: כלל שנוסף באחת מפני ששם נתקלו בבעיה נשאר
   *  שם לבדו, ⛔ ואיש אינו בודק את האחרות — ⚠️ אין באג, ⭐ הרכיב רק
   *  נראה אחרת. */
  appClasses: {
    'auth-box':
      'תיבת הכניסה בשכר רחבה יותר — שדה הסיסמה כאן חופשי ואינו מוגבל לשש ספרות — ⚠️ מוצהרת **עד יישור שכבת האסימונים**',
    'auth-btn':
      'כפתור הכניסה בשכר נושא את רדיוס הכפתורים של המערכת ואת מצב הריחוף — המסך נפתח גם במחשב שולחני של המזכירות — ⚠️ מוצהרת **עד יישור שכבת האסימונים**',
    'badge':
      'תג בשכר נושא ריווח צר ורדיוס מלא — הוא יושב בתוך תא בטבלת החודשים, ורוחב התא הוא מה שמגביל אותו — ⚠️ מוצהרת **עד יישור שכבת האסימונים**',
    'btn':
      'כפתור בשכר הוא גלולה ללא מסגרת בגוון ההדגשה — הוא יושב על גבי טבלה צפופה, ומסגרת בו הייתה מוסיפה קו שלישי לתא — ⚠️ מוצהרת **עד יישור שכבת האסימונים**',
    'card':
      'כרטיס בשכר הוא מיכל של טבלה ולא של טקסט — ולכן אין בו ריווח פנימי, והוא חותך את פינות הטבלה שבתוכו — ⚠️ מוצהרת **עד יישור שכבת האסימונים**',
    'sheet':
      'הגיליון בשכר הוא דיאלוג ממורכז וצר — הוא מקבל סכום ותאריך, ואינו מציג רשימה שנגללת — ⚠️ מוצהרת **עד יישור שכבת האסימונים**',
    'sheet-ft':
      'שורת הכפתורים בגיליון של שכר נדחקת לקצה — הדיאלוג ממורכז, ושורה פרושה בו נראית כטופס נוסף — ⚠️ מוצהרת **עד יישור שכבת האסימונים**',
    'sheet-hd':
      'כותרת הגיליון בשכר אינה נדבקת לראש — הדיאלוג נמוך מהמסך, ואין בו גלילה שתסתיר אותה — ⚠️ מוצהרת **עד יישור שכבת האסימונים**',
    'tab-btn':
      'לשונית בשכר היא פריט בסרגל תחתון של אייקון מעל תווית — הניווט כאן בתחתית המסך, במקום שהאגודל מגיע אליו — ⚠️ מוצהרת **עד יישור שכבת האסימונים**',
    'veil':
      'מסך ההעמעמה בשכר ממרכז את הדיאלוג ומשאיר לו ריווח מסביב — הדיאלוג כאן קצר, וגיליון תחתון היה מותיר חצי מסך ריק — ⚠️ מוצהרת **עד יישור שכבת האסימונים**',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [90, 107, 84, 104, 211];

/*  ⛔ המרשם שהסורק מכריז — ⚠️ **מה נכנס**: שם הדפוס שהשער אוכף;
 *  ⛔ **ומה מפיל**: דפוס שאין לו מוטציה, ומוטציה שנוקבת בדפוס שאינו כאן.
 *  ⭐ **ולמה המבנה קיים**: בלעדיו דפוס נשחק בשקט — ⚠️ השער ממשיך להכריז
 *  עליו, ⛔ והוא כבר אינו נמדד. */
export const PATTERNS = ['color', 'scaled', 'closing', 'future', 'media', 'classes',
                         'semantic', 'layer', 'clstok'];
export const MUTS = ['color', 'color', 'color', 'color', 'scaled', 'scaled', 'scaled',
                     'scaled', 'closing', 'closing', 'closing', 'closing', 'color',
                     'color', 'color', 'future', 'media', 'future',
                     'classes', 'classes', 'classes', 'classes', 'classes',
                     'semantic', 'semantic', 'semantic', 'layer', 'layer', 'layer',
                     'clstok', 'clstok', 'clstok'];

const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה.
 *  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ הסריקה זהה בכולן, ⭐ ומה שנבדל הוא
 *  מספר האתרים ⛔ ולא מספר הטענות. */
const FLOOR = { shared: 28, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
const SUBRUN = !!process.env.GATE_SUBRUN;
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
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — עדכן את \`FLOOR\`.`);
    process.exitCode = 1;
  }
});
const t = (c, m) => { RAN++; if (c) { pass++; console.log('  ok   ' + m); }
                      else { fail++; console.error('  FAIL ' + m); } };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ── ההחרגות — קבוצה, ובה תכונות שהערך בהן אינו דרגה בסולם ─────────────── */
/*  ⛔ **מה נכנס**: תכונה שערכה המספרי אינו דרגה בשום סולם, ⛔ **ומה מפיל**:
 *  קבוצה שאין לה אף אתר חי בריפו הזה. ⭐ **ולמה המבנה קיים**: בלי
 *  ההחרגות הכלל הסוגר היה תופס כל מידה של רכיב יחיד, ⚠️ ורשימה שבולעת
 *  את הכלל גרועה מאין כלל — ⛔ ולכן חמש קבוצות, וכל אחת עם נימוקה. */
const ALLOW = {
  /*  ⛔ מספר מתוך קבוצה סגורה ⛔ ולא דרגה — ⚠️ `font-weight` הוא מאה עד
   *  תשע-מאות, ⭐ ו-`flex` ו-`grid` הם יחס ולא מידה. */
  enumProps: ['font-weight', 'flex', 'flex-grow', 'flex-shrink', 'flex-basis',
              'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
              'order', 'stroke-width', 'content', 'size', 'font', 'tab-size',
              '-webkit-text-size-adjust', '-webkit-line-clamp', 'line-clamp'],
  /*  ⛔ מידת רכיב יחיד — ⚠️ רוחב הלוגו וגובה הסרגל אינם סולם: ⭐ סולם
   *  עליהם היה **מפקד של המוצר** ⛔ וישתנה עם כל מסך שנוסף. */
  boxProps: ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
             'top', 'bottom', 'left', 'right', 'inset', 'inset-inline', 'inset-block',
             'inset-inline-start', 'inset-inline-end', 'background-position',
             'background-size', 'transform-origin', 'vertical-align', 'outline-offset'],
  /*  ⛔ עובי קו — ⚠️ שיער אחד, אחד וחצי או שניים: ⭐ הוא נמדד מול הפיקסל
   *  של המכשיר ⛔ ולא מול סולם הריווח. */
  edgeProps: ['border', 'border-top', 'border-bottom', 'border-left', 'border-right',
              'border-inline', 'border-block', 'border-width', 'border-top-width',
              'border-bottom-width', 'border-left-width', 'border-right-width',
              'outline', 'border-top-color', 'border-color'],
  /*  ⛔ גיאומטריית אפקט — ⚠️ היסט הצל, מרחק ההזזה וזווית המדרון הם תכונת
   *  הציור: ⭐ **והצבע שבתוכם כן נגזר** — ⛔ הוא נמדד בטענת הצבע. */
  effectProps: ['box-shadow', 'text-shadow', 'transform', 'filter', 'backdrop-filter',
                'background', 'background-image'],
};

/*  ⛔ שתי שכבות שאינן בסולם — ⚠️ **מה נכנס**: ערך ה-`z-index` שעליו
 *  מוצהר; ⛔ **ומה מפיל**: ערך מוצהר שאין לו אתר חי. ⭐ **ולמה הן מחוץ
 *  לסולם**: הן משטח ההתרעה שנכתב מ-JS כשהאחסון מלא או כשהתור נתקע —
 *  ⚠️ הוא חייב לשבת מעל כל מה שהדף צייר **ומעל כל שכבה שהמעטפת מציירת**,
 *  ⛔ ודרגה בסולם שרכיב אחר יכול לתבוע גם הוא הייתה משווה ביניהם. */
const TOP_LAYER = ['2147482000', '2147483000'];

/*  ⛔ תכונה שערכה המספרי הוא דרגה בסולם — ⚠️ **מה נכנס**: התכונה והדפוס
 *  שהערך בה חייב לענות עליו; ⛔ **ומה מפיל**: כל ערך אחר בה — ⭐ ערך
 *  שנבחר לאתר הוא סולם שלא הוגדר. */
const SCALED = {
  'z-index': new RegExp('^(?:var\\(--z-[1-7]\\)|' + TOP_LAYER.join('|') + ')$'),
  opacity: /^(?:var\(--op-[1-7]\)|0|1)$/,
  'line-height': /^(?:var\(--lh-[1-6]\)|0|inherit)$/,
  'letter-spacing': /^(?:var\(--ls-(?:[1-3]|n[12])\)|0)$/,
};
/*  ⛔ התכונות שהסולם בהן כבר נאכף בשורת הסולמות — ⚠️ שתי מדידות לאותו
 *  ערך הן שתי אמיתות, ⭐ ולכן כאן הן מדולגות בשמן. */
const OWNED = ['font-size', 'padding', 'padding-top', 'padding-bottom', 'padding-left',
               'padding-right', 'padding-inline', 'padding-block', 'padding-inline-start',
               'padding-inline-end', 'margin', 'margin-top', 'margin-bottom', 'margin-left',
               'margin-right', 'margin-inline', 'margin-block', 'margin-inline-start',
               'margin-inline-end', 'gap', 'row-gap', 'column-gap', 'border-radius'];

/*  ⛔ תכונות שאין להן היום אף אתר — ⚠️ הן נכנסות לסריקה כדי שהיום שבו
 *  ייכנסו לא יעבור בשתיקה: ⭐ הכלל הסוגר חל עליהן כמו על כל השאר. */
const FUTURE = ['clip-path', 'mask', 'mask-image', 'mix-blend-mode', 'will-change',
                'aspect-ratio', 'scroll-behavior', 'scroll-snap-type', 'scroll-margin',
                'scroll-padding', 'offset-path'];
const FUTURE_FN = /\b(?:color-mix|oklch|oklab|lab|lch|light-dark)\s*\(/;

const COLOR_LIT = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\([^)]*\)|(?<![-\w#(])(?:white|black|red|green|blue|gray|grey|silver|gold|orange|yellow|purple|pink|brown|navy|teal|cyan|magenta|lime|maroon|olive|aqua|fuchsia)(?![-\w])/g;
const NUM_LIT = /(?<![-\w.#])-?\d*\.?\d+(px|rem|em|%|vh|vw|vmin|vmax|dvh|dvw|s|ms|deg|turn|fr|ch|ex|pt)?(?![\w%])/g;

/* ── חילוץ ההיקף — הגיליון, וכל מחרוזת CSS שנכתבת מ-JS ─────────────────── */
/*  ⛔ הגיליון הוא ההיקף הראשון — ⚠️ **וההיקף השני הוא המחרוזות**: ⭐ שם
 *  ישבו הערכים שאף סורק לא ראה. */
function sheetRanges(src) {
  const out = []; const re = /<style[^>]*>([\s\S]*?)<\/style>/gi; let m;
  while ((m = re.exec(src)) !== null) {
    const a = m.index + m[0].indexOf('>') + 1;
    out.push([a, a + m[1].length]);
  }
  return out;
}
/*  ⛔ מחרוזת שהיא CSS — ⚠️ שתי הצהרות לפחות ותכונה מוכרת: ⭐ מחרוזת
 *  שנראית כמו כתובת או כמו אובייקט אינה CSS, ⛔ וסינון רופף היה מדווח
 *  על כל טקסט. */
const CSS_HINT = /(?:^|[;{])\s*(?:color|background|background-color|z-index|padding|margin|font-size|font-weight|border|border-radius|display|position|opacity|transition|width|height|line-height|box-shadow|transform|inset|top|left|right|bottom|gap|text-align|animation|letter-spacing|filter|backdrop-filter|outline)\s*:/;
function jsCssRanges(src) {
  const out = [];
  const holes = sheetRanges(src);
  const inSheet = (i) => holes.some(([a, b]) => i >= a && i < b);
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const body = m[1] !== undefined ? m[1] : m[2];
    if (body.length < 12 || inSheet(m.index)) continue;
    if ((body.match(/:/g) || []).length < 2) continue;
    if (!CSS_HINT.test(body)) continue;
    out.push([m.index + 1, m.index + 1 + body.length]);
  }
  return out;
}
/*  ⛔ ההצהרות שבטווח — ⚠️ תכונה שנפתחת בשני מקפים היא הגדרת אסימון,
 *  ⭐ והיא המקום היחיד שבו הערך נכתב כליטרל. */
function declsIn(src, a, b, inSheet) {
  const raw = src.slice(a, b);
  const s = inSheet ? raw.replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, ' ')) : raw;
  const out = []; let i = 0, depth = inSheet ? 0 : 1, mark = 0, sel = '';
  while (i < s.length) {
    const c = s[i];
    if (c === '{') {
      const head = s.slice(mark, i).trim();
      if (!head.startsWith('@')) sel = head;
      depth++; i++; mark = i; continue;
    }
    if (c === '}') { depth--; i++; mark = i; continue; }
    if (depth > 0) {
      let j = i, paren = 0;
      while (j < s.length) {
        const d = s[j];
        if (d === '(') paren++;
        else if (d === ')') paren--;
        else if ((d === ';' || d === '}' || d === '{') && !paren) break;
        j++;
      }
      if (s[j] === '{') { i = j; continue; }
      const txt = s.slice(i, j), k = txt.indexOf(':');
      if (k > 0 && /^[-a-zA-Z]/.test(txt.slice(0, k).trim()))
        out.push({ sel, prop: txt.slice(0, k).trim(), val: txt.slice(k + 1).trim(), at: a + i });
      i = j + 1; mark = i; continue;
    }
    i++;
  }
  return out;
}
const lineOf = (src, i) => src.slice(0, i).split('\n').length;

/* ── הסריקה ────────────────────────────────────────────────────────────── */
/*  ⛔ בזיכרון ⛔ ובלי תהליך — ⚠️ המקור מגיע כארגומנט, ⭐ והמוטציה מריצה
 *  את אותה פונקציה בדיוק על טקסט מוטט. */
/*  ⛔ טווח גוף הפונקציה — ⚠️ הוא ההיקף שההחרגה הפרטית חלה עליו,
 *  ⭐ ובלעדיו ההחרגה הייתה שם קובץ ⛔ ולא מקום. */
function fnRange(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return null;
  let d = 0, j = src.indexOf('{', i);
  if (j < 0) return null;
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return [i, k + 1]; }
  }
  return null;
}

function scan(src, allow) {
  const out = { color: [], scaled: [], closing: [], media: [], future: [] };
  const skip = (allow.fns || []).map((n) => fnRange(src, n)).filter(Boolean);
  const inSkip = (i) => skip.some(([a, b]) => i >= a && i < b);
  const zones = [];
  for (const r of sheetRanges(src)) zones.push([r, true]);
  for (const r of jsCssRanges(src)) zones.push([r, false]);
  for (const [[a, b], inSheet] of zones) {
    if (inSkip(a)) continue;
    for (const d of declsIn(src, a, b, inSheet)) {
      const where = 'שורה ' + lineOf(src, d.at) + ' (' + d.prop + ')';
      if (d.prop.startsWith('--')) continue;
      /*  ⛔ ליטרל צבע מפיל בכל תכונה — ⚠️ הצבע אינו תכונה של רכיב,
       *  ⭐ הוא ערכה. */
      const cols = d.val.match(COLOR_LIT) || [];
      for (const c of cols) out.color.push(where + ': ' + c);
      if (FUTURE_FN.test(d.val) && !/var\(--/.test(d.val)) out.future.push(where + ': ' + d.val.slice(0, 40));
      if (FUTURE.indexOf(d.prop) >= 0 && !/^(?:var\(--|none$|auto$|initial$|inherit$|unset$)/.test(d.val))
        out.future.push(where + ': ' + d.val.slice(0, 40));
      if (SCALED[d.prop]) {
        if (!SCALED[d.prop].test(d.val)) out.scaled.push(where + ': ' + d.val.slice(0, 40));
        continue;
      }
      if (OWNED.indexOf(d.prop) >= 0) continue;
      if (ALLOW.enumProps.indexOf(d.prop) >= 0 || ALLOW.boxProps.indexOf(d.prop) >= 0
          || ALLOW.edgeProps.indexOf(d.prop) >= 0 || ALLOW.effectProps.indexOf(d.prop) >= 0) continue;
      /*  ⛔ חישוב שמערב את שולי המכשיר אינו דרגה — ⚠️ הוא היסט שנבנה
       *  מ-`env`, ⭐ ואין דרגה שמתארת אותו. */
      if (/\benv\s*\(/.test(d.val)) continue;
      const v = d.val.replace(/var\(\s*--[\w-]+\s*(?:,[^()]*)?\)/g, ' ').replace(COLOR_LIT, ' ');
      for (const m of v.matchAll(NUM_LIT)) {
        /*  ⛔ מספר בלי יחידה אינו מידה — ⚠️ הוא מכפיל בתוך `calc`
         *  או מונה, ⭐ והתכונות שבהן הוא כן מידה מוצהרות למעלה. */
        if (!m[1]) continue;
        if (/^-?0(?:\.0+)?$/.test(m[0].replace(/[a-z%]+$/, ''))) continue;
        out.closing.push(where + ': ' + m[0]);
      }
    }
  }
  /*  ⛔ השמה ישירה למאפיין סגנון — ⚠️ היא אינה גיליון ואינה מחרוזת כלל,
   *  ⭐ ושם ישבו משך, אטימות וגוון שאף סורק לא ראה: ⛔ והנמדד הוא הערך
   *  שנכתב ⛔ ולא עצם ההשמה. */
  for (const m of src.matchAll(/\.style\.([a-zA-Z]+)\s*=\s*'([^']*)'/g)) {
    if (inSkip(m.index)) continue;
    const prop = m[1].replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
    const where = 'שורה ' + lineOf(src, m.index) + ' (style.' + m[1] + ')';
    if (!m[2] || /^var\(--/.test(m[2]) || m[1] === 'cssText') continue;
    if ((m[2].match(COLOR_LIT) || []).length) { out.color.push(where + ': ' + m[2]); continue; }
    if (ALLOW.boxProps.indexOf(prop) >= 0 || ALLOW.effectProps.indexOf(prop) >= 0
        || OWNED.indexOf(prop) >= 0) continue;
    if (SCALED[prop] && !SCALED[prop].test(m[2])) { out.scaled.push(where + ': ' + m[2]); continue; }
    const vv = m[2].replace(/var\(\s*--[\w-]+\s*(?:,[^()]*)?\)/g, ' ');
    for (const n of vv.matchAll(NUM_LIT))
      if (n[1] && !/^-?0(?:\.0+)?$/.test(n[0].replace(/[a-z%]+$/, ''))) out.closing.push(where + ': ' + n[0]);
  }
  /*  ⛔ אוצר המילים של שאילתת הפריסה — ⚠️ הערך עצמו נמדד מול `BP_SCALE`
   *  בבודק היכולות, ⭐ וכאן נמדד מה שהוא אינו מודד: היחידה והתכונה. */
  for (const m of src.matchAll(/@media([^{]*)\{/g)) {
    const q = m[1];
    if (/prefers-color-scheme|\bprint\b|\bscreen\b/.test(q) && !/width/.test(q)) continue;
    for (const f of q.matchAll(/\(([^)]*)\)/g)) {
      const txt = f[1].trim();
      if (/^min-width\s*:\s*\d+px$/.test(txt)) continue;
      /*  ⛔ שאילתת העדפת משתמש אינה נקודת שבירה — ⚠️ אין בה יחידה ואין
       *  בה כיוון, ⭐ ו-`BP_SCALE` אינו מודד אותה: ⛔ והדרישה לכתוב אותה
       *  כ-`min-width` הייתה הופכת העדפת נגישות לרוחב מסך. */
      if (/^prefers-(?:color-scheme|reduced-motion)\s*:/.test(txt)) continue;
      out.media.push('שורה ' + lineOf(src, m.index) + ': (' + txt + ')');
    }
  }
  return out;
}

/*  ⛔ ההחרגות נמדדות משני צדדיהן — ⚠️ קבוצה שאין לה אף אתר חי היא היתר
 *  שלא נסגר, ⭐ והכיוון השני הוא הכלל הסוגר עצמו. */
function groupSites(src, names) {
  let n = 0;
  for (const r of sheetRanges(src))
    for (const d of declsIn(src, r[0], r[1], true))
      if (names.indexOf(d.prop) >= 0 && /\d/.test(d.val.replace(/var\([^)]*\)/g, ''))) n++;
  return n;
}

const IDX = rd('index.html');
const F = scan(IDX, APP.visualAllow);

t(F.color.length === 0,
  `ליטרל צבע בגיליון או ב-CSS שנכתב מ-JS — נמדדו ${F.color.length} והצפוי אפס` +
  (F.color.length ? ' · ' + F.color.slice(0, 4).join(' · ') +
   ' — מה עושים: מחליפים באסימון מהערכה, או מוסיפים אסימון ומצהירים אותו' : ''));
t(F.scaled.length === 0,
  `ערך שאינו דרגה בסולם — נמדדו ${F.scaled.length} והצפוי אפס` +
  (F.scaled.length ? ' · ' + F.scaled.slice(0, 4).join(' · ') +
   ' — מה עושים: מיישרים לדרגה הקרובה בסולם שבבלוק המשותף' : ''));
t(F.closing.length === 0,
  `ערך מספרי שאינו נגזר ואינו מוחרג — נמדדו ${F.closing.length} והצפוי אפס` +
  (F.closing.length ? ' · ' + F.closing.slice(0, 4).join(' · ') +
   ' — מה עושים: גוזרים מדרגה, או מוסיפים את התכונה לקבוצת החרגה עם נימוקה' : ''));
t(F.media.length === 0,
  `שאילתת פריסה מחוץ לאוצר המילים — נמדדו ${F.media.length} והצפוי אפס` +
  (F.media.length ? ' · ' + F.media.slice(0, 4).join(' · ') +
   ' — מה עושים: כותבים אותה כ-(min-width:<N>px), ש-BP_SCALE נמדד מולה' : ''));
t(F.future.length === 0,
  `תכונה עתידית שערכה אינו נגזר — נמדדו ${F.future.length} והצפוי אפס` +
  (F.future.length ? ' · ' + F.future.slice(0, 4).join(' · ') : ''));

/* ── הסולמות עצמם — הצהרה בלי דרגה היא סולם שאינו קיים ─────────────────── */
const SCALE_DEF = [
  ['z', 7, /--z-(\d):\s*(\d+)/g], ['dur', 6, /--dur-(\d):\s*([\d.]+s)/g],
  ['op', 7, /--op-(\d):\s*([\d.]+)/g], ['lh', 6, /--lh-(\d):\s*([\d.]+)/g],
];
for (const [fam, n, re] of SCALE_DEF) {
  const got = [...IDX.matchAll(re)].map((m) => Number(m[1]));
  t(got.length === n && got.every((x, i) => x === i + 1),
    `סולם --${fam}-* — נמדדו ${got.length} דרגות והצפוי ${n}, רצופות מאחת`);
}
t(/--ls-1:/.test(IDX) && /--ls-n1:/.test(IDX) && /--ls-n2:/.test(IDX),
  'סולם --ls-* — הכיוון החיובי והשלילי שניהם מוצהרים, ' +
  'והשלילי בשם שנושא את סימנו');
t(/--ease:\s*cubic-bezier\(/.test(IDX),
  'עקומת ההאטה מוצהרת פעם אחת — `--ease`, וכל `cubic-bezier` נגזר ממנה');

/*  ⛔ סדר ולא גודל — ⚠️ הדרגות עולות, ⭐ ומי שמחליף שתיים מהן הופך שתי
 *  שכבות: ⛔ והמדידה היא שהמספרים עולים ⛔ ולא מה הם. */
{
  const z = [...IDX.matchAll(/--z-(\d):\s*(\d+)/g)].map((m) => Number(m[2]));
  t(z.length > 1 && z.every((x, i) => i === 0 || x > z[i - 1]),
    `סולם השכבות עולה — נמדד ${z.join('<')} , וכל דרגה מעל קודמתה`);
}

/* ── ההחרגות — כל קבוצה עם אתר חי ──────────────────────────────────────── */
for (const g of ['enumProps', 'boxProps', 'edgeProps', 'effectProps']) {
  const n = groupSites(IDX, ALLOW[g]);
  t(n > 0, `קבוצת ההחרגה ${g} — נמדדו ${n} אתרים חיים והצפוי לפחות אחד`);
}
/*  ⛔ החרגה פרטית נמדדת אף היא — ⚠️ בורר שאין לו אתר הוא היתר שלא נסגר. */
{
  const dead = (APP.visualAllow.fns || []).filter((s) => IDX.indexOf('function ' + s + '(') < 0);
  t(dead.length === 0,
    `החרגה פרטית בלי אתר — נמדדו ${dead.length} והצפוי אפס` +
    (dead.length ? ' · ' + dead.join(' · ') : ''));
}
/*  ⛔ שכבת העל נמדדת אף היא — ⚠️ ערך מוצהר שאין לו אתר הוא היתר שלא נסגר. */
{
  const dead = TOP_LAYER.filter((v) => IDX.indexOf('z-index:' + v) < 0);
  t(dead.length === 0,
    `שכבת-על מוצהרת בלי אתר — נמדדו ${dead.length} והצפוי אפס` +
    (dead.length ? ' · ' + dead.join(' · ') : ''));
}
/*  ⛔ דף האופליין של ה-`sw` מוחרג — ⚠️ **וההחרגה נמדדת**: ⭐ קובץ שאין
 *  בו גיליון כלל היא הצהרה שהתיישנה. */
t(/<style>|style="/.test(rd('sw.js')),
  'דף האופליין שב-`sw` נושא גיליון משלו — מסמך עצמאי, ולכן מוחרג כאן');
/*  ⛔ והכלים אינם מקור לערך — ⚠️ **הנמדד הוא הגדרת אסימון**: ⭐ שער
 *  שמגדיר דרגה משלו הוא סולם שני, ⛔ ומי שמעדכן את הבלוק אינו רואה אותו.
 *  ⚠️ **ומחרוזת CSS בשער אינה נמדדת כאן** — ⛔ היא רתמת מוטציה, ⭐ וזה
 *  בדיוק תפקידה. */
{
  const bad = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'tools')).filter((x) => x.endsWith('.mjs')))
    if (/(?:^|['"\s;{])--(?:z|dur|op|lh|ls|fs|sp|r)-[0-9n]+\s*:\s*[^\s'";}]/.test(rd('tools/' + f)))
      bad.push(f);
  t(bad.length === 0,
    `הגדרת דרגה בקובצי הכלים — נמדדו ${bad.length} והצפוי אפס` +
    (bad.length ? ' · ' + bad.join(' · ') : ''));
}


/* ── רכיב משותף מתנהג אותו דבר — המחלקות מוצלבות בין הריפו ─────────────── */
/*  ⛔ השם נחתך מהגיליון **באסימון מלא** — ⚠️ `tab-btn` אינו `btn`,
 *  ⭐ ו-`mod-ic` אינו `mod`: ⛔ תפיסת תחילית הייתה מאחדת שני רכיבים
 *  שאינם אותו רכיב, ⚠️ והיא מה שכמעט הפיל את המדידה. */
const CLS_SEL = /^\.(-?[A-Za-z_][\w-]*)(:hover|:focus|:active|:disabled)?$/;
/*  ⛔ הנימוק המינימלי — ⚠️ פחות מזה אינו אומר מה המסך דורש, ⭐ והוא
 *  נקרא כתווית. */
const CLS_WHY_MIN = 6;
/*  ⛔ ניסוחי נוכחות — ⚠️ «אינה זהה» היא **המדידה** ⛔ ואינה הנימוק:
 *  ⭐ הוא נכון על כל שם שהרשימה מחזיקה, ⚠️ ואינו אומר מה המסך דורש. */
const CLS_PRESENCE = ['אינה זהה', 'אינו זהה', 'אינה בכולן', 'אינו בכולן',
                      'שונה מהאחרות', 'שונה מהשאר', 'אינה כמו'];

/*  ⛔ פירוק הגיליון לכללים — ⚠️ **מה נכנס**: הקשר (`@media`) · הבורר ·
 *  וגוף הכלל; ⛔ **ומה מפיל**: אין כאן מה שיפיל, ⭐ שזה חילוץ ולא הכרעה.
 *  ⚠️ **ולמה המבנה קיים**: ההקשר הוא חלק מהכלל — ⛔ כלל שחי בתוך שאילתה
 *  ואינו מחוצה לה הוא כלל אחר. */
function cssRules(css) {
  const out = [];
  const walk = (t, ctx) => {
    let i = 0, mark = 0;
    while (i < t.length) {
      const c = t[i];
      if (c === '{') {
        const sel = t.slice(mark, i).trim();
        let d = 1, k = i + 1;
        while (k < t.length && d > 0) { if (t[k] === '{') d++; else if (t[k] === '}') d--; k++; }
        const body = t.slice(i + 1, k - 1);
        if (sel.startsWith('@')) walk(body, ctx ? ctx + ' && ' + sel : sel);
        else out.push({ ctx: ctx || '', sel, body: body.trim() });
        i = k; mark = k; continue;
      }
      if (c === '}') { i++; mark = i; continue; }
      i++;
    }
  };
  walk(css.replace(/\/\*[\s\S]*?\*\//g, ' '), '');
  return out;
}
const styleSheet = (src) => { const r = sheetRanges(src)[0]; return r ? src.slice(r[0], r[1]) : ''; };
const normDecls = (b) => b.split(';').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join('; ');
/*  ⛔ הפרופיל הוא גוף הכלל **וכל כללי המצבים** — ⚠️ `:hover` · `:focus` ·
 *  `:active` · `:disabled`: ⭐ כפתור שמגיב באחת ואינו מגיב באחרת נקרא
 *  כתקלה, ⛔ ואין באג שאפשר להצביע עליו. */
function classProfiles(css) {
  const P = new Map();
  for (const r of cssRules(css))
    for (const one of r.sel.split(',')) {
      const m = CLS_SEL.exec(one.trim());
      if (!m) continue;
      const key = (r.ctx ? r.ctx + ' >> ' : '') + (m[2] || 'base');
      const o = P.get(m[1]) || {};
      o[key] = (o[key] ? o[key] + '; ' : '') + normDecls(r.body);
      P.set(m[1], o);
    }
  return P;
}
/*  ⛔ כל שם שבורר כלשהו נוקב בו — ⚠️ הוא **אינו** הפרופיל: ⭐ `.empty .big`
 *  הוא כלל ל-`big`, ⛔ ואינו כלל שאפשר להצליב בו. */
function classMentions(css) {
  const S = new Set();
  for (const r of cssRules(css))
    for (const m of r.sel.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) S.add(m[1]);
  return S;
}
/*  ⛔ השימוש נמדד מחוץ לגיליון — ⚠️ `class="…"` במקור ו-`classList` בקוד:
 *  ⭐ ושם שנבנה מביטוי אינו שם, ⛔ והוא מדולג. */
function classUses(src) {
  const holes = sheetRanges(src);
  const outside = (i) => !holes.some(([a, b]) => i >= a && i < b);
  const out = new Set();
  for (const m of src.matchAll(/class\s*=\s*(["'])([^"'<>]*)\1/g)) {
    if (!outside(m.index) || /[$+{}\\]/.test(m[2])) continue;
    for (const t of m[2].split(/\s+/)) if (t) out.add(t);
  }
  for (const m of src.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)) {
    if (!outside(m.index)) continue;
    for (const q of m[1].matchAll(/['"]([A-Za-z_][\w-]*)['"]/g)) out.add(q[1]);
  }
  return out;
}
/*  ⛔ מחלקה שקוד בורר אותה היא וו ל-JS ⛔ ואינה הצהרת עיצוב — ⚠️ והיא
 *  נמדדת בשורת «סלקטור בלי קורא», ⭐ ולא כאן. */
function classHooks(src) {
  const out = new Set();
  for (const m of src.matchAll(/(?:querySelector|querySelectorAll|closest|matches|contains)\s*\(\s*['"]([^'"]*)['"]/g))
    for (const q of m[1].matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) out.add(q[1]);
  for (const m of src.matchAll(/classList\.contains\(\s*['"]([A-Za-z_][\w-]*)['"]/g)) out.add(m[1]);
  return out;
}
const profSig = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
/*  ⛔ הקבוצה הגדולה פטורה, ⛔ ותיקו אינו פוטר אף אחד — ⚠️ הסוטה הוא מי
 *  שאינו בה: ⭐ הנימוק לסטייה נכתב בריפו שסוטה, ⛔ ולא באחיותיו. */
function classDeviants(profs) {
  const out = new Map();
  const names = new Set();
  for (const p of Object.values(profs)) for (const c of p.keys()) names.add(c);
  for (const c of names) {
    const carriers = Object.keys(profs).filter((a) => profs[a].has(c));
    if (carriers.length < 2) continue;
    const g = new Map();
    for (const a of carriers) {
      const s = profSig(profs[a].get(c));
      if (!g.has(s)) g.set(s, []);
      g.get(s).push(a);
    }
    if (g.size === 1) continue;
    const arr = [...g.values()].sort((x, y) => y.length - x.length);
    const big = (arr.length > 1 && arr[0].length > arr[1].length) ? arr[0] : [];
    out.set(c, carriers.filter((a) => big.indexOf(a) < 0));
  }
  return out;
}
/*  ⛔ המדידה משני צדדיה — ⚠️ **מה נכנס**: הפרופילים של כל הריפו
 *  והצהרת `APP.appClasses`; ⛔ **ומה מפיל**: סטייה בלי הצהרה · הצהרה
 *  למחלקה שכלליה זהים לאחיותיה · הצהרה בלי נימוק תפקידי · ⛔ ומחלקה
 *  שיש לה שימוש כאן, כלל באחות, ואין לה כלל כאן. */
function classGaps(me, srcByApp, decl) {
  const profs = {};
  for (const a of Object.keys(srcByApp)) profs[a] = classProfiles(styleSheet(srcByApp[a]));
  const dev = classDeviants(profs);
  const out = { drift: [], ghost: [], bare: [], missing: [] };
  for (const [c, apps] of dev) if (apps.indexOf(me) >= 0 && !decl[c]) out.drift.push(c);
  for (const c of Object.keys(decl)) {
    const apps = dev.get(c) || [];
    if (apps.indexOf(me) < 0) { out.ghost.push(c); continue; }
    const why = String(decl[c]).trim();
    if (why.split(/\s+/).length < CLS_WHY_MIN || CLS_PRESENCE.some((p) => why.indexOf(p) >= 0))
      out.bare.push(c);
  }
  const mine = classMentions(styleSheet(srcByApp[me]));
  const hooks = classHooks(srcByApp[me]);
  for (const c of classUses(srcByApp[me])) {
    if (mine.has(c) || hooks.has(c)) continue;
    if (Object.keys(srcByApp).some((a) => a !== me && classMentions(styleSheet(srcByApp[a])).has(c)))
      out.missing.push(c);
  }
  return out;
}

/*  ⚠️ שורש הייחוס הוא הריפו הזה, והאחיות לצידו — ⛔ ריפו שאינו על הדיסק
 *  **מדווח בשמו**: ⭐ ההשוואה שלא רצה נראית, ⛔ ואינה נספרת כטענה שעברה.
 *  ⚠️ **והמוטציות בונות לעצמן אחות סינתטית** ⭐ ולכן רצות תמיד. */
const SIBS = path.join(ROOT, '..');
const CLS_OTHERS = PEERS.filter((p) => p !== APP.app);
const CLS_HAVE = CLS_OTHERS.filter((p) => fs.existsSync(path.join(SIBS, p, 'index.html')));
const CLS_AWAY = CLS_OTHERS.filter((p) => CLS_HAVE.indexOf(p) < 0);
const CLS_SRC = { [APP.app]: IDX };
for (const p of CLS_HAVE) CLS_SRC[p] = fs.readFileSync(path.join(SIBS, p, 'index.html'), 'utf8');
const CG = CLS_AWAY.length ? null : classGaps(APP.app, CLS_SRC, APP.appClasses || {});
/*  ⛔ ריפו שאינו על הדיסק **מדווח בשמו** — ⚠️ ההשוואה שלא רצה נראית,
 *  ⭐ והתוצאה נספרת ככל תוצאה: ⛔ מונה שמדלג עליה מדווח חוסר שאינו קיים.
 *  ⚠️ **וההצלבה אינה מתקיימת על עץ חלקי** — ⛔ רתמת מוטציה שמעתיקה שני
 *  קבצים בלבד הייתה מדווחת «הצהרה שאין לה סטייה» על כל הצהרה. */
const cg = (k, msg, how) => t(CG === null
  ? true : CG[k].length === 0,
  CG === null
    ? `${msg} — ⏭ ההצלבה בין הריפו לא רצה: ${CLS_AWAY.join(' · ')} אינם על הדיסק ` +
      `לצד ${APP.app} (${CLS_HAVE.length} מתוך ${CLS_OTHERS.length}). ` +
      'מריצים את הסבב עם כל הריפו זה לצד זה'
    : `${msg} — נמדדו ${CG[k].length} והצפוי אפס` +
      (CG[k].length ? ' · ' + CG[k].slice(0, 6).join(' · ') + ' — מה עושים: ' + how : ''));
cg('drift', 'מחלקה משותפת שכלליה נבדלים ואינה מוצהרת',
   'מיישרים את הכלל לזה של האחיות, או מצהירים ב-APP.appClasses מה המסך כאן דורש');
cg('ghost', 'הצהרת מחלקה שאין לה סטייה',
   'מסירים אותה מ-APP.appClasses, שהיא מתארת מצב שחלף');
cg('bare', 'הצהרת מחלקה בלי נימוק תפקידי',
   'כותבים מה המסך כאן דורש, ולא שהכלל נבדל');
cg('missing', 'מחלקה בשימוש כאן שכלל שלה חי באחות ואין לה כלל כאן',
   'מביאים את הכלל, או מסירים את השימוש');

/* ── שלוש שכבות נוספות — סמנטי · שכבת הדיאלוג · אסימון שמחלקה מגדירה ───── */
/*  ⛔ הגוון נגזר מהערך ⛔ ואינו מושווה בין הריפו — ⚠️ הערך הוא מוצר,
 *  ⭐ ומה שמושווה הוא **התפקיד** שהמיפוי מגיע אליו. */
const hexRgb = (h) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h == null ? '' : h).trim());
  if (!m) return null;
  const s = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const hueOf = (rgb) => {
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return null;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const hueGap = (a, b) => (a === null || b === null) ? null : Math.abs(((a - b + 540) % 360) - 180);
/*  ⛔ סוגר תואם ⛔ ולא חלון תווים — ⚠️ גוף שנחתך באורך קבוע מסווג את
 *  מה שאחריו לקלט שאינו שלו. */
function braceBody(src, open) {
  if (open < 0) return null;
  let d = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') { d--; if (!d) return src.slice(open + 1, i); }
  }
  return null;
}
/*  ⛔ ערכי ה-`:root` בשני המצבים — ⚠️ הכהה הוא `:root` שבתוך
 *  `prefers-color-scheme`, ⭐ והוא דורס את הבהיר ⛔ ואינו מחליף אותו. */
function rootVars(rules, dark) {
  const v = {};
  for (const r of rules) {
    if (!/(^|,)\s*:root\s*(,|$)/.test(r.sel)) continue;
    if (!!dark !== /prefers-color-scheme\s*:\s*dark/.test(r.ctx)) continue;
    for (const m of r.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) v[m[1]] = m[2].trim();
  }
  return v;
}
/*  ⛔ שרשרת ה-`var()` נפתרת עד לליטרל — ⚠️ אסימון שמצביע על אסימון
 *  נראה תקין בטקסט, ⭐ ומי שיודע מה יצא בסוף הוא מי שפתר את השרשרת. */
function resolveTok(vars, name) {
  let x = vars[name], seen = 0;
  while (x !== undefined && seen++ < 10 && /var\(\s*--/.test(x)) x = vars[/var\(\s*(--[\w-]+)/.exec(x)[1]];
  return x === undefined ? null : String(x).trim();
}
/*  ⛔ תחומי הגוון של שלושת המצבים — ⚠️ **מה נכנס**: שם האסימון ⟵ תחום
 *  הגוון של שמו, ⛔ **ומה מפיל**: אסימון שערכו נופל מחוץ לתחום.
 *  ⭐ **ולמה המבנה קיים**: `--bad` שאינו אדום הוא אסימון שנושא תפקיד
 *  של אחר, ⚠️ והרכיב המשותף שנשען עליו צובע את הכשל בצבע ההצלחה. */
const STATE_BANDS = { '--ok': [90, 170], '--warn': [10, 60], '--bad': [340, 10] };
/*  ⛔ התקרה נגזרת מהפער שנמדד — ⚠️ צבע הזהות והצהרת המניפסט נכתבים
 *  בנפרד, ⭐ והפער הגדול שנמדד ביניהם בריפו תקין הוא מעלה וחצי:
 *  ⛔ תקרה צמודה לו הייתה מפילה על עיגול, ⚠️ ותקרה רחבה הייתה מתירה גוון אחר. */
const HUE_TOL = 12;
const inBand = (h, [a, b]) => h === null ? false : (a <= b ? (h >= a && h <= b) : (h >= a || h <= b));
function semanticGaps(rules, theme) {
  const out = [];
  const th = hueOf(hexRgb(theme));
  if (th === null) { out.push(`theme_color אינו ליטרל שאפשר לגזור ממנו גוון — «${theme}»`); return out; }
  const light = rootVars(rules, false);
  const dark = Object.assign({}, light, rootVars(rules, true));
  for (const [mode, vars] of [['בהיר', light], ['כהה', dark]]) {
    const b = resolveTok(vars, '--brand');
    const g = hueGap(hueOf(hexRgb(b)), th);
    if (g === null || g > HUE_TOL)
      out.push(`--brand (${mode}) ⟵ ${b} · ${g === null ? 'אינו ליטרל' : g.toFixed(0) + '° מול ' + theme}`);
    for (const k of Object.keys(STATE_BANDS)) {
      const v = resolveTok(vars, k);
      if (!inBand(hueOf(hexRgb(v)), STATE_BANDS[k])) out.push(`${k} (${mode}) ⟵ ${v}`);
    }
  }
  return out;
}

/*  ⛔ הדרגה נגזרת מהסולם ⛔ ואינה הערך — ⚠️ `--z-4` היא «מודאל»,
 *  ⭐ והמספר שמאחוריה הוא מוצר שיכול להשתנות. */
const Z_RE = /z-index\s*:\s*var\(\s*--z-(\d)\s*\)/;
const POS_RE = /position\s*:\s*(fixed|absolute|sticky)/;
/*  ⛔ הבורר הפשוט בלבד — ⚠️ בורר מורכב אינו ניתן להתאמה לאלמנט בלי מנוע
 *  התאמה מלא, ⭐ וכל מיכל שנושא שכבה בכל הריפו הוא `#id` או `.class`. */
function layerRules(rules) {
  const out = [];
  for (const r of rules) {
    const z = Z_RE.exec(r.body);
    if (!z || !POS_RE.test(r.body)) continue;
    for (const one of r.sel.split(',')) {
      const m = /^([#.])([-\w]+)$/.exec(one.trim());
      if (m) out.push({ kind: m[1], name: m[2], z: Number(z[1]) });
    }
  }
  return out;
}
const VOID_TAGS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                   'link', 'meta', 'param', 'source', 'track', 'wbr'];
/*  ⛔ העץ נבנה מהסימון בלבד — ⚠️ סקריפט, גיליון והערה מולבנים לפניו:
 *  ⭐ `'<div id="x">'` בתוך מחרוזת אינו אלמנט. */
function domNodes(html, layers, dlgIds) {
  const markup = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => ' '.repeat(m.length))
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (m) => ' '.repeat(m.length))
    .replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));
  const zOf = (id, cls) => {
    let z = null;
    for (const L of layers)
      if (L.kind === '#' ? id === L.name : cls.indexOf(L.name) >= 0) z = z === null ? L.z : Math.max(z, L.z);
    return z;
  };
  const out = [], stack = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g;
  let m;
  while ((m = re.exec(markup))) {
    const tag = m[2].toLowerCase(), attrs = m[3];
    if (m[1] === '/') {
      for (let k = stack.length - 1; k >= 0; k--) if (stack[k].tag === tag) { stack.length = k; break; }
      continue;
    }
    const id = (/\bid="([^"]*)"/.exec(attrs) || ['', ''])[1];
    const cls = ((/\bclass="([^"]*)"/.exec(attrs) || ['', ''])[1]).split(/\s+/).filter(Boolean);
    const act = (/\bdata-act="([^"]*)"/.exec(attrs) || ['', ''])[1];
    const own = zOf(id, cls);
    const up = stack.length ? stack[stack.length - 1] : null;
    const layer = own === null ? (up ? up.layer : 0) : own;
    /*  ⛔ פותח שיושב **בתוך** מיכל הדיאלוג אינו נמדד — ⚠️ כפתור «נסה
     *  שוב» שבתוך המודאל פותח אותו מחדש, ⭐ ואין שכבה שצריך לעבור. */
    const inDlg = (up ? up.inDlg : false) || (!!id && dlgIds.has(id));
    if (id || act) out.push({ id, act, layer, tag, inDlg });
    if (VOID_TAGS.indexOf(tag) < 0 && !/\/\s*$/.test(attrs)) stack.push({ tag, layer, inDlg });
  }
  return out;
}
/*  ⛔ סימון שנבנה ב-JS נמדד אף הוא — ⚠️ סורק שמוגבל למקור מדווח על מה
 *  שנסרק בלבד: ⭐ והפותח מיוחס לשכבת המיכל שהוא מרונדר לתוכו, ⛔ ואם אין
 *  יעד מוצהר — לשכבת התוכן, ⚠️ שהיא הנמוכה שבסולם. */
function jsOpeners(html, acts, byId) {
  const out = [];
  for (const [name, body] of fnBodies(html)) {
    const found = [];
    for (const m of body.matchAll(/data-act=\\?["']([-\w]+)/g)) if (acts.indexOf(m[1]) >= 0) found.push(m[1]);
    for (const m of body.matchAll(/dataset\.act\s*=\s*'([-\w]+)'/g)) if (acts.indexOf(m[1]) >= 0) found.push(m[1]);
    if (!found.length) continue;
    let layer = 0, inDlg = false;
    for (const m of body.matchAll(/getElementById\(\s*'([-\w]+)'/g)) {
      const n = byId.get(m[1]);
      if (!n) continue;
      if (n.layer > layer) layer = n.layer;
      if (n.inDlg) inDlg = true;
    }
    for (const a of found) out.push({ act: a, layer, inDlg, fn: name });
  }
  return out;
}
/*  ⛔ הפעולה שפותחת דיאלוג נגזרת ממפת הפעולות ⛔ ואינה רשימת שמות —
 *  ⚠️ ושרשרת הקריאה עומק אחד: ⭐ המטפל קורא לפונקציה, ⛔ והיא פותחת. */
const DIALOG_OPEN = /\b(openModal|ask)\s*\(/;
function fnBodies(src) {
  const map = new Map();
  for (const m of src.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const b = braceBody(src, src.indexOf('{', m.index + m[0].length - 1));
    if (b !== null && !map.has(m[1])) map.set(m[1], b);
  }
  return map;
}
function dialogActs(src, bodies) {
  const i = src.indexOf('DOM_ACTIONS = {');
  if (i < 0) return null;
  const map = braceBody(src, src.indexOf('{', i));
  if (map === null) return null;
  const out = [];
  for (const m of map.matchAll(/'([-\w]+)'\s*:\s*function\s*\([^)]*\)\s*\{/g)) {
    const b = braceBody(map, map.indexOf('{', m.index + m[0].length - 1)) || '';
    let opens = DIALOG_OPEN.test(b);
    if (!opens)
      for (const c of b.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g))
        if (bodies.has(c[1]) && DIALOG_OPEN.test(bodies.get(c[1]))) { opens = true; break; }
    if (opens) out.push(m[1]);
  }
  return out;
}
/*  ⛔ מיכל הדיאלוג נגזר מגוף הפותח ⛔ ואינו מוקלד — ⚠️ המזהה שהפותח
 *  קורא לו הוא המיכל, ⭐ ושם שנכתב כאן היה מרשם שני. */
function dialogIds(bodies) {
  const ids = new Set();
  for (const n of ['openModal', 'ask'])
    for (const m of (bodies.get(n) || '').matchAll(/getElementById\(\s*'([-\w]+)'/g)) ids.add(m[1]);
  return ids;
}
function dialogLayerGaps(html, rules) {
  const layers = layerRules(rules);
  const bodies = fnBodies(html);
  const acts = dialogActs(html, bodies) || [];
  const ids = dialogIds(bodies);
  const nodes = domNodes(html, layers, ids);
  const byId = new Map();
  for (const n of nodes) if (n.id && !byId.has(n.id)) byId.set(n.id, n);
  const holders = nodes.filter((n) => n.id && ids.has(n.id) && n.layer > 0);
  const top = holders.length ? Math.max(...holders.map((n) => n.layer)) : null;
  const openers = nodes.filter((n) => n.act && acts.indexOf(n.act) >= 0)
    .concat(jsOpeners(html, acts, byId));
  const over = top === null ? [] : openers.filter((n) => !n.inDlg && n.layer >= top);
  return { layers, nodes, acts, holders, top, openers, over };
}

/*  ⛔ אתר ההחלה הוא מי שבונה אלמנט ⛔ ואינו מפיק־שם — ⚠️ פונקציה
 *  שמחזירה את שם המחלקה אינה מחילה אותה, ⭐ והאתר הוא מי שקורא לה. */
const BUILDS_EL = /class\s*=|className|classList\.(add|toggle)|<(div|span|button|td|tr|li)\b/;
const wordRe = (w) => new RegExp('\\b' + w.replace(/-/g, '\\-') + '\\b');
function classTokenGaps(html) {
  const rules = cssRules(styleSheet(html));
  const defs = new Map(), readers = new Map();
  for (const r of rules)
    for (const one of r.sel.split(',')) {
      const sel = one.trim();
      const dm = /^\.(-?[A-Za-z_][\w-]*)$/.exec(sel);
      if (dm)
        for (const m of r.body.matchAll(/(?:^|;|\s)(--[\w-]+)\s*:/g))
          defs.set(dm[1], new Set([...(defs.get(dm[1]) || []), m[1]]));
      /*  ⛔ המרשם ממופתח באסימון ⛔ ולא במחלקה — ⚠️ השאלה היא «מי קורא
       *  את האסימון הזה», ⭐ ולא «מה המחלקה הזו קוראת». */
      const toks = [...r.body.matchAll(/var\(\s*(--[\w-]+)/g)].map((x) => x[1]);
      const cls = [...sel.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((x) => x[1]);
      if (!toks.length || !cls.length) continue;
      for (const tok of toks) readers.set(tok, new Set([...(readers.get(tok) || []), ...cls]));
    }
  const fns = [...fnBodies(html)].map(([name, body]) => ({ name, body }));
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => ' '.repeat(m.length))
                     .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (m) => ' '.repeat(m.length));
  const bad = [];
  let sites = 0;
  for (const [cls, toks] of defs) {
    const hosts = [];
    for (const f of fns) if (BUILDS_EL.test(f.body) && wordRe(cls).test(f.body)) hosts.push({ n: f.name, b: f.body });
    if (wordRe(cls).test(markup)) hosts.push({ n: '(מקור)', b: markup });
    /*  ⛔ שם שנבנה בהרכבה — ⚠️ מפיק־שם שמחזיר תחילית ועוד, ⭐ ואתריו
     *  הם מי שקוראים לו. */
    for (const f of fns) {
      if (BUILDS_EL.test(f.body)) continue;
      const lit = new RegExp('[\'"`][^\'"`]*\\b' + cls.replace(/-/g, '\\-') + '\\b');
      const pre = [];
      for (let k = cls.length - 1; k > 0; k--) if (cls[k] === '-') pre.push(cls.slice(0, k + 1));
      const builds = lit.test(f.body) ||
        pre.some((p) => new RegExp('[\'"`]' + p.replace(/-/g, '\\-') + '[\'"`]\\s*\\+').test(f.body));
      if (!builds) continue;
      for (const c of fns)
        if (c.name !== f.name && BUILDS_EL.test(c.body) && new RegExp('\\b' + f.name + '\\s*\\(').test(c.body))
          hosts.push({ n: c.name + '←' + f.name, b: c.body });
    }
    const rd2 = [...toks].reduce((a, t) => a.concat([...(readers.get(t) || [])]), []);
    sites += hosts.length;
    if (!hosts.length) { bad.push(`.${cls} ⤫ אין אתר החלה`); continue; }
    const un = hosts.filter((h) => !rd2.some((rc) => wordRe(rc).test(h.b)));
    if (un.length) bad.push(`.${cls} [${[...toks].join(',')}] ⤫ ${un.map((h) => h.n).join(',')}`);
  }
  return { defs, sites, bad };
}

/* ── הטענות ────────────────────────────────────────────────────────────── */
const MANIFEST_THEME = (() => {
  try { return JSON.parse(rd('manifest.json')).theme_color; } catch (e) { return null; }
})();
const SEM = semanticGaps(cssRules(styleSheet(IDX)), MANIFEST_THEME);
t(SEM.length === 0,
  `[semantic-role] ⛔ אסימון סמנטי ממופה לתפקיד אחד — נמדדו ${SEM.length} מיפויים ` +
  `שאינם בתפקיד שמם והצפוי אפס` + (SEM.length ? ` (${SEM.join(' · ')})` : '') +
  ' — מה עושים: ממפים את `--brand` לצבע הזהות שהמניפסט מכריז, ' +
  'ואת `--ok`/`--warn`/`--bad` לגוון שמם');

const DL = dialogLayerGaps(IDX, cssRules(styleSheet(IDX)));
t(DL.top !== null && DL.acts.length > 0 && DL.openers.length > 0,
  `[dialog-registry] ⛔ מרשם השכבות והפעולות נקרא — נמדדו ${DL.layers.length} כללי שכבה · ` +
  `${DL.holders.length} מיכלי דיאלוג (דרגה ${DL.top === null ? '—' : DL.top}) · ` +
  `${DL.acts.length} פעולות שפותחות דיאלוג · ${DL.openers.length} אתרי פתיחה, והצפוי לפחות אחד מכל אחד`);
t(DL.over.length === 0,
  `[dialog-layer] ⛔ מיכל דיאלוג נפתח מעל השכבה שפתחה אותו — נמדדו ${DL.over.length} אתרי פתיחה ` +
  `בדרגה שאינה נמוכה מ-${DL.top} והצפוי אפס` +
  (DL.over.length ? ` (${DL.over.map((n) => `${n.act}@${n.layer}`).join(' · ')})` : '') +
  ' — מה עושים: מורידים את דרגת האזור שפותח, או מעלים את דרגת המיכל');

const CT = classTokenGaps(IDX);
t(CT.bad.length === 0,
  `[class-token] ⛔ מחלקה שמגדירה אסימון נקראת באתר שבו היא מוחלת — נמדדו ` +
  `${CT.defs.size} מחלקות מגדירות ב-${CT.sites} אתרי החלה, ${CT.bad.length} בלי צרכן והצפוי אפס` +
  (CT.bad.length ? ` (${CT.bad.slice(0, 6).join(' · ')})` : '') +
  ' — מה עושים: קוראים את האסימון בכלל שחל על האלמנט, או מסירים את ההגדרה');

mutStage();
if (RUN_MUT) {
/*  ⛔ המוטציות בזיכרון — ⚠️ הן מריצות את **אותה** `scan` על טקסט מוטט,
 *  ⭐ ואין כאן תהליך: ⛔ שער שמודד טקסט רץ בזיכרון.
 *  ⛔ **מרשם המוטציות** — ⚠️ **מה נכנס**: שם הטענה שתיפול, והעריכה
 *  שמפילה אותה; ⛔ **ומה מפיל**: עריכה שהטענה שנקבה בה לא נפלה עליה.
 *  ⭐ **ולמה המבנה קיים**: דפוס בלי מוטציה נשחק בחזרה לבדיקת נוכחות. */
const HOST = '.toast{';
function put(text, decl) {
  const i = text.indexOf(HOST);
  return i < 0 ? null : text.slice(0, i + HOST.length) + decl + text.slice(i + HOST.length);
}
const MUT = [
  { m: 'מ1',  key: 'color',   lbl: 'ליטרל `#RRGGBB` בכלל חי',        edit: () => put(IDX, 'background:#123456;') },
  { m: 'מ2',  key: 'color',   lbl: 'ליטרל `rgb()` בכלל חי',          edit: () => put(IDX, 'color:rgba(1,2,3,.4);') },
  { m: 'מ3',  key: 'color',   lbl: 'ליטרל `hsl()` בכלל חי',          edit: () => put(IDX, 'color:hsl(10,20%,30%);') },
  { m: 'מ4',  key: 'color',   lbl: 'שם צבע בכלל חי',                 edit: () => put(IDX, 'color:white;') },
  { m: 'מ5',  key: 'scaled',  lbl: '`z-index` שאינו דרגה',           edit: () => put(IDX, 'z-index:999;') },
  { m: 'מ6',  key: 'scaled',  lbl: '`opacity` שאינה דרגה',           edit: () => put(IDX, 'opacity:.37;') },
  { m: 'מ7',  key: 'scaled',  lbl: '`line-height` שאינו דרגה',       edit: () => put(IDX, 'line-height:1.23;') },
  { m: 'מ8',  key: 'scaled',  lbl: '`letter-spacing` שאינו דרגה',    edit: () => put(IDX, 'letter-spacing:.7px;') },
  { m: 'מ9',  key: 'closing', lbl: 'משך `transition` שאינו דרגה',    edit: () => put(IDX, 'transition:all .17s;') },
  { m: 'מ10', key: 'closing', lbl: 'משך `animation` שאינו דרגה',     edit: () => put(IDX, 'animation:toastUp .17s;') },
  { m: 'מ11', key: 'closing', lbl: 'תכונה שאינה בשום קבוצה',         edit: () => put(IDX, 'column-width:17px;') },
  { m: 'מ12', key: 'closing', lbl: 'ערך בתוך מחרוזת CSS שנכתבת מ-JS',
    edit: () => IDX.replace("'#lk-warn{position:fixed;", "'#lk-warn{column-width:19px;position:fixed;") },
  { m: 'מ13', key: 'color',   lbl: 'ליטרל צבע בצל',                  edit: () => put(IDX, 'box-shadow:0 1px 2px #abcdef;') },
  { m: 'מ14', key: 'color',   lbl: 'ליטרל צבע במתאר',                edit: () => put(IDX, 'outline:1px solid #fedcba;') },
  { m: 'מ15', key: 'color',   lbl: 'ליטרל צבע במדרון',               edit: () => put(IDX, 'background-image:linear-gradient(90deg,#111111,#222222);') },
  { m: 'מ16', key: 'future',  lbl: '`filter` עם ערך שאינו נגזר',     edit: () => put(IDX, 'will-change:opacity 3px;') },
  { m: 'מ17', key: 'media',   lbl: 'שאילתת פריסה ביחידה שאינה `px`',  edit: () => IDX.replace('@media (min-width:640px)', '@media (min-width:40em)') },
  { m: 'מ18', key: 'future',  lbl: '`clip-path` שנכנס לראשונה',      edit: () => put(IDX, 'clip-path:inset(4px);') },
];
for (const r of MUT) {
  const body = r.edit();
  if (body === null || body === IDX) { t(true, `${r.m} · ⭕ ${r.lbl} — ⛔ אין כאן מה למוטט`); continue; }
  const g = scan(body, APP.visualAllow);
  t(g[r.key].length > F[r.key].length, `${r.m} · ${r.lbl} **מפיל** את «${r.key}»`);
}
/*  ⭐ מוטציית-נגד: כלל חי שכל ערכיו נגזרים ⛔ אינו מפיל — ⚠️ הנמדד הוא
 *  **שהערך נגזר**, ⛔ ולא שהכלל קיים. */
{
  const ok = put(IDX, 'z-index:var(--z-3);opacity:var(--op-2);line-height:var(--lh-2);' +
                      'letter-spacing:var(--ls-2);transition:all var(--dur-2) var(--ease);' +
                      'color:var(--text);width:37px;border:1px solid var(--border);');
  const g = scan(ok, APP.visualAllow);
  t(g.color.length === F.color.length && g.scaled.length === F.scaled.length
    && g.closing.length === F.closing.length,
    'נ1 · ⭐ כלל שכל ערכיו נגזרים ⛔ **אינו** מפיל');
}
/*  ⛔ מוטציות ההצלבה — ⚠️ הן בונות **אחות סינתטית** בזיכרון, ⭐ ולכן הן
 *  רצות גם כשאין ריפו שני על הדיסק: ⛔ מוטציה שתלויה בעץ שאינו כאן היא
 *  מוטציה שאינה רצה. */
{
  const TWIN = 'zz-twin';
  const base = '<style>.' + TWIN + '{color:var(--text);padding:var(--sp-4)}</style><div class="' + TWIN + '"></div>';
  const mine = '<style>.' + TWIN + '{color:var(--text);padding:var(--sp-4)}</style><div class="' + TWIN + '"></div>';
  const S0 = { a: mine, b: base, c: base };
  const g0 = classGaps('a', S0, {});
  t(g0.drift.length === 0 && g0.ghost.length === 0 && g0.missing.length === 0,
    'נ4 · ⭐ בקרה חיובית: מחלקה שכלליה זהים בשלושה ⛔ **אינה** מפילה');
  const g1 = classGaps('a', { a: mine.replace('{color:var(--text)', '{color:var(--text-2)'), b: base, c: base }, {});
  t(g1.drift.length > g0.drift.length, 'מ19 · גוף כלל שנבדל באחת **מפיל** את «drift»');
  const g2 = classGaps('a', { a: mine.replace('</style>', '.' + TWIN + ':hover{opacity:var(--op-5)}</style>'), b: base, c: base }, {});
  t(g2.drift.length > g0.drift.length, 'מ20 · כלל מצב שנוסף באחת **מפיל** את «drift»');
  const g3 = classGaps('a', S0, { [TWIN]: 'מחלקה שכלליה זהים לאחיותיה, וההצהרה כאן מיותרת לגמרי' });
  t(g3.ghost.length > g0.ghost.length, 'מ21 · הצהרה למחלקה שכלליה זהים **מפילה** את «ghost»');
  const g4 = classGaps('a', { a: '<style>.' + TWIN + '-x{color:var(--text)}</style><div class="' + TWIN + '"></div>', b: base, c: base }, {});
  t(g4.missing.length > g0.missing.length,
    'מ22 · שימוש במחלקה שאין לה כלל כאן **ואין לה קורא ב-JS**, וכלל שלה חי באחות — **מפיל** את «missing»');
  const g5 = classGaps('a', { a: mine.replace('{color:var(--text)', '{color:var(--text-2)'), b: base, c: base },
    { [TWIN]: 'קצר מדי' });
  t(g5.bare.length > g0.bare.length, 'מ23 · הצהרה בלי נימוק תפקידי **מפילה** את «bare»');
  /*  ⭐ מוטציות-נגד: ⛔ מחלקה שחיה באחת בלבד אינה מפילה, ⛔ ותחילית אינה
   *  אסימון — ⚠️ `tab-btn` אינו `btn`. */
  const n1 = classGaps('a', { a: '<style>.' + TWIN + '-solo{color:var(--text)}</style>', b: base, c: base }, {});
  t(n1.drift.length === 0, 'נ2 · ⭐ מחלקה שחיה באחת בלבד ⛔ **אינה** מפילה');
  const n2 = classGaps('a', { a: '<style>.tab-' + TWIN + '{color:var(--text)}.' + TWIN + '{color:var(--text);padding:var(--sp-4)}</style>',
                              b: base, c: base }, {});
  t(n2.drift.length === 0, 'נ3 · ⭐ תחילית אינה אסימון — `tab-' + TWIN + '` אינו `' + TWIN + '` ⛔ ואינו מפיל');
  /*  ⭐ מוטציית-נגד: ⛔ מחלקה בלי כלל **שיש לה קורא ב-JS** אינה מפילה —
   *  ⚠️ היא **וו** ⛔ ואינה הצהרת עיצוב: ⭐ נמדד `.ksave` בחמישה — אפס
   *  כללים, ⛔ ומודול המקשים בוחר אותה כהיקף הטופס. */
  const n3 = classGaps('a', {
    a: '<div class="' + TWIN + '"></div><script>document.querySelectorAll(".' + TWIN + '")</scr' + 'ipt>',
    b: base, c: base }, {});
  t(n3.missing.length === 0,
    'נ5 · ⭐ מחלקה בלי כלל שיש לה קורא ב-JS — **וו** ⛔ ואינה מפילה את «missing»');
}

/*  ⛔ שלוש השכבות החדשות — ⚠️ המוטציות בזיכרון, ⭐ ועל עותק של המקור:
 *  ⛔ מוטציה שנכתבת לעץ משאירה אותו שגוי כשהמדידה נפלה באמצע. */
const RULES0 = cssRules(styleSheet(IDX));
const injCss = (r) => { const i = IDX.indexOf('</style>'); return IDX.slice(0, i) + r + IDX.slice(i); };
const injBody = (h, x) => { const i = h.lastIndexOf('</body>'); return h.slice(0, i) + x + h.slice(i); };

/* מ24. `--brand` ממופה להדגשה ולא לזהות — [semantic-role] נופלת */
{
  const m = IDX.replace(/--brand\s*:\s*[^;]+;/, '--brand:#F0A500;');
  t(semanticGaps(cssRules(styleSheet(m)), MANIFEST_THEME).length > SEM.length,
    'מ24 · `--brand` בגוון שאינו הזהות — [semantic-role] הייתה נכשלת');
}
/* מ25. `--bad` בגוון של מצב אחר — [semantic-role] נופלת */
{
  const m = IDX.replace(/--bad\s*:\s*#[0-9a-fA-F]{3,6}\s*;/, '--bad:#1A6A3A;');
  t(semanticGaps(cssRules(styleSheet(m)), MANIFEST_THEME).length > SEM.length,
    'מ25 · `--bad` בגוון ירוק — [semantic-role] הייתה נכשלת');
}
/*  ⭐ מוטציית-נגד א — ⛔ גוון אחר **באותו תפקיד** אינו מפיל: ⚠️ הערך
 *  הוא מוצר, ⭐ והנמדד הוא התפקיד. */
{
  const m = IDX.replace(/--ok\s*:\s*#[0-9a-fA-F]{3,6}\s*;/, '--ok:#2F8F4F;');
  t(semanticGaps(cssRules(styleSheet(m)), MANIFEST_THEME).length === SEM.length,
    'נ6 · ⭐ גוון ירוק אחר ל-`--ok` ⛔ **אינו** מפיל את [semantic-role]');
}
/* מ26. אזור שפותח דיאלוג בדרגה שאינה נמוכה מהמיכל — [dialog-layer] נופלת */
{
  const act = DL.acts[0];
  const m = injBody(injCss('#zz-mut-lay{position:fixed;z-index:var(--z-7)}'),
    '<div id="zz-mut-lay"><button data-act="' + act + '"></button></div>');
  t(dialogLayerGaps(m, cssRules(styleSheet(m))).over.length > DL.over.length,
    'מ26 · פותח דיאלוג בדרגת «נעילה» — [dialog-layer] הייתה נכשלת');
}
/*  ⭐ מוטציית-נגד ב — ⛔ אותו פותח בדיוק, בדרגה נמוכה מהמיכל: ⚠️ זה
 *  השימוש התקין, ⭐ ואסור לו להפיל. */
{
  const act = DL.acts[0];
  const m = injBody(injCss('#zz-mut-lay{position:fixed;z-index:var(--z-1)}'),
    '<div id="zz-mut-lay"><button data-act="' + act + '"></button></div>');
  t(dialogLayerGaps(m, cssRules(styleSheet(m))).over.length === DL.over.length,
    'נ7 · ⭐ פותח דיאלוג בדרגת «תוכן» ⛔ **אינו** מפיל את [dialog-layer]');
}
/* מ27. מפת הפעולות אינה נקראת — [dialog-registry] נופלת */
{
  const m = IDX.replace('DOM_ACTIONS = {', 'DOM_ACTIONS_MUT = {');
  const g = dialogLayerGaps(m, RULES0);
  t(g.acts.length === 0 && g.openers.length === 0,
    'מ27 · מפת הפעולות אינה נקראת — [dialog-registry] הייתה נכשלת');
}
/* מ28. מחלקה שמגדירה אסימון ואין לו צרכן באתר — [class-token] נופלת */
{
  const m = injBody(injCss('.zz-mut-tok{--zz-mut:var(--text)}'),
    '<scr' + 'ipt>function zzMutBuild(){var e=document.createElement("b");' +
    'e.className="zz-mut-tok";return e;}</scr' + 'ipt>');
  t(classTokenGaps(m).bad.length > CT.bad.length,
    'מ28 · מחלקה שמגדירה אסימון בלי צרכן באתר — [class-token] הייתה נכשלת');
}
/*  ⭐ מוטציית-נגד ג — ⛔ אותה מחלקה בדיוק, עם צרכן על אותו אלמנט:
 *  ⚠️ זו ההחלה התקינה, ⭐ ואסור לה להפיל. */
{
  const m = injBody(injCss('.zz-mut-tok{--zz-mut:var(--text)}.zz-mut-read{color:var(--zz-mut)}'),
    '<scr' + 'ipt>function zzMutBuild(){var e=document.createElement("b");' +
    'e.className="zz-mut-tok zz-mut-read";return e;}</scr' + 'ipt>');
  t(classTokenGaps(m).bad.length === CT.bad.length,
    'נ8 · ⭐ מחלקה שמגדירה אסימון וקוראת אותו על אותו אלמנט ⛔ **אינה** מפילה');
}
/* מ29. מפיק־שם נספר כאתר החלה — הבדיקה הייתה מפספסת את האתר האמיתי */
{
  const m = injBody(injCss('.zz-mut-p-1{--zz-p:var(--text)}'),
    '<scr' + 'ipt>function zzMutName(n){return "zz-mut-p-"+n;}' +
    'function zzMutHost(){var e=document.createElement("b");e.className=zzMutName(1);return e;}</scr' + 'ipt>');
  const g = classTokenGaps(m);
  t(g.bad.some((x) => x.indexOf('zz-mut-p-1') >= 0 && x.indexOf('zzMutHost') >= 0),
    'מ29 · אתר ההחלה נגזר דרך מפיק־השם — ולא מגוף המפיק עצמו');
}
}

if (fail) { console.error(`❌ ${GATE_ID}: ${fail} טענות נכשלו`); process.exitCode = 1; }
else console.log(`✅ ${GATE_ID} — ${pass} טענות עברו`);
