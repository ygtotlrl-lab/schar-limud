// core/push.js — ההתראות במכשיר: הפעלה, בדיקה וכיבוי, מול שער ההתראות (sh-gate)
// במעטפת — אסימון FCM מהגשר AndroidPush (מוגבל למקור, כמו גשר השיתוף); בדפדפן — מינוי Web Push של ה-service worker.
// מי שמקבל — לפי «מקבל התראות» בטבלת המשתמשים, בשרת; כאן רק נרשם המכשיר, על שם המשתמש המחובר.
// זהות המשתמש מול השער — מהאפליקציה (app.NOTIFY_CFG.auth): בהנהלה אסימון השער, ובכניסה עם Google — אסימון הסשן;
// ומי המשתמש ואם סומן — app.NOTIFY_CFG.user().
// החלון «התראות במכשיר הזה» והכרטיס שמזמין להפעיל — כאן, אחידים בכל האפליקציות; האייקונים — מהסט של האפליקציה (shellIcon).

import { app } from './util.js';
import { lsGet, lsSet, lsSpace } from './storage.js';
import { closeModal, esc, openModal, toast } from './ui.js';
import { shellIcon } from './icons.js';

// המקור משותף לכל האפליקציות — המפתחות נושאים את מזהה האפליקציה
function _k(name) { return 'push_' + name + '_' + self.APP.id; }
// המפתחות נרשמים במרשם — מפתח שאינו במרשם נמחק בכל עלייה, וההתראות היו «כבויות» אחרי כל עדכון
var PUSH_KEYS = ['on', 'asked', 'dev', 'blocked', 'vapid'];
lsSpace({ keys: function () { return PUSH_KEYS.map(_k); }, owns: function (k) { return PUSH_KEYS.map(_k).indexOf(k) >= 0; } });
function _gateUrl() { return self.APP.supabase.url + '/functions/v1/sh-gate'; }
function _cfg() { return app.NOTIFY_CFG || {}; }
function _me() { try { return _cfg().user ? _cfg().user() : null; } catch (e) { return null; } }

// מזהה המכשיר — אקראי, נוצר פעם אחת; השער מחליף בו את האסימון הקודם של אותו מכשיר
function pushDevice() {
  var d = lsGet(_k('dev'));
  if (!d) {
    var b = new Uint8Array(12);
    crypto.getRandomValues(b);
    d = Array.from(b).map(function (x) { return (x + 0x100).toString(16).slice(1); }).join('');
    lsSet(_k('dev'), d);
  }
  return d;
}

function _shell() { return !!(self.AndroidPush && typeof self.AndroidPush.postMessage === 'function'); }
// שאלה אחת למעטפת בכל פעם; בלי תשובה תוך 20 שניות — כאילו אין אסימון
var _shellQ = Promise.resolve();
function _shellAsk(op) {
  _shellQ = _shellQ.then(function () {
    return new Promise(function (resolve) {
      var t = setTimeout(function () { resolve(null); }, 20000);
      self.AndroidPush.onmessage = function (e) {
        clearTimeout(t);
        try { resolve(JSON.parse(e.data)); } catch (x) { resolve(null); }
      };
      self.AndroidPush.postMessage(JSON.stringify({ op: op }));
    });
  });
  return _shellQ;
}

function pushSupported() {
  if (_shell()) return true;
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in self && 'Notification' in self;
}
// on — הופעל במכשיר הזה ולא כובה; ההרשאה עצמה עשויה להשתנות בהגדרות המערכת
function pushIsOn() { return lsGet(_k('on')) === '1'; }
// חסום — המשתמש סירב בחלון של המערכת; רק הגדרות המכשיר מבטלות סירוב
function pushBlocked() {
  if (_shell()) return lsGet(_k('blocked')) === '1';
  return pushSupported() && Notification.permission === 'denied';
}

async function _post(body) {
  var a = {};
  try { a = _cfg().auth ? (await _cfg().auth()) || {} : {}; } catch (e) { a = {}; }
  var k = self.APP.supabase.key;
  var j = null;
  try {
    // זמן קצוב — בלי תשובה תוך 20 שניות הבקשה נחשבת כשל, ושום חלון אינו נשאר תקוע
    var res = await Promise.race([fetch(_gateUrl(), {
      method: 'POST',
      headers: Object.assign({ apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' }, a.headers || {}),
      body: JSON.stringify(Object.assign({ app: self.APP.id }, a.body || {}, body))
    }), new Promise(function (_, no) { setTimeout(function () { no(new Error('timeout')); }, 20000); })]);
    j = await res.json();
  } catch (e) { j = null; }
  return j || { error: 'net' };
}

function _b64ToBytes(s) {
  var p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
  var o = new Uint8Array(b.length);
  for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i);
  return o;
}

// ask — מותר לשאול את המשתמש על ההרשאה (רק מלחיצה שלו); בלי — רק אם כבר ניתנה
// מחזיר { kind, push } או 'denied' או null
async function _token(ask) {
  if (_shell()) {
    var r = await _shellAsk(ask ? 'enable' : 'token');
    lsSet(_k('blocked'), r && r.perm === 'denied' ? '1' : '0');
    if (r && r.token) return { kind: 'fcm', push: String(r.token) };
    return (r && r.perm === 'denied') ? 'denied' : null;
  }
  if (!pushSupported()) return null;
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') {
    if (!ask) return null;
    var p = await Notification.requestPermission();
    if (p !== 'granted') return p === 'denied' ? 'denied' : null;
  }
  var reg = await navigator.serviceWorker.ready;
  var sub = await reg.pushManager.getSubscription();
  if (!sub) {
    // המפתח הציבורי — נשמר במכשיר אחרי הפעם הראשונה, וההפעלה אינה ממתינה לשרת פעמיים
    var key = lsGet(_k('vapid'));
    if (!key) { var v = await _post({ action: 'vapid' }); if (!v || !v.key) return null; key = v.key; lsSet(_k('vapid'), key); }
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: _b64ToBytes(key) });
  }
  return { kind: 'web', push: JSON.stringify(sub) };
}

// 'ok' · 'denied' (ההרשאה נחסמה במכשיר) · 'unsupported' · 'fail'
async function pushEnable() {
  if (!pushSupported()) return 'unsupported';
  var t;
  try { t = await _token(true); } catch (e) { console.warn('[push] token', e); t = null; }
  if (t === 'denied') return 'denied';
  if (!t) return 'fail';
  var r = await _post({ action: 'reg', device: pushDevice(), kind: t.kind, push: t.push });
  if (!r || !r.ok) return 'fail';
  lsSet(_k('on'), '1');
  return 'ok';
}
async function pushDisable() {
  lsSet(_k('on'), '0');
  try { await _post({ action: 'unreg', device: pushDevice() }); } catch (e) { /* */ }
  if (!_shell() && pushSupported()) {
    try { var reg = await navigator.serviceWorker.ready; var s = await reg.pushManager.getSubscription(); if (s) await s.unsubscribe(); }
    catch (e) { /* */ }
  }
  return 'ok';
}
// ההתראה מגיעה למכשירי המשתמש המחובר בלבד — בלי תלות בסימון «מקבל התראות»
async function pushTest() {
  var r = await _post({ action: 'test' });
  return r && r.push ? r.push : null;
}
// אחרי כל כניסה — אסימון שהתחלף נרשם מחדש בשקט, על שם המשתמש שנכנס; בלי שאלה למשתמש
async function pushRefresh() {
  if (!pushIsOn()) return false;
  try {
    var t = await _token(false);
    if (!t || t === 'denied') return false;
    var r = await _post({ action: 'reg', device: pushDevice(), kind: t.kind, push: t.push });
    return !!(r && r.ok);
  } catch (e) { return false; }
}
// ביציאה — המכשיר יורד מהרשימה, ומשתמש אחר שנכנס בו אינו מקבל את ההתראות של הקודם
async function pushSignOut() {
  if (!pushIsOn()) return;
  try { await _post({ action: 'unreg', device: pushDevice() }); } catch (e) { /* */ }
}
// מי הפעיל התראות — מספר המכשירים לכל משתמש; למנהל בלבד ({} כשאין)
async function pushDevices() {
  try { var r = await _post({ action: 'devices' }); return (r && r.devices) || {}; } catch (e) { return {}; }
}
// הגדרות ההתראות של המכשיר — במעטפת המסך של האפליקציה בהגדרות הטלפון; בדפדפן אין דרך לפתוח, ומוצג הסבר
function pushOpenSettings() {
  if (_shell()) { _shellAsk('settings'); return true; }
  return false;
}

// הפעמון — מלא: הפעיל במכשיר אחד לפחות (ולידו המספר, כשיש יותר); ריק: עוד לא הפעיל; בלי סימון (בהנהלה) — מקום ריק, כדי שהעמודה לא תזוז
function bellHTML(notify, devices) {
  if (!notify) return '<span class="ga-bell is-none"></span>';
  var n = devices || 0;
  return '<span class="ga-bell' + (n ? ' is-on' : '') + '" title="' + (n ? 'התראות פועלות · ' + n + ' מכשירים' : 'עוד לא הפעיל התראות במכשיר') + '">' +
    shellIcon('bell') + (n > 1 ? '<i>' + n + '</i>' : '') + '</span>';
}

// ── החלון «התראות במכשיר הזה» ──
var MSG_PUSH = {
  ok: 'ההתראות הופעלו במכשיר הזה', off: 'ההתראות כובו במכשיר הזה',
  denied: 'ההתראות חסומות בהגדרות המכשיר', unsupported: 'המכשיר או הדפדפן אינם תומכים בהתראות',
  fail: 'ההפעלה נכשלה — בדקו את החיבור ונסו שוב', test: 'נשלחה התראת בדיקה', testNone: 'לא נמצא מכשיר רשום — הפעילו שוב את ההתראות',
  testKey: 'המכשיר רשום, אבל השליחה לטלפונים עוד לא הוגדרה בשרת'
};
function _ic(n) { return shellIcon(n); }
// המצב — שבב בכותרת; והפעולות — שורות כמו בכרטיס החשבון (אייקון בעיגול · שם · חץ), בלי כפתורים בתחתית
function _row(act, ic, label, cls) {
  return '<button type="button" class="ga-row' + (cls ? ' ' + cls : '') + '" data-act="' + act + '">' +
    '<span class="ga-ri">' + _ic(ic) + '</span><span class="ga-rl">' + esc(label) + '</span><span class="ga-chev" aria-hidden="true"></span></button>';
}
function _stateHTML() {
  var on = pushIsOn(), sup = pushSupported(), blocked = pushBlocked();
  var state = !sup ? 'לא נתמך' : blocked ? 'חסומות' : on ? 'פועלות' : 'כבויות';
  return '<span class="push-st-l' + (on && !blocked ? ' is-on' : blocked ? ' is-bad' : '') + '">' + esc(state) + '</span>';
}
function _bodyHTML() {
  var on = pushIsOn(), sup = pushSupported(), blocked = pushBlocked(), me = _me();
  if (!sup) return '<div class="push-st"><p>המכשיר או הדפדפן אינם תומכים בהתראות.</p></div>';
  if (blocked) return '<div class="push-st"><p class="push-fix">' + (_shell()
      ? 'ההתראות חסומות בהגדרות המכשיר. כדי לבטל את החסימה — פותחים את הגדרות ההתראות ומפעילים את ההתראות של האפליקציה.'
      : 'ההתראות חסומות בדפדפן. כדי לבטל את החסימה — לוחצים על סמל המנעול שליד הכתובת, ומאפשרים «התראות».') + '</p>' +
    (_shell() ? '<div class="ga-rows">' + _row('push-settings', 'power', 'פתיחת הגדרות ההתראות', 'is-pri') + '</div>' : '') + '</div>';
  // בהנהלה — רק מי שסומן «מקבל התראות» מקבל; ההסבר — רק למי שלא סומן
  var why = (me && me.notify === false) ? '<p>לא סומנת «מקבל התראות» — המכשיר יירשם, וההתראות יגיעו כשהמנהל יסמן אותך.</p>' : '';
  return '<div class="push-st">' + why + '<div class="ga-rows">' + (on
    ? _row('push-test', 'bell', 'שליחת התראת בדיקה') + _row('push-off', 'power', 'כיבוי ההתראות', 'is-out')
    : _row('push-on', 'power', 'הפעלת ההתראות', 'is-pri')) + '</div></div>';
}
function pushModal() {
  openModal('התראות במכשיר הזה', _bodyHTML(), '', _ic('bell'));
  var t = document.getElementById('modal-title');
  if (t) t.insertAdjacentHTML('beforeend', _stateHTML());
}
async function _act(kind) {
  if (kind === 'test') {
    var r = await pushTest();
    toast(r && (r.ok || 0) > 0 ? MSG_PUSH.test : r && r.nokey ? MSG_PUSH.testKey : MSG_PUSH.testNone, null, r && r.ok ? 'good' : 'warn');
    return;
  }
  if (kind === 'off') { await pushDisable(); toast(MSG_PUSH.off, null, 'good'); closeModal(); return; }
  var res = await pushEnable();
  _promptHide();
  toast(MSG_PUSH[res] || MSG_PUSH.fail, null, res === 'ok' ? 'good' : 'warn');
  pushModal();
}

// ── הכרטיס שמזמין להפעיל — פעם אחת בכל מכשיר, למי שסומן ועוד לא הפעיל בו; «לא עכשיו» אינו חוזר ──
function _promptHide() { var el = document.getElementById('push-prompt'); if (el) el.remove(); }
function pushPrompt() {
  var me = _me();
  if (!me || me.notify === false || !pushSupported() || pushIsOn() || pushBlocked() || lsGet(_k('asked')) === '1') return false;
  if (document.getElementById('push-prompt')) return true;
  var el = document.createElement('div');
  el.id = 'push-prompt';
  el.className = 'push-prompt';
  el.setAttribute('role', 'dialog');
  el.innerHTML = '<div class="push-prompt-ic">' + _ic('bell') + '</div>' +
    '<div class="push-prompt-t"><b>התראות מהאפליקציה</b><span>להפעיל אותן במכשיר הזה?</span></div>' +
    '<div class="push-prompt-b"><button class="push-later" data-act="push-later">לא עכשיו</button>' +
    '<button class="push-go" data-act="push-on">' + _ic('power') + 'הפעלה</button></div>';
  document.body.appendChild(el);
  return true;
}

// מפת הפעולות — האפליקציה פורשת אותה לתוך DOM_ACTIONS שלה
var PUSH_ACTIONS = {
  'push-open': function () { pushModal(); },
  'push-on': function () { lsSet(_k('asked'), '1'); return _act('on'); },
  'push-off': function () { return _act('off'); },
  'push-test': function () { return _act('test'); },
  'push-settings': function () { pushOpenSettings(); },
  'push-later': function () { lsSet(_k('asked'), '1'); _promptHide(); }
};

export { PUSH_ACTIONS, bellHTML, pushBlocked, pushDevice, pushDevices, pushDisable, pushEnable, pushIsOn, pushModal, pushOpenSettings,
         pushPrompt, pushRefresh, pushSignOut, pushSupported, pushTest };
