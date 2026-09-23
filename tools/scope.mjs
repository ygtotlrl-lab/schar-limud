/* ───────────────────────────────────────────────────────────────────────────
   חילוץ ההיקף — מודול משותף לשערים

   ⛔ מה נאכף: שער שמודד טענה מקבל מכאן את **ההיקף** שבו היא נמדדת —
      ⚠️ `bodyOf` את הטווח המסוגר שנפתח אחרי סמן, ⭐ ו-`scopeOf` את
      הסימון של כל אלמנט שמתאים לבורר: ⛔ והמודול עצמו אינו מפיל —
      ⚠️ הוא מחזיר מחרוזת ריקה, ⭐ והשער שקורא לו מפיל על היעדר ההיקף.
   ⚠️ הנימוק המדוד: 21 בדיקות הכריעו במבחן חברות על המקור כולו, ⛔ ושלוש
      אישרו באג חי — מיכל שנבנה ב-JS, סמל שנמדד בכתובת ה-CDN, ⭐ ומאזין
      שנספר בתוך מחרוזת: ⛔ «המחרוזת קיימת» אינו «היא במקום הנכון».
      ⚠️ ומונה סוגריים שאינו מדלג על תבנית `regex` נמתח מעל סוף הגוף —
      ⭐ `/\.toast\{/` נושא סוגר פותח בלבד, ⛔ והגוף רץ עד סוף הקובץ.
   ⛔ מה יישבר בלעדיו: כל שער היה חותך את ההיקף בעצמו, ⚠️ וכמה מימושים
      לחיתוך סוגריים הם כמה מקומות שבהם גוף נמתח מעל סופו.
   ⭐ מה אינו נאכף כאן: **איזה** היקף נכון לטענה — ⛔ זו קריאת משמעות,
      ⚠️ ונסרקת ידנית בכל סבב שנוגע.
   ──────────────────────────────────────────────────────────────────────── */

/*  ⛔ החיתוך בזיכרון ⛔ ואינו נוגע בקובץ — ⚠️ שער הוא קורא בלבד. */
const RE_OK_BEFORE = /[({[,;:!&|?+\-*%~^<=>]$/;
const RE_KW_BEFORE = /\b(return|typeof|instanceof|case|in|of|new|delete|void|do|else|yield|await)$/;

/*  ⛔ הסמן הוא שם פונקציה או טקסט כלשונו — ⚠️ שם שאין בו אלא אותיות
 *  נפתר ל-`function <שם>(`, ⭐ וכל השאר נלקח כלשונו: ⛔ מטפל שנרשם
 *  בתוך מאזין אינו פונקציה בשם, ⚠️ וגופו הוא ההיקף שלו. */
function markEnd(src, mark) {
  const key = /^[A-Za-z_$][\w$]*$/.test(mark) ? 'function ' + mark + '(' : mark;
  const i = src.indexOf(key);
  return i < 0 ? -1 : i + key.length;
}

/*  ⛔ מונה הסוגריים מדלג על מחרוזת, הערה ותבנית — ⚠️ שלושתן נושאות
 *  סוגריים שאינם מאוזנים, ⭐ והגוף שנמתח מעליהן מסווג את הבדיקה להיקף
 *  שאינו שלה. ⛔ **והחזרה היא מחרוזת ריקה** ⛔ ולא `null` — ⚠️ קורא
 *  שמחפש דפוס במחרוזת ריקה אינו מוצא אותו, ⭐ וזה בדיוק «אין היקף». */
export function bodyOf(src, mark) {
  const at = markEnd(src, mark);
  if (at < 0) return '';
  const from = src.indexOf('{', at);
  if (from < 0) return '';
  let d = 0, i = from, last = '';
  while (i < src.length) {
    const c = src[i], c2 = src[i + 1];
    if (c === '/' && c2 === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
    if (c === '/' && c2 === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === c) { i++; break; }
        i++;
      }
      last = 'x'; continue;
    }
    if (c === '/') {
      const t = last.replace(/\s+$/, '');
      if (t === '' || RE_OK_BEFORE.test(t) || RE_KW_BEFORE.test(t)) {
        i++;
        let cls = false;
        while (i < src.length) {
          if (src[i] === '\\') { i += 2; continue; }
          if (src[i] === '[') cls = true;
          else if (src[i] === ']') cls = false;
          else if (src[i] === '/' && !cls) { i++; break; }
          else if (src[i] === '\n') break;
          i++;
        }
        while (i < src.length && /[a-z]/.test(src[i])) i++;
        last = 'x'; continue;
      }
    }
    if (c === '{') d++;
    else if (c === '}') { d--; if (!d) return src.slice(from, i + 1); }
    last = (last + c).slice(-40);
    i++;
  }
  return '';
}

/*  ⛔ תגיות שאין להן סוגר — ⚠️ ההיקף שלהן הוא התגית עצמה, ⭐ וחיפוש
 *  `</input>` היה רץ עד סוף המסמך. */
const VOID_TAGS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                   'link', 'meta', 'source', 'track', 'wbr'];

function tagEnd(src, at, tag, openLen) {
  if (VOID_TAGS.indexOf(tag.toLowerCase()) >= 0) return at + openLen;
  const open = new RegExp('<' + tag + '(?=[\\s>/])', 'gi');
  const close = new RegExp('</' + tag + '\\s*>', 'gi');
  let d = 1, i = at + openLen;
  while (i < src.length) {
    open.lastIndex = i; close.lastIndex = i;
    const o = open.exec(src), c = close.exec(src);
    if (!c) return src.length;
    if (o && o.index < c.index) { d++; i = o.index + o[0].length; continue; }
    d--; i = c.index + c[0].length;
    if (!d) return i;
  }
  return src.length;
}

/*  ⛔ הבורר הוא תגית · `#מזהה` · או `.מחלקה` — ⚠️ **וההיקף הוא כל
 *  האלמנטים שמתאימים**, משורשרים: ⭐ אלמנט אחד אינו ההיקף כשיש שניים,
 *  ⛔ ומדידה על הראשון בלבד מאשרת את השני. */
export function scopeOf(src, sel) {
  const m = /^([a-zA-Z][\w-]*)?(?:([#.])([\w-]+))?$/.exec(sel);
  if (!m || (!m[1] && !m[2])) return '';
  const tag = m[1] || '[a-zA-Z][\\w-]*';
  const out = [];
  const open = new RegExp('<(' + tag + ')((?:\\s[^>]*)?)>', 'g');
  let o;
  while ((o = open.exec(src)) !== null) {
    const at = o[2] || '';
    if (m[2] === '#' && !new RegExp('\\sid="' + m[3] + '"').test(at)) continue;
    if (m[2] === '.' && !new RegExp('\\sclass="(?:[^"]*\\s)?' + m[3] + '(?:\\s[^"]*)?"').test(at)) continue;
    out.push(src.slice(o.index, tagEnd(src, o.index, o[1], o[0].length)));
  }
  return out.join('\n');
}

/*  ⛔ נימוק שהוא נוכחות בלבד — ⚠️ הוא חוזר על **המדידה** שכבר נעשתה,
 *  ⭐ ואינו אומר דבר על התפקיד: ⛔ והוא בדיוק ההצהרה שעוברת בשקט. */
const PRESENCE_ONLY =
  /אינה בכולן|אינו בכולן|אינם בכולן|לא בכולן|קיימת רק ב|קיים רק ב|קיימות רק ב|יש רק ב|קיימת בשתיים|קיים בשתיים|קיימת בשלוש|קיים בשלוש/;
/*  ⛔ שני חלקים ומפריד ביניהם — ⚠️ הראשון מה הדבר עושה, ⭐ והשני למה
 *  לתפקיד אין מקבילה: ⛔ נימוק שכולו חלק אחד אינו נמדד בשני הצדדים. */
const PART_MIN = 15;

/*  ⛔ נימוק תפקידי — ⚠️ **מה נכנס**: מפה של שם ⟵ נימוק; ⛔ **ומה מפיל**:
 *  הצהרה בלי נימוק · נימוק שהוא נוכחות בלבד · ונימוק שאין בו שני חלקים.
 *  ⭐ **ולמה כאן**: שני מרשמים שונים — שמות פונקציה ושמות שערים — נמדדים
 *  באותה אמת מידה, ⛔ ושני עותקים שלה היו נסחפים זה מזה. */
export function reasonGaps(decl) {
  const out = [];
  for (const [name, why] of Object.entries(decl || {})) {
    const s = typeof why === 'string' ? why.trim() : '';
    if (!s) { out.push(name + ': הצהרה בלי נימוק'); continue; }
    if (PRESENCE_ONLY.test(s)) { out.push(name + ': נימוק שהוא נוכחות בלבד'); continue; }
    const i = s.indexOf(' — ');
    if (i < 0) { out.push(name + ': נימוק בלי מפריד בין התפקיד להיעדרו'); continue; }
    const does = s.slice(0, i).trim(), why2 = s.slice(i + 3).trim();
    if (does.length < PART_MIN) out.push(name + ': הנימוק אינו אומר מה הוא עושה');
    else if (why2.length < PART_MIN) out.push(name + ': הנימוק אינו אומר למה התפקיד אינו קיים בשאר');
  }
  return out;
}
