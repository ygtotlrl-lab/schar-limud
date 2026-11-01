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
//   msg        — { openLast, overlap }: הודעות הפגם, מהמחרוזות של האפליקציה
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

  return { norm: norm, list: list, has: has, inMonth: inMonth, continues: continues, toggled: toggled,
           archived: archived, problem: problem, text: text, enrollText: enrollText, first: first };
}

export { periodsEngine };
