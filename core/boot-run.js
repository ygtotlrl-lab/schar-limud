// core/boot-run.js — עליית הליבה

import { eraKick, pendBoot, plBoot, rtyBoot, tombBoot } from './sync.js';
import { hwBoot, lsBoot } from './storage.js';
import { mirrorBoot } from './mirror.js';
import { bkBoot } from './backup.js';

// כל מנגנוני הליבה עולים בקריאה אחת, בסדר אחד בכל האפליקציות, וכל אחד בשומר משלו — כשל באחד אינו עוצר את הבאים.
// המדידה והפינוי לפני המראה — שהטעינה והמשיכה יכתבו לאחסון שיש בו מקום; המראה לפני הסימונים והעידן — הדחיפה קוראת ממנו.
// הגיבוי כאן ולא במסלול הדחיפה — שם הוא רץ רק כשמישהו כותב, ונעצר ביום בלי כתיבה.
// הנעילה נרשמת מ-core/auth.js — באפליקציה שיש בה כניסה בלבד, והאפליקציה אינה שואלת.
// הקריאה חוזרת בבטחה — כל מנגנון נדרך פעם אחת, ובקריאה חוזרת רק טוען את ההקשר הנוכחי.
var _bootLk = null;
function bootWire(o) { if (o && typeof o.lk === 'function') _bootLk = o.lk; }
function bootRun() {
  [['ls', lsBoot], ['mirror', mirrorBoot], ['pend', pendBoot], ['tomb', tombBoot], ['era', eraKick],
   ['bk', bkBoot], ['rty', rtyBoot], ['lk', _bootLk], ['pl', plBoot], ['hw', hwBoot]].forEach(function (m) {
    if (!m[1]) return;
    try { m[1](); } catch (e) { console.warn('[' + m[0] + '] boot', e); }
  });
}

// ייצוא בשם ולא default — שם שנעלם נשבר בטעינה, ו-default היה נבלע בשקט.
export { bootRun, bootWire };
