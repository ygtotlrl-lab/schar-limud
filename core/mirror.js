// core/mirror.js — שכבת המראה

import { app } from './util.js';
import { lsGet, lsRemove, lsSet } from './storage.js';

// ── שכבת המראה ──
// mirrorSave היא הכתיבה האחת לדיסק — הזיכרון של הטבלה, דרך MIRROR_CFG.clean.
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
  return lsSet(mirrorKey(t), JSON.stringify(app.MIRROR_CFG.clean(t, MIRROR[t] || [])));
}
// העותק נזרק כולו — הזיכרון והדיסק.
function mirrorWipe() {
  mirrorTables().forEach(function (t) { MIRROR[t] = app.MIRROR_CFG.empty(); lsRemove(mirrorKey(t)); });
}
// אין כאן הגירה — מפתחות המראה נקראים בשמם הנוכחי, כמערך רשומות; עותק בצורה אחרת עובר בעידן הנתונים.
// MIRROR_CFG.loaded — מה שהאפליקציה בונה מהמראה, לפני כל מנגנון שדוחף ממנו.
function mirrorBoot() {
  mirrorLoad();
  if (typeof app.MIRROR_CFG.loaded === 'function') app.MIRROR_CFG.loaded();
}

// ייצוא בשם ולא default — שם שנעלם נשבר בטעינה, ו-default היה נבלע בשקט.
export { MIRROR, mirrorBoot, mirrorKey, mirrorLoadOne, mirrorSave,
         mirrorTables, mirrorWipe };
