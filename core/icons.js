// core/icons.js — הצייר של אייקוני הממשק: גוף אחד בכל האפליקציות, והסט — של כל אפליקציה ב-app/icons.js
// רשת 24, קו בצבע הטקסט וקצוות מעוגלים; עובי הקו נקבע ב-CSS של האפליקציה (.ico).

// מחזירה את icon(name) של הסט שנמסר — אייקון שאינו בסט נצייר ריק ואינו מפיל את המסך.
function iconSet(paths) {
  return function icon(name) {
    return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || '') + '</svg>';
  };
}

export { iconSet };
