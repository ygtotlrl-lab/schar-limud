/* ═══ core/auth.js — הכניסה והסשן ═══════════════════════════════════════
   ⭐ נעילה, סשן, הרשאות וכתיבת משתמש — ⚠️ רק במי שיש בה כניסה.
   השורות: «`lock` — נעילת חוסר-פעילות» · «`sess` — מודל הסשן» ·
   «מודל ההרשאות» · «כתיבת משתמש עוברת בפונקציה אחת» ·
   «מראת המשתמשים — ועדכונה החלקי»
   ⛔ המודול זהה בית-לבית בכל ריפו שנושא אותו — ⚠️ והתצורה פר-אפליקציה
      נמסרת ב-`appConfigure` שבראש `index.html`, ⭐ ואינה כתובה כאן.
   ⛔ ושינוי כאן — בכל הריפו שנושאים אותו, באותו סבב.
   ════════════════════════════════════════════════════════════════════ */

import { app } from './util.js';
import { newClientId } from './sync.js';
import { lsGet, lsLog, lsRemove } from './storage.js';

/* ═══ נעילת חוסר-פעילות — מודול משותף ═════════════════════════════════════
   ═══════════════════════════════════════════════════════════════════════ */
var LK_LOCK_MS = 5 * 60 * 1000;   // נעילה אחרי חמש דקות ללא פעילות
var LK_WARN_MS = 4 * 60 * 1000;   // אזהרה דקה לפניה
var LK_EVENTS  = ['touchstart', 'click', 'keydown', 'scroll'];
var _lkLockT = null, _lkWarnT = null, _lkWired = false;

function _lkActive() {
  try { return !!(typeof app.LK_CFG === 'object' && app.LK_CFG && app.LK_CFG.active && app.LK_CFG.active()); }
  catch (e) { return false; }
}
function _lkStyle() {
  if (typeof document === 'undefined' || document.getElementById('lk-css')) return;
  var s = document.createElement('style');
  s.id = 'lk-css';
  s.textContent =
    '#lk-warn{position:fixed;inset:0;background:var(--veil-deep);z-index:var(--z-7);' +
    'display:flex;align-items:center;justify-content:center;font:inherit}' +
    '#lk-warn.lk-hidden{display:none}' +
    '#lk-warn .lk-box{background:var(--card);color:var(--text);border-radius:14px;' +
    'padding:28px 24px;text-align:center;max-width:280px;width:90%}' +
    '#lk-warn .lk-ico{font-size:2rem;margin-bottom:6px}' +
    '#lk-warn .lk-ttl{font-weight:700;font-size:1.05rem;margin-bottom:8px}' +
    '#lk-warn .lk-txt{font-size:.88rem;opacity:var(--op-6);margin-bottom:18px;line-height:var(--lh-4)}' +
    '#lk-warn button{width:100%;border:0;border-radius:10px;padding:11px 16px;' +
    'font:inherit;font-weight:600;cursor:pointer;background:var(--brand);color:var(--on-brand)}';
  (document.head || document.documentElement).appendChild(s);
}
function _lkWarnEl() {
  if (typeof document === 'undefined' || !document.body) return null;
  var el = document.getElementById('lk-warn');
  if (el) return el;
  _lkStyle();
  el = document.createElement('div');
  el.id = 'lk-warn';
  el.className = 'lk-hidden';
  var box = document.createElement('div');
  box.className = 'lk-box';
  var ico = document.createElement('div');
  ico.className = 'lk-ico';
  ico.textContent = '⚠️';
  var ttl = document.createElement('div');
  ttl.className = 'lk-ttl';
  ttl.textContent = 'האפליקציה תינעל';
  var txt = document.createElement('div');
  txt.className = 'lk-txt';
  txt.textContent = 'דקה של חוסר פעילות נותרה. לחץ להמשך.';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'אני כאן ✋';
  btn.dataset.act = 'lk-stay';
  box.appendChild(ico); box.appendChild(ttl); box.appendChild(txt); box.appendChild(btn);
  el.appendChild(box);
  document.body.appendChild(el);
  return el;
}
function _lkHide() { var el = _lkWarnEl(); if (el) el.className = 'lk-hidden'; }
function _lkShow() { var el = _lkWarnEl(); if (el) el.className = ''; }

// איפוס המונה. ⛔ הסדר קבוע: מסתירים, מנקים, ורק אז דורכים מחדש — דריכה
// לפני הניקוי הייתה משאירה טיימר ישן חי ונועלת מוקדם.
function lkReset() {
  _lkHide();
  if (_lkLockT) { clearTimeout(_lkLockT); _lkLockT = null; }
  if (_lkWarnT) { clearTimeout(_lkWarnT); _lkWarnT = null; }
  if (!_lkActive()) return false;
  _lkWarnT = setTimeout(function () { _lkShow(); }, LK_WARN_MS);
  _lkLockT = setTimeout(function () {
    _lkHide();
    try { if (typeof app.LK_CFG === 'object' && app.LK_CFG && app.LK_CFG.lock) app.LK_CFG.lock(); }
    catch (e) { console.warn('[lk] lock', e); }
  }, LK_LOCK_MS);
  return true;
}

// עצירה מלאה — מסלול היציאה. ⛔ אינה מסתמכת על `lkReset`: שם
// הדריכה מחדש מותנית ב-`LK_CFG.active()`, ומסלול יציאה שמנקה את המשתמש
// **אחרי** הקריאה היה נשאר עם טיימר דרוך שנועל את מסך הכניסה.
function lkStop() {
  if (_lkLockT) { clearTimeout(_lkLockT); _lkLockT = null; }
  if (_lkWarnT) { clearTimeout(_lkWarnT); _lkWarnT = null; }
  _lkHide();
}

function lkBoot() {
  if (!_lkWired) {
    _lkWired = true;
    try {
      for (var i = 0; i < LK_EVENTS.length; i++) {
        document.addEventListener(LK_EVENTS[i], function () {
          if (_lkActive()) lkReset();
        }, { passive: true });
      }
    } catch (e) { console.warn('[lk] wiring', e); }
  }
  return lkReset();
}

/* ═══════════════ סוף מודול נעילת חוסר-הפעילות ═══════════════════════════ */

/* ═══ מודל הסשן — מודול משותף ═════════════════════════════════════════════
   ═══════════════════════════════════════════════════════════════════════ */
var _sessUser = null;
var _sessBooted = false;

function sessSet(u) { _sessUser = u || null; return _sessUser; }
function sessGet() { return _sessUser; }
function sessClear() { _sessUser = null; }
function sessActive() { return !!_sessUser; }

/*  רשימת מפתחות השריד, נכשלת-סגור על תצורה חסרה. */
function _sessLegacy() {
  try {
    var k = (typeof app.SESS_CFG === 'object' && app.SESS_CFG && app.SESS_CFG.legacy) || [];
    return Object.prototype.toString.call(k) === '[object Array]' ? k : [];
  } catch (e) { return []; }
}

/*  ניקוי שרידי הסשן; מחזירה את מספר המפתחות שנמחקו בפועל.
    ⚠️ הקריאה קודמת למחיקה בכוונה — כדי שהיומן יירשם רק כשבאמת היה שם
    משהו, ולא בכל עלייה של כל מכשיר. */
function _sessPurge() {
  var keys = _sessLegacy(), gone = [];
  for (var i = 0; i < keys.length; i++) {
    try {
      if (lsGet(keys[i], null) === null) continue;
      lsRemove(keys[i]);
      gone.push(keys[i]);
    } catch (e) { /* אחסון חסום — לא נוגעים, וננסה שוב בעלייה הבאה */ }
  }
  if (gone.length) { try { lsLog('sess-purge', gone.join(',')); } catch (e) { } }
  return gone.length;
}

/*  ⛔ נקודת ההפעלה היחידה — פונקציית העלייה של האפליקציה,
    זו שקוראת גם ל-`lsBoot()` ול-`pendBoot()`. */
function sessBoot() {
  if (_sessBooted) return 0;
  _sessBooted = true;
  return _sessPurge();
}
/* ═══════════════ סוף מודול הסשן ═════════════════════════════════════════ */

/* ═══ מודל ההרשאות — מודול משותף ══════════════════════════════════════════
   ⛔ ההרשאה נגזרת מ-`role` שבטבלת המשתמשים ⛔ ולא מסיסמת שער — ⚠️ ואוצר
      המילים אחד בשלוש האפליקציות: `admin` הוא המורשה, `manager` מי שאינו.
      ⭐ אפליקציה שיש בה מטריצת הרשאות נושאת דרגת ביניים נוספת, ⛔ והיא
      מוכרזת במקומה עם נימוקה.
   ⛔ **ההשוואה היא ל-`admin` בדיוק ⛔ ולא «שונה מ-manager»** — ⚠️ תפקיד
      שהוקלד בטעות, או עמודה ריקה, שוללים הרשאה ⛔ ולעולם אינם מעניקים
      אותה: ⭐ נפילה-חזרה לשם התפקיד הייתה שער שנפתח לכל מקליד.
   ⛔ **ואין השוואה שנייה מחוץ לבלוק** — ⚠️ שלוש השוואות באותו נושא הן
      שלוש הזדמנויות לטעות, ⭐ ותיקון באחת משאיר את השתיים סותרות אותה.
   ⚠️ מקור המשתמש נבדל בין האפליקציות (`AUTH.user` · `state.user`) ⛔ ולכן
      הוא נלקח כאן מ-`sessGet()`, ⭐ שהוא נקודת המעבר האחת של הסשן
      בשלושתן.
   ⛔ שינוי כאן — שלוש האפליקציות, באותו סבב.
   ══════════════════════════════════════════════════════════════════════ */
var ROLE_ADMIN = 'admin';
function isAdminOf(u) { return !!u && String(u.role) === ROLE_ADMIN; }
function isAdmin() { return isAdminOf(sessGet()); }
/* ═══════════════ סוף מודול מודל ההרשאות ═════════════════════════════════ */

/* ═══ כתיבת משתמש — מודול משותף ═══════════════════════════════════════════
   ⛔ שינוי כאן — שלוש האפליקציות שיש בהן כניסה,
      באותו סבב: אחרת הבלוק נסחף בין הריפו.
   ⛔ **כל כתיבה לטבלת המשתמשים עוברת כאן** — ⚠️ הטבלה אינה ב-`PUSH_TABLES`,
      ⭐ שהמראה המקומית מסירה ממנה את הסוד: ⛔ דחיפה גורפת שלה הייתה כותבת
      אותו חזרה ריק לכל המשתמשים.
   ⛔ **והכתיבה דורשת רשת** — ⚠️ אין רשת ⇒ נדחה ברעש ⛔ ולא «נשמר»: ⭐ מה
      שאינו נכתב כאן אינו עולה לענן בשום מסלול אחר.
   ⛔ **`upsert` ליצירה, `update` לעריכה, ⛔ ואין להחליף ביניהם** — ⚠️ שדות
      החובה נבדקים על השורה המועמדת **לפני** ש-`ON CONFLICT` מופעל, ⭐ ולכן
      `upsert` עם אובייקט חלקי נופל על `not null` במקום לעדכן. ⚠️ וביצירה
      השורה מלאה **והמזהה נוצר במכשיר**, ⛔ ולכן ניסיון חוזר אחרי תשובה
      שאבדה ברשת מעדכן ⛔ ואינו מכפיל.
   ⛔ **והתשובה מוחזרת ⛔ ואינה נזרקת** — ⚠️ supabase-js אינו זורק בכשל,
      ⭐ ו-`USER_CFG.after` הוא שמכריע מה נעשה ב-`res.error`. */
function _writeUserSend(body, key) {
  var q = key == null
    ? app.USER_CFG.from().upsert(body, { onConflict: 'client_id' })
    : app.USER_CFG.from().update(body).eq('client_id', key);
  /*  ⛔ `.select()` בשני המסלולים — ⚠️ הקורא צריך את השורה **כפי שנשמרה**
   *  ולא כפי שנשלחה: ⭐ בלעדיה המטמון נכתב מהמטען, ⛔ ועמודה שהמסד מילא
   *  אינה מגיעה אליו לעולם. */
  return app.USER_CFG.run(q.select());
}

function writeUser(id, row) {
  if (!app.USER_CFG.ready()) return Promise.reject(new Error(app.USER_CFG.offMsg()));
  var key = (id == null || id === '') ? null : String(id);
  var body = Object.assign({}, row);
  body.updated_at = Date.now();
  body.client_id = (key == null) ? (body.client_id || newClientId()) : key;
  return _writeUserSend(body, key).then(function (res) {
    /*  ⛔ נפילה-חזרה לחלון שבין דחיפת הקוד להרצת המיגרציה — ⚠️ בלעדיה
     *  **כל** שמירת משתמש נכשלת עד שהעמודות ייווצרו: ⭐ המשתמש נשמר,
     *  והכניסה האופליין שלו תיפתח בשינוי הסיסמה הבא. */
    if (!(res && res.error && app.USER_CFG.missingFp(res.error))) return res;
    var b2 = Object.assign({}, body);
    delete b2.pass_salt; delete b2.pass_fp;
    return _writeUserSend(b2, key).then(function (r) {
      if (r && !r.error) r._noFp = true;
      return r;
    });
  }).then(function (res) { return app.USER_CFG.after(res, body); });
}
/* ═══════════════ סוף מודול כתיבת משתמש ══════════════════════════════════ */

/*  ⛔ הייצוא בשם ⛔ ואינו `default` — ⚠️ קורא שמייבא שם שנעלם נשבר בטעינה,
 *  ⭐ ו-`default` היה נבלע בשקט. */
export { ROLE_ADMIN, isAdmin, isAdminOf, lkBoot, lkReset, lkStop,
         sessActive, sessBoot, sessClear, sessGet, sessSet, writeUser };
