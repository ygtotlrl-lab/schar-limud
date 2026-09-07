/* ───────────────────────────────────────────────────────────────────────────
   הלבנת מקור — מודול משותף לשערים (סבב 111)

   ⛔ מה נאכף: שער שמחפש **דפוס בקוד** מקבל מכאן מקור שבו מחרוזות והערות
      הוחלפו ברווחים באורך זהה — ⚠️ ההיסטים נשמרים, ⭐ ומספר שורה שנגזר
      מהתוצאה מצביע על אותה שורה במקור.
   ⚠️ הנימוק המדוד: שער שסרק גולמי ספר שם שיושב **בתוך מחרוזת** כמזהה
      חי — ⛔ ודיווח מזהה DOM שאיש אינו קורא על טקסט שאינו DOM כלל.
   ⛔ מה יישבר בלעדיו: כל שער היה מלבין בעצמו, ⚠️ ושלוש צורות להלבנה הן
      שלוש תשובות לאותה שאלה — ⭐ בדיוק הסחיפה שהחתימות באו למנוע.
   ⭐ מה אינו נאכף כאן: **הסימון של תגיות ה-HTML** — ⛔ הן נשארות כפי
      שהן: ⚠️ שער שמודד מבנה מסמך זקוק להן, ⭐ ומי שמודד קוד בלבד מסיר
      אותן אצלו.
   ──────────────────────────────────────────────────────────────────────── */

/*  ⛔ ההלבנה בזיכרון ⛔ ואינה נוגעת בקובץ — ⚠️ שער הוא קורא בלבד. */
const RE_OK_BEFORE = /[({[,;:!&|?+\-*%~^<=>]$/;
const RE_KW_BEFORE = /\b(return|typeof|instanceof|case|in|of|new|delete|void|do|else|yield|await)$/;

/*  ⛔ המחרוזת מוחלפת ברווחים באורך זהה ⛔ ולא נמחקת — ⚠️ מחיקה מזיזה כל
 *  היסט שאחריה, ⭐ ומספר שורה שנגזר מהתוצאה מצביע על שורה אחרת. */
function blankRange(out, text, from, to) {
  for (let i = from; i < to; i++) out[i] = (text[i] === '\n') ? '\n' : ' ';
}

function scanJs(text, from, to, out) {
  let i = from, lastCode = '';
  while (i < to) {
    const c = text[i], c2 = text[i + 1];
    if (c === '/' && c2 === '/') {
      const e = text.indexOf('\n', i);
      const end = (e < 0 || e > to) ? to : e;
      blankRange(out, text, i, end); i = end; continue;
    }
    if (c === '/' && c2 === '*') {
      const e = text.indexOf('*/', i + 2);
      const end = (e < 0 || e + 2 > to) ? to : e + 2;
      blankRange(out, text, i, end); i = end; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c, s0 = i; i++;
      while (i < to) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === q) { i++; break; }
        i++;
      }
      /*  ⛔ הגרשיים מולבנים אף הם — ⚠️ שער שמחפש ליטרל צמוד לסוגר היה
       *  מוצא את הגרשיים הריקים כקוד, ⭐ ורווח אינו נקרא כדבר. */
      blankRange(out, text, s0, i);
      lastCode = 'x'; continue;
    }
    if (c === '/') {
      const t = lastCode.replace(/\s+$/, '');
      if (t === '' || RE_OK_BEFORE.test(t) || RE_KW_BEFORE.test(t)) {
        const s0 = i; i++;
        let cls = false;
        while (i < to) {
          if (text[i] === '\\') { i += 2; continue; }
          if (text[i] === '[') cls = true;
          else if (text[i] === ']') cls = false;
          else if (text[i] === '/' && !cls) { i++; break; }
          else if (text[i] === '\n') break;
          i++;
        }
        while (i < to && /[a-z]/.test(text[i])) i++;
        /*  ⚠️ תבנית regex נשארת כפי שהיא — ⛔ היא **קוד**, ⭐ ושער
         *  שמודד תבנית מדד אותה עד כה במקור הגולמי. */
        void s0;
        lastCode = 'x'; continue;
      }
    }
    lastCode += c;
    if (lastCode.length > 40) lastCode = lastCode.slice(-40);
    i++;
  }
}

/*  ⛔ הסריקה על אזורי `<script>` בלבד — ⚠️ תגית HTML אינה קוד, ⭐ ומרכאות
 *  במאפיין אינן מחרוזת JS: ⛔ הלבנתן הייתה מוחקת כל `id=` ו-`class=`. */
export function whiten(src, opts) {
  const out = src.split('');
  /*  ⛔ **הסימון נשמר כברירת מחדל** — ⚠️ שער שמודד תגיות זקוק להן;
   *  ⭐ ומי שמודד קוד בלבד מבקש `markup: 'blank'`: ⛔ ושורות חדשות
   *  נשמרות בשני המצבים — ⚠️ מספר שורה שנגזר מהתוצאה חייב להצביע על
   *  אותה שורה במקור, ⭐ והלבנה שבולעת `\n` מקצרת את הספירה. */
  const blankMarkup = opts && opts.markup === 'blank';
  for (const m of src.matchAll(/<!--[\s\S]*?-->/g))
    blankRange(out, src, m.index, m.index + m[0].length);
  const re = /<script(?![^>]*\ssrc[=\s])[^>]*>/gi;
  let m, prev = 0;
  while ((m = re.exec(src)) !== null) {
    const from = m.index + m[0].length;
    const to = src.indexOf('</script', from);
    const end = to < 0 ? src.length : to;
    if (blankMarkup) blankRange(out, src, prev, from);
    scanJs(src, from, end, out);
    prev = end;
    re.lastIndex = end;
  }
  if (blankMarkup) blankRange(out, src, prev, src.length);
  return out.join('');
}

/*  ⛔ קובץ JS שלם — ⚠️ קובץ שער אינו עטוף ב-`<script>`, ⭐ ולכן נקודת
 *  כניסה שנייה לאותה הלבנה: ⛔ ולא מימוש שני. */
export function whitenJs(src) {
  const out = src.split('');
  scanJs(src, 0, src.length, out);
  return out.join('');
}
