// core/storage.js — האחסון המקומי: IndexedDB, והזיכרון שמעליו

import { app } from './util.js';
import { lsToast } from './ui.js';

// ── האחסון ──
// מסד IndexedDB אחד לאפליקציה, בשם APP.id, ומאגר מפתח-ערך אחד — הכל נטען לזיכרון ב-lsOpen לפני כל קריאה,
// והקריאה והכתיבה סינכרוניות מול הזיכרון: קריאה אסינכרונית במסך היא נתון שנקרא לפני שהגיע.
// הכתיבה לדיסק בתור אחד, ו-lsFlush מסתיימת כשהתור נכתב — ההצלחה מוצגת רק אחריה.
var LS_STORE = 'kv';
var LS_OPEN_MS = 8000; // מסד שאינו נפתח עד אז — מצב זיכרון בלבד, והעלייה אינה נתקעת
var LS_LOG_MAX = 12;

// נוסח אחיד: סמל הצלחה, אזהרה או שגיאה בתחילת ההודעה.
var MSG_LS_FULL  = '❌ האחסון במכשיר מלא — לא ניתן לשמור. התחברו לרשת כדי שהנתונים יסונכרנו.';
var MSG_LS_BLOCK = '❌ האחסון במכשיר חסום — לא ניתן לשמור במכשיר.';

var _lsMap = new Map();
var _lsDb = null;      // null — מצב זיכרון בלבד
var _lsOpening = null;

// ── יומן האחסון ──
// קצר בכוונה; נכתב לזיכרון ונוסע עם הכתיבה הבאה — רישום שמזניק כתיבה היה חוזר על עצמו בכל כשל.
function lsLog(action, detail, n) {
  var e = { t: Date.now(), a: String(action), d: String(detail == null ? '' : detail), b: Number(n) || 0 };
  try { console.info('[ls] ' + e.a + (e.d ? ' · ' + e.d : '') + (e.b ? ' · ' + e.b : '')); } catch (e1) { }
  try {
    var k = app.LS_CFG.logKey, arr;
    try { arr = JSON.parse(_lsMap.get(k) || '[]'); } catch (e2) { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    arr.push(e);
    while (arr.length > LS_LOG_MAX) arr.shift();
    _lsMap.set(k, JSON.stringify(arr));
    lsMark(k);
  } catch (e3) { }
}

// שם השגיאה משתנה בין דפדפנים; code 22 הוא הישן, 1014 של פיירפוקס.
function lsIsQuotaErr(e) {
  if (!e) return false;
  var n = e.name || '';
  return n === 'QuotaExceededError' || n === 'NS_ERROR_DOM_QUOTA_REACHED' ||
         e.code === 22 || e.code === 1014;
}

// ── באנר כישלון קבוע ──
// טוסט נעלם אחרי שלוש שניות; כישלון שמירה נשאר על המסך עד שהמשתמש סוגר אותו.
function lsAlert(msg) {
  var el = document.getElementById('ls-alert');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ls-alert';
    el.setAttribute('role', 'alert');
    var sp = document.createElement('span');
    sp.id = 'ls-alert-msg';
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = '✕';
    b.setAttribute('aria-label', 'סגור');
    b.dataset.act = 'ls-alert-close';
    el.appendChild(sp); el.appendChild(b);
    (document.body || document.documentElement).appendChild(el);
  }
  var m = document.getElementById('ls-alert-msg');
  if (m) m.textContent = String(msg == null ? '' : msg);
}

// ── השתקת טוסט הצלחה אחרי כישלון שמירה ──
// toast() פותחת ב-lsGuardToast, והודעת הצלחה נבלעת אם כתיבה מקומית נכשלה ב-2.5 השניות האחרונות.
// אין להסיר את השער מ-toast — בלעדיו כתיבה שנכשלה מלווה ב«נשמר בהצלחה».
var _lsLastFailAt = 0;
var _lsToastAt = 0;
var LS_SUCCESS_MUTE_MS = 2500;
function lsSuccessBlocked() { return (Date.now() - _lsLastFailAt) < LS_SUCCESS_MUTE_MS; }
function lsGuardToast(msg) {
  return !(String(msg == null ? '' : msg).indexOf('✅') === 0 && lsSuccessBlocked());
}
// הבאנר אידמפוטנטי ומוצג בכל כישלון; הטוסט מווסת כדי שסדרת כתיבות כושלת לא תסתיר את ההודעה עצמה.
function lsToastThrottled(msg) {
  var now = Date.now();
  if (now - _lsToastAt < 8000) return;
  _lsToastAt = now;
  try { lsToast(msg, 6000, 'bad'); } catch (e) { }
}
function lsFail(e) {
  _lsLastFailAt = Date.now();
  var full = lsIsQuotaErr(e);
  lsLog(full ? '❌ כתיבה נכשלה (מכסה)' : '❌ כתיבה נכשלה (אחסון חסום)', e && (e.name || e.message), 0);
  lsAlert(full ? MSG_LS_FULL : MSG_LS_BLOCK);
  lsToastThrottled(full ? MSG_LS_FULL : MSG_LS_BLOCK);
  return false;
}

// ── תור הכתיבה ──
// מפתח מלוכלך נושא את מספר הכתיבה האחרונה שלו — הערך שנכתב נקרא מהזיכרון ברגע פתיחת הטרנזקציה,
// והסימון יורד רק אם לא נכתב אחריו ערך חדש. כשל משאיר את המפתחות בתור, והכתיבה הבאה מנסה שוב.
var _lsDirty = new Map();
var _lsSeq = 0;
var _lsTail = Promise.resolve(true);
var _lsTimer = null;
function lsMark(k) { _lsDirty.set(k, ++_lsSeq); }
function lsKick() { if (!_lsTimer) _lsTimer = setTimeout(lsFlush, 0); }
function lsWriteDirty() {
  if (!_lsDirty.size) return Promise.resolve(true);
  if (!_lsDb) return Promise.resolve(false);
  var batch = Array.from(_lsDirty);
  return new Promise(function (res) {
    var tx;
    try {
      tx = _lsDb.transaction(LS_STORE, 'readwrite');
      var st = tx.objectStore(LS_STORE);
      batch.forEach(function (b) {
        if (_lsMap.has(b[0])) st.put(_lsMap.get(b[0]), b[0]); else st.delete(b[0]);
      });
    } catch (e) { res(lsFail(e)); return; }
    tx.oncomplete = function () {
      batch.forEach(function (b) { if (_lsDirty.get(b[0]) === b[1]) _lsDirty.delete(b[0]); });
      res(true);
    };
    tx.onabort = function () { res(lsFail(tx.error)); };
  });
}
// true — כל מה שנכתב לזיכרון עד הקריאה נמצא בדיסק; false — כשל, והבאנר הקבוע כבר עלה.
function lsFlush() {
  if (_lsTimer) { clearTimeout(_lsTimer); _lsTimer = null; }
  _lsTail = _lsTail.then(lsWriteDirty, lsWriteDirty);
  return _lsTail;
}

// ── קריאה וכתיבה ──
// סינכרוניות מול הזיכרון; false מ-lsSet — מצב זיכרון בלבד, והערך לא יגיע לדיסק.
function lsGet(key, fallback) {
  var v = _lsMap.get(key);
  return v == null ? (fallback === undefined ? null : fallback) : v;
}
function lsSet(key, value) {
  _lsMap.set(key, value == null ? '' : String(value));
  lsMark(key); lsKick();
  return !!_lsDb;
}
function lsRemove(key) {
  _lsMap.delete(key);
  lsMark(key); lsKick();
  return !!_lsDb;
}
function lsKeys() { return Array.from(_lsMap.keys()); }

// ── מרשם המפתחות ──
// מפתח במסד שאינו במרשם נמחק בעלייה. משפחה (lsSpace) מצהירה על מפתחות מחוץ לתחילית —
// keys() ריקה או זורקת היא «אין ראיה» ולא «אין מה לשמור», ומפתח שמשפחה כזו מחזיקה אינו נמחק.
var _lsSpaces = [];
function lsSpace(sp) { if (sp && typeof sp.keys === 'function' && typeof sp.owns === 'function') _lsSpaces.push(sp); }
function lsKeyRegistry() {
  var own = {}, list = app.LS_CFG.keys(), i;
  for (i = 0; i < list.length; i++) if (typeof list[i] === 'string' && list[i]) own[list[i]] = true;
  return own;
}
// מחזירה את המשפחות שאינן נקראות — מה שהן מחזיקות אינו נמחק.
function lsSpacesRead(own) {
  var dark = [];
  _lsSpaces.forEach(function (sp) {
    var ks = null;
    try { ks = sp.keys(); } catch (e) { console.warn('[ls] משפחת מפתחות אינה נקראת — מחוץ לניקוי', e); ks = null; }
    if (!Array.isArray(ks) || !ks.length) { dark.push(sp); return; }
    ks.forEach(function (k) { if (typeof k === 'string' && k) own[k] = true; });
  });
  return dark;
}
function lsOwnedBy(list, k) {
  for (var j = 0; j < list.length; j++) { try { if (list[j].owns(k)) return true; } catch (e) { return true; } }
  return false;
}
// המרשם, או null כשאינו נקרא — מרשם שאינו נקרא אינו מוחק דבר.
function lsRegistry() {
  var own;
  try { own = lsKeyRegistry(); } catch (e) { console.error('[ls] המרשם אינו נקרא — אין ניקוי', e); return null; }
  if (!Object.keys(own).length) { console.error('[ls] המרשם ריק — אין ניקוי'); return null; }
  var dark = lsSpacesRead(own);
  return { known: function (k) { return own[k] === true || lsOwnedBy(dark, k); } };
}

// ── «יש ממתין» והרישום לפני מחיקה ──
// מי שיודע מה ממתין (הסנכרון) ומי שמחזיק את תור היומן (הגיבוי) נרשמים כאן — הליבה אינה מייבאת אותם.
// מפתח שנמחק כשיש ממתין הוא אולי העותק היחיד של מה שממתין, ולכן הוא נרשם כמות שהוא לפני המחיקה, בפעולה של זריקת העידן.
var LS_DROP_ACTION = 'era_discard';
var LS_IMPORT_ACTION = 'ls_import';
var _lsWire = { pending: null, log: null };
function lsWire(o) {
  if (o && typeof o.pending === 'function') _lsWire.pending = o.pending;
  if (o && typeof o.log === 'function') _lsWire.log = o.log;
}
// כשל בבדיקה, או בדיקה שלא חווטה, נקראים «יש ממתין» — רישום מיותר זול ממחיקה בלי רישום.
function lsPending() {
  if (!_lsWire.pending) return true;
  try { return !!_lsWire.pending(); } catch (e) { return true; }
}
// true רק כשהתור קיבל את כולם — רישום שנכשל משאיר את המפתחות לעלייה הבאה.
function lsDropLog(keys, valOf) {
  if (!lsPending()) return true;
  if (!_lsWire.log) { console.error('[ls] אין תור יומן — המפתחות נשארים'); return false; }
  try {
    return _lsWire.log(LS_DROP_ACTION, keys.map(function (k) {
      return { key: k, details: { ls: k, value: valOf(k) } };
    })) === true;
  } catch (e) { console.error('[ls] הרישום לפני המחיקה נכשל — המפתחות נשארים', e); return false; }
}
function lsKeySweep() {
  var reg = lsRegistry();
  if (!reg) return 0;
  var drop = lsKeys().filter(function (k) { return !reg.known(k); });
  if (drop.length && !lsDropLog(drop, function (k) { return lsGet(k, null); })) return 0;
  drop.forEach(lsRemove);
  if (drop.length) lsLog('מפתח שאינו מוצהר נמחק', drop.join(' · '), 0);
  return drop.length;
}

// ── ייבוא האחסון הישן — localStorage ──
// מכשיר שמחזיק עוד localStorage מייבא ממנו פעם אחת: כל מפתח מוצהר במרחב האפליקציה, כמות שהוא, ושורת מראה דחוסה נפרשת —
// בטרנזקציה אחת, והמחיקה מ-localStorage רק אחרי שהושלמה: מחיקה לפני הכתיבה היא נתון שאבד.
// מפתח שכבר במסד חדש מהעותק הישן ואינו נדרס. מפתח של אפליקציה אחרת אינו נגע — ה-origin משותף.
// שורת מראה נכתבה כמערך ערכים, ושמות העמודות פעם אחת למפתח; כל שורה נפתחת במספר צורתה.
function lsUnpack(v) {
  if (Array.isArray(v)) return v;
  if (!v || !Array.isArray(v.cols) || !Array.isArray(v.rows)) return null;
  var out = [];
  v.rows.forEach(function (a) {
    var ks = Array.isArray(a) ? v.cols[a[0]] : null;
    if (!Array.isArray(ks)) return;
    var o = {};
    for (var j = 0; j < ks.length; j++) o[ks[j]] = a[j + 1];
    out.push(o);
  });
  return out;
}
function lsImportVal(raw) {
  var v;
  try { v = JSON.parse(raw); } catch (e) { return raw; }
  if (!v || Array.isArray(v) || !Array.isArray(v.cols)) return raw;
  var rows = lsUnpack(v);
  return rows ? JSON.stringify(rows) : raw;
}
function lsLegacyKeys() {
  var pre = self.APP.prefix, out = [], i, k;
  if (!pre) return out;
  try {
    for (i = 0; i < localStorage.length; i++) {
      k = localStorage.key(i);
      if (k != null && (k.indexOf(pre) === 0 || lsOwnedBy(_lsSpaces, k))) out.push(k);
    }
  } catch (e) { return []; }
  return out;
}
function lsImport() {
  var ks = lsLegacyKeys();
  if (!ks.length) return Promise.resolve(0);
  var reg = lsRegistry();
  if (!reg) return Promise.resolve(0);
  var old = {}, take = [], rest = [];
  ks.forEach(function (k) {
    try { old[k] = localStorage.getItem(k); } catch (e) { old[k] = null; }
    if (old[k] == null) return;
    if (reg.known(k)) take.push(k); else rest.push(k);
  });
  var fresh = take.filter(function (k) { return !_lsMap.has(k); });
  fresh.forEach(function (k) { _lsMap.set(k, lsImportVal(old[k])); });
  // בלי מסד — הזיכרון בלבד, ו-localStorage נשאר לעלייה הבאה.
  if (!_lsDb) return Promise.resolve(0);
  return new Promise(function (res) {
    var tx;
    try {
      tx = _lsDb.transaction(LS_STORE, 'readwrite');
      var st = tx.objectStore(LS_STORE);
      fresh.forEach(function (k) { st.put(_lsMap.get(k), k); });
    } catch (e) { res(false); return; }
    tx.oncomplete = function () { res(true); };
    tx.onabort = function () { res(false); };
  }).then(function (ok) {
    if (!ok) {
      // הזיכרון נשאר מלא והמפתחות מסומנים — הכתיבה הבאה מנסה שוב, ו-localStorage נשאר עד שתצליח.
      fresh.forEach(lsMark);
      lsLog('❌ ייבוא נכשל', fresh.length + ' מפתחות — localStorage נשאר', 0);
      return 0;
    }
    var gone = take.slice();
    if (rest.length && lsDropLog(rest, function (k) { return old[k]; })) gone = gone.concat(rest);
    gone.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { } });
    lsLog('ייבוא מ-localStorage', fresh.length + ' מפתחות · ' + (gone.length - take.length) + ' שאינם מוצהרים ירדו', fresh.length);
    if (_lsWire.log) {
      try { _lsWire.log(LS_IMPORT_ACTION, [{ key: LS_IMPORT_ACTION, details: { keys: fresh.length, dropped: gone.length - take.length } }]); }
      catch (e1) { }
    }
    return fresh.length;
  });
}

// ── הפתיחה ──
// תמיד מסתיימת בהצלחה: מסד שלא נפתח — מצב זיכרון בלבד, והבאנר הקבוע עולה.
function lsOpenDb() {
  return new Promise(function (res) {
    var done = false, req;
    function end(db) { if (done) { if (db) try { db.close(); } catch (e0) { } return; } done = true; res(db); }
    setTimeout(function () { end(null); }, LS_OPEN_MS);
    try { req = indexedDB.open(self.APP.id, 1); } catch (e) { end(null); return; }
    req.onupgradeneeded = function () {
      try { if (!req.result.objectStoreNames.contains(LS_STORE)) req.result.createObjectStore(LS_STORE); } catch (e1) { }
    };
    req.onsuccess = function () { end(req.result); };
    req.onerror = function () { end(null); };
    req.onblocked = function () { end(null); };
  });
}
function lsReadAll(db) {
  return new Promise(function (res, rej) {
    var tx = db.transaction(LS_STORE, 'readonly'), st = tx.objectStore(LS_STORE);
    var ks = st.getAllKeys(), vs = st.getAll();
    tx.oncomplete = function () { res({ keys: ks.result, vals: vs.result }); };
    tx.onabort = function () { rej(tx.error); };
  });
}
// בלי בקשת עמידות הדפדפן רשאי לפנות את המסד בלחץ מקום — והוא העותק היחיד של מה שטרם עלה.
function lsPersist() {
  try {
    if (!navigator.storage || typeof navigator.storage.persist !== 'function') { lsLog('persist', 'אינו נתמך', 0); return; }
    navigator.storage.persist().then(function (g) { lsLog('persist', g ? 'ניתן' : 'נדחה', 0); },
                                     function (e) { lsLog('persist', 'נכשל — ' + (e && e.message), 0); });
  } catch (e1) { }
}
function lsOpen() {
  if (_lsOpening) return _lsOpening;
  _lsOpening = lsOpenDb().then(function (db) {
    if (!db) return null;
    return lsReadAll(db).then(function (all) {
      for (var i = 0; i < all.keys.length; i++) if (typeof all.keys[i] === 'string') _lsMap.set(all.keys[i], all.vals[i]);
      _lsDb = db;
    }, function () { try { db.close(); } catch (e) { } });
  }).catch(function () { }).then(function () {
    if (!_lsDb) { _lsLastFailAt = Date.now(); lsAlert(MSG_LS_BLOCK); lsLog('❌ המסד לא נפתח', 'מצב זיכרון בלבד', 0); }
    return lsImport().catch(function (e) { console.warn('[ls] ייבוא', e); });
  }).then(function () {
    try { lsKeySweep(); } catch (e) { console.warn('[ls] ניקוי המרשם', e); }
    lsPersist();
    // התור נכתב גם כשהדף נסגר או מוסתר — ההבטחה אינה נשמרת, אך הטרנזקציה כבר בדרך.
    try {
      window.addEventListener('pagehide', function () { lsFlush(); });
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') lsFlush(); });
    } catch (e1) { }
    return true;
  }, function () { return true; });
  return _lsOpening;
}

// ייצוא בשם ולא default — שם שנעלם נשבר בטעינה, ו-default היה נבלע בשקט.
export { MSG_LS_FULL, lsFlush, lsGet, lsGuardToast, lsKeys, lsLog, lsOpen,
         lsRemove, lsSet, lsSpace, lsWire };
