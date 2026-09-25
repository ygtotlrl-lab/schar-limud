/* ═══ core/auth.js — הכניסה והסשן ═══════════════════════════════════════
   ⭐ נעילה, סשן, הרשאות, טביעת הסיסמה, מראת המשתמשים וכתיבת משתמש —
      ⚠️ רק במי שיש בה כניסה.
   השורות: «כתיבת משתמש עוברת בפונקציה אחת» ·
   «`lock` — נעילת חוסר-פעילות» · «`sess` — מודל הסשן» · «מודל ההרשאות» ·
   «מראת המשתמשים — ועדכונה החלקי» · «שכבת כניסה» · «`PBKDF2` — פרמטרים» ·
   «כניסה אופליין»
   ⛔ המודול זהה בית-לבית בכל ריפו שנושא אותו — ⚠️ והתצורה פר-אפליקציה
      נמסרת ב-`appConfigure` שבראש `index.html`, ⭐ ואינה כתובה כאן.
   ⛔ ושינוי כאן — בכל הריפו שנושאים אותו, באותו סבב.
   ════════════════════════════════════════════════════════════════════ */

import { MSG_PASS_CHANGED_OUT, MSG_USER_DISABLED_OUT, app } from './util.js';
import { MIRROR, mirrorSave } from './mirror.js';
import { newClientId } from './sync.js';
import { logAction, logFlush } from './backup.js';

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

function sessSet(u) { _sessUser = u || null; return _sessUser; }
function sessGet() { return _sessUser; }
function sessClear() { _sessUser = null; }
function sessActive() { return !!_sessUser; }
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

/* ═══ טביעת הסיסמה — מודול משותף ═════════════════════════════════════════
   ⛔ PBKDF2-SHA256 · 100,000 סיבובים · 256 ביט · **ומלח אקראי פר-משתמש** —
      ⚠️ מכשיר שאבד חושף טביעות ולא סיסמאות, ⭐ וההשהיה היא מה שהופך
      ניחוש-בכוח על העותק שבדיסק ליקר גם מול סיסמה בת שש ספרות.
   ⛔ **וההקשר נגזר מהתצורה** — `<id>/<prefix>users/v1/` — ⚠️ ה-origin משותף
      לכל האפליקציות, ⭐ וטבלה מחושבת מראש לאחת אינה תקפה באחרת: ⛔ אין
      לשנות את הצורה — ⚠️ כל טביעה שמורה נגזרה ממנה, ⛔ ושינוי נועל בחוץ
      את כל המשתמשים.
   ⛔ **כל כשל נכשל סגור** — ⚠️ אין מלח או אין `crypto.subtle` ⇒ `null`,
      ⭐ והקורא אינו שומר טביעה ⛔ ואינו משאיר טביעה ישנה.
   ══════════════════════════════════════════════════════════════════════ */
var AUTH_PASS_ITER = 100000;
function _authApp() { return (typeof self !== 'undefined' && self.APP) || {}; }
function authUsersTable() { return _authApp().prefix + 'users'; }
function _authPassCtx() { return _authApp().id + '/' + authUsersTable() + '/v1/'; }
function _authHex(b) {
  var h = '';
  for (var i = 0; i < b.length; i++) h += (b[i] + 0x100).toString(16).slice(1);
  return h;
}
// 16 בתים אקראיים כ-hex.
function authRandSalt() {
  try {
    if (typeof crypto === 'undefined' || !crypto || !crypto.getRandomValues) return null;
    var b = new Uint8Array(16); crypto.getRandomValues(b);
    return _authHex(b);
  } catch (e) { return null; }
}
// PBKDF2-SHA256 → hex בן 64 תווים.
async function authPassFp(pass, salt) {
  try {
    if (!salt) return null;
    if (typeof crypto === 'undefined' || !crypto || !crypto.subtle || !crypto.subtle.importKey) return null;
    var enc = new TextEncoder();
    var key = await crypto.subtle.importKey('raw', enc.encode(String(pass == null ? '' : pass)), 'PBKDF2', false, ['deriveBits']);
    var bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(_authPassCtx() + String(salt)), iterations: AUTH_PASS_ITER, hash: 'SHA-256' }, key, 256);
    return _authHex(new Uint8Array(bits));
  } catch (e) { console.warn('[auth] גזירת טביעה נכשלה', e); return null; }
}
// מלח חדש וטביעה לסיסמה — `{salt, fp}` או `null`.
async function authMakePassFp(pass) {
  var salt = authRandSalt();
  if (!salt) return null;
  var fp = await authPassFp(pass, salt);
  return fp ? { salt: salt, fp: fp } : null;
}
/*  ⛔ שדות הכתיבה לסיסמה — ⚠️ כשל גזירה **מאפס את שני השדות** ואינו מדלג:
 *  ⭐ טביעה ישנה ששרדה שינוי סיסמה הייתה פותחת את הכניסה האופליין בסיסמה
 *  הקודמת, לנצח. ⛔ וכל מסלול שכותב סיסמה עובר כאן. */
async function authPassFields(pass) {
  var made = await authMakePassFp(pass);
  return made ? { pass_salt: made.salt, pass_fp: made.fp }
              : { pass_salt: null, pass_fp: null };
}
/*  ⛔ תשובת שרת שאומרת «עמודות הטביעה אינן קיימות» — ⚠️ בלי הזיהוי כל
 *  שמירת משתמש נכשלת לגמרי בחלון שבין דחיפת הקוד להרצת המיגרציה. */
function authMissingFpCol(err) {
  var m = ((err && (err.message || err.details || err.hint || err.code || '')) + '').toLowerCase();
  return m.indexOf('pass_fp') !== -1 || m.indexOf('pass_salt') !== -1;
}
/*  ⛔ האימות — מקוון ואופליין — מול הטביעה בלבד, ⭐ ומחזיר אחת מארבע:
 *  `ok` · `bad` (סיסמה שגויה או משתמש מושבת) · `no-fp` · `no-crypto`.
 *  ⛔ אין לאחד את שלושת הכישלונות — ⚠️ «סיסמה שגויה» על היעדר טביעה שולח
 *  את המשתמש להקליד שוב ושוב סיסמה נכונה. ⛔ ואין כאן אכיפת פורמט — ⚠️ היא
 *  הייתה נועלת בחוץ סיסמה תקפה שנקבעה לפני התקן. */
async function authVerify(u, pass) {
  if (!u || u.active !== true) return 'bad';
  if (!u.pass_salt || !u.pass_fp) return 'no-fp';
  var fp = await authPassFp(pass, u.pass_salt);
  if (!fp) return 'no-crypto';
  return (fp === u.pass_fp) ? 'ok' : 'bad';
}
/* ═══════════════ סוף מודול טביעת הסיסמה ═════════════════════════════════ */

/* ═══ מראת המשתמשים — מודול משותף ═════════════════════════════════════════
   ⛔ עותק מקומי של טבלת המשתמשים לכניסה אופליין — ⚠️ לכל משתמש ולא רק למי
      שנכנס אחרון במכשיר: ⭐ מכשיר שמישהו אחר נכנס בו אחרון היה נועל בחוץ
      את כל השאר.
   ⛔ **רשימת-היתר של עמודות ולא רשימת-איסור** — ⚠️ עמודה רגישה שתתווסף
      לטבלה אינה יורדת לדיסק, ⭐ והשאילתה עצמה מבקשת רק אותן: ⛔ הסיסמה
      אינה מגיעה לזיכרון הדפדפן כלל.
   ⛔ **וכל כתיבה למראה עוברת ב-`usersSanitize`** — המלאה, החלקית, ושער
      הדיסק שב-`MIRROR_CFG.clean`: ⚠️ נתיב שלישי הוא נתיב שעוקף את הרשימה.
   ⚠️ **והמראה מחזיקה גם משתמש מושבת** — ⭐ `authVerify` הוא שחוסם אותו:
      ⛔ שורה שנשמטה הייתה משאירה במכשיר אחר את העותק הפעיל הישן.
   ══════════════════════════════════════════════════════════════════════ */
var AUTH_USER_COLS = ['client_id', 'username', 'full_name', 'role', 'active',
                      'created_at', 'updated_at', 'pass_salt', 'pass_fp'];
/*  ⛔ שדה שנמסר ריק נכתב ריק — ⚠️ איפוס הטביעה הוא ערך ולא היעדר:
 *  ⭐ ורק שדה שלא נמסר כלל נשאר כפי שהיה. */
function _authSlim(r) {
  var o = {};
  AUTH_USER_COLS.forEach(function (c) { if (r[c] !== undefined) o[c] = r[c]; });
  return o;
}
function usersSanitize(rows) {
  return (Array.isArray(rows) ? rows : [rows])
    .filter(function (r) { return r && typeof r === 'object' && r.username != null; })
    .map(_authSlim);
}
function usersGet() {
  var v = MIRROR[authUsersTable()];
  return Array.isArray(v) ? v : [];
}
// החלפת המראה כולה — משיכה מלאה מהענן.
function usersSaveAll(rows) {
  if (!Array.isArray(rows)) return false;
  MIRROR[authUsersTable()] = usersSanitize(rows);
  return mirrorSave(authUsersTable());
}
/*  ⛔ משתמש בודד, בלי משיכה מלאה — ⚠️ הכניסה המקוונת ושינוי הסיסמה מחזיקים
 *  את השורה בידם, ⭐ ובלי המסלול הזה מכשיר שאיבד רשת היה מאמת מול טביעה
 *  ישנה. ⛔ **מיזוג שדות ולא החלפת שורה** — ⚠️ תשובה בלי עמודה אינה מוחקת
 *  טביעה קיימת. */
function usersSaveOne(row) {
  var clean = usersSanitize(row)[0];
  if (!clean) return false;
  var t = authUsersTable(), arr = usersGet().slice(), hit = null;
  for (var i = 0; i < arr.length && !hit; i++) {
    var u = arr[i];
    if (!u) continue;
    if (clean.client_id != null ? String(u.client_id) === String(clean.client_id)
                                : String(u.username) === String(clean.username)) hit = u;
  }
  if (hit) Object.keys(clean).forEach(function (k) { hit[k] = clean[k]; });
  else arr.push(clean);
  MIRROR[t] = arr;
  return mirrorSave(t);
}
function usersByName(username) {
  var arr = usersGet();
  for (var i = 0; i < arr.length; i++) if (arr[i] && String(arr[i].username) === String(username)) return arr[i];
  return null;
}
/*  ⛔ רענון המראה מהענן — ⚠️ בכל המשתמשים ובעמודות שברשימה בלבד. ⭐ נקרא
 *  אחרי כניסה מקוונת, ⛔ ושומר הריצה הכפולה מונע שתי משיכות שנערמות ברשת
 *  איטית. ⚠️ `USER_CFG.refreshed` — מה שהאפליקציה עושה אחרי שהמראה נשמרה.
 *  ⛔ ובלי משתמש מחובר אין משיכה — ⚠️ רשימת הצוות אינה יורדת למכשיר של
 *  מי שטרם נכנס. */
var _authPulling = false;
async function usersRefresh() {
  if (_authPulling || !sessActive() || !app.USER_CFG.ready()) return false;
  _authPulling = true;
  try {
    var r = await app.USER_CFG.run(app.USER_CFG.from().select(AUTH_USER_COLS.join(',')));
    if (!r || r.error || !Array.isArray(r.data)) return false;
    usersSaveAll(r.data);
    if (app.USER_CFG.refreshed) app.USER_CFG.refreshed();
    return true;
  } catch (e) { console.warn('[auth] רענון המראה נכשל', e); return false; }
  finally { _authPulling = false; }
}
/* ═══════════════ סוף מודול מראת המשתמשים ════════════════════════════════ */

/* ═══ אימות מחדש בחזרת הרשת — מודול משותף ═════════════════════════════════
   ⛔ כניסה אופליין מאומתת מחדש מול הענן כשהרשת חוזרת — ⚠️ בלעדיה משתמש
      שהושבת, או שסיסמתו שונתה במכשיר אחר, נשאר מחובר עד הטעינה הבאה.
   ⭐ הכניסה נלכדת ב-`authLog` — ⚠️ המשתמש והטביעה שמולה אומת; ⛔ ומאזין
      ה-`online` נדרך בכניסה האופליין הראשונה, ⭐ שבלעדיה אין מה לאמת.
   ⛔ **כשל רשת אינו מכריע** — ⚠️ רק תשובה סמכותית מוציאה: ⭐ אין שורה,
      השורה מושבתת, או שהטביעה בענן אינה זו שמולה נכנס.
   ══════════════════════════════════════════════════════════════════════ */
var AUTH_OFFLINE_BRANCHES = ['offline', 'switch_offline'];
var _authOffline = null, _authWired = false;
function _authNoteLogin(ok, branch, username) {
  if (!ok) return;
  if (AUTH_OFFLINE_BRANCHES.indexOf(branch) === -1) { _authOffline = null; return; }
  var cu = usersByName(username), su = sessGet();
  _authOffline = { client_id: su ? su.client_id : (cu && cu.client_id),
                   fp: cu ? cu.pass_fp : null };
  if (_authWired || typeof window === 'undefined') return;
  _authWired = true;
  try { window.addEventListener('online', function () { authRevalidate(); }); }
  catch (e) { console.warn('[auth] online', e); }
}
async function authRevalidate() {
  var o = _authOffline;
  if (!o || o.client_id == null || !app.USER_CFG.ready()) return false;
  var res;
  try {
    res = await app.USER_CFG.run(app.USER_CFG.from().select(AUTH_USER_COLS.join(','))
      .eq('client_id', String(o.client_id)).maybeSingle());
  } catch (e) { return false; }
  /*  ⛔ ההקשר נלכד בכניסה ונבדק אחרי ההמתנה — ⚠️ יציאה או כניסה אחרת
   *  בזמן הבקשה אינה נזקפת למשתמש הקודם. */
  if (_authOffline !== o) return false;
  var su = sessGet();
  if (!su || String(su.client_id) !== String(o.client_id)) { _authOffline = null; return false; }
  if (!res || res.error) return false;
  var row = res.data;
  _authOffline = null;
  if (!row || row.active !== true || (o.fp && row.pass_fp !== o.fp)) {
    if (row) usersSaveOne(row);
    app.USER_CFG.logout((row && row.active === true) ? MSG_PASS_CHANGED_OUT : MSG_USER_DISABLED_OUT);
    return false;
  }
  usersSaveOne(row);
  if (app.USER_CFG.revalidated) app.USER_CFG.revalidated(row);
  console.log('[auth] כניסה אופליין אושררה מול הענן');
  return true;
}
/* ═══════════════ סוף מודול האימות מחדש ══════════════════════════════════ */

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
    if (!(res && res.error && authMissingFpCol(res.error))) return res;
    var b2 = Object.assign({}, body);
    delete b2.pass_salt; delete b2.pass_fp;
    return _writeUserSend(b2, key).then(function (r) {
      if (r && !r.error) r._noFp = true;
      return r;
    });
  }).then(function (res) { return app.USER_CFG.after(res, body); });
}
/* ═══════════════ סוף מודול כתיבת משתמש ══════════════════════════════════ */

/* ═══ רישום כניסה — מודול משותף ═══════════════════════════════════════════
   ═══════════════════════════════════════════════════════════════════════ */
/*  ⛔ כל כניסה — הצלחה וכישלון — נרשמת כאן ⛔ ולא באתר הכניסה: ⚠️ רישום
 *  שחי באפליקציה אחת הוא אפליקציה אחת שנרשמת. `branch` אומר איזה מסלול
 *  הכריע. ⛔ אין להוסיף לרשומה את הסיסמה או כל נגזרת שלה — ⚠️ היומן נקרא
 *  לכל מי שמחזיק את מפתח ה-anon.
 *  ⭐ כניסה מקוונת שהצליחה היא ראיה שהרשת עובדת — ⛔ ולכן תור היומן נשלח
 *  כאן, ⚠️ ולא באתר הכניסה של כל אפליקציה. */
var AUTH_ONLINE_BRANCHES = ['online', 'switch_online'];
function authLog(ok, branch, username) {
  logAction(ok ? 'login_ok' : 'login_fail', branch || null, 0,
            { typed_username: username || '', online: !!navigator.onLine });
  if (ok && AUTH_ONLINE_BRANCHES.indexOf(branch) !== -1) {
    try { logFlush(); } catch (e) { console.warn('[auth] logFlush', e); }
    try { usersRefresh(); } catch (e) { console.warn('[auth] usersRefresh', e); }
  }
  _authNoteLogin(ok, branch, username);
}
/* ═══════════════ סוף מודול רישום כניסה ══════════════════════════════════ */

/*  ⛔ הייצוא בשם ⛔ ואינו `default` — ⚠️ קורא שמייבא שם שנעלם נשבר בטעינה,
 *  ⭐ ו-`default` היה נבלע בשקט. */
export { AUTH_USER_COLS, ROLE_ADMIN, authLog, authMakePassFp, authMissingFpCol, authPassFields,
         authPassFp, authRandSalt, authRevalidate, authUsersTable, authVerify,
         isAdmin, isAdminOf, lkBoot, lkReset, lkStop, sessActive, sessClear,
         sessGet, sessSet, usersByName, usersGet, usersRefresh, usersSanitize,
         usersSaveAll, usersSaveOne, writeUser };
