#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
   test_rowscan.mjs — כל קלט נופל על שורה אחת, וכל אכיפה כתובה בתקן (סבב 141)

   **מה נאכף:** ⛔ שתי שורות אינן נופלות על אותו קלט — ⚠️ probe זהה בית-לבית,
   והצהרת `APP` ששתי שורות נוקבות בה · ⛔ ושורה שכל אכיפתה נימוק
   כתוב אינה מסומנת תקין · ⭐ ושער שרץ ואין שורה שמצביעה עליו
   מוכרז בשמו ובנימוקו.

   **הנימוק המדוד:** ⚠️ שלוש סתירות נמצאו בשיחה ⛔ ולא בשער — ⭐ אסימון שפרש
   והוגדר מחדש · מפה שהייתה מנגנון שני · ⛔ ושתי שורות שחפפו.
   ⚠️ ו-188 שורות חיו זו לצד זו ⛔ בלי שאיש מדד אם שתיים סותרות.

   **מה יישבר בלעדיו:** ⛔ שתי שורות על אותה מדידה — ⚠️ אחת מהן משתנה, ⭐ והשנייה
   ממשיכה לתאר עולם שהשתנה: ⛔ ומי שקורא אותה מיישר לכיוון הלא נכון.

   **מה אינו נאכף כאן:** ⚠️ **האם התקן עצמו נכון** — ⛔ זו קריאת משמעות, ⭐ ונסרקת
   ידנית בכל סבב שנוגע · ⛔ ותוכן השורה, שנמדד בבודק התיעוד.
   ──────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS, COL_FIRST, COL_NOTE, ROW_CELLS } from './peers.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  sameProbeOk: [],
  sharedDecl: [],
  /*  ⛔ מפקד שאינו מפקד — ⚠️ **מה נכנס**: קטע טקסט שהמספר בו הוא
   *  שם של מבנה או תיאורו, והנימוק למה; ⛔ **ומה מפיל**: הכרזה שאין לה
   *  אתר בהיקף של מרשם. ⭐ **ולמה המבנה קיים**: הסריקה הפוכה
   *  תופסת גם מספר שהוא **שם**, ⚠️ והוא אינו מתיישן עם המרשם. */
  censusAllow: {},
  /*  ⛔ שער שרץ ואינו מצהיר שורה — ⚠️ **מה נכנס**: שם השער ⟵ הנושא
   *  שהוא מודד ולמה אינו מצהיר אותו; ⛔ **ומה מפיל**: שער בלי שורה
   *  ובלי הכרזה, והכרזה שאין לה שער. ⭐ **ולמה המבנה קיים**: אכיפה
   *  שאין לה שורה מפילה על טענה שאינה בתקן, ⚠️ ומי שנפל עליה אינו
   *  יודע איזו הוראה נשברה.
   *  ⛔ **והנימוק המשותף לכולם** — ⚠️ השורה שהשער מודד נאכפת ב-`MATRIX`
   *  שבבודק המרוכז, ⭐ ושני מרשמים לשורה אחת אינם מותרים: ⛔ שורה
   *  שמוצהרת גם ב-`ROWS` וגם ב-`MATRIX` מפילה כשורה שאינה במרשם. */
  gateNoRows: {
    'check-structure.mjs':       'המבנה הקנוני של הריפו — ⚠️ קיום הקבצים ומיקומם, ⛔ ואין לו שורה: ⭐ הטבלה מודדת תוכן ⛔ ולא נוכחות',
    'test_backup_policy.mjs':    'מדיניות הגיבויים במסד — ⚠️ נמדדת מול המסד החי, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_budget.mjs':           'תקציב התיעוד — ⚠️ ספירת השורות, ⛔ והשורות עצמן נאכפות בבודק התיעוד',
    'test_caps_build.mjs':       'חלק «מעטפת ומסד» של בודק היכולות — ⚠️ השורות שהוא מודד נגזרות מ-`MATRIX` שבבודק המרוכז',
    'test_caps_guard.mjs':       'חלק «קלט וניקוי» של בודק היכולות — ⚠️ השורות שהוא מודד נגזרות מ-`MATRIX` שבבודק המרוכז',
    'test_caps_ui.mjs':          'חלק «מסך ועיצוב» של בודק היכולות — ⚠️ השורות שהוא מודד נגזרות מ-`MATRIX` שבבודק המרוכז',
    'test_devid.mjs':            'מודול מזהה המכשיר — ⚠️ גוף המודול המשותף, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_hotwin.mjs':           'מודול החלון החם והשחזור המקומי — ⚠️ גוף המודול, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_icons.mjs':            'תוכן `icons/` ו-`design/` — ⚠️ הנכסים עצמם, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_idarg.mjs':            'העברת מזהה ל-DOM — ⚠️ הגוף אות-באות, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_ids.mjs':              'מודול מזהי הרשומות — ⚠️ גוף המודול המשותף, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_lists.mjs':            'שקילות שתי רשימות המודולים המשותפים — ⚠️ צד שני של אותה מדידה, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_lock.mjs':             'נעילת חוסר-הפעילות — ⚠️ גוף המודול המשותף אות-באות, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_md.mjs':               'שלד שלושת קובצי ה-md הנלווים — ⚠️ הפסקאות עצמן, ⛔ והשורות נאכפות בבודק התיעוד',
    'test_merge_pending.mjs':    'ליבת המיזוג והגנת ה-⏳ — ⚠️ גוף המודול המשותף, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_offline_login.mjs':    'כניסה אופליין מרובת-משתמשים — ⚠️ המסלול עצמו, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_pendflush.mjs':        'הניסיון החוזר ואישור ה-⏳ בריקון התור — ⚠️ גוף המודול, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_pull.mjs':             'מנגנון המשיכה המאוחד — ⚠️ גוף המודול, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_roles.mjs':            'מודל ההרשאות — ⚠️ המסלול עצמו, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_session.mjs':          'מודל הסשן — ⚠️ גוף המודול המשותף אות-באות, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_shell.mjs':            'החתימה על מעטפת ה-WebView — ⚠️ גוף המעטפת, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_stage_a.mjs':          'הגיבוי היומי ויומן הפעולות — ⚠️ גוף המודול המשותף, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_swcore.mjs':           'ליבת ה-service worker וקו הבסיס ההתנהגותי — ⚠️ גוף הקובץ, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_users_patch.mjs':      'נתיב העדכון החלקי למראת המשתמשים — ⚠️ המסלול עצמו, ⛔ והשורה עצמה ב-`MATRIX`',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [54, 50];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
/*  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ כל טענה שאין לה מה למדוד בריפו הזה
 *  נושאת שורת נימוק ⛔ ואינה מדולגת: ⭐ המספר זהה בכולן. */
const FLOOR = { shared: 8, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
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

/*  ⛔ הטבלה נקראת פעם אחת — ⚠️ **מה נכנס**: שורות הבלוק החתום;
 *  ⛔ **ומה מפיל**: שורה שאינה מתפרקת למספר העמודות שהמרשם
 *  גוזר. ⭐ **ולמה המבנה
 *  קיים**: חמש הבדיקות שכאן מודדות את **אותה** טבלה, ⛔ וקריאה נפרדת
 *  לכל אחת הייתה חמישה מצבים שיכולים להיבדל. */
function tableRows(md) {
  const ls = md.split('\n');
  const a = ls.findIndex((l) => /^<!--\s*SHARED:start\s+id="table"/.test(l));
  const b = ls.findIndex((l, i) => i > a && /^<!--\s*SHARED:end/.test(l));
  if (a < 0 || b < 0) return null;
  const out = [];
  for (const l of ls.slice(a, b)) {
    const m = /^\|\s*(\d+)\s*\|/.exec(l);
    if (!m) continue;
    const c = l.split('|');
    out.push({ n: Number(m[1]), name: (c[2] || '').trim(), std: c[3] || '',
               marks: c.slice(COL_FIRST, COL_NOTE).map((x) => (x || '').trim()),
               note: (c[COL_NOTE] || '').trim() });
  }
  return out;
}

/*  ⛔ שני המרשמים נקראים מהבודק — ⚠️ `MATRIX` נושא probe לכל שורה,
 *  ⛔ ו-`GATES` נושא שם טענה או נימוק כתוב: ⭐ ושורה שאינה באף אחד מהם
 *  היא שורה שאיש אינו מודד. */
function registries(src) {
  const mx = /const MATRIX = \[([\s\S]*?)\n\];/.exec(src);
  const gb = /const GATES = \{([\s\S]*?)\n\};/.exec(src);
  const entries = [];
  if (mx) for (const m of mx[1].matchAll(/\{\s*row:\s*(\d+),[\s\S]{0,200}?probe:\s*\(\)\s*=>\s*([^\n]*)/g))
    entries.push({ row: Number(m[1]), probe: m[2].trim().replace(/[,}]\s*$/, '').trim() });
  const gates = {};
  if (gb) {
    const ls = gb[1].split('\n');
    for (let i = 0; i < ls.length; i++) {
      const km = /^(\s*)(\d+):/.exec(ls[i]);
      if (!km) continue;
      let d = 0, j = i, body = [];
      do { const t = ls[j]; body.push(t);
           for (const ch of t) { if (ch === '{' || ch === '[') d++; if (ch === '}' || ch === ']') d--; }
           j++; } while (d > 0 && j < ls.length);
      gates[Number(km[2])] = body.join('\n');
      i = j - 1;
    }
  }
  return { entries, gates };
}

/*  ⛔ מרשם הדפוסים והמוטציות — ⚠️ **מה נכנס**: שם כל דפוס שהשער מכריז,
 *  ⛔ ושם כל דפוס שיש לו מוטציה; ⛔ **ומה מפיל**: דפוס בלי מוטציה,
 *  ומוטציה בלי דפוס. ⭐ **ולמה המבנה קיים**: הוא מה שמאפשר להצליב
 *  את השער מבחוץ — ⛔ דפוס בלי מוטציה נשחק בשקט. */

/*  ⛔ אות הקטגוריה נגזרת ⛔ ואינה מוקלדת — ⚠️ **והמרשמים המותרים לה
 *  שניים**: `CAT_ORDER` שמצהיר את סדר הפנים, ו-`PART_CATS` שמשייך
 *  קטגוריה לשער; ⭐ **ומעליהם `HEB_ORD`**, ⛔ שהוא המנגנון שגוזר את
 *  האות מהמספר ⛔ ואינו מקליד אותה.
 *  ⛔ **ואות שמוקלדת בגוף שער נשברת בכל הסטה** — ⚠️ קטגוריה שיורדת
 *  מסיטה את כל הבאות אחריה, ⭐ והאות שהוקלדה נשארת מצביעה על הקודמת.
 *  ⛔ **והמדידה על המקור הגולמי** — ⚠️ **הלבנה מוחקת בדיוק את מה
 *  שהוא סורק**: ⭐ אות הקטגוריה חיה כליטרל מחרוזת, ⛔ ומקור מולבן היה
 *  מחזיר אפס תמיד — ⚠️ וזה probe שאינו יכול להיכשל. */
function catLiteralGaps(src) {
  const CAT = /^(?:[א-ט]|י[א-ט]?|[כלמנסעפצ])$/;
  const w = src;
  const spans = [];
  for (const head of ['const CAT_ORDER = [', 'const PART_CATS = {', 'const HEB_ORD = (']) {
    const i = w.indexOf(head);
    if (i < 0) return ['מרשם מוצהר שאינו קיים: ' + head];
    const o = Math.max(w.indexOf('[', i + head.length - 1), w.indexOf('{', i + head.length - 1));
    const open = head.endsWith('[') ? w.indexOf('[', i) : (head.endsWith('{') ? w.indexOf('{', i) : w.indexOf('{', i));
    const oc = w[open], cl = oc === '[' ? ']' : '}';
    let d = 0, e = -1;
    for (let j = open; j < w.length; j++) {
      if (w[j] === oc) d++;
      else if (w[j] === cl && --d === 0) { e = j; break; }
    }
    if (e < 0) return ['מרשם שאינו מאוזן: ' + head];
    spans.push([open, e]);
  }
  const out = [];
  for (const m of w.matchAll(/'([א-ת]{1,2})'/g)) {
    if (!CAT.test(m[1])) continue;
    if (spans.some(([a, b]) => m.index > a && m.index < b)) continue;
    out.push('שורה ' + w.slice(0, m.index).split('\n').length + ': «' + m[1] + '»');
  }
  return out;
}


/*  ⛔ מרשם המרשמים — ⚠️ **מה נכנס**: שם ההכרזה, הקובץ שבו היא חיה, והשמות
 *  העבריים של מה שהיא מונה; ⛔ **ומה מפיל**: הכרזה שאין לה אתר חי בקובץ
 *  שהוצהר. ⭐ **ולמה המבנה קיים**: המפקד נסרק **הפוך** — ⚠️ הרשימה נבנית
 *  מהמרשמים עצמם, ⛔ ולא מרשימת ניסוחים ידועים שמישהו הקליד. */
const REGISTRIES = [
  { id: 'PEERS', src: 'peers', nouns: ['אפליקציות', 'אפליקציה', 'ריפו', 'אחיות'] },
  { id: 'CAT_ORDER', src: 'cap', nouns: ['קטגוריות', 'קטגוריה'] },
  { id: 'MATRIX', src: 'cap', nouns: ['שורות', 'שורה'] },
  { id: 'GATES', src: 'cap', nouns: ['שערים', 'שער'] },
  { id: 'SHARED', src: 'sets', nouns: ['קבצים', 'קובץ'] },
];
/*  ⛔ מילות המספר בעברית ובספרות — ⚠️ צורת הנפרד וצורת הנסמך כאחת, ⭐ והגבול
 *  הוא «התו הבא אינו אות עברית» ⛔ ולא `\b`: ⚠️ `\b` צמוד לאות עברית אינו
 *  גבול-מילה, ⭐ והוא probe שאינו יכול להיכשל. */
const HEB_NUM = ['אחת', 'אחד', 'שתי', 'שתיים', 'שני', 'שלוש', 'שלושה', 'שלושת',
                 'ארבע', 'ארבעה', 'ארבעת', 'חמש', 'חמישה', 'חמשת', 'שש', 'שישה',
                 'ששת', 'שבע', 'שבעה', 'שבעת', 'שמונה', 'שמונת', 'תשע', 'תשעה',
                 'תשעת', 'עשר', 'עשרה', 'עשרת'];
const HEB_TAIL = '(?![\\u0590-\\u05FF])';
const NUM_RE = () => new RegExp('(?:\\d+|(?:' + HEB_NUM.join('|') + '))' + HEB_TAIL, 'g');
/*  ⛔ צורת נסמך עם כינוי חבור — «כולן» · «שלושתם» — ⚠️ היא מונה את
 *  האפליקציות **בלי שם עצם כלל**, ⭐ ולכן היא מפקד בפני עצמה: ⛔ והיא בדיוק
 *  מה שנשבר ביום שנוספת אפליקציה. */
const BOUND_RE = () => new RegExp('(?:שלושת|ארבעת|חמשת|ששת|שבעת|שמונת|תשעת|עשרת)[ןם]' + HEB_TAIL, 'g');

/*  ⛔ ההיקף הוא **ההכרזה ובלוק ההערה שצמוד לה** — ⚠️ שם נכתב «כמה יש»,
 *  ⭐ ושם הוא מתיישן: ⛔ והחזרה היא מחרוזת ריקה כשההכרזה אינה קיימת,
 *  ⚠️ וזה הצד השני שהטענה מודדת. */
function declSpan(src, id) {
  const m = new RegExp('(?:^|\\n)(?:export )?(?:const|let|var) ' + id + '\\s*=').exec(src);
  if (!m) return '';
  let at = m.index + (src[m.index] === '\n' ? 1 : 0);
  const head = src.slice(0, at);
  const cm = head.lastIndexOf('/*');
  if (cm >= 0 && /^\/\*[\s\S]*\*\/[ \t]*\n?[ \t]*$/.test(head.slice(cm))) at = cm;
  const nl = src.indexOf('\n', m.index + 1);
  return src.slice(at, nl < 0 ? src.length : nl);
}

/* ז · הכרזה שאין לה מרשם חי */
function registryGaps(c) {
  return REGISTRIES.filter((r) => !declSpan(c[r.src] || '', r.id))
                   .map((r) => `${r.id} (${r.src})`);
}

/* ח · מפקד מוקלד בהיקף של מרשם */
function censusGaps(c) {
  const out = [];
  const allow = Object.keys(APP.censusAllow || {});
  for (const r of REGISTRIES) {
    const txt = declSpan(c[r.src] || '', r.id);
    if (!txt) continue;
    const num = NUM_RE();
    let m;
    while ((m = num.exec(txt)) !== null) {
      const rest = txt.slice(m.index + m[0].length).replace(/^[\s־-]+/, '');
      if (!r.nouns.some((n) => new RegExp('^(?:ה|ב|ל|מ|ו)?' + n + HEB_TAIL).test(rest))) continue;
      const hit = txt.slice(m.index, m.index + 40).split('\n')[0];
      if (allow.some((a) => hit.indexOf(a) >= 0)) continue;
      out.push(`${r.id}: «${hit.trim()}»`);
    }
    const bnd = BOUND_RE();
    while ((m = bnd.exec(txt)) !== null) {
      const hit = txt.slice(Math.max(0, m.index - 14), m.index + m[0].length);
      if (allow.some((a) => hit.indexOf(a) >= 0)) continue;
      out.push(`${r.id}: «${hit.trim().split('\n').pop()}»`);
    }
  }
  return out;
}

/* ח · והצד השני — הכרזה בהיתר שאין לה אתר חי */
function censusAllowGaps(c) {
  const body = REGISTRIES.map((r) => declSpan(c[r.src] || '', r.id)).join('\n');
  return Object.keys(APP.censusAllow || {}).filter((a) => body.indexOf(a) < 0);
}

export const PATTERNS = ['א', 'ב+ג', 'ד', 'ה', 'ו', 'ז', 'ח'];
export const MUTS = ['א', 'ב+ג', 'ד', 'ה', 'ו', 'ז', 'ח'];

/*  ⛔ כל בדיקה היא **פונקציה טהורה של טקסט** — ⚠️ היא מקבלת את התוכן
 *  כארגומנט, ⭐ ולכן המוטציות רצות בזיכרון: ⛔ שער שמודד טקסט ומריץ
 *  תהליך לכל מוטציה משלם על מה שאינו צריך, ⚠️ והזמן נגזר ממספרן. */
const CTX = () => ({
  md: rd('CLAUDE.md'),
  cap: rd('tools/check-capabilities.mjs'),
  peers: rd('tools/peers.mjs'),
  sets: rd('tools/test_filesets.mjs'),
  js: rd('tools/check-js.mjs'),
  rows: Object.fromEntries(fs.readdirSync(path.join(ROOT, 'tools'))
    .filter((x) => x.endsWith('.mjs'))
    .map((f) => [f, (/export const ROWS = \[([^\]]*)\]/.exec(rd('tools/' + f)) || [, ''])[1]])),
});

/* א · שתי שורות שה-probe שלהן נופל על אותו קלט */
function dupProbe(c) {
  const { entries } = registries(c.cap);
  const by = {};
  for (const e of entries) {
    const k = e.probe.replace(/\s+/g, '');
    if (!k || k === '{' || k.length < 4) continue;
    (by[k] = by[k] || new Set()).add(e.row);
  }
  return Object.entries(by).filter(([, v]) => v.size > 1)
    .map(([k, v]) => `${[...v].sort((x, y) => x - y).join('+')} → ${k.slice(0, 40)}`)
    .filter((s) => !APP.sameProbeOk.includes(s.split(' → ')[0]));
}

/* ב+ג · הצהרה אחת ⟵ שורה אחת */
function clashDecl(c) {
  const rows = tableRows(c.md) || [];
  const owner = {};
  for (const r of rows)
    for (const m of r.std.matchAll(/`APP\.([A-Za-z_$][\w$]*)`/g))
      (owner[m[1]] = owner[m[1]] || new Set()).add(r.n);
  return Object.entries(owner)
    .filter(([k, v]) => v.size > 1 && !APP.sharedDecl.includes(k))
    .map(([k, v]) => `APP.${k} → ${[...v].sort((x, y) => x - y).join('+')}`);
}

/* ד · שורה שאכיפתה נימוק כתוב ⛔ ומסומנת תקין — ⚠️ «נימוק» אינו «נמדד» */
function falseGreen(c) {
  const rows = tableRows(c.md) || [];
  const { entries, gates } = registries(c.cap);
  const probed = new Set(entries.map((e) => e.row));
  const inRows = new Set();
  for (const v of Object.values(c.rows))
    String(v).split(',').map((x) => Number(x.trim())).filter(Boolean).forEach((n) => inRows.add(n));
  return rows.filter((r) => !probed.has(r.n) && !inRows.has(r.n) &&
                            /manual:/.test(gates[r.n] || '') &&
                            r.marks.some((x) => x === '✅'))
             .map((r) => `${r.n} «${r.name}»`);
}

/* ה · אכיפה שאין לה שורה */
function silentGates(c) {
  const wired = [...((/gates: \[([\s\S]*?)\],/.exec(c.js) || ['', ''])[1])
    .matchAll(/'([a-z_-]+)\.mjs'/g)].map((m) => m[1] + '.mjs');
  const silent = wired.filter((g) => g in c.rows &&
    String(c.rows[g]).split(',').map((x) => x.trim()).filter(Boolean).length === 0);
  return {
    silent,
    undeclared: silent.filter((g) => !APP.gateNoRows[g]),
    ghost: Object.keys(APP.gateNoRows).filter((g) => !silent.includes(g)),
    bare: Object.entries(APP.gateNoRows).filter(([, w]) => !w || String(w).trim().length < 12).map(([g]) => g),
  };
}

const C0 = CTX();
t(!!tableRows(C0.md) && tableRows(C0.md).length > 0,
  `טבלת התשתית נקראה — נמדדו ${(tableRows(C0.md) || []).length} שורות והצפוי לפחות אחת`);
{
  const g = dupProbe(C0);
  t(g.length === 0, `א · אין שתי שורות על אותו probe — נמדדו ${g.length} והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. ממזגים, או נותנים לכל שורה מדידה משלה` : ''));
}
{
  const g = clashDecl(C0);
  t(g.length === 0, `ב+ג · הצהרה אחת לשורה אחת — נמדדו ${g.length} והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. מסירים את האזכור מהשורה שאינה הבעלים` : ''));
}
{
  const g = falseGreen(C0);
  t(g.length === 0, `ד · שורה שאכיפתה נימוק כתוב אינה מסומנת תקין — נמדדו ${g.length} והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. מסמנים ⭕ עם «אינו ניתן לאכיפה», או בונים אכיפה` : ''));
}
{
  const s = silentGates(C0);
  const bad = s.undeclared.length + s.ghost.length + s.bare.length;
  t(bad === 0, `ה · אכיפה שאין לה שורה — נמדדו ${s.undeclared.length} בלי הכרזה, ` +
    `${s.ghost.length} הכרזות בלי מקרה, ${s.bare.length} בלי נימוק; והצפוי אפס` +
    (bad ? `: ${[...s.undeclared, ...s.ghost, ...s.bare].slice(0, 10).join(' · ')}. ` +
           'מצהירים ב-`ROWS` את השורה שהשער אוכף, או מכריזים עם נימוקו'
         : ` (${s.silent.length} שערים מוכרזים)`));
}

/*  ⛔ טענה ו — אות הקטגוריה נגזרת: ⚠️ היא הצד השני של «שער אינו מקליד
 *  מספר שורה», ⭐ והאות נשברת בהסטה בדיוק כמו המספר. */
{
  const g = catLiteralGaps(rd('tools/check-capabilities.mjs'));
  t(g.length === 0, g.length
    ? 'ו · אות קטגוריה שהוקלדה מחוץ למרשמים: ' + g.join(' · ') +
      '. נמדדו ' + g.length + ' והצפוי אפס. גוזרים את האות מן המרשמים המוצהרים'
    : 'ו · אות הקטגוריה נגזרת — אפס אותיות מוקלדות מחוץ לשני המרשמים ולמנוע הגזירה');
}

/*  ⛔ ז — הכרזת מרשם שאין לה אתר חי: ⚠️ זה הצד השני של הסריקה ההפוכה,
 *  ⭐ ובלעדיו מרשם ששמו הוסב היה מוציא את עצמו מהמדידה בשקט. */
{
  const g = registryGaps(C0);
  t(g.length === 0, `ז · כל מרשם מוכרז חי בקובץ שהוצהר — נמדדו ${g.length} בלי הכרזה חיה והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. מיישרים את שם ההכרזה, או מסירים אותה מהמרשם` : ''));
}
/*  ⛔ ח — מפקד מוקלד בהיקף של מרשם: ⚠️ המספר שנכתב ליד מה שהוא מונה
 *  מתיישן ביום שהמרשם משתנה, ⭐ ואיש אינו חוזר לעדכן אותו: ⛔ והסריקה
 *  הפוכה — היא נבנית מהמרשמים ⛔ ולא מרשימת ניסוחים ידועים. */
{
  const g = censusGaps(C0), a = censusAllowGaps(C0);
  t(g.length + a.length === 0,
    `ח · מפקד נגזר ואינו מוקלד — נמדדו ${g.length} מפקדים מוקלדים ו-${a.length} היתרים בלי אתר, והצפוי אפס` +
    (g.length + a.length ? `: ${[...g, ...a].slice(0, 8).join(' · ')}. גוזרים את המספר מהמרשם, או מכריזים ב-\`APP.censusAllow\` עם נימוקו` : ''));
}

mutStage();
if (RUN_MUT) {
  /*  ⛔ המוטציות בזיכרון — ⚠️ כל אחת מוסרת טקסט שונה לאותה פונקציה,
   *  ⭐ ואינה כותבת לעץ ⛔ ואינה פותחת תהליך. */
  const firstRow = (tableRows(C0.md) || [])[0];
  const MUT = [
    /*  ⛔ המוטציה משכפלת **שורת רשומה שלמה** ⛔ ואינה מרכיבה probe מטקסט —
     *  ⚠️ probe שנחלץ ומולחם מחדש עלול להיחתך אחרת בפרסור, ⭐ והמוטציה
     *  הייתה מדווחת «לא נפל» על מנגנון תקין. */
    { m: 'מ1', lbl: 'שתי שורות על אותו probe', claim: 'א',
      run: () => {
        const line = C0.cap.split('\n').find((l) =>
          /^\s*\{ row: \d+, name: '[^']*', probe: \(\) => .*\},$/.test(l));
        if (!line) return null;
        const twin = line.replace(/row: \d+/, 'row: 999');
        return dupProbe({ ...C0, cap: C0.cap.replace(line, line + '\n' + twin) }).length >
               dupProbe(C0).length;
      } },
    { m: 'מ2', lbl: 'הצהרה ששתי שורות נוקבות בה', claim: 'ב+ג',
      /*  ⛔ שם ההצהרה נבחר **מהטבלה** ⛔ ואינו מוקלד — ⚠️ שם מוקלד היה
       *  נספר בעצמו כקריאה חיה בסורק ההצהרות, ⭐ ומדווח על השער הזה. */
      run: () => {
        const rows = tableRows(C0.md) || [];
        const own = {};
        for (const r of rows)
          for (const m of r.std.matchAll(/`APP\.([A-Za-z_$][\w$]*)`/g))
            (own[m[1]] = own[m[1]] || new Set()).add(r.n);
        const solo = Object.keys(own).find((k) => own[k].size === 1);
        const host = rows.find((r) => !own[solo].has(r.n) && r.std.length > 40);
        if (!solo || !host) return null;
        const line = C0.md.split('\n').find((l) =>
          new RegExp('^\\|\\s*' + host.n + '\\s*\\|').test(l));
        const hurt = line.replace(host.std, host.std + ' · `APP' + '.' + solo + '`');
        return clashDecl({ ...C0, md: C0.md.replace(line, hurt) }).length > clashDecl(C0).length;
      } },
    /*  ⛔ המועמדת נבחרת לפי **התוצאה** ⛔ ולא לפי התנאי לבדו — ⚠️ שורה
     *  שמוצהרת ב-`ROWS` של שער אינה נספרת ב-`falseGreen`, ⭐ ובחירה בה
     *  הייתה מדווחת «לא נפל» על מנגנון תקין. */
    { m: 'מ3', lbl: 'שורה שאכיפתה נימוק כתוב מסומנת תקין', claim: 'ד',
      run: () => {
        const { entries, gates } = registries(C0.cap);
        const base = falseGreen(C0).length;
        for (const r of tableRows(C0.md) || []) {
          if (entries.some((e) => e.row === r.n)) continue;
          if (!/manual:/.test(gates[r.n] || '')) continue;
          if (!r.marks.length || !r.marks.every((x) => x === '⭕')) continue;
          const line = C0.md.split('\n').find((l) => new RegExp('^\\|\\s*' + r.n + '\\s*\\|').test(l));
          if (!line) continue;
          if (falseGreen({ ...C0, md: C0.md.replace(line, line.replace('⭕', '✅')) }).length > base)
            return true;
        }
        return null;
      } },
    { m: 'מ4', lbl: 'שער בלי שורה ובלי הכרזה', claim: 'ה',
      run: () => {
        const g = silentGates(C0).silent[0];
        if (!g) return null;
        const saved = APP.gateNoRows[g]; delete APP.gateNoRows[g];
        const bad = silentGates(C0).undeclared.length > 0;
        APP.gateNoRows[g] = saved;
        return bad;
      } },
  ];
  for (const r of MUT) {
    const got = r.run();
    if (got === null) { t(true, `${r.m} · ⭕ ${r.lbl} — ⛔ אין כאן מה למוטט`); continue; }
    t(got === true, `${r.m} · ${r.lbl} **מפיל** את «${r.claim}»`);
  }
  /*  ⛔ מוטציה ו · אות שהוקלדה בגוף שער — ⚠️ בזיכרון, ⭐ והיא בדיוק מה
   *  שנשבר בכל הסטת קטגוריה. */
  {
    const src = rd('tools/check-capabilities.mjs')
      .replace('const CAT_ORDER = [', "const ZZ_TYPED = 'ט';\nconst CAT_ORDER = [");
    t(catLiteralGaps(src).length > 0, 'ו · אות שהוקלדה בגוף שער **מפילה** את «אות הקטגוריה נגזרת»');
  }
  /*  ⭐ מוטציית-נגד: קטגוריה חדשה **בסוף** המרשם ⛔ אינה מפילה — ⚠️ היא
   *  נכנסת לתוך המרשם, ⭐ שהוא המקום המותר. */
  {
    const src = rd('tools/check-capabilities.mjs')
      .replace("'test_caps_guard':    ['ט', 'י', 'יא'],", "'test_caps_guard':    ['ט', 'י', 'יא', 'יב'],");
    t(catLiteralGaps(src).length === 0, 'נ2 · קטגוריה חדשה בסוף המרשם — ⛔ אינה מפילה');
  }
  /*  ⭐ מוטציית-נגד: שינוי ניסוח בשם שורה ⛔ אינו מפיל — ⚠️ הנמדד הוא
   *  **המבנה** ⛔ ולא הטקסט שהשורה נושאת. */
  const renamed = firstRow
    ? C0.md.replace('| ' + firstRow.n + ' | ' + firstRow.name,
                    '| ' + firstRow.n + ' | ' + firstRow.name + ' ')
    : C0.md;
  const c2 = { ...C0, md: renamed };
  /*  ⛔ מוטציית-נגד נמדדת מול **קו הבסיס** ⛔ ולא מול אפס — ⚠️ שער
   *  שיש לו ממצא פתוח היה מדווח «הנגד הפילה», ⭐ והנמדד הוא שהשינוי
   *  אינו **מוסיף** ממצא. */
  t(dupProbe(c2).length === dupProbe(C0).length &&
    clashDecl(c2).length === clashDecl(C0).length &&
    falseGreen(c2).length === falseGreen(C0).length,
    'נ1 · ניסוח שם שורה שהשתנה — ⛔ אינו מוסיף ממצא');

  /*  ⛔ מפקד מוקלד — ⚠️ כל מוטציה מזריקה בלוק הערה **צמוד** להכרזת מרשם,
   *  ⭐ שהוא ההיקף שהטענה מודדת: ⛔ והן בזיכרון ⛔ ואינן נוגעות בעץ. */
  const CMUT = [
    { m: 'מ5', lbl: 'מספר האפליקציות מוקלד', src: 'peers',
      at: 'export const PEERS = [', txt: '/*  ⛔ ארבע אפליקציות — וזה מה שאסור. */\n' },
    { m: 'מ6', lbl: 'צורת נסמך שמונה את האפליקציות', src: 'peers',
      at: 'export const PEERS = [', txt: '/*  ⛔ הרשימה זהה בארבע' + 'תן — וזה מה שאסור. */\n' },
    { m: 'מ7', lbl: 'מספר הקטגוריות מוקלד', src: 'cap',
      at: 'const CAT_ORDER = [', txt: '/*  ⛔ שבע קטגוריות — וזה מה שאסור. */\n' },
    { m: 'מ8', lbl: 'ספירה של אירוע שחלף', src: 'cap',
      at: 'const MATRIX = [', txt: '/*  ⛔ נמדדו 57 שורות פגומות — וזה מה שאסור. */\n' },
  ];
  for (const r of CMUT) {
    const c2 = { ...C0, [r.src]: C0[r.src].replace(r.at, () => r.txt + r.at) };
    t(censusGaps(c2).length > censusGaps(C0).length,
      `${r.m} · ${r.lbl} **מפיל** את «ח»`);
  }
  /*  ⭐ מוטציית-נגד: מספר שהוא **שם של מבנה** ⛔ אינו מפקד — ⚠️ הוא אינו
   *  מונה מרשם, ⭐ ואינו משתנה איתו: ⛔ ושער שמפיל עליו מלמד לכתוב פחות. */
  const ANTI = [
    { m: 'נ3', lbl: 'ארבעה ממדים', src: 'peers',
      at: 'export const PEERS = [', txt: '/*  ⛔ ארבעה ממדים — וזה מותר. */\n' },
    { m: 'נ4', lbl: 'שלוש פתיחות', src: 'cap',
      at: 'const CAT_ORDER = [', txt: '/*  ⛔ שלוש פתיחות — וזה מותר. */\n' },
  ];
  for (const r of ANTI) {
    const c2 = { ...C0, [r.src]: C0[r.src].replace(r.at, () => r.txt + r.at) };
    t(censusGaps(c2).length === censusGaps(C0).length,
      `${r.m} · «${r.lbl}» ⛔ אינו מפיל את «ח»`);
  }
  /*  ⛔ מוטציה: שם מרשם שהוסב — ⚠️ ההכרזה נשארת במרשם, ⭐ והאתר החי נעלם. */
  {
    const c2 = { ...C0, sets: C0.sets.replace('const SHARED = [', () => 'const SHARED_SET = [') };
    t(registryGaps(c2).length > registryGaps(C0).length,
      'מ9 · שם מרשם שהוסב **מפיל** את «ז»');
  }
}

if (fail) {
  console.error(`\n❌ ${GATE_ID}: ${fail} כשלים מתוך ${pass + fail}`);
  process.exit(1);
}
console.log(`\n✅ ${GATE_ID}: ${pass} טענות`);
