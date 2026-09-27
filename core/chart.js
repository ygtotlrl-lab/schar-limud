// core/chart.js — גרף העמודות

import { esc } from './ui.js';

// ── גרף העמודות ──
// noTarget אינו יוצר את הפס השני כלל, ולא מסתיר אותו — והמכנה max עדיין נגזר גם מ-tgt.
// הרוחב נכתב למשתנה CSS ונצבע בפריים שאחרי ה-innerHTML — רק אז הפסים כבר בעץ.
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

// ייצוא בשם ולא default — שם שנעלם נשבר בטעינה, ו-default היה נבלע בשקט.
export { bar, barChart };
