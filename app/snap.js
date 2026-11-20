// app/snap.js — ייצוא תמונה: רכיב שנבנה לפלט נצרב ל-JPEG (html2canvas) ויוצא בשיתוף (core/share.js).
// הפלט נבנה מחדש ולא מצולם מהמסך — במסך הקבוצות סגורות וההתחייבויות מקופלות, והתמונה מציגה הכל.
import { toast } from '../core/ui.js';
import { shareFile } from '../core/share.js';
import { MSG_IMG_FAIL, MSG_IMG_OFFLINE, MSG_IMG_PREP } from './constants.js';

// התאריך העברי לשם הקובץ — מהלוח העברי של הדפדפן.
function hebToday() {
  try { return new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); }
  catch (e) { return ''; }
}

// שורש הפלט — הערכה הבהירה גם במצב כהה (.snap), ברוחב קבוע, מחוץ לתצוגה.
// html2canvas משכפל רק את הרכיב, אבותיו וה-head — שכפול הדף כולו מאט כגודל הדף.
function snapShare(html, title) {
  if (typeof html2canvas !== 'function') { toast(MSG_IMG_OFFLINE, null, 'bad'); return; }
  toast(MSG_IMG_PREP);
  var div = document.createElement('div');
  div.className = 'snap';
  div.innerHTML = html;
  document.body.appendChild(div);
  Promise.resolve().then(function () {
    return html2canvas(div, { scale: 2, useCORS: true, backgroundColor: getComputedStyle(div).backgroundColor, logging: false,
      ignoreElements: function (el) {
        return !(el === div || div.contains(el) || el.contains(div) || el.tagName === 'HEAD' || !!el.closest('head'));
      } });
  }).then(function (canvas) {
    div.remove();
    shareFile(canvas.toDataURL('image/jpeg', 0.92).split(',')[1], 'image/jpeg', title + ' ' + hebToday() + '.jpg');
  }).catch(function (e) {
    div.remove();
    console.error('[snap] rendering failed:', e);
    toast(MSG_IMG_FAIL, null, 'bad');
  });
}

export { snapShare };
