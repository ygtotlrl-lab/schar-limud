#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
   test_rowscan.mjs — כל קלט נופל על שורה אחת, וכל אכיפה כתובה בתקן

   **מה נאכף:** ⛔ שתי שורות אינן נופלות על אותו קלט — ⚠️ probe זהה בית-לבית,
   והצהרת `APP` ששתי שורות נוקבות בה · ⛔ ושורה שכל אכיפתה נימוק
   כתוב אינה מסומנת תקין · ⭐ ושער שרץ ואין שורה שמצביעה עליו
   מוכרז בשמו ובנימוקו · ⛔ ו-⭕ נושא תקן על הקוד ⚠️ ולא כלל עבודה.

   **הנימוק המדוד:** ⚠️ שלוש סתירות נמצאו בשיחה ⛔ ולא בשער — ⭐ אסימון שפרש
   והוגדר מחדש · מפה שהייתה מנגנון שני · ⛔ ושתי שורות שחפפו.
   ⚠️ ו-188 שורות חיו זו לצד זו ⛔ בלי שאיש מדד אם שתיים סותרות.

   **מה יישבר בלעדיו:** ⛔ שתי שורות על אותה מדידה — ⚠️ אחת מהן משתנה, ⭐ והשנייה
   ממשיכה לתאר עולם שהשתנה: ⛔ ומי שקורא אותה מיישר לכיוון הלא נכון.

   **מה אינו נאכף כאן:** ⚠️ **האם התקן עצמו נכון** — ⛔ זו קריאת משמעות, ⭐ ונסרקת
   ידנית בכל סבב שנוגע · ⛔ ותוכן השורה, שנמדד בבודק התיעוד · ⚠️ ושורה
   שנושאה תקן וניסוחה כלל עבודה — ⛔ אין לה סימן בטקסט, ⭐ ונסרקת ידנית.
   ──────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS, COL_FIRST, COL_NOTE, ROW_CELLS } from './peers.mjs';
import { whitenJs } from './whiten.mjs';
import { FACTS } from './app-facts.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  /*  ⛔ הסעיפים שאינם נאכפים בשורה ⭕ — ⚠️ **מה נכנס**: מספר השורה ⟵ ציטוט
   *  כל סעיף שאינו נאכף, כפי שהוא בתקן של אותה שורה; ⛔ **ומה מפיל**: ציטוט
   *  שאינו בהערה, ציטוט שאינו בתקן, שורה «בחלקו» בלי הכרזה, והכרזה בלי שורה.
   *  ⭐ **ולמה המבנה קיים**: נימוק שמונה סעיף אחד ומשמיט שני מסתיר סעיף פרוץ
   *  בתוך שורה שנראית מוכרעת, ⛔ ואיש לא יחפש אותו. */
  gapClauses: {
    33: ['שני שערים על אותו נושא'],
    51: ['**וההערה מסבירה למה**', '**וספירה שנמדדה בכלי חיצוני היא ספירת אירוע**'],
    115: ['יופתע'],
    126: ['סטייה מדפוס'],
    228: ['והניסיון החוזר נעצר'],
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [58, 52, 54, 53, 55, 57];

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
const FLOOR = { shared: 12, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו.
 *  ⛔ **ושומר הרקורסיה הוא ריצת-משנה אף הוא** — ⚠️ הסט רץ שם על **עותק
 *  סינתטי** שאין לצידו אחיות ואין בו `.git`, ⭐ ולכן שער שמשווה מול אחות
 *  או קורא את סט המעקב מגיע לחלק מטענותיו **בכוונה**: ⛔ והריצפה נמדדת
 *  על עץ אמיתי ⛔ ולא שם. */
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.GATE_INNER;
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
  for (const r of REGISTRIES) {
    const txt = declSpan(c[r.src] || '', r.id);
    if (!txt) continue;
    const num = NUM_RE();
    let m;
    while ((m = num.exec(txt)) !== null) {
      const rest = txt.slice(m.index + m[0].length).replace(/^[\s־-]+/, '');
      if (!r.nouns.some((n) => new RegExp('^(?:ה|ב|ל|מ|ו)?' + n + HEB_TAIL).test(rest))) continue;
      const hit = txt.slice(m.index, m.index + 40).split('\n')[0];
      out.push(`${r.id}: «${hit.trim()}»`);
    }
    const bnd = BOUND_RE();
    while ((m = bnd.exec(txt)) !== null) {
      const hit = txt.slice(Math.max(0, m.index - 14), m.index + m[0].length);
      out.push(`${r.id}: «${hit.trim().split('\n').pop()}»`);
    }
  }
  return out;
}

/*  ⛔ שמות הישויות שמפקד מונה נגזרים מ-`REGISTRIES` ⛔ ואינם רשימה שנייה —
 *  ⚠️ מרשם שייכתב מחר מביא איתו את שמותיו, ⭐ ומעליהם «מרשם» עצמו: ⛔ הוא
 *  הישות היחידה שאין לה מרשם משלה, ⚠️ והיא בדיוק מה שנספר בניסוח. */
const CENSUS_NOUNS = [...new Set(REGISTRIES.flatMap((r) => r.nouns).concat(['מרשמים', 'מרשם']))];
/*  ⛔ הנסמך עם ה״א הידיעה הוא מה שהופך מספר למפקד — ⚠️ «שתי שורות» הוא
 *  כל שתיים, ⭐ ו«שתי השורות» הוא **כל מה שיש**: ⛔ והשני הוא שמתיישן
 *  ביום שהמרשם משתנה, ⚠️ והראשון הוא כמת ⛔ ואינו ספירה. */
const CENSUS_BOUND = ['שני', 'שתי', 'שלושת', 'ארבעת', 'חמשת', 'ששת', 'שבעת', 'שמונת', 'תשעת', 'עשרת'];
const TBL_CENSUS_RE = () => new RegExp(
  '(?:[מבלוכש]?(?:' + CENSUS_BOUND.join('|') + ')|\\d[\\d,]*)\\s+ה(?:' +
  CENSUS_NOUNS.join('|') + ')' + HEB_TAIL, 'g');
/*  ⛔ ציטוט ב-«…» אינו ניסוח משלה — ⚠️ הוא הפניה לתקן, ⭐ ונמדד בטענה יא:
 *  ⛔ והמחיקה שומרת על האורך, ⚠️ שהמיקום הוא מה שמדווח. */
const dropQuotes = (s) => s.replace(/«[^»]*»/g, (m) => ' '.repeat(m.length));
/*  ⛔ הערה שנפתחת ב«נמדד» היא מדידה שהשער חוזר עליה — ⚠️ ושם ספירה
 *  משתנה חיה בכוונה, ⭐ שבעמודת התקן היא הייתה הופכת כל תוספת להפרה. */
const MEASURED_NOTE = /^⚠️\s*\*\*נמדד\*\*/;

/* ח · מפקד מוקלד בניסוח — עמודת התקן ועמודת ההערות */
function censusTableGaps(c) {
  const out = [];
  for (const r of tableRows(c.md) || []) {
    for (const [where, txt] of [['תקן', dropQuotes(r.std)],
                                ['הערה', MEASURED_NOTE.test(r.note.trim()) ? '' : dropQuotes(r.note)]]) {
      const re = TBL_CENSUS_RE();
      let m;
      while ((m = re.exec(txt)) !== null) {
        out.push(`${r.n} (${where}): «${m[0]}»`);
      }
    }
  }
  return out;
}

/*  ⛔ מפקד מוקלד מפיל ⛔ ואין לו חריגה — ⚠️ רשימת ההיתר נותרה ריקה בכל
 *  הריפו, ⭐ וירדה עם מי שקרא אותה: ⛔ מספר שהוא שם של מבנה נכתב במילים
 *  שאינן ישות של מרשם. */

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
  /*  ⛔ מקורות השערים **מולבנים** — ⚠️ מחרוזת שנראית כמרשם אינה מרשם,
   *  ⭐ ורשימת שמות שמחרוזותיה הולבנו נבדלת ממרשם חישוב בדיוק בזה. */
  srcs: Object.fromEntries(fs.readdirSync(path.join(ROOT, 'tools'))
    .filter((x) => /^test_.*\.mjs$/.test(x))
    .map((f) => [f, whitenJs(rd('tools/' + f))])),
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
    .map(([k, v]) => `${[...v].sort((x, y) => x - y).join('+')} → ${k.slice(0, 40)}`);
}

/* ב+ג · הצהרה אחת ⟵ שורה אחת */
function clashDecl(c) {
  const rows = tableRows(c.md) || [];
  const owner = {};
  for (const r of rows)
    for (const m of r.std.matchAll(/`APP\.([A-Za-z_$][\w$]*)`/g))
      (owner[m[1]] = owner[m[1]] || new Set()).add(r.n);
  return Object.entries(owner)
    .filter(([, v]) => v.size > 1)
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

/*  ⛔ שער סינתטי לשתי המוטציות של ה — ⚠️ השער הראשון ברשימת הריצה
 *  שמצהיר שורות, ⭐ ו-`ROWS` שלו מרוקן בזיכרון בלבד. */
function syntheticSilent() {
  const wired = [...((/gates: \[([\s\S]*?)\],/.exec(C0.js) || ['', ''])[1])
    .matchAll(/'([a-z_-]+)\.mjs'/g)].map((m) => m[1] + '.mjs');
  return wired.find((g) => g in C0.rows && String(C0.rows[g]).trim()) || null;
}

/* ה · אכיפה שאין לה שורה */
/*  ⛔ שער שרץ ואינו מצהיר שורה מפיל ⛔ ואין לו חריגה — ⚠️ רשימת ההכרזה
 *  נותרה ריקה בכל הריפו, ⭐ וירדה עם מי שקרא אותה: ⛔ אכיפה שאין לה שורה
 *  מפילה על טענה שאינה בתקן, ⚠️ ומי שנפל עליה אינו יודע איזו הוראה נשברה. */
function silentGates(c) {
  const wired = [...((/gates: \[([\s\S]*?)\],/.exec(c.js) || ['', ''])[1])
    .matchAll(/'([a-z_-]+)\.mjs'/g)].map((m) => m[1] + '.mjs');
  return wired.filter((g) => g in c.rows &&
    String(c.rows[g]).split(',').map((x) => x.trim()).filter(Boolean).length === 0);
}


/* ── ט · probe מודד מימוש ולא הצהרה ────────────────────────────────────── */
/*  ⛔ **המוטציה היא הסרת המנגנון והשארת ההצהרה** — ⚠️ ו-`probe` שכל גופו,
 *  וגוף כל עוזר שהוא קורא לו, אינו נוגע במקור האפליקציה ולא בעץ, ⭐ אינו
 *  יכול ליפול בה: ⛔ הוא מחזיר את אותה תשובה גם על עץ שרוקן,
 *  ⚠️ והוא הופך תא ירוק לעדות על עצמו.
 *  ⛔ **והסריקה נכשלת סגור** — ⚠️ עוזר שגופו לא נחתך נספר כנוגע במקור:
 *  ⭐ פספוס נשאר פספוס, ⛔ ואינו הופך להאשמה על מנגנון תקין.
 *  ⛔ **וההכרעה על המקור המולבן** — ⚠️ מחרוזת ותבנית נושאות סוגריים,
 *  ⭐ והתאמת סוגריים עליהן מחזירה גוף ריק: ⛔ וגוף ריק נקרא «אינו נוגע
 *  במקור», ⚠️ וזה בדיוק היפוך התשובה.
 *  ⚠️ **ומה שאינו נאכף כאן**: ⛔ שורה שאין לה `probe` כלל — ⭐ היא נמדדת
 *  בטענה ד, ⛔ ותא ⭕ שהוכרע בהצהרה בכוונה אינו נסרק. */
const PROBE_SRC = new RegExp('\\b(?:' + [
  'present', 'src', 'code', 'srcRefs', 'readOnce', 'readSafe', 'readFileSync',
  'hasSrc', 'hasCode', 'fnBody', 'fnBodyRaw', 'fnRange', 'callSites', 'cfgBlock',
  'bodyOf', 'domEntry', 'whitenJs', 'whiten', 'grab', 'fileHas', 'existsSync',
  'readdirSync', 'inputAudit', 'ranges',
].join('|') + ')\\b');
const PROBE_KW = ['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'typeof'];
const probeBal = (s, i) => {
  const open = s[i], close = { '(': ')', '{': '}', '[': ']' }[open];
  let d = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === open) d++;
    else if (s[j] === close) { d--; if (!d) return s.slice(i, j + 1); }
  }
  return null;
};
function probeBodies(W) {
  const map = new Map();
  for (const m of W.matchAll(/(?:^|\n)\s*(?:export\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g)) {
    const open = W.indexOf('{', m.index + m[0].length - 1);
    const b = open > 0 ? probeBal(W, open) : null;
    map.set(m[1], b === null ? '' : b);
  }
  const re = /(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?(?:function\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)?\s*(?:=>)?\s*/g;
  for (const m of W.matchAll(re)) {
    if (map.has(m[1])) continue;
    const at = m.index + m[0].length;
    if (W[at] === '{') { const b = probeBal(W, at); map.set(m[1], b === null ? '' : b); continue; }
    let j = at, d = 0;
    for (; j < W.length; j++) {
      const c = W[j];
      if ('([{'.indexOf(c) >= 0) d++;
      else if (')]}'.indexOf(c) >= 0) d--;
      else if (c === ';' && d <= 0) break;
    }
    map.set(m[1], W.slice(at, Math.min(j, at + 6000)));
  }
  return map;
}
function probeTouches(body, map, depth, seen) {
  if (PROBE_SRC.test(body)) return true;
  if (depth > 8) return true;
  for (const m of body.matchAll(/\b([A-Za-z0-9_$]+)\s*\(/g)) {
    const id = m[1];
    if (PROBE_KW.indexOf(id) >= 0 || seen.has(id)) continue;
    seen.add(id);
    const b = map.get(id);
    if (b === undefined) continue;
    if (!b.length) return true;
    if (probeTouches(b, map, depth + 1, seen)) return true;
  }
  return false;
}
/*  ⛔ ה-probe-ים נקראים משני המרשמים ⛔ ולא מרשימה מוקלדת — ⚠️ `MATRIX`
 *  הוא המרוכז ו-`tableProbe` הוא הפר-אפליקציתי: ⭐ probe שייכתב מחר
 *  נסרק אף הוא. */
function probeEntries(RAWC, W) {
  const out = [];
  const a = W.indexOf('const MATRIX = [');
  if (a >= 0) {
    const b = W.indexOf('\n];', a);
    const mxW = W.slice(a, b), mxR = RAWC.slice(a, b);
    const marks = [...mxW.matchAll(/\n  \{ row: (\d+),/g)];
    for (let k = 0; k < marks.length; k++) {
      const from = marks[k].index;
      const to = k + 1 < marks.length ? marks[k + 1].index : mxW.length;
      const nm = /name: '([^']*)'/.exec(mxR.slice(from, to));
      const pr = /probe:\s*([\s\S]*)$/.exec(mxW.slice(from, to));
      if (pr) out.push({ row: Number(marks[k][1]), name: nm ? nm[1] : '?', body: pr[1] });
    }
  }
  const tp = W.indexOf('\n  tableProbe: {');
  if (tp >= 0) {
    const i = W.indexOf('{', tp), j = W.indexOf('\n  },', i);
    const blk = W.slice(i, j);
    const marks = [...blk.matchAll(/\n    (\d+): /g)];
    for (let k = 0; k < marks.length; k++) {
      const from = marks[k].index;
      const to = k + 1 < marks.length ? marks[k + 1].index : blk.length;
      out.push({ row: Number(marks[k][1]), name: 'tableProbe', body: blk.slice(from, to) });
    }
  }
  return out;
}
/*  ⛔ המדידה על שורות ✅ בלבד — ⚠️ תא ⭕ מוכרע בהצהרה **בכוונה**: ⭐ «אין
 *  כאן כניסה» הוא `() => false`, ⛔ והוא אינו שורה ירוקה בלי מנגנון. */
function probeDeclOnly(c) {
  const W = whitenJs(c.cap);
  const map = probeBodies(W);
  const col = COL_FIRST + PEERS.indexOf(FACTS.slug);
  const green = new Set();
  for (const r of (tableRows(c.md) || []))
    if ((r.marks[col - COL_FIRST] || '') === '✅') green.add(r.n);
  const out = [];
  for (const e of probeEntries(c.cap, W)) {
    if (!green.has(e.row)) continue;
    if (!probeTouches(e.body, map, 0, new Set())) out.push(e.row + '|' + e.name);
  }
  return out;
}

/* ── י · מרשם חישוב נושא את המקרה הריק ─────────────────────────────────── */
/*  ⛔ **ההגדרה המכנית יושבת בשורה שבטבלה** — ⚠️ וכאן היא מיושמת: ⭐ מרשם
 *  שפריטיו נושאים שדה מספרי, או שדה מערך שאינו רשימת שמות, הוא **מרשם
 *  חישוב**: ⛔ ומה שאינו כזה הוא רשימת שמות, מרשם מוטציות, או מרשם טענות.
 *  ⛔ **ומרשם שאינו נופל לאף סוג מפיל** — ⚠️ פריטים שאינם מאותו סוג הם
 *  מבנה שאיש אינו יודע מה נכנס אליו, ⭐ ובדיוק עליו אין מה למדוד. */
export function topRegistries(W) {
  const out = [];
  const re = /(?:^|\n)(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*\[/g;
  let m;
  while ((m = re.exec(W)) !== null) {
    const i = W.indexOf('[', m.index + m[0].length - 1);
    let d = 0, j = i;
    for (; j < W.length; j++) { if (W[j] === '[') d++; else if (W[j] === ']' && --d === 0) break; }
    if (j >= W.length) continue;
    out.push({ name: m[1], w: W.slice(i, j + 1) });
  }
  return out;
}
/*  ⛔ הפריטים נחתכים בפסיק שבעומק אפס — ⚠️ פסיק בתוך אובייקט או מערך
 *  מקונן אינו גבול פריט, ⭐ וחיתוך תמים היה מסווג כל מרשם כמעורב. */
export function regItems(w) {
  const inner = w.slice(1, -1), out = [];
  let d = 0, s = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '[' || c === '{' || c === '(') d++;
    else if (c === ']' || c === '}' || c === ')') d--;
    else if (c === ',' && d === 0) { out.push(inner.slice(s, i)); s = i + 1; }
  }
  out.push(inner.slice(s));
  return out.map((x) => x.trim()).filter((x) => x.length);
}
const R_ASSERT = /[\s{,](?:ok|must|never|re|why)\s*:/;
const R_MUT = /[\s{,](?:m|lbl|mut|from|to|txt|at|run|claim)\s*:/;
const R_FN = /=>|function\s*[({]/;
const R_NUM = /[\s{,][A-Za-z_$][\w$]*\s*:\s*-?\d/;
/*  ⛔ שדה מערך שתוכנו המולבן ריק הוא **רשימת שמות** ⛔ ולא נתון לחישוב —
 *  ⚠️ ההלבנה מוחקת את המחרוזות, ⭐ ומה שנותר הוא פסיקים ורווחים בלבד. */
function arrField(it) {
  for (const m of it.matchAll(/[\s{,][A-Za-z_$][\w$]*\s*:\s*\[/g)) {
    const i = it.indexOf('[', m.index);
    let d = 0, j = i;
    for (; j < it.length; j++) { if (it[j] === '[') d++; else if (it[j] === ']' && --d === 0) break; }
    if (/[^\s,]/.test(it.slice(i + 1, j))) return true;
  }
  return false;
}
export function regKind(w) {
  const items = regItems(w);
  if (!items.length) return 'names';
  const objs = items.filter((x) => x.charAt(0) === '{');
  const scal = items.filter((x) => x.charAt(0) !== '{');
  if (objs.some((x) => R_ASSERT.test(x))) return 'assert';
  if (objs.some((x) => R_MUT.test(x)) || items.some((x) => R_FN.test(x))) return 'mut';
  if (objs.some((x) => R_NUM.test(x) || arrField(x))) return 'calc';
  if (!objs.length || !scal.length) return 'names';
  return '';
}
/*  ⛔ המקרה הריק הוא **ערך ריק בשדה של פריט** — ⚠️ מערך ריק או אפס:
 *  ⭐ פריט כזה הוא ההתקנה הטרייה, ⛔ והוא מה שאינו נבדק. */
export function emptyCase(w) {
  return regItems(w).some((it) => /[\s{,][A-Za-z_$][\w$]*\s*:\s*(?:\[\s*\]|0)\s*[,}]/.test(it));
}
export function emptyGaps(srcs) {
  const kinds = { calc: 0, names: 0, mut: 0, assert: 0 };
  const bad = [], noEmpty = [];
  for (const [f, W] of Object.entries(srcs)) {
    for (const g of topRegistries(W)) {
      const k = regKind(g.w);
      if (!k) { bad.push(f + '::' + g.name); continue; }
      kinds[k]++;
      if (k !== 'calc') continue;
      /*  ⛔ מרשם חישוב בלי מקרה ריק מפיל ⛔ ואין לו חריגה — ⚠️ רשימת
       *  ההכרזה נותרה ריקה בכל הריפו, ⭐ וירדה עם מי שקרא אותה. */
      if (!emptyCase(g.w)) noEmpty.push(f + '::' + g.name);
    }
  }
  return { kinds, bad, noEmpty };
}

/* ── יא · כל פסוקית נמנית ──────────────────────────────────────────────── */
/*  ⛔ פתיחת ההערה נמדדת **מול הסימון** — ⚠️ «נמדד» היא פתיחת ✅, ⭐ ותא ⭕
 *  שנפתח בה הוא סתירה בין שני חלקי אותה שורה: ⛔ והפתיחה נמדדת כאן ⛔ ולא
 *  בבודק ההערות, ⚠️ ששם היא נמדדת בלי הסימון שלצידה. */
const GAP_OPEN = /^[\s*⛔⚠️⭐️\uFE0F]*\*\*(?:הבדל מכוון|אינו ניתן לאכיפה)\*\*/;
export function gapNoteGaps(rows, decl) {
  const out = [];
  for (const r of rows) {
    const gap = r.marks.some((x) => x === '⭕');
    if (!gap) {
      if (Object.prototype.hasOwnProperty.call(decl || {}, r.n)) out.push('[הכרזה בלי ⭕] ' + r.n);
      continue;
    }
    if (!GAP_OPEN.test(r.note)) { out.push('[פתיחה] ' + r.n + ': «' + r.note.slice(0, 24) + '»'); continue; }
    const partial = r.note.indexOf('בחלקו') >= 0;
    const d = (decl || {})[r.n];
    if (partial && !d) { out.push('[בלי הכרזה] ' + r.n); continue; }
    if (!partial && d) { out.push('[הכרזה בלי «בחלקו»] ' + r.n); continue; }
    if (!d) continue;
    for (const q of d) {
      if (r.note.indexOf('«' + q + '»') < 0) out.push('[סעיף שאינו בהערה] ' + r.n + ': «' + q + '»');
      else if (r.std.indexOf(q) < 0) out.push('[סעיף שאינו בתקן] ' + r.n + ': «' + q + '»');
    }
  }
  return out;
}

/* ── יב · ⭕ אינו כלל עבודה ─────────────────────────────────────────────── */
/*  ⛔ ⭕ נושא תקן על הקוד שאין לו אכיפה מכנית — ⚠️ ולא כלל עבודה: ⭐ כלל
 *  שאין לו תוצר בריפו אינו שורה, ⛔ והוא יושב בזיכרון המנהל.
 *  ⚠️ **מה נכנס**: הניסוחים של נימוק שנוקב בסשן או במה שמחוץ לעץ;
 *  ⛔ **ומה מפיל**: שורה ⭕ שהערתה נושאת אחד מהם. ⭐ **ולמה הדפוס קיים**:
 *  הסימון ⭕ נקרא כ«תקן שאין לו אכיפה» ⛔ ולא כ«אינו תקן», ⚠️ ושתי
 *  המשמעויות נראות זהות בטבלה — ⭐ והנימוק הוא המקום היחיד שבו הן נבדלות. */
const WORK_RULE = /התנהגות סשן|מחוץ לריפו|מעותק העבודה/;
export function workRuleGaps(rows) {
  return rows.filter((r) => r.marks.some((x) => x === '⭕') && WORK_RULE.test(r.note))
             .map((r) => r.n + ': «' + r.note.slice(0, 40) + '»');
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
  t(s.length === 0, `ה · אכיפה שאין לה שורה — נמדדו ${s.length} שערים שרצים בלי \`ROWS\`, והצפוי אפס` +
    (s.length ? `: ${s.slice(0, 10).join(' · ')}. מצהירים ב-\`ROWS\` את השורה שהשער אוכף — ⛔ ואין חריגה` : ''));
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
  const g = censusGaps(C0).concat(censusTableGaps(C0));
  t(g.length === 0,
    `ח · מפקד נגזר ואינו מוקלד — נמדדו ${g.length} מפקדים מוקלדים בהיקף המרשמים ובניסוח שבטבלה, והצפוי אפס` +
    (g.length ? `: ${g.slice(0, 8).join(' · ')}. גוזרים את המספר מהמרשם — ⛔ ואין חריגה` : ''));
}

{
  const g = probeDeclOnly(C0);
  t(g.length === 0,
    `ט · probe מודד מימוש ולא הצהרה — נמדדו ${g.length} probe של שורה ✅ שאינם נוגעים במקור, והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. מעגנים את ה-probe במקור — ⛔ ואין חריגה` : ''));
}


{
  const g = emptyGaps(C0.srcs);
  const bad = g.bad.length + g.noEmpty.length;
  t(bad === 0,
    `י · מרשם חישוב נושא את המקרה הריק — נמדדו ${g.kinds.calc} מרשמי חישוב · ` +
    `${g.kinds.names} רשימות שמות · ${g.kinds.mut} מרשמי מוטציות · ${g.kinds.assert} מרשמי טענות; ` +
    `${g.bad.length} שאינם נופלים לאף סוג ו-${g.noEmpty.length} בלי מקרה ריק — והצפוי אפס` +
    (bad ? `: ${[...g.bad, ...g.noEmpty].slice(0, 8).join(' · ')}. ` +
           'מוסיפים למרשם פריט ריק — ⛔ ואין חריגה' : ''));
}
{
  const g = gapNoteGaps(tableRows(C0.md) || [], APP.gapClauses);
  t(g.length === 0,
    `יא · כל פסוקית נמנית — נמדדו ${g.length} פערים מתוך ` +
    `${Object.keys(APP.gapClauses || {}).length} הכרזות והצפוי אפס` +
    (g.length ? `: ${g.slice(0, 8).join(' · ')}. מונים בהערה כל סעיף שאינו נאכף, ` +
                'בציטוט מהתקן, ומצהירים אותו ב-`APP.gapClauses`' : ''));
}
{
  const g = workRuleGaps(tableRows(C0.md) || []);
  t(g.length === 0,
    `יב · ⭕ אינו כלל עבודה — נמדדו ${g.length} שורות ⭕ שנימוקן התנהגות סשן או עבודה מחוץ לריפו, ` +
    'והצפוי אפס' +
    (g.length ? `: ${g.slice(0, 8).join(' · ')}. מורידים את השורה מהטבלה, ` +
                'והכלל עובר לזיכרון המנהל' : ''));
}

mutStage();
if (RUN_MUT) {
  /*  ⛔ מ19 · מ20 · מ21 — כלל עבודה שנכתב כשורה ⭕: ⚠️ שתי השורות שירדו
   *  חוזרות לטבלה כלשונן, ⭐ ושורה שלישית שנימוקה סשן בלבד. ⛔ והשורה
   *  מוזרקת לטקסט הטבלה ⛔ ולא לרשימה שכבר פורקה — ⚠️ פרסור שחותך אחרת
   *  היה מדווח «לא נפל» על כלל שכן נתפס. */
  {
    const base = workRuleGaps(tableRows(C0.md) || []).length;
    const withRow = (name, std, note) => {
      const at = C0.md.indexOf('\n<!-- SHARED:end');
      const line = '\n| ' + ((tableRows(C0.md) || []).length + 1) + ' | ' + name + ' | ' + std + ' | ' +
        PEERS.map(() => '⭕').join(' | ') + ' | ' + note + ' |';
      return workRuleGaps(tableRows(C0.md.slice(0, at) + line + C0.md.slice(at)) || []).length - base;
    };
    const CLAIM = '«יב · ⭕ אינו כלל עבודה»';
    const g19 = withRow('ענפים שלא מוזגו', 'ענף מרוחק שאינו ב-`main`',
      '⛔ **אינו ניתן לאכיפה** מכנית: מצב הענפים המרוחקים אינו נראה מעותק העבודה');
    t(g19 === 1, 'מ19 · שורת הענפים שלא מוזגו שחזרה **מפילה** את ' + CLAIM + ` — נמדדו ${g19} והצפוי 1`);
    const g20 = withRow('הסימון הוא הצהרה על עכשיו', 'תיקן ⟵ ✅ · גילה בעיה ⟵ ❌ עם הערה',
      '⛔ **אינו ניתן לאכיפה** מכנית: עדכון הסימון הוא התנהגות סשן — ⚠️ מה שכן נאכף הוא **תוצאתו**');
    t(g20 === 1, 'מ20 · שורת הסימון שחזרה **מפילה** את ' + CLAIM + ` — נמדדו ${g20} והצפוי 1`);
    const g21 = withRow('zz', 'אלף', '⛔ **אינו ניתן לאכיפה** מכנית: אלף הוא התנהגות סשן');
    t(g21 === 1, 'מ21 · שורה ⭕ שנימוקה התנהגות סשן **מפילה** את ' + CLAIM + ` — נמדדו ${g21} והצפוי 1`);
    /*  ⭐ נ13 · נ14 — מוטציות-נגד: ⚠️ «קריאת משמעות» היא תקן שאין לו
     *  אכיפה, ⭐ ו«הבדל מכוון» הוא החלטת מנהל על הקוד — ⛔ ושתיהן שורה. */
    const g13 = withRow('zz', 'אלף', '⛔ **אינו ניתן לאכיפה**: «אלף» היא קריאת משמעות');
    t(g13 === 0, 'נ13 · ⭐ שורה ⭕ שנימוקה קריאת משמעות ⛔ **אינה** מפילה — ' + `נמדדו ${g13} והצפוי 0`);
    const g14 = withRow('zz', 'אלף', '⛔ **הבדל מכוון**: אין כניסה ביומן ובקופה');
    t(g14 === 0, 'נ14 · ⭐ שורה ⭕ שנימוקה הבדל מכוון ⛔ **אינה** מפילה — ' + `נמדדו ${g14} והצפוי 0`);
    /*  ⭐ נ15 — ⚠️ «נמדד בשימוש בפועל» הוא תקן על הקוד שהמנהל מודד בהפעלה,
     *  ⛔ ואינו התנהגות סשן: ⭐ השורה נשארת ⭕ עם נימוקה. */
    const g15 = withRow('zz', 'אלף', '⛔ **אינו ניתן לאכיפה**: «אלף» — ⚠️ **נמדד בשימוש בפועל**: ⭐ המנהל מפעיל את האפליקציה');
    t(g15 === 0, 'נ15 · ⭐ שורה ⭕ שנימוקה נמדד בשימוש בפועל ⛔ **אינה** מפילה — ' + `נמדדו ${g15} והצפוי 0`);
  }
  /*  ⛔ מ10: probe של שורה ✅ שכל גופו הצהרה — ⚠️ זו בדיוק המוטציה
   *  שהשורה מתארת: ⭐ המנגנון הוסר וההצהרה נשארה, ⛔ והשורה נשארת ✅.
   *  ⚠️ **וההזרקה היא רשומה שלמה במרשם** — ⛔ ואינה הלחמת טקסט לתוך
   *  רשומה קיימת: ⭐ רשומה שנחתכה אחרת בפרסור הייתה מדווחת «לא נפל»
   *  על מנגנון תקין. */
  {
    const base = probeDeclOnly(C0).length;
    const green = (tableRows(C0.md) || []).find((r) =>
      (r.marks[PEERS.indexOf(FACTS.slug)] || '') === '✅');
    const a = C0.cap.indexOf('const MATRIX = [');
    const b = C0.cap.indexOf('\n];', a);
    const inj = (body) => C0.cap.slice(0, b) +
      "\n  { row: " + green.n + ", name: 'zzהזרקה',\n    probe: () => " + body + " }," +
      C0.cap.slice(b);
    const after = probeDeclOnly({ ...C0, cap: inj('FACTS.slug === FACTS.slug') }).length;
    t(after > base,
      'מ10 · ⛔ מוטציה: probe שכל גופו הצהרה מפיל את טענה ט — ' +
      `נמדדו ${after} מול ${base} בקו הבסיס, והצפוי יותר`);
    /*  ⭐ מוטציית-נגד: אותה רשומה בדיוק, ⛔ עם קריאה למקור — ⚠️ שינוי חי
     *  שאסור לו להפיל: ⭐ זו העבודה היומיומית, ⛔ ושער שנופל עליה חוסם
     *  כל probe חדש. */
    const anti = probeDeclOnly({ ...C0, cap: inj('src.indexOf(FACTS.slug) >= 0') }).length;
    t(anti === base,
      'נ10 · ⭐ מוטציית-נגד: probe שנוגע במקור ⛔ אינו מפיל — ' +
      `נמדדו ${anti} והצפוי ${base}`);
  }

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
        /*  ⛔ השער הסינתטי נגזר מרשימת הריצה ⛔ ואינו «השקט הראשון» — ⚠️ אין
         *  היום שער שקט, ⭐ ומוטציה שתלויה בקיומו הייתה מדלגת לנצח. */
        const g = syntheticSilent();
        if (!g) return null;
        return silentGates({ ...C0, rows: { ...C0.rows, [g]: '' } }).includes(g);
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
  /*  ⛔ והניסוח הוא הטבלה — ⚠️ המוטציה מזריקה לתא קיים, ⭐ והיא בזיכרון
   *  ⛔ ואינה נוגעת בעץ: ⚠️ עמודת התקן אינה סובלת מפקד כלל, ⛔ ועמודת
   *  ההערות סובלת אותו תחת «נמדד» בלבד. */
  const TMUT = [
    { m: 'מ17', lbl: 'מפקד בעמודת התקן', col: 'std',
      txt: 'והמקומות המותרים הם שלושת המרשמים · ' },
    { m: 'מ18', lbl: 'מפקד בהערה שאינה «נמדד»', col: 'note',
      txt: '⛔ **הבדל מכוון**: ארבעת השערים אינם כאן · ' },
  ];
  for (const r of TMUT) {
    const rows = tableRows(C0.md) || [];
    const pick = rows.find((x) => (r.col === 'std' ? x.std : x.note).trim().length > 0 &&
                                  !MEASURED_NOTE.test(x.note.trim()));
    const cell = r.col === 'std' ? pick.std : pick.note;
    const c2 = { ...C0, md: C0.md.replace(cell, () => (r.col === 'std' ? ' ' : '') + r.txt + cell.trim()) };
    t(censusTableGaps(c2).length > censusTableGaps(C0).length,
      `${r.m} · ${r.lbl} **מפיל** את «ח»`);
  }
  /*  ⭐ מוטציית-נגד: כמת בלי ה״א הידיעה אינו מפקד — ⚠️ «שתי שורות» הוא
   *  כל שתיים, ⛔ ואינו מונה את מה שיש · ⭐ וספירה תחת «נמדד» חיה בכוונה. */
  const TANTI = [
    { m: 'נ11', lbl: 'כמת בלי ה״א הידיעה', col: 'std', txt: 'ושתי שורות אינן נופלות על אותו קלט · ' },
    { m: 'נ12', lbl: 'ספירה תחת «נמדד»', col: 'note', txt: null },
  ];
  for (const r of TANTI) {
    const rows = tableRows(C0.md) || [];
    let md2;
    if (r.txt === null) {
      const pick = rows.find((x) => MEASURED_NOTE.test(x.note.trim()));
      md2 = C0.md.replace(pick.note, () => '⚠️ **נמדד**: ארבעת השערים משותפים · ' + pick.note.replace(/^⚠️ \*\*נמדד\*\*: /, ''));
    } else {
      const pick = rows.find((x) => x.std.trim().length > 0);
      md2 = C0.md.replace(pick.std, () => ' ' + r.txt + pick.std.trim());
    }
    t(censusTableGaps({ ...C0, md: md2 }).length === censusTableGaps(C0).length,
      `${r.m} · «${r.lbl}» ⛔ אינו מפיל את «ח»`);
  }
  /*  ⛔ מ11 — מרשם חישוב בלי מקרה ריק: ⚠️ המוטציה בזיכרון, ⭐ והיא מזינה
   *  לאותה פונקציה מרשם שפריטיו נושאים שדה מספרי ⛔ ואין בו פריט ריק. */
  {
    const one = { 'zz.mjs': "\nconst ZZ = [\n  { key: 'a', year: 5787, rows: [1] },\n];\n" };
    const got = emptyGaps(one);
    t(got.noEmpty.length === 1 && got.kinds.calc === 1,
      'מ11 · מרשם חישוב בלי מקרה ריק **מפיל** את «י» — ' +
      `נמדדו ${got.kinds.calc} מרשמי חישוב ו-${got.noEmpty.length} בלי מקרה ריק, והצפוי 1 ו-1`);
  }
  /*  ⛔ מ12 — מרשם שאינו נופל לאף סוג: ⚠️ פריט אובייקט לצד פריט מחרוזת,
   *  ⭐ ואין דרך לדעת מה נכנס אליו. */
  {
    const one = { 'zz.mjs': "\nconst ZZ = [\n  { a: b },\n  c,\n];\n" };
    const got = emptyGaps(one);
    t(got.bad.length === 1,
      'מ12 · מרשם שאינו נופל לאף סוג **מפיל** את «י» — ' +
      `נמדדו ${got.bad.length} והצפוי 1`);
  }
  /*  ⭐ נ5 · מוטציית-נגד: אותו מרשם עם פריט ריק ⛔ אינו מפיל — הריק הוא בדיוק מה שנדרש. */
  {
    const one = { 'zz.mjs': "\nconst ZZ = [\n  { key: 'a', year: 5787, rows: [1] },\n  { key: 'b', year: 0, rows: [] },\n];\n" };
    const got = emptyGaps(one);
    t(got.noEmpty.length === 0 && got.kinds.calc === 1,
      'נ5 · ⭐ מרשם חישוב עם מקרה ריק ⛔ **אינו** מפיל — ' +
      `נמדדו ${got.noEmpty.length} והצפוי 0`);
  }
  /*  ⭐ נ6 · מוטציית-נגד: רשימת שמות בלי ערך ריק ⛔ אינה מפילה — ⚠️ המקרה
   *  הריק אינו מוגדר בה, ⭐ ודרישה ממנה הייתה רשימה שאיש לא יקרא. */
  {
    const one = { 'zz.mjs': "\nconst ZZ = ['a', 'b', 'c'];\n" };
    const got = emptyGaps(one);
    t(got.noEmpty.length === 0 && got.kinds.names === 1,
      'נ6 · ⭐ רשימת שמות בלי ערך ריק ⛔ **אינה** מפילה — ' +
      `נמדדו ${got.kinds.names} רשימות שמות והצפוי 1`);
  }
  /*  ⛔ מ14 — סעיף שהושמט מנימוק ⭕: ⚠️ ההכרזה מונה שניים, ⭐ וההערה
   *  מצטטת אחד. */
  {
    const row = { n: 9, name: 'zz', std: 'אלף · בית', note: '⛔ **אינו ניתן לאכיפה** בחלקו: «אלף» אינו נגזר', marks: ['⭕'] };
    const got = gapNoteGaps([row], { 9: ['אלף', 'בית'] });
    t(got.length === 1 && got[0].indexOf('[סעיף שאינו בהערה]') === 0,
      'מ14 · סעיף שהושמט מנימוק ⭕ **מפיל** את «יא» — ' +
      `נמדדו ${got.length} והצפוי 1`);
  }
  /*  ⛔ מ15 — תא ⭕ שהערתו נפתחת ב«נמדד». */
  {
    const row = { n: 9, name: 'zz', std: 'אלף', note: '⚠️ **נמדד**: אלף', marks: ['⭕'] };
    const got = gapNoteGaps([row], {});
    t(got.length === 1 && got[0].indexOf('[פתיחה]') === 0,
      'מ15 · תא ⭕ שנפתח ב«נמדד» **מפיל** את «יא» — ' +
      `נמדדו ${got.length} והצפוי 1`);
  }
  /*  ⛔ מ16 — ציטוט שאינו בתקן של אותה שורה: ⚠️ הפניה לטקסט שאינו קיים. */
  {
    const row = { n: 9, name: 'zz', std: 'אלף · בית', note: '⛔ **אינו ניתן לאכיפה** בחלקו: «גימל» אינו נגזר', marks: ['⭕'] };
    const got = gapNoteGaps([row], { 9: ['גימל'] });
    t(got.length === 1 && got[0].indexOf('[סעיף שאינו בתקן]') === 0,
      'מ16 · ציטוט שאינו בתקן **מפיל** את «יא» — ' +
      `נמדדו ${got.length} והצפוי 1`);
  }
  /*  ⭐ נ7 · מוטציית-נגד: נימוק שמונה את כל הסעיפים ⛔ אינו מפיל — זו הדרישה עצמה. */
  {
    const row = { n: 9, name: 'zz', std: 'אלף · בית', note: '⛔ **אינו ניתן לאכיפה** בחלקו: «אלף» ו«בית» אינם נגזרים', marks: ['⭕'] };
    const got = gapNoteGaps([row], { 9: ['אלף', 'בית'] });
    t(got.length === 0,
      'נ7 · ⭐ נימוק שמונה את כל הסעיפים ⛔ **אינו** מפיל — ' +
      `נמדדו ${got.length} והצפוי 0`);
  }
  /*  ⭐ נ8 · מוטציית-נגד: תא ✅ שנפתח ב«נמדד» ⛔ אינו מפיל — ⚠️ שם זו
   *  הפתיחה הנכונה, ⭐ והנמדד הוא הצימוד לסימון. */
  {
    const row = { n: 9, name: 'zz', std: 'אלף', note: '⚠️ **נמדד**: אלף', marks: ['✅'] };
    const got = gapNoteGaps([row], {});
    t(got.length === 0,
      'נ8 · ⭐ תא ✅ שנפתח ב«נמדד» ⛔ **אינו** מפיל — ' +
      `נמדדו ${got.length} והצפוי 0`);
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
