// core/icons.js — הצייר של אייקוני הממשק: גוף אחד בכל האפליקציות, והסט — של כל אפליקציה ב-app/icons.js
// רשת 24, קו בצבע הטקסט וקצוות מעוגלים; עובי הקו נקבע ב-CSS של האפליקציה (.ico).

// מחזירה את icon(name) של הסט שנמסר — אייקון שאינו בסט נצייר ריק ואינו מפיל את המסך.
function iconSet(paths) {
  return function icon(name) {
    return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || '') + '</svg>';
  };
}

// אייקוני המעטפת והליבה — ✕ של #modal, של #updater ושל #ls-alert, ואייקון הרענון בבאנר העדכון: הקוד המשותף אינו מכיר את הסט של האפליקציה,
// ולכן האפליקציה מוסרת לו את האייקון בעלייה (shellIcon('close', icon('close'))), והוא נצבע בכל אלמנט שמסומן data-shell-ic.
var _shell = {};
function shellIcon(name, svg) {
  if (svg !== undefined) {
    _shell[name] = svg;
    document.querySelectorAll('[data-shell-ic="' + name + '"]').forEach(function (el) { el.innerHTML = svg; });
  }
  return _shell[name] || '';
}

export { iconSet, shellIcon };
