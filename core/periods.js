// core/periods.js — תקופות הפעילות של תלמיד: מנוע אחד, והלוח נמסר מבחוץ (לועזי בשכר לימוד, עברי בהנהלה)
// תקופה — { start, end } במפתחות חודש «שנה-חודש» בשתי ספרות, ו-end ריק לתקופה פתוחה; התקופות על השדה periods של התלמיד.
// המפתח ממוין כרונולוגית כמחרוזת — ולכן ההשוואה לקסיקוגרפית, בלי המרה לתאריך ובלי תלות בלוח.
// בלי חפיפה, ותקופה פתוחה אחת לכל היותר — האחרונה. «פעיל» אינו נשמר: חודש בתוך תקופה — פעיל, ומחוץ לכולן — לא.
//
// cal — הלוח של האפליקציה:
//   valid(k)   — מפתח חודש תקין בלוח הזה
//   now()      — מפתח החודש הנוכחי
//   add(k, n)  — המפתח n חודשים אחרי k (n שלילי — לפניו)
//   label(k)   — שם החודש והשנה לתצוגה
//   msg        — { openLast, overlap, endBefore, none }: הודעות הפגם, מהמחרוזות של האפליקציה
//   removeIcon — סימון כפתור ההסרה בעורך, מהאייקונים של האפליקציה
//
// העורך — אחד בשתי האפליקציות: שורה לכל תקופה — «מ» · «עד» (ו«עדיין בישיבה» לתקופה פתוחה) · הסרה, ו«+ הוסף תקופה».
// הפעולות בכפתורים — per-add · per-remove, מחווטות במפת הפעולות של האפליקציה ל-addRow · removeRow.
import { esc } from './ui.js';

function periodsEngine(cal) {
  // ערך שאינו מפתח תקין היה משתתף בהשוואה ומחזיר טווח שגוי בשקט — ולכן ערך פסול נחשב «לא הוגדר»
  function norm(v) { v = (v == null ? '' : String(v)).trim(); return cal.valid(v) ? v : ''; }

  function byStart(a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; }

  // תקופה בלי התחלה תקינה אינה תקופה. המפתח — start.
  function list(s) {
    return ((s && Array.isArray(s.periods)) ? s.periods : []).map(function (p) {
      return { start: norm(p && p.start), end: norm(p && p.end) || null };
    }).filter(function (p) { return p.start; }).sort(byStart);
  }

  function has(p, k) { return k >= p.start && (!p.end || k <= p.end); }

  // בלי חודש — החודש הנוכחי.
  function inMonth(s, k) { if (!s) return false; k = k || cal.now(); return list(s).some(function (p) { return has(p, k); }); }

  // מצב הכפתור «פעיל» — תקופה שנמשכת מעבר לחודש הנוכחי; תלמיד שנסגר החודש עדיין נספר בו, אך הכפתור כבר כבוי.
  function continues(s) { var k = cal.now(); return list(s).some(function (p) { return has(p, k) && p.end !== k; }); }

  // כיבוי — התקופה נסגרת בחודש הנוכחי: נספר החודש ויוצא מהבא.
  // הפעלה — תקופה שנסגרה החודש נפתחת מחדש, בלי תקופה שנייה; אחרת תקופה חדשה מהחודש הנוכחי, עד שלפני הבאה אם יש.
  function toggled(s) {
    var k = cal.now(), ps = list(s);
    if (continues(s)) return ps.map(function (p) { return has(p, k) ? { start: p.start, end: k } : p; });
    var hit = ps.filter(function (p) { return has(p, k); })[0];
    var next = ps.filter(function (p) { return p.start > k; })[0];
    var end = next ? cal.add(next.start, -1) : null;
    if (hit) return ps.map(function (p) { return p === hit ? { start: p.start, end: end } : p; });
    return ps.concat([{ start: k, end: end }]).sort(byStart);
  }

  // בארכיון — מי שכל תקופותיו הסתיימו לפני החודש הנוכחי; תקופה עתידית משאירה ברשימה.
  function archived(s) { var k = cal.now(); return !list(s).some(function (p) { return !p.end || p.end >= k; }); }

  // הסדר, החפיפה והתקופה הפתוחה — רשימה פגומה נדחית כאן, לפני שהיא נכתבת.
  function problem(ps) {
    var l = ps.slice().sort(byStart);
    for (var i = 1; i < l.length; i++) {
      if (!l[i - 1].end) return cal.msg.openLast;
      if (l[i].start <= l[i - 1].end) return cal.msg.overlap;
    }
    return '';
  }

  function text(p) { return p.end ? cal.label(p.start) + ' – ' + cal.label(p.end) : 'מ-' + cal.label(p.start); }

  function enrollText(s) { return list(s).map(text).join(' · '); }

  // החודש הראשון שבו מישהו מהרשימה פעיל — הרצפה של בוררי התאריך והחודש; אין תקופות — ריק.
  function first(students) {
    var f = '';
    (students || []).forEach(function (s) { list(s).forEach(function (p) { if (!f || p.start < f) f = p.start; }); });
    return f;
  }

  // ── העורך ──
  // בורר חודש — שלוש שנים אחורה ושנה קדימה מהחודש הנוכחי, החדש ראשון; ערך שמור מחוץ לטווח נוסף כמות שהוא.
  function options(cur, open) {
    var ks = [], k = cal.add(cal.now(), -36);
    for (var i = 0; i <= 48 && k; i++) { ks.push(k); k = cal.add(k, 1); }
    if (cur && ks.indexOf(cur) < 0) { ks.push(cur); ks.sort(); }
    return (open ? '<option value=""' + (cur ? '' : ' selected') + '>עדיין בישיבה</option>' : '') +
      ks.reverse().map(function (x) { return '<option value="' + x + '"' + (x === cur ? ' selected' : '') + '>' + esc(cal.label(x)) + '</option>'; }).join('');
  }
  function rowHTML(p) {
    return '<div class="per-row" data-per-row>' +
      '<label class="per-lbl">תחילה<select aria-label="חודש הצטרפות" data-f="start">' + options(p.start, false) + '</select></label>' +
      '<label class="per-lbl">סוף<select aria-label="חודש עזיבה" data-f="end">' + options(p.end || '', true) + '</select></label>' +
      '<button type="button" data-act="per-remove" class="per-del" aria-label="הסרת התקופה">' + (cal.removeIcon || '') + '</button>' +
    '</div>';
  }
  // בלי תקופות — שורה אחת מהחודש הנוכחי, פתוחה: תלמיד בלי תקופה אינו נספר באף חודש.
  function editorHTML(ps) {
    if (!ps || !ps.length) ps = [{ start: cal.now(), end: null }];
    return '<div class="per-list" data-per-list>' + ps.map(rowHTML).join('') + '</div>' +
      '<button type="button" data-act="per-add" class="per-add">+ הוסף תקופה</button>';
  }
  function addRow(btn) {
    var box = btn && btn.previousElementSibling;
    if (box && box.hasAttribute('data-per-list')) box.insertAdjacentHTML('beforeend', rowHTML({ start: cal.now(), end: null }));
  }
  function removeRow(btn) { var r = btn && btn.closest('[data-per-row]'); if (r) r.remove(); }
  // הרשימה מהעורך שבתוך root — עזיבה לפני הצטרפות, אף תקופה, חפיפה ותקופה פתוחה שאינה האחרונה נדחות כאן.
  function read(root) {
    var ps = [], err = '';
    (root || document).querySelectorAll('[data-per-list] [data-per-row]').forEach(function (r) {
      var s = norm((r.querySelector('[data-f="start"]') || {}).value), e = norm((r.querySelector('[data-f="end"]') || {}).value);
      if (!s) return;
      if (e && e < s) err = err || cal.msg.endBefore;
      ps.push({ start: s, end: e || null });
    });
    if (!err && !ps.length) err = cal.msg.none;
    if (!err) err = problem(ps);
    return { ps: list({ periods: ps }), err: err };
  }

  return { norm: norm, list: list, has: has, inMonth: inMonth, continues: continues, toggled: toggled,
           archived: archived, problem: problem, text: text, enrollText: enrollText, first: first,
           editorHTML: editorHTML, addRow: addRow, removeRow: removeRow, read: read };
}

export { periodsEngine };
