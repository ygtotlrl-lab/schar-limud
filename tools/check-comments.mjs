#!/usr/bin/env node
/*  בדיקת תקן ההערות בקוד — סבב 28.
 *
 *  כלל ברזל 11 של הארגון: **הערה על אותו סוג דבר נראית אותו דבר בארבע
 *  האפליקציות.** סבב 27 הוסיף תיעוד פנימי ל-gius ומדד שהאחיות נבדלות ממנה
 *  לא באחוזים אלא ב**כיסוי ובצורה**: אזורים לוגיים שלמים בלי כותרת, הערות
 *  ⛔ בלי מספר הסבב שממנו נלמד האיסור ובלי סיבה, וסימנים שהומצאו לצורך
 *  שורה אחת. הבדיקה הזו רצה עם שערי התחביר לפני כל דחיפה, ונכשלת על ארבעת
 *  סוגי הסטייה:
 *
 *    א. **כותרת בלוק** — אזור לוגי בלי כותרת בפורמט התקני, או כותרת
 *       שצורתה אינה תקנית. הכיסוי נמדד מבנית: הקוד הפרטי חייב להיפתח
 *       בכותרת, ואסור שיהיה בין שתי כותרות רצף ארוך מ-MAX_AREA_LINES.
 *    ב. **⛔ בלי סבב או בלי סיבה** — בלוק הערה שיש בו ⛔ חייב לשאת
 *       `סבב <N>` **וגם** מפריד « — » שאחריו הנימוק.
 *    ג. **סימן שאינו מהרשימה** — שורת הערה שנפתחת בסמל חייבת להיפתח
 *       באחד משלושה: ⛔ איסור · ⚠️ אזהרה · ⭐ החלטה מרכזית.
 *    ד. **טרמינולוגיה** — מונח מהרשימה שנכתב בגרסה שאינה התקנית.
 *
 *  ⚠️ הבדיקה חלה על **האזורים הפרטיים בלבד**. חמשת הבלוקים המשותפים
 *  והמודולים הקפואים (סבבים 11–17) מוחרגים: הם זהים בית-לבית בארבע
 *  האפליקציות ונשמרים ע"י `check-status-area.mjs`, ועריכה שלהם כאן הייתה
 *  מחייבת שינוי בארבעתם ובחתימות — כלומר הבדיקה הזו הייתה מייצרת בעצמה
 *  את הסחיפה שהיא באה למנוע.
 *
 *  ⚠️ הבדיקה קוראת **הערות בלבד** ולא מחרוזות. הקובץ עובר טוקניזציה של JS
 *  (מחרוזות, תבניות ו-regex) — בלי זה `'✅ נשמר'` שבטוסט היה נספר כהערה
 *  שנפתחת בסמל אסור, ו-`/https:\/\//` היה נקרא כפתיחת הערה.
 *
 *  הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */
import fs from 'node:fs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  file: 'index.html',
  /*  ⚠️ אין כאן בלוק משותף שנעדר (סבב 52). */
  skipBlocks: [],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/* הבלוקים המשותפים והמודולים הקפואים — מוחרגים מכל ארבעת הסעיפים.
   ⚠️ הסימון הוא **טקסט הסמן בלבד**, בלי מסגרת ה-`═` שלפניו: במודול האחסון
   שם המודול יושב בשורה **השנייה** של הכותרת ולא בראשונה, וסמן שכלל את
   המסגרת היה מפספס אותו בשקט — כלומר מודול קפוא שהיה נבדק כאילו הוא קוד
   פרטי. ההחרגה מתחילה בפתיחת ההערה שלפני הסמן ונגמרת בסגירת ההערה
   שאחרי סמן הסיום. */
const SHARED_BLOCKS = [
  ['עמידות אחסון מקומי — מודול משותף (סבב 11)', 'סוף המודול המשותף'],
  ['ממתין לסנכרון — מודול משותף (סבב 12)',       'סוף מודול "ממתין לסנכרון"'],
  ['"מידע טכני" — קיפול מסכי האחסון',              'סוף רכיב "מידע טכני"'],
  ['אזור מצב — בלוק "☁️ סנכרון"',                  'סוף בלוק "☁️ סנכרון"'],
  ['גיבוי יומי ויומן פעולות — מודול משותף (סבב 30)', 'סוף מודול הגיבוי היומי'],
  ['חלון חם ושחזור מקומי — מודול משותף (סבב 35)',    'סוף מודול החלון החם'],
  ['מיזוג רשומות — מודול משותף (סבב 38)',            'סוף מודול המיזוג'],
  ['מזהי רשומות — מודול משותף (סבב 37א)',            'סוף מודול מזהי הרשומות'],
  ['מזהה מכשיר — מודול משותף (סבב 40)',              'סוף מודול מזהה המכשיר'],
  ['ניסיון חוזר בסנכרון — מודול משותף (סבב 44)',   'סוף מודול הניסיון החוזר'],
  ['מנגנון המשיכה — מודול משותף (סבב 51)',           'סוף מנגנון המשיכה'],
  ['נעילת חוסר-פעילות — מודול משותף (סבב 52)',  'סוף מודול נעילת חוסר-הפעילות'],
  ['מודל הסשן — מודול משותף (סבב 53)',              'סוף מודול הסשן'],
];
/* ⚠️ הבלוק המשותף החמישי — «CSS אזור המצב» — אינו ברשימה מפני שהוא יושב
   ב-`<style>` ולא ב-`<script>`, וכל מה שאינו JS מוטבע מולבן ממילא. הוספתו
   כאן הייתה מפילה את הבדיקה על סמן שלא ייתכן שיימצא.

   ⛔ הרשימה הזו חייבת להיות שקולה ל-`CAPS` שב-`check-capabilities.mjs`
   (סבב 45ב) — מודול משותף שנספר כאן כקוד פרטי נמדד בתקרת 400 השורות
   ומחייב כותרת שאין לו, ומודול שנעדר משם אינו נאכף בחתימה כלל. ⚠️ שתי
   הרשימות נבדלות בשני מקומות **מדודים בלבד**, ו-`test_lists.mjs`
   אוכף בדיוק אותם: `swcore` נעדר כאן (הוא ב-`sw.js`, וקובץ שאינו
   `index.html` אינו נסרק כאן כלל), ו-«מידע טכני» נעדר משם (הוא נאכף
   ב-`check-status-area.mjs`, ואין לו שורה במטריצת היכולות). */

/* פורמט הכותרת — רוחב קבוע, כך שארבע האפליקציות נראות אותו דבר לעין. */
const RULE_W   = 74;
const HDR_OPEN = new RegExp('^/\\* ═{' + RULE_W + '}$');
const HDR_RULE = new RegExp('^ {3}═{' + RULE_W + '}$');
const HDR_END  = new RegExp('^ {3}═{' + RULE_W + '} \\*/$');
/* כותרת «כמעט תקנית» — נתפסת ומדווחת במקום להיספר כטקסט רגיל. */
const HDR_NEAR = /^\/\* ═{20,}\s*$/;
const MAX_AREA_LINES = 400;
/* רוחב באנר ה-`───────────────────────────────` בקובצי השערים — ר' סעיף ה. */
const BANNER_W = 78;

const MARKERS = ['⛔', '⚠️', '⭐'];
const PICTO = /^\p{Extended_Pictographic}/u;

/* ⚠️ רק גרסאות שאינן יכולות להיות מזהה בקוד — כדי שלא ניפול על
   `` `lsSweep` `` או על שם משתנה בתוך גרשיים אחוריים. */
const TERMS = [
  { bad: /דחיפת מצב/g,   good: 'דחיפת-מצב' },
  { bad: /טביעת אצבע/g,  good: 'טביעה' },
  { bad: /אופק פינוי/g,  good: 'אופק הפינוי' },
  { bad: /קאש/g,         good: 'מטמון' },
  { bad: /מירור/g,       good: 'מראה' },
  { bad: /אוף-ליין/g,    good: 'אופליין' },
  { bad: /טומבסטון/g,    good: 'tombstone' },
];

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

const src = fs.readFileSync(APP.file, 'utf8');

/* ── בניית «הקוד הפרטי» — אותו קובץ, כשכל מה שאינו JS פרטי מולבן ───────── */
/* ⚠️ מלבינים ולא חותכים: מספרי השורות בהודעות השגיאה חייבים להתאים לקובץ
   האמיתי, אחרת ההודעה שולחת את הקורא לשורה הלא נכונה. */
function blank(text, from, to) {
  const seg = text.slice(from, to).replace(/[^\n]/g, ' ');
  return text.slice(0, from) + seg + text.slice(to);
}

let priv = src;
{
  /* א. הכל מחוץ ל-<script> מוטבע */
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  const keep = [];
  let m;
  while ((m = re.exec(src))) keep.push([m.index + m[0].indexOf('>') + 1, m.index + m[0].length - '</script>'.length]);
  let out = src;
  let cur = 0;
  for (const [a, b] of keep) { out = blank(out, cur, a); cur = b; }
  out = blank(out, cur, out.length);
  priv = out;

  /* ב. חמשת הבלוקים המשותפים */
  for (const [start, end] of SHARED_BLOCKS) {
    /*  ⛔ בלוק שהוכרז נעדר כאן (סבב 52) — הנימוק יושב ב-`APP`, ואין מה
     *  להחריג מהסריקה. */
    if ((APP.skipBlocks || []).indexOf(start) >= 0) continue;
    const i0 = priv.indexOf(start);
    if (i0 < 0) { fail(`סמן הבלוק המשותף «${start}» לא נמצא ב-${APP.file}`); continue; }
    const open = priv.lastIndexOf('/*', i0);
    const j = priv.indexOf(end, i0);
    const k = j < 0 ? -1 : priv.indexOf('*/', j);
    if (open < 0 || j < 0 || k < 0) { fail(`הבלוק המשותף «${start}» אינו סגור ב-${APP.file}`); continue; }
    priv = blank(priv, open, k + 2);
  }
}

/* ── טוקניזציה: איסוף ההערות בלבד ──────────────────────────────────────── */
/* ⛔ אין להחליף את זה בביטוי רגולרי על `//` ו-`/*` (סבב 28) — מחרוזת שמכילה `//`
   (כל URL) הייתה נקראת כהערה, ו-regex שמכיל `*` היה פותח בלוק שלא נסגר. */
function collectComments(text) {
  const out = [];
  const n = text.length;
  let i = 0, line = 1;
  let prevSignificant = '';
  const bump = (s) => { for (let k = 0; k < s.length; k++) if (s[k] === '\n') line++; };

  while (i < n) {
    const c = text[i];
    if (c === '\n') { line++; i++; continue; }

    if (c === '/' && text[i + 1] === '/') {
      let j = text.indexOf('\n', i);
      if (j < 0) j = n;
      out.push({ line, endLine: line, kind: 'line', text: text.slice(i, j),
                 own: /(^|\n)[ \t]*$/.test(text.slice(Math.max(0, i - 200), i)) });
      i = j;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      let j = text.indexOf('*/', i + 2);
      if (j < 0) j = n; else j += 2;
      const body = text.slice(i, j);
      const startLine = line;
      bump(body);
      out.push({ line: startLine, endLine: line, kind: 'block', text: body, own: true });
      i = j;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n) {
        if (text[i] === '\\') { if (text[i] === '\n') line++; i += 2; continue; }
        if (text[i] === '\n') { line++; if (q !== '`') break; }
        if (text[i] === q) { i++; break; }
        i++;
      }
      prevSignificant = q;
      continue;
    }
    if (c === '/') {
      /* regex או חילוק — מוכרע לפי הטוקן המשמעותי הקודם */
      if (/[({[,;:=!&|?+\-*%~^<>]/.test(prevSignificant) || prevSignificant === '') {
        i++;
        let cls = false;
        while (i < n) {
          const d = text[i];
          if (d === '\\') { i += 2; continue; }
          if (d === '\n') { line++; break; }
          if (d === '[') cls = true;
          else if (d === ']') cls = false;
          else if (d === '/' && !cls) { i++; break; }
          i++;
        }
        prevSignificant = '/';
        continue;
      }
      i++; prevSignificant = '/'; continue;
    }
    if (!/\s/.test(c)) prevSignificant = c;
    i++;
  }
  return out;
}

/* איחוד רצף שורות `//` עצמאיות לבלוק אחד — הערה בת חמש שורות היא רעיון
   אחד, והדרישה למספר סבב חלה עליו ולא על כל שורה בנפרד. */
function blocksOf(text) {
  const out = [];
  for (const c of collectComments(text)) {
    const last = out[out.length - 1];
    if (c.kind === 'line' && c.own && last && last.kind === 'line' && last.own && last.endLine === c.line - 1) {
      last.endLine = c.endLine;
      last.text += '\n' + c.text;
      continue;
    }
    out.push({ ...c });
  }
  return out;
}

const blocks = blocksOf(priv);

/*  ⭐ סבב 65 — תחולת התקן הורחבה ל-`sw.js` ול-`tools/` (ממצא 13). ⚠️ עד
 *  כאן היא נעצרה ב-`index.html`, ולכן 185 בלוקי ההערה שבשערים עצמם לא
 *  נבדקו כלל — ⛔ כלומר התקן שנאכף על הקוד לא נאכף על מי שאוכף אותו.
 *  ⛔ **וסעיף א (כותרת בלוק וכיסוי) נשאר ב-`index.html` בלבד, וזו הגבלה
 *  מוצהרת ולא השמטה (סבב 65)** — מדד הכיסוי הוא «רצף קוד פרטי בלי כותרת»,
 *  והוא מדבר על אפליקציה בת אלפי שורות; קובץ שער בן 150 שורות עם כותרת
 *  אחת היה נכשל על כלום, וכפייה של מסגרת 74 על באנרי ה-`───────` הייתה מחליפה
 *  תקן קיים ומדוד בתקן שהומצא כאן. סעיפים ב–ד חלים במלואם, וסעיף ה נכתב
 *  במיוחד לצורת הבאנר שבשערים.                                            */
const EXTRA = [];
/*  ⭐ שורת הכותרת של כל קובץ (סבב 67) — ⛔ שתים-עשרה השורות הראשונות
 *  בלבד: זהו הבאנר, ומספר הסבב שיושב בו הוא מה שהחליף את מספר הסבב
 *  שהיה בשם הקובץ. ⚠️ סריקת הקובץ כולו הייתה מוצאת «סבב 12» בהערה
 *  כלשהי באמצעו והופכת את ההקלה לאוטומטית. */
const HEADERS = {};
{
  const add = (p) => { try { const t = fs.readFileSync(p, 'utf8');
    HEADERS[p] = t.split('\n').slice(0, 12).join('\n');
    EXTRA.push({ name: p, blocks: blocksOf(t), lines: t.split('\n') }); } catch (e) {} };
  add('sw.js');
  try {
    for (const f of fs.readdirSync('tools').sort()) if (f.endsWith('.mjs')) add('tools/' + f);
  } catch (e) {}
}
const SCOPE = [{ name: APP.file, blocks, lines: src.split('\n') }, ...EXTRA];

/* ── א. כותרות בלוק — צורה וכיסוי ──────────────────────────────────────── */
{
  const lines = priv.split('\n');
  const hdrs = [];
  let bad = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (HDR_OPEN.test(l)) {
      const title = lines[i + 1] || '';
      const rule  = lines[i + 2] || '';
      if (!/^ {3}\S/.test(title) || title.length > 78) {
        fail(`שורה ${i + 2}: כותרת בלוק — שורת השם אינה תקנית (שלושה רווחים + שם, עד 78 תווים)`); bad++;
      } else if (!HDR_RULE.test(rule) && !HDR_END.test(rule)) {
        fail(`שורה ${i + 3}: כותרת בלוק — חסרה שורת מסגרת תחתונה ברוחב ${RULE_W}`); bad++;
      } else {
        hdrs.push({ line: i + 1, title: title.trim() });
      }
      continue;
    }
    if (HDR_NEAR.test(l) && !HDR_OPEN.test(l)) {
      fail(`שורה ${i + 1}: מסגרת כותרת ברוחב לא תקני — נדרשים בדיוק ${RULE_W} תווי ═`); bad++;
    }
  }

  /* טווח הקוד הפרטי — השורה הראשונה והאחרונה שאינן ריקות אחרי ההלבנה */
  let first = -1, last = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].trim()) { if (first < 0) first = i; last = i; }

  if (hdrs.length === 0) {
    fail('אין באזור הפרטי אף כותרת בלוק תקנית');
  } else {
    /* ⚠️ הכיסוי נמדד כמרווח בין כותרות ולא כ«כותרת לכל פונקציה»: אזור לוגי
       הוא רעיון, לא הצהרה. רצף ארוך בלי כותרת הוא בדיוק מה שנמדד בסבב 28. */
    /* ⚠️ המרווח נספר ב**שורות לא-ריקות של קוד פרטי** ולא במספרי שורות:
       בין שני אזורים יושבים HTML ו-CSS שהולבנו, וספירה גולמית הייתה
       מדווחת «1700 שורות בלי כותרת» על אזור שאין בו קוד בכלל. */
    const nonBlank = new Array(lines.length + 1).fill(0);
    for (let i = 0; i < lines.length; i++) nonBlank[i + 1] = nonBlank[i] + (lines[i].trim() ? 1 : 0);
    const marks = [first + 1, ...hdrs.map(h => h.line), last + 1];
    for (let k = 1; k < marks.length; k++) {
      const gap = nonBlank[marks[k]] - nonBlank[marks[k - 1]];
      if (gap > MAX_AREA_LINES) {
        fail(`שורות ${marks[k - 1]}–${marks[k]}: ${gap} שורות קוד פרטי בלי כותרת בלוק (המותר ${MAX_AREA_LINES})`);
        bad++;
      }
    }
  }
  if (!bad && hdrs.length) pass(`כותרות בלוק: ${hdrs.length} אזורים, כולם בפורמט התקני והכיסוי מלא`);
}

/* ── ב. ⛔ עם מספר סבב ועם סיבה (סבב 28) ────────────────────────────────── */
{
  let bad = 0, seen = 0;
  for (const { name, blocks: bs } of SCOPE) for (const b of bs) {
    if (b.text.indexOf('⛔') < 0) continue;
    seen++;
    /*  ⭐ סבב 67 — מספר הסבב עבר משם הקובץ ל**שורת הכותרת** שבגופו.
     *  ⚠️ עד הסבב הזה השם היה `test_round<N>_<נושא>.mjs`, ⛔ ומי שרצה
     *  לדעת מה בודק את מודול הנעילה לא ידע לחפש; מעכשיו השם הוא הנושא,
     *  והסבב נקרא משורת «— סבב N» שבראש הקובץ. ⛔ דרישת ה**סיבה**
     *  נשארת במלואה — היא מה שמונע מהסשן הבא לבטל את האיסור בתום לב,
     *  ואותה לא שם הקובץ ולא שורת הכותרת נותנים.
     *  ⚠️ ההקלה מוגבלת לקובצי המבחנים: ב-`check-*.mjs` אין שורה כזו. */
    const inRound = /^tools\/test_/.test(name) && /סבב\s+\d+/.test(HEADERS[name] || '');
    const hasRound = inRound || /סבב\s+\d+/.test(b.text);
    /* ⚠️ מפריד « — » בסוף שורה תקף בדיוק כמו באמצעה: הערה בת כמה שורות
       שמות הנימוק בשורה הבאה היא ניסוח לגיטימי, לא היעדר נימוק. */
    /*  ⭐ סבב 65 — ⛔ ששבוי בשורת **כותרת** (באנר `─`/`═`) אינו איסור אלא
     *  **שם** של הטענה שמתחתיה, והנימוק יושב בגוף. ⚠️ ההקלה מוגבלת לבלוק
     *  שכל ה-⛔ שבו יושבים בשורות כותרת: ⛔ אחד בגוף מחזיר את הדרישה. */
    const bodyStop = b.text.split('\n').filter(x => x.indexOf('⛔') >= 0 && !/[─═]{2,}/.test(x));
    const hasWhy   = / —\s/.test(b.text) || bodyStop.length === 0;
    if (!hasRound || !hasWhy) {
      const miss = [!hasRound ? 'מספר סבב' : null, !hasWhy ? 'סיבה אחרי « — »' : null].filter(Boolean).join(' ו');
      fail(`${name}:${b.line}: הערת ⛔ בלי ${miss}`);
      bad++;
    }
  }
  if (!bad) pass(`הערות ⛔: ${seen} בלוקים, כולם עם מספר סבב ועם סיבה`);
}

/* ── ג. סימנים — שלושה בלבד ────────────────────────────────────────────── */
{
  let bad = 0;
  for (const { name, blocks: bs } of SCOPE) for (const b of bs) {
    const ls = b.text.split('\n');
    for (let k = 0; k < ls.length; k++) {
      let t = ls[k];
      t = t.replace(/^\s*/, '').replace(/^\/\*+/, '').replace(/^\/\//, '').replace(/^\*+/, '').replace(/^\s*/, '');
      if (!t) continue;
      if (!PICTO.test(t)) continue;
      const ok = MARKERS.some(m => t.startsWith(m));
      if (!ok) {
        fail(`${name}:${b.line + k}: שורת הערה נפתחת בסמל שאינו ⛔/⚠️/⭐ — «${t.slice(0, 24)}»`);
        bad++;
      }
    }
  }
  if (!bad) pass('סימנים: כל שורת הערה שנפתחת בסמל משתמשת ב-⛔ / ⚠️ / ⭐ בלבד');
}

/* ── ד. טרמינולוגיה ────────────────────────────────────────────────────── */
{
  let bad = 0;
  for (const { name, blocks: bs } of SCOPE) for (const b of bs) {
    for (const t of TERMS) {
      t.bad.lastIndex = 0;
      if (t.bad.test(b.text)) {
        fail(`${name}:${b.line}: מונח לא תקני «${String(t.bad).replace(/[/g]/g, '')}» — הכתיב התקני הוא «${t.good}»`);
        bad++;
      }
    }
  }
  if (!bad) pass(`טרמינולוגיה: ${TERMS.length} מונחים נבדקו, כולם בכתיב התקני`);
}

/* ── ה. רוחב באנר ה-`──` בשערים ────────────────────────────────────────── */
/*  ⭐ סבב 65 — הבאנר היה תקן שני לא-מוצהר: 242 שורות ב-44 מתוך 45 קובצי
 *  `tools/`, ברוחב כולל 62–80. ⛔ תקן שלא נמדד נסחף, ולכן הרוחב נעול
 *  ל-`BANNER_W` — הערך שהיה כבר ברוב המכריע של השורות (165 מתוך 249).   */
{
  let bad = 0, seen = 0;
  for (const { name, blocks: bs, lines: srcLines } of SCOPE) {
    if (name === APP.file) continue;          /* ⚠️ שם התקן הוא מסגרת ה-`═` של סעיף א */
    for (const b of bs) {
      const ls = b.text.split('\n');
      for (let k = 0; k < ls.length; k++) {
        if (!/─{2,}/.test(ls[k])) continue;
        seen++;
        /*  ⚠️ נמדדת **שורת המקור** ולא פרוסת ההערה (סבב 65) — טקסט הבלוק
         *  מתחיל ב-`/*` ומשמיט את ההזחה שלפניו, ולכן מדידה עליו הייתה
         *  מדווחת 76 על שורה שרוחבה 78. */
        const full = srcLines[b.line - 1 + k];
        if (full === undefined || full.length === BANNER_W) continue;
        fail(`${name}:${b.line + k}: באנר «─» ברוחב ${full.length} במקום ${BANNER_W}`);
        bad++;
      }
    }
  }
  if (!bad) pass(`באנרי «─»: ${seen} שורות, כולן ברוחב ${BANNER_W}`);
}

if (failures) {
  console.error(`\n❌ ${APP.app}: ${failures} סטיות מתקן ההערות (כלל ברזל 11)`);
  process.exit(1);
}
/* ───────────────────────────────────────────────────────────────────────────
   ו · ⛔ כל מבחן נכנס עם מוטציה — או עם נימוק כתוב (סבב 67)
   ───────────────────────────────────────────────────────────────────────────
   ⛔ מה נאכף: `tools/test_*.mjs` מכיל «מוטציה» **וגם** «מוטציית-נגד», או
   נימוק מפורש מדוע אינו ניתן למוטציה. ⛔ ולמה זה יכול להישבר: מבחן
   שעובר על עץ תקין ואינו מסוגל ליפול נראה כרשת ביטחון ופועל כאישור.
   ──────────────────────────────────────────────────────────────────────── */
{
  let bad = 0, seen = 0;
  let names = [];
  try { names = fs.readdirSync('tools').filter((f) => /^test_.*\.mjs$/.test(f)); } catch (e) {}
  for (const f of names) {
    let t = '';
    try { t = fs.readFileSync('tools/' + f, 'utf8'); } catch (e) { continue; }
    seen++;
    const hasMut  = t.indexOf('מוטציה') >= 0;
    const hasAnti = t.indexOf('מוטציית-נגד') >= 0;
    /*  ⚠️ נימוק מפורש הוא מסלול חוקי — ⛔ אך הוא נקרא בעין ואינו
     *  מדלג בשתיקה (סבב 67) — «אין כאן מה למוטט» חייב להיאמר. */
    const excused = /אינו ניתן למוטציה/.test(t);
    if (excused) continue;
    if (!hasMut || !hasAnti) {
      bad++;
      fail(`tools/${f}: ` + (!hasMut ? 'אין מוטציה' : 'אין מוטציית-נגד') +
           ' — מבחן נכנס עם מוטציה ועם מוטציית-נגד, או עם נימוק כתוב ' +
           '«אינו ניתן למוטציה» (כלל ברזל 11, סבב 67)');
    }
  }
  if (!bad) pass(`מוטציות: ${seen} מבחנים, לכל אחד מוטציה ומוטציית-נגד`);
}

console.log(`\n✅ ${APP.app}: תקן ההערות תקין`);
