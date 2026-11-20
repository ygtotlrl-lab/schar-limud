// app/snap.js — ייצוא תמונה: רכיב שנבנה לפלט נצרב ל-JPEG (html2canvas) ויוצא בשיתוף (core/share.js) — כמו בגיוס.
// הפלט נבנה מחדש ולא מצולם מהמסך. כמה עמודים — תמונה לכל עמוד, «חלק X מתוך Y» בתחתית כל אחד, וחלון ובו כפתור שיתוף לכל חלק — כמו בדוח של יומן עבודה.
import { esc, openModal, toast } from '../core/ui.js';
import { shareFile, shareFiles } from '../core/share.js';
import { MSG_IMG_FAIL, MSG_IMG_OFFLINE, MSG_IMG_PREP, SNAP_DONE, SNAP_OF, SNAP_PART, SNAP_PARTS } from './constants.js';
import { icon } from './icons.js';

// התאריך העברי לשם הקובץ — מהלוח העברי של הדפדפן.
function hebToday() {
  try { return new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); }
  catch (e) { return ''; }
}

// עמוד אחד — שורש הפלט ברוחב קבוע, מחוץ לתצוגה; html2canvas משכפל רק את הרכיב, אבותיו וה-head.
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
function partsDialog() {
  openModal(SNAP_PARTS, '<div class="rp-parts">' + _parts.map(function (f, i) {
    return '<button type="button" class="rp-part" data-act="snap-part" data-i="' + i + '">' + icon('share') +
      '<span>' + SNAP_PART + ' ' + (i + 1) + ' ' + SNAP_OF + ' ' + _parts.length + '</span></button>';
  }).join('') + '</div>', '', icon('share'));
}
// חלק ששותף — בהיר ובסימון וי, ועדיין לחיץ לשיתוף חוזר.
function snapSharePart(el) {
  var i = Number(el.getAttribute('data-i')), f = _parts[i];
  if (!f) return;
  try { shareFiles([f]); } catch (e) { toast(e.message, null, 'bad'); return; }
  el.classList.add('is-done');
  el.innerHTML = icon('check') + '<span>' + esc(SNAP_DONE + ': ' + SNAP_PART + ' ' + (i + 1) + ' ' + SNAP_OF + ' ' + _parts.length) + '</span>';
}

// pages — מחרוזת אחת או רשימה; caption — הכיתוב של כל חלק בשיתוף (תמונה עם כיתוב אינה מתקבצת לאלבום).
function snapShare(pages, title, caption) {
  if (typeof html2canvas !== 'function') { toast(MSG_IMG_OFFLINE, null, 'bad'); return; }
  pages = [].concat(pages);
  var n = pages.length, name = title + ' ' + hebToday(), out = [];
  toast(MSG_IMG_PREP);
  function next(i) {
    if (i >= n) {
      if (n === 1) { shareFile(out[0].b64, 'image/jpeg', name + '.jpg'); return; }
      _parts = out; partsDialog(); return;
    }
    var tag = SNAP_PART + ' ' + (i + 1) + ' ' + SNAP_OF + ' ' + n;
    render(pages[i] + (n > 1 ? '<div class="snap-foot">' + esc(tag) + '</div>' : '')).then(function (b64) {
      out.push({ b64: b64, mime: 'image/jpeg', name: name + (n > 1 ? ' - ' + tag : '') + '.jpg', text: n > 1 ? caption + ' · ' + tag : '' });
      next(i + 1);
    }).catch(function (e) {
      console.error('[snap] rendering failed:', e);
      toast(MSG_IMG_FAIL, null, 'bad');
    });
  }
  next(0);
}

export { snapShare, snapSharePart };
