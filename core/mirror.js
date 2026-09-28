// core/mirror.js — שכבת המראה

import { app } from './util.js';
import { hwDiskFilter, lsGet, lsSetArray } from './storage.js';

// ── שכבת המראה ──
// שער החלון החם יושב ב-mirrorSave; mirrorWrite היא הכתיבה הגולמית היחידה, למסלול שכבר סינן —
// כתיבה שעוקפת את השער מחזירה לדיסק את מה שהרגע פונה ממנו.
var MIRROR = {};
// תחילית האפליקציה נגרעת משם הטבלה — היא כבר ב-MIRROR_CFG.prefix, ושמה פעמיים מייצר מפתח שאיש אינו מחפש.
function mirrorKey(t) {
  var s = String(t), p = self.APP.prefix;
  return app.MIRROR_CFG.prefix + (p && s.indexOf(p) === 0 ? s.slice(p.length) : s);
}
function mirrorTables() { return app.MIRROR_CFG.tables(); }
// מסלול שרץ לפני העלייה זקוק לטבלה שלו לבדה.
function mirrorLoadOne(t) {
  var v = null;
  try { var raw = lsGet(mirrorKey(t), null); v = raw == null ? null : JSON.parse(raw); }
  catch (e) { console.warn('[mirror] ' + t + ' פגום — נטען ריק', e); v = null; }
  if (!Array.isArray(v)) { MIRROR[t] = app.MIRROR_CFG.empty(); return MIRROR[t]; }
  MIRROR[t] = v.filter(function (r) { return r && typeof r === 'object'; });
  return MIRROR[t];
}
function mirrorLoad() { mirrorTables().forEach(mirrorLoadOne); }
function mirrorSave(t) {
  var k = mirrorKey(t);
  return lsSetArray(k, app.MIRROR_CFG.clean(t, hwDiskFilter(k, MIRROR[t] || [])), app.MIRROR_CFG.ts);
}
// אינה נוגעת בזיכרון — הפינוי מצמצם את הדיסק, והמסך הפתוח ממשיך להציג את מה שכבר נטען.
function mirrorWrite(t, rows) {
  return lsSetArray(mirrorKey(t), app.MIRROR_CFG.clean(t, rows || []), app.MIRROR_CFG.ts);
}
// אין כאן הגירה — מפתחות המראה נקראים בשמם הנוכחי בלבד.
function mirrorBoot() { mirrorLoad(); }

// ייצוא בשם ולא default — שם שנעלם נשבר בטעינה, ו-default היה נבלע בשקט.
export { MIRROR, mirrorBoot, mirrorKey, mirrorLoadOne, mirrorSave,
         mirrorTables, mirrorWrite };
