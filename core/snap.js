// core/snap.js — ייצוא תמונה: רכיב שנבנה לפלט נצרב ל-JPEG (html2canvas) ויוצא בשיתוף (core/share.js) — גוף אחד בכל האפליקציות.
// הפלט נבנה מחדש ולא מצולם מהמסך. כמה עמודים — תמונה לכל עמוד, «חלק X מתוך Y» בתחתית כל אחד, וחלון ובו כפתור שיתוף לכל חלק — כמו בדוח של יומן עבודה.
// העיצוב — של האפליקציה (.snap ומה שבתוכו), והאייקון «שיתוף» — מהסט שלה (shellIcon('share')).
import { esc, openModal, toast } from './ui.js';
import { shareFile, shareFiles } from './share.js';
import { shellIcon } from './icons.js';

var MSG_SNAP = {
  prep: 'מכין תמונה...', offline: 'יצירת התמונה לא זמינה — נדרש חיבור לאינטרנט פעם אחת', fail: 'יצירת התמונה נכשלה — נסה שוב',
  parts: 'שיתוף בחלקים', part: 'חלק', of: 'מתוך', done: 'שותף'
};

// התאריך העברי לשם הקובץ — מהלוח העברי של הדפדפן.
function hebToday() {
  try { return new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); }
  catch (e) { return ''; }
}

// עמוד אחד — שורש הפלט ברוחב קבוע, מחוץ לתצוגה; html2canvas משכפל רק את הרכיב, אבותיו וה-head — שכפול הדף כולו מאט כגודל הדף.
function render(html) {
  var div = document.createElement('div');
  div.className = 'snap';
  div.innerHTML = html;
  document.body.appendChild(div);
  return Promise.resolve().then(function () {
    return html2canvas(div, { scale: 2, useCORS: true, backgroundColor: getComputedStyle(div).backgroundColor, logging: false,
      ignoreElements: function (el) {
        return !(el === div || div.contains(el) || el.contains(div) || el.tagName === 'HEAD' || !!el.closest('head'));
      } });
  }).then(function (canvas) { div.remove(); return canvas.toDataURL('image/jpeg', 0.92).split(',')[1]; },
          function (e) { div.remove(); throw e; });
}

var _parts = [];
function partLabel(i) { return MSG_SNAP.part + ' ' + (i + 1) + ' ' + MSG_SNAP.of + ' ' + _parts.length; }
function partsDialog() {
  openModal(MSG_SNAP.parts, '<div class="rp-parts">' + _parts.map(function (f, i) {
    return '<button type="button" class="rp-part" data-act="snap-part" data-i="' + i + '">' + shellIcon('share') +
      '<span>' + esc(partLabel(i)) + '</span></button>';
  }).join('') + '</div>', '', shellIcon('share'));
}
// חלק ששותף — בהיר ובסימון וי, ועדיין לחיץ לשיתוף חוזר.
function snapSharePart(el) {
  var i = Number(el.getAttribute('data-i')), f = _parts[i];
  if (!f) return;
  try { shareFiles([f]); } catch (e) { toast(e.message, null, 'bad'); return; }
  el.classList.add('is-done');
  el.innerHTML = shellIcon('good') + '<span>' + esc(MSG_SNAP.done + ': ' + partLabel(i)) + '</span>';
}

// pages — מחרוזת אחת או רשימה; caption — הכיתוב של כל חלק בשיתוף (תמונה עם כיתוב אינה מתקבצת לאלבום).
function snapShare(pages, title, caption) {
  if (typeof html2canvas !== 'function') { toast(MSG_SNAP.offline, null, 'bad'); return; }
  pages = [].concat(pages);
  var n = pages.length, name = title + ' ' + hebToday(), out = [];
  toast(MSG_SNAP.prep);
  function next(i) {
    if (i >= n) {
      if (n === 1) { shareFile(out[0].b64, 'image/jpeg', name + '.jpg'); return; }
      _parts = out; partsDialog(); return;
    }
    var tag = MSG_SNAP.part + ' ' + (i + 1) + ' ' + MSG_SNAP.of + ' ' + n;
    render(pages[i] + (n > 1 ? '<div class="snap-foot">' + esc(tag) + '</div>' : '')).then(function (b64) {
      out.push({ b64: b64, mime: 'image/jpeg', name: name + (n > 1 ? ' - ' + tag : '') + '.jpg', text: n > 1 ? (caption || title) + ' · ' + tag : '' });
      next(i + 1);
    }).catch(function (e) {
      console.error('[snap] rendering failed:', e);
      toast(MSG_SNAP.fail, null, 'bad');
    });
  }
  next(0);
}

// מפת הפעולות — האפליקציה פורשת אותה לתוך DOM_ACTIONS שלה
var SNAP_ACTIONS = { 'snap-part': function (el) { snapSharePart(el); } };

export { SNAP_ACTIONS, snapShare, snapSharePart };
