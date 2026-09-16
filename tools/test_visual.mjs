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

   ⛔ **ומחלקה שקיימת ביותר מאפליקציה אחת נושאת את אותם מצבים** — ⚠️ `:hover`
   · `:focus` · `:active` · `:disabled`, ⭐ והשם נחתך מהגיליון **באסימון
   מלא**: ⛔ **והנמדד הוא נוכחות המצב** ⛔ ולא ערכיו.

   **מה אינו נאכף כאן:** ⚠️ **הערך שבשאילתת `@media`** — ⛔ הוא נמדד מול
   `BP_SCALE` בבודק היכולות, ⭐ וכאן נמדד **אוצר המילים** של השאילתה בלבד:
   ⛔ יחידה, תכונה וכיוון · ⚠️ **והגוון של אסימון** — ⛔ היחס נמדד בשורת
   ערכת הנושא, ⭐ וכאן נמדד רק שהערך **נגזר** מאסימון · ⚠️ **ודף האופליין
   שב-`sw`** — ⛔ הוא מסמך עצמאי שאין לו גישה לערכת האפליקציה ·
   ⚠️ **וערכי המצב של מחלקה משותפת** — ⛔ צבע · מיקום · גודל · ריווח:
   ⭐ הם מוצר, ⛔ ושורה שמפילה על מוצר מייצרת רשימת הצהרות שגדלה בכל
   שינוי עיצוב.
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
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [89, 105];

/*  ⛔ המרשם שהסורק מכריז — ⚠️ **מה נכנס**: שם הדפוס שהשער אוכף;
 *  ⛔ **ומה מפיל**: דפוס שאין לו מוטציה, ומוטציה שנוקבת בדפוס שאינו כאן.
 *  ⭐ **ולמה המבנה קיים**: בלעדיו דפוס נשחק בשקט — ⚠️ השער ממשיך להכריז
 *  עליו, ⛔ והוא כבר אינו נמדד. */
export const PATTERNS = ['color', 'scaled', 'closing', 'future', 'media', 'classes'];
export const MUTS = ['color', 'color', 'color', 'color', 'scaled', 'scaled', 'scaled',
                     'scaled', 'closing', 'closing', 'closing', 'closing', 'color',
                     'color', 'color', 'future', 'media', 'future',
                     'classes', 'classes'];

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
const FLOOR = { shared: 21, app: 0, appWhy: '' };
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


/* ── רכיב משותף מתנהג אותו דבר — המצבים מוצלבים בין הריפו ──────────────── */
/*  ⛔ השם נחתך מהגיליון **באסימון מלא** — ⚠️ `tab-btn` אינו `btn`,
 *  ⭐ ו-`mod-ic` אינו `mod`: ⛔ תפיסת תחילית הייתה מאחדת שני רכיבים
 *  שאינם אותו רכיב, ⚠️ והיא מה שכמעט הפיל את המדידה. */
const CLS_SEL = /^\.(-?[A-Za-z_][\w-]*)(:hover|:focus|:active|:disabled)?$/;
/*  ⛔ ארבעת המצבים — ⚠️ **מה נכנס**: המצב שבו רכיב מגיב למשתמש;
 *  ⛔ **ומה מפיל**: מצב שקיים באחת ואינו באחרת. ⭐ **ולמה המבנה קיים**:
 *  הנמדד הוא **התנהגות** ⛔ ולא מראה — ⚠️ וערכי המצב הם מוצר, ⭐ והם
 *  משתנים עם המסך שהרכיב יושב בו. */
const CLS_STATES = [':hover', ':focus', ':active', ':disabled'];

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
/*  ⛔ הפרופיל הוא **קבוצת המצבים** ⛔ ולא גוף הכלל — ⚠️ כפתור שמגיב
 *  באחת ואינו מגיב באחרת נקרא כתקלה, ⭐ **והמשתמש עובר ביניהן**: ⛔ וגוף
 *  הבסיס אינו נכנס כלל — ⚠️ הוא מיקום, צבע, גודל וריווח, ⭐ והם מוצר.
 *  ⚠️ **וההקשר נבלע** — ⛔ מצב שחי בתוך `@media` הוא מצב קיים: ⭐ שאילתה
 *  אינה התנהגות ⛔ אלא הרוחב שבו ההתנהגות חלה. */
function classStates(css) {
  const P = new Map();
  for (const r of cssRules(css))
    for (const one of r.sel.split(',')) {
      const m = CLS_SEL.exec(one.trim());
      if (!m) continue;
      const s = P.get(m[1]) || new Set();
      if (m[2]) s.add(m[2]);
      P.set(m[1], s);
    }
  return P;
}
/*  ⛔ החתימה היא הקבוצה בסדר קבוע — ⚠️ סדר הכללים בגיליון אינו מצב,
 *  ⭐ ושתי מחלקות שנושאות את אותם מצבים בסדר אחר הן אותה התנהגות. */
const stateSig = (s) => CLS_STATES.filter((x) => s.has(x)).join(' ');
/*  ⛔ המדידה היא הצלבת **נוכחות** בין כל הריפו שיש בהם את המחלקה —
 *  ⚠️ **מה נכנס**: המקור של כל אחת מהן; ⛔ **ומה מפיל**: מחלקה שקבוצת
 *  המצבים שלה כאן נבדלת מזו שבאחות. ⭐ **ולמה אין רוב פוטר**: הפער הוא
 *  בין שני הריפו, ⛔ ולא בין ריפו לקבוצה — ⚠️ וכל אחד מהם מדווח אותו
 *  אצלו, ⭐ עד שהמצבים מיושרים. ⛔ **ואין כאן הצלבת ערכים** — ⚠️ ערך
 *  המצב הוא מוצר, ⭐ ושורה שמפילה על מוצר מייצרת רשימת הצהרות שגדלה
 *  בכל שינוי עיצוב. */
function classStateGaps(me, srcByApp) {
  const P = {};
  for (const a of Object.keys(srcByApp)) P[a] = classStates(styleSheet(srcByApp[a]));
  const names = new Set();
  for (const p of Object.values(P)) for (const c of p.keys()) names.add(c);
  const out = [];
  for (const c of names) {
    const carriers = Object.keys(P).filter((a) => P[a].has(c));
    if (carriers.length < 2 || carriers.indexOf(me) < 0) continue;
    const mine = stateSig(P[me].get(c));
    const off = carriers.filter((a) => a !== me && stateSig(P[a].get(c)) !== mine);
    if (off.length)
      out.push(`.${c} [${mine || '—'}] ⟵ ` +
               off.map((a) => `${a} [${stateSig(P[a].get(c)) || '—'}]`).join(' · '));
  }
  return out.sort();
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
/*  ⛔ ריפו שאינו על הדיסק **מדווח בשמו** — ⚠️ ההצלבה שלא רצה נראית,
 *  ⭐ והתוצאה נספרת ככל תוצאה: ⛔ מונה שמדלג עליה מדווח חוסר שאינו קיים. */
{
  const g = CLS_AWAY.length ? null : classStateGaps(APP.app, CLS_SRC);
  t(g === null ? true : g.length === 0,
    g === null
      ? 'מחלקה משותפת שמצביה נבדלים — ⏭ ההצלבה בין הריפו לא רצה: ' +
        `${CLS_AWAY.join(' · ')} אינם על הדיסק לצד ${APP.app} ` +
        `(${CLS_HAVE.length} מתוך ${CLS_OTHERS.length}). ` +
        'מריצים את הסבב עם כל הריפו זה לצד זה'
      : `מחלקה משותפת שמצביה נבדלים — נמדדו ${g.length} והצפוי אפס` +
        (g.length ? ' · ' + g.slice(0, 6).join(' · ') +
         ' — מה עושים: מביאים את המצב החסר, או מסירים אותו משתיהן' : ''));
}

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
  const sheet = (extra) => '<style>.' + TWIN + '{color:var(--text);padding:var(--sp-4)}' +
    '.' + TWIN + ':hover{opacity:var(--op-5)}' + (extra || '') + '</style>';
  const S0 = { a: sheet(), b: sheet(), c: sheet() };
  const g0 = classStateGaps('a', S0);
  t(g0.length === 0, 'נ4 · ⭐ בקרה חיובית: אותה קבוצת מצבים בשלושה ⛔ **אינה** מפילה');
  const g1 = classStateGaps('a', { a: '<style>.' + TWIN + '{color:var(--text);padding:var(--sp-4)}</style>',
                                   b: sheet(), c: sheet() });
  t(g1.length > g0.length, 'מ19 · הסרת `:hover` ממחלקה משותפת באחת **מפילה** את «classes»');
  const g2 = classStateGaps('a', { a: sheet('.' + TWIN + ':disabled{opacity:var(--op-3)}'),
                                   b: sheet(), c: sheet() });
  t(g2.length > g0.length, 'מ20 · הוספת `:disabled` למחלקה משותפת באחת **מפילה** את «classes»');
  /*  ⭐ מוטציות-נגד: ⛔ ערך הוא מוצר — ⚠️ בגוף הבסיס ובתוך המצב כאחד:
   *  ⭐ הכפתור הצף בקצה המתחיל כאן ובקצה המסיים באחות **אינו** מפיל,
   *  ⛔ וגוון שנבדל אינו מפיל. */
  const n1 = classStateGaps('a', { a: sheet().replace('{color:var(--text);padding:var(--sp-4)}',
                                                      '{color:var(--text-2);inset-inline-start:var(--sp-6)}'),
                                   b: sheet(), c: sheet() });
  t(n1.length === 0, 'נ2 · ⭐ מיקום וצבע שנבדלים בגוף הבסיס ⛔ **אינם** מפילים');
  const n2 = classStateGaps('a', { a: sheet().replace(':hover{opacity:var(--op-5)}',
                                                      ':hover{opacity:var(--op-3);background:var(--bad-soft)}'),
                                   b: sheet(), c: sheet() });
  t(n2.length === 0, 'נ3 · ⭐ ערך **בתוך** המצב שנבדל ⛔ **אינו** מפיל');
  const n3 = classStateGaps('a', { a: sheet('.' + TWIN + '-solo:hover{opacity:var(--op-5)}'),
                                   b: sheet(), c: sheet() });
  t(n3.length === 0, 'נ5 · ⭐ מחלקה שחיה באחת בלבד ⛔ **אינה** מפילה');
  const n4 = classStateGaps('a', { a: sheet('.tab-' + TWIN + ':focus{outline:none}'),
                                   b: sheet(), c: sheet() });
  t(n4.length === 0, 'נ6 · ⭐ תחילית אינה אסימון — `tab-' + TWIN + '` אינו `' + TWIN + '` ⛔ ואינו מפיל');
}
}

if (fail) { console.error(`❌ ${GATE_ID}: ${fail} טענות נכשלו`); process.exitCode = 1; }
else console.log(`✅ ${GATE_ID} — ${pass} טענות עברו`);
