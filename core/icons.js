// core/icons.js — הצייר של אייקוני הממשק: גוף אחד בכל האפליקציות, והסט — של כל אפליקציה ב-app/icons.js
// רשת 24, קו בצבע הטקסט וקצוות מעוגלים; עובי הקו נקבע ב-CSS של האפליקציה (.ico).

// מחזירה את icon(name) של הסט שנמסר — אייקון שאינו בסט נצייר ריק ואינו מפיל את המסך.
function iconSet(paths) {
  return function icon(name) {
    return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || '') + '</svg>';
  };
}

// אייקוני המעטפת והליבה — ✕ של #modal, של #updater ושל #ls-alert, הרענון בבאנר העדכון, ואייקוני המצב של ההודעות: הקוד המשותף אינו מכיר את הסט של האפליקציה,
// ולכן האפליקציה מוסרת לו את האייקון בעלייה (shellIcon('close', icon('close'))), והוא נצבע בכל אלמנט שמסומן data-shell-ic.
var _shell = {};
function shellIcon(name, svg) {
  if (svg !== undefined) {
    _shell[name] = svg;
    document.querySelectorAll('[data-shell-ic="' + name + '"]').forEach(function (el) { el.innerHTML = svg; });
  }
  return _shell[name] || '';
}

// אייקון מצב בעטיפה — לטוסט, לכותרת דיאלוג, לכפתור עסוק ולסרגל הסנכרון; שם שלא נמסר — כלום, והטקסט לבדו.
// השמות: good · bad · warn · off · wait, שהאפליקציה מוסרת בעלייה; או svg שלם מ-icon() של האפליקציה (כותרת דיאלוג).
function stIcon(name) {
  var s = !name ? '' : (name.charAt(0) === '<' ? name : shellIcon(name));
  return s ? '<span class="st-ic">' + s + '</span>' : '';
}

export { iconSet, shellIcon, stIcon };
