// app/icons.js — סט האייקונים של הממשק: קו אחד, פינות מעוגלות, בצבע הטקסט
// כולם באותה רשת (24) ובאותו עובי קו — אמוג׳י מתחלף בין מערכות ההפעלה ואינו נשמע לצבע.
import { iconSet, shellIcon } from '../core/icons.js';
var PATHS = {
  // הכניסה, המשתמשים וההתראות — הליבה מציירת אותם (shellIcon)
  bell:     '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  user:     '<circle cx="12" cy="8.5" r="3.8"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
  power:    '<path d="M12 3.5v8"/><path d="M7 6.5a7 7 0 1 0 10 0"/>',
  logout:   '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>',
  save:     '<path d="M5 4h11.5L20 7.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8 4v5h7V4"/><path d="M8 20v-6h8v6"/>',
  // אייקוני המצב — טוסט · כותרת · כפתור עסוק · סרגל הסנכרון (stIcon בליבה)
  good:     '<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.8 2.8L16.2 9.6"/>',
  bad:      '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>',
  warn:     '<path d="M10.3 4.4L2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17.4v.1"/>',
  off:      '<path d="M3 3l18 18"/><path d="M8.6 16.3a5 5 0 0 1 6.8 0"/><path d="M5.2 12.8a10 10 0 0 1 4-2.3M18.8 12.8a10 10 0 0 0-2.4-1.7"/><path d="M2 9.2a15 15 0 0 1 4.3-2.6M22 9.2a15 15 0 0 0-10.6-4"/><path d="M12 19.8v.1"/>',
  wait:     '<path d="M7 3h10M7 21h10"/><path d="M8 3v3.2a4 4 0 0 0 1.4 3L12 12l2.6-2.8A4 4 0 0 0 16 6.2V3"/><path d="M8 21v-3.2a4 4 0 0 1 1.4-3L12 12l2.6 2.8a4 4 0 0 1 1.4 3V21"/>',
  refresh:  '<path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.5"/><path d="M20 3.5v5h-5"/>',
  dash:     '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l3.6-4.4"/><circle cx="12" cy="16" r="1.3"/><path d="M4 19.5h16"/>',
  txn:      '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 9.5h18"/><path d="M7 14.5h4"/>',
  student:  '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.8-3 3-4.6 5.5-4.6s4.7 1.6 5.5 4.6"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 6"/><path d="M17.5 14.6c1.6.6 2.6 2 3 4.4"/>',
  settings: '<path d="M4 6h8.5M16.5 6H20M4 12h2.5M10.5 12H20M4 18h6.5M14.5 18H20"/><circle cx="14.5" cy="6" r="2"/><circle cx="8.5" cy="12" r="2"/><circle cx="12.5" cy="18" r="2"/>',
  plus:     '<path d="M12 5v14M5 12h14"/>',
  minus:    '<path d="M5 12h14"/>',
  share:    '<path d="M12 15V3.5"/><path d="M8 7.5l4-4 4 4"/><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12"/>',
  info:     '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6v.1"/>',
  edit:     '<path d="M16.5 4.5l3 3L8 19l-4 1 1-4z"/><path d="M14 7l3 3"/>',
  del:      '<path d="M4.5 6.5h15"/><path d="M9.5 6.5v-2h5v2"/><path d="M6.5 6.5l1 13h9l1-13"/><path d="M10.5 10.5v6M13.5 10.5v6"/>',
  close:    '<path d="M6 6l12 12M18 6L6 18"/>',
  check:    '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  archive:  '<path d="M3.5 4.5h17v4h-17z"/><path d="M5 8.5v10a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-10"/><path d="M10 12.5h4"/>',
  cycle:    '<path d="M19.5 12a7.5 7.5 0 0 1-13.1 5"/><path d="M4.5 12a7.5 7.5 0 0 1 13.1-5"/><path d="M17.6 3.5V7h-3.5"/><path d="M6.4 20.5V17h3.5"/>',
  prev:     '<path d="M9 6l6 6-6 6"/>',
  next:     '<path d="M15 6l-6 6 6 6"/>',
  up:       '<path d="M6 15l6-6 6 6"/>',
  down:     '<path d="M6 9l6 6 6-6"/>',
  // אמצעי התשלום — כמו בגיוס
  cards:    '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10.8" r="2.1"/><path d="M5.9 16.2c.7-1.4 1.8-2.1 3.1-2.1s2.4.7 3.1 2.1"/><path d="M14.6 10h3.9M14.6 13.6h2.6"/>',
  credit:   '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18M7 14.5h3"/>',
  // המראה של הזיכוי — חוב שעבר משנה קודמת: אותו כרטיס, והקו בצד השני
  debt:     '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18M14 14.5h3"/>',
  bank:     '<path d="M3.5 9.5L12 4.5l8.5 5"/><path d="M5.5 10v7M10 10v7M14 10v7M18.5 10v7"/><path d="M3.5 19.5h17"/>',
  cash:     '<rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2.4"/><path d="M6.5 10v4M17.5 10v4"/>',
  cheque:   '<rect x="3" y="6.5" width="18" height="11" rx="2"/><path d="M6.5 14.5c1.2-1.8 2.3-1.8 3 0s1.8 1.8 3 0"/><path d="M14.5 10.5h3.5"/>',
  phone:    '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 17.5h2"/>',
  repeat:   '<path d="M17 4l3 3-3 3"/><path d="M20 7H9a5 5 0 0 0-5 5"/><path d="M7 20l-3-3 3-3"/><path d="M4 17h11a5 5 0 0 0 5-5"/>',
  // החצים של הזיכוי בכיוון ההפוך — האייקון של החוב שעבר משנה קודמת
  repeatBack: '<path d="M7 4L4 7l3 3"/><path d="M4 7h11a5 5 0 0 1 5 5"/><path d="M17 20l3-3-3-3"/><path d="M20 17H9a5 5 0 0 1-5-5"/>',
  lock:     '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
};

// הצייר — core/icons.js, גוף אחד בכולן; כאן רק הסט.
var icon = iconSet(PATHS);
shellIcon('close', icon('close')); // ✕ של המעטפת והליבה — מהסט של האפליקציה
shellIcon('refresh', icon('refresh')); // באנר העדכון
shellIcon('share', icon('share')); // ייצוא התמונה (core/snap.js)
['good', 'bad', 'warn', 'off', 'wait'].forEach(function (n) { shellIcon(n, icon(n)); }); // אייקוני המצב
['bell', 'user', 'power', 'logout', 'plus', 'save'].forEach(function (n) { shellIcon(n, icon(n)); }); // הכניסה והמשתמשים וההתראות

export { icon };
