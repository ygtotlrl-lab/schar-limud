/* ═══ core/chart.js — גרף העמודות ═══════════════════════════════════════
   ⭐ פס יחיד ופס בסדרה — ⚠️ רכיב אחד, ⛔ ורק במי שיש בה סדרה.
   השורות: «גרף נבנה מ-CSS ולא מספרייה»
   ⛔ המודול זהה בית-לבית בכל ריפו שנושא אותו — ⚠️ והתצורה פר-אפליקציה
      נמסרת ב-`appConfigure` שבראש `index.html`, ⭐ ואינה כתובה כאן.
   ⛔ ושינוי כאן — בכל הריפו שנושאים אותו, באותו סבב.
   ════════════════════════════════════════════════════════════════════ */

import { esc } from './ui.js';

/* ═══ גרף העמודות — מודול משותף ═════════════════════════════════════════════
   ⛔ סדרה מוצגת ברוחב יחסי ⛔ ולא בספריית גרפים — ⚠️ הרוחב הוא התכונה
      היחידה שנגזרת מהנתון, ⭐ והוא החריג היחיד לסגנון מוטבע.
   ⛔ פחות משתי נקודות אינו גרף — ⚠️ עמודה אחת אינה משווה דבר, ⭐ והמסך
      מציג את הטבלה בלבד: ⛔ המחזירה מחרוזת ריקה ⛔ ואינה מציירת מסגרת.
   ⛔ וכל שורה נושאת `aria-label` עם המספרים — ⚠️ גרף בלי טקסט חלופי אינו
      נגיש, ⭐ והוא כל מה שקורא-מסך רואה.
   ⛔ **פס יחיד ופס בסדרה הם רכיב אחד** — ⚠️ `bar` היא אתר
      הרוחב הדינמי האחד, ⭐ ו-`barChart` קוראת לה בלולאה: ⛔ שני מימושים
      באותה אפליקציה הם שני מקומות שבהם הרוחב נכתב ביד, ⚠️ ושניים כאלה
      נמדדו — הסדרה בבונה, והפס בטבלת הפילוח.
   ⛔ **מה נכנס**: `lab` תווית · `val` הערך · `tgt` היעד · `txt` הטקסט
      החלופי · `end` מה שנכתב בסוף השורה.
   ⛔ **ו-`noTarget` הוא דגל בחתימה** — ⚠️ וכשהוא דולק הפס השני **אינו
      נוצר**, ⭐ ואינו נוצר-ומוסתר: ⛔ הסתרה ב-CSS פר-אפליקציה משאירה
      את הקוד רץ ואת האלמנט ב-DOM, ⚠️ ומי שקורא את המודול אינו יודע
      שהוא מכובה. ⭐ **והמכנה נשמר** — ⛔ `max` עדיין נגזר מ-`val`
      ומ-`tgt`, ⚠️ והסרת הציור אינה משנה את אורכי הפסים. */
/*  ⛔ הרוחב נכתב למשתנה CSS ⛔ ולא לתגית — ⚠️ סגנון מוטבע גובר על כל
 *  מחלקה ואינו ניתן לשינוי ממקום אחד: ⭐ והצביעה נדחית לפריים שאחרי
 *  ה-`innerHTML`, ⛔ שהיא הרגע שבו הפסים כבר בעץ. */
var _barPending = false;
function barPaint() {
  _barPending = false;
  var l = document.querySelectorAll('.btrack > i[data-pct]'), i;
  for (i = 0; i < l.length; i++)
    l[i].style.setProperty('--bar-w', l[i].getAttribute('data-pct') + '%');
}
function bar(pct, cls) {
  if (!_barPending) { _barPending = true; requestAnimationFrame(barPaint); }
  return '<span class="btrack' + (cls ? ' ' + cls : '') +
         '"><i data-pct="' + pct + '"></i></span>';
}
function barChart(rows, label, noTarget) {
  if (!Array.isArray(rows) || rows.length < 2) return '';
  var max = 0, i;
  for (i = 0; i < rows.length; i++) max = Math.max(max, rows[i].val || 0, rows[i].tgt || 0);
  if (!(max > 0)) return '';
  var pct = function (v) { return Math.round(((v || 0) / max) * 1000) / 10; };
  var h = '<div class="bchart" role="img" aria-label="' + esc(label) + '">';
  for (i = 0; i < rows.length; i++) {
    h += '<div class="brow" aria-label="' + esc(rows[i].txt) + '">' +
      '<span class="blab">' + esc(rows[i].lab) + '</span>' +
      '<span class="bbars">' + bar(pct(rows[i].val)) +
      (noTarget ? '' : bar(pct(rows[i].tgt), 'tgt')) +
      '</span>' +
      '<span class="bval">' + esc(rows[i].end) + '</span></div>';
  }
  return h + '</div>';
}
/* ═══════════════ סוף מודול גרף העמודות ══════════════════════════════════ */

/*  ⛔ הייצוא בשם ⛔ ואינו `default` — ⚠️ קורא שמייבא שם שנעלם נשבר בטעינה,
 *  ⭐ ו-`default` היה נבלע בשקט. */
export { bar, barChart };
