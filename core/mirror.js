/* ═══ core/mirror.js — שכבת המראה ═══════════════════════════════════════
   ⭐ העותק המקומי של הענן, ממופתח בשם הטבלה — ⚠️ רק במי שיש בה מראה.
   השורות: «שכבת המראה»
   ⛔ המודול זהה בית-לבית בכל ריפו שנושא אותו — ⚠️ והתצורה פר-אפליקציה
      נמסרת ב-`appConfigure` שבראש `index.html`, ⭐ ואינה כתובה כאן.
   ⛔ ושינוי כאן — בכל הריפו שנושאים אותו, באותו סבב.
   ════════════════════════════════════════════════════════════════════ */

import { app } from './util.js';
import { hwDiskFilter, lsGet, lsSetArray } from './storage.js';

/* ═══ שכבת המראה — מודול משותף ════════════════════════════════════════════
   ⛔ העותק המקומי של הענן חי במבנה **אחד** — ⚠️ `MIRROR`, ממופתח בשם
      הטבלה: ⭐ שם לוגי שני לאותה מראה הוא מיפוי שחי במקום נפרד, ⛔ ומיפוי
      שחי במקום נפרד מתיישן בשקט.
   ⛔ **ומפתח האחסון נגזר** ⛔ ואינו מוקלד — ⚠️ מפתח שהוקלד בהצהרת הפינוי
      ואינו מה שנכתב בפועל אינו מתפנה לעולם, ⭐ והפינוי מדווח «אין מה
      לפנות» על מפתח שגדל בלי גבול.
   ⛔ **שער החלון החם יושב ב-`mirrorSave`** — ⚠️ והכתיבה הגולמית היחידה
      היא `mirrorWrite`, למסלול שכבר סינן: ⭐ סינון שני מודד את התוצאה של
      עצמו, ⛔ וכתיבה שעוקפת את השער מחזירה לדיסק את מה שהרגע פונה ממנו.
   ⛔ שינוי כאן — שלוש האפליקציות, באותו סבב: ⚠️ אחרת
      הבלוק נסחף בין הריפו.
   ⚠️ מה שאינו כאן: **תוכן** השורות ומי שאינו טבלה — ⭐ הניקוי הוא
      `MIRROR_CFG.clean`.
   ══════════════════════════════════════════════════════════════════════ */
var MIRROR = {};
/*  ⛔ תחילית האפליקציה נגרעת משם הטבלה — ⚠️ היא כבר בתוך
 *  `MIRROR_CFG.prefix`, ⭐ ושמה פעמיים מייצר מפתח שאיש אינו מחפש. */
function mirrorKey(t) {
  var s = String(t), p = app.MIRROR_CFG.app;
  return app.MIRROR_CFG.prefix + (p && s.indexOf(p) === 0 ? s.slice(p.length) : s);
}
function mirrorTables() { return app.MIRROR_CFG.tables(); }
/*  ⛔ טעינת טבלה אחת — ⚠️ מסלול שרץ **לפני** העלייה זקוק לטבלה שלו לבדה,
 *  ⭐ וטעינת כולן שם היא עבודה שאיש לא ביקש: ⛔ ושתי טעינות שאינן אותה
 *  פונקציה נבדלות בשקט. */
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
/*  ⛔ **ואינה נוגעת בזיכרון** — ⚠️ הפינוי מצמצם את הדיסק, ⭐ והמסך שפתוח
 *  ממשיך להציג את מה שכבר נטען. */
function mirrorWrite(t, rows) {
  return lsSetArray(mirrorKey(t), app.MIRROR_CFG.clean(t, rows || []), app.MIRROR_CFG.ts);
}
/*  ⛔ נקודת ההפעלה האחת — ⚠️ ואין בה הגירה: ⭐ מפתחות המראה נקראים
 *  בשמם הנוכחי בלבד. */
function mirrorBoot() { mirrorLoad(); }
/* ═══════════════ סוף מודול שכבת המראה ═══════════════════════════════════ */

/*  ⛔ הייצוא בשם ⛔ ואינו `default` — ⚠️ קורא שמייבא שם שנעלם נשבר בטעינה,
 *  ⭐ ו-`default` היה נבלע בשקט. */
export { MIRROR, mirrorBoot, mirrorKey, mirrorLoadOne, mirrorSave,
         mirrorTables, mirrorWrite };
