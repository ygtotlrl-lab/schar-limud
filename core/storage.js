/* ═══ core/storage.js — האחסון המקומי ═══════════════════════════════════
   ⭐ הכתיבה לדיסק, הפינוי והחלון החם.
   השורות: «`hw` — חלון חם» · «אחסון מקומי» · «אסטרטגיית `localStorage`»
   ⛔ המודול זהה בית-לבית בכל ריפו שנושא אותו — ⚠️ והתצורה פר-אפליקציה
      נמסרת ב-`appConfigure` שבראש `index.html`, ⭐ ואינה כתובה כאן.
   ⛔ ושינוי כאן — בכל הריפו שנושאים אותו, באותו סבב.
   ════════════════════════════════════════════════════════════════════ */

import { app } from './util.js';
import { lsToast } from './ui.js';

/* ═══ עמידות אחסון מקומי — מודול משותף ═════════════════════════════════
   ══════════════════════════════════════════════════════════════════════════ */

/*  ⛔ המכסה היא מספר שנמדד בדפדפן — ⚠️ Chromium מקבל 10 MiB במדידת
 *  `lsEntryBytes` (תווים × 2) ⛔ ונופל ב-`QuotaExceededError` מעליהם:
 *  ⭐ מד שמראה יותר ממאה אחוז בזמן שהכתיבה מצליחה — מודד שגוי.
 *  ⛔ והספים נגזרים ממנה באחוזים — ⚠️ סף שמוקלד בבתים נשאר במקומו
 *  ביום שהמכסה נמדדת מחדש. */
var LS_QUOTA_BYTES = 10 * 1024 * 1024;
var LS_WARN_PCT    = 0.60;              // התרעה
var LS_CRIT_PCT    = 0.80;              // התרעה בולטת
var LS_WARN_BYTES  = Math.floor(LS_QUOTA_BYTES * LS_WARN_PCT);
var LS_CRIT_BYTES  = Math.floor(LS_QUOTA_BYTES * LS_CRIT_PCT);
var LS_SWEEP_PCT   = 0.60;              // מעל זה — פינוי יזום בעלייה
var LS_SWEEP_TO    = 0.45;              // יעד הפינוי היזום
var LS_LOG_MAX     = 12;                // אורך יומן הפינוי הנשמר

/*  ⭐ חלון הפינוי נגזר מסוג האפליקציה — ⚠️ **מה נכנס**: סוג ⟵ ימים, ⛔ **ומה
 *  מפיל**: סוג שאין לו אפליקציה, ⚠️ ואפליקציה שמצהירה סוג שאינו כאן.
 *  ⭐ **ולמה המפה קיימת**: חלון שנבחר בכל אפליקציה לבדה נבחר בלי קשר
 *  לחישוב שקורא את הטבלה — ⛔ ורשומה שפונתה מתוך מה שהחישוב קורא היא
 *  יתרה שגויה, אופליין ובשקט. ⚠️ **ואפליקציה בלי סוג אינה מפנה דבר** —
 *  ⛔ חלון שאיש לא הכריע עליו אינו חלון. */
var LS_DAY_MS = 86400000;
var LS_APP_TYPES = { annual: 400, daily: 90 };
function lsWindowMs() {
  var t = app.LS_CFG.appType && app.LS_CFG.appType.type;
  var d = Object.prototype.hasOwnProperty.call(LS_APP_TYPES, t) ? LS_APP_TYPES[t] : 0;
  return d > 0 ? d * LS_DAY_MS : Infinity;
}

// נוסח אחיד בכל האפליקציות. סמלים: ✅ הצלחה / ⚠️ אזהרה / ❌ שגיאה, בתחילה.
var MSG_LS_FULL   = '❌ האחסון במכשיר מלא — לא ניתן לשמור. התחברו לרשת כדי שהנתונים יסונכרנו והמקום יתפנה.';
var MSG_LS_BLOCK  = '❌ האחסון במכשיר חסום — לא ניתן לשמור במכשיר.';
var MSG_LS_WARN   = '⚠️ האחסון המקומי מתמלא — התחברו לרשת, והמקום יתפנה מעצמו';
var MSG_LS_CRIT   = '⚠️ האחסון המקומי כמעט מלא — התחברו לרשת כדי שהמקום יתפנה';
var MSG_LS_RESTORED = '✅ האחסון התפנה — הנתונים הישנים חוזרים בסנכרון הזה';
var MSG_LS_PRUNED = '⚠️ נתונים ישנים פונו מהמכשיר מחוסר מקום — הם שמורים בענן ויחזרו כשתהיה רשת';

/*  ⛔ כל האפליקציות שחולקות את ה-origin — ⚠️ הקידומת היא מה שמזהה מי תופס
 *  מה, ⛔ והרשימה נמדדת מול כל הריפו: ⭐ אפליקציה שנולדה אחרי הרשימה
 *  נספרת כ«אחר», ⚠️ ואיש אינו רואה. */
var LS_APPS = [
  { id: 'hanhala', name: 'הנהלה רוחנית', pre: ['hr_'] },
  { id: 'schar',   name: 'שכר לימוד',    pre: ['sl_'] },
  { id: 'yoman',   name: 'יומן עבודה',   pre: ['ya_'] },
  { id: 'gius',    name: 'גיוס',         pre: ['g_'] },
  { id: 'kupa',    name: 'הקופה',        pre: ['k_'] }
];

function lsFmtBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + ' ב׳';
  if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}
function lsAppOf(key) {
  var k = String(key == null ? '' : key);
  for (var i = 0; i < LS_APPS.length; i++) {
    for (var j = 0; j < LS_APPS[i].pre.length; j++) {
      if (k.indexOf(LS_APPS[i].pre[j]) === 0) return LS_APPS[i];
    }
  }
  return { id: 'other', name: 'אחר', pre: [] };
}
// UTF-16: שני בתים לתו, גם למפתח וגם לערך. הערכה, לא מדידה מדויקת — אבל
// עקבית, וזה מה שנדרש כדי להשוות מול הסף.
function lsEntryBytes(key, val) {
  return (String(key == null ? '' : key).length + String(val == null ? '' : val).length) * 2;
}

// מדידת **כל** המפתחות בדומיין, לא רק של האפליקציה הנוכחית — זה כל העניין:
// המכסה משותפת, ולכן אפליקציה שמסתכלת רק על עצמה לא רואה את מה שחונק אותה.
function lsUsage() {
  var out = { total: 0, quota: LS_QUOTA_BYTES, free: 0, pct: 0, apps: [], keys: [], ok: true };
  var byApp = {}, i;
  for (i = 0; i < LS_APPS.length; i++) byApp[LS_APPS[i].id] = { id: LS_APPS[i].id, name: LS_APPS[i].name, bytes: 0, count: 0 };
  byApp.other = { id: 'other', name: 'אחר', bytes: 0, count: 0 };
  try {
    for (i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k == null) continue;
      var v = '';
      try { v = localStorage.getItem(k) || ''; } catch (e) { }
      var b = lsEntryBytes(k, v), a = lsAppOf(k);
      out.total += b;
      out.keys.push({ key: k, bytes: b, app: a.id });
      if (!byApp[a.id]) byApp[a.id] = { id: a.id, name: a.name, bytes: 0, count: 0 };
      byApp[a.id].bytes += b; byApp[a.id].count++;
    }
  } catch (e) { out.ok = false; }
  out.keys.sort(function (x, y) { return y.bytes - x.bytes; });
  Object.keys(byApp).forEach(function (id) { if (byApp[id].count) out.apps.push(byApp[id]); });
  out.apps.sort(function (x, y) { return y.bytes - x.bytes; });
  out.free = Math.max(0, out.quota - out.total);
  out.pct = out.quota ? out.total / out.quota : 0;
  return out;
}

/* ── יומן הפינוי ────────────────────────────────────────────────────────
   הפינוי שקט כלפי המשתמש, אבל **לא בלתי נראה** — בלי יומן אי אפשר לדעת
   מתי ומה פונה. נשמר קצר בכוונה (12 רשומות) כדי שהיומן עצמו לא יהפוך
   לצרכן מקום. הכתיבה כאן גולמית ולא דרך `lsSet` — אחרת כישלון ביומן היה
   מפעיל פינוי שכותב ליומן, וחוזר חלילה. */
function lsSetRaw(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
}
function lsLogRead() {
  try { var v = JSON.parse(localStorage.getItem(app.LS_CFG.logKey) || '[]'); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}
function lsLog(action, detail, bytes) {
  var e = { t: Date.now(), a: String(action), d: String(detail == null ? '' : detail), b: Number(bytes) || 0 };
  try { console.info('[ls] ' + e.a + (e.d ? ' · ' + e.d : '') + (e.b ? ' · ' + lsFmtBytes(e.b) : '')); } catch (e1) { }
  try {
    var arr = lsLogRead();
    arr.push(e);
    while (arr.length > LS_LOG_MAX) arr.shift();
    lsSetRaw(app.LS_CFG.logKey, JSON.stringify(arr));
  } catch (e2) { }
}

// שמות הזריקה משתנים בין דפדפנים; code 22 הוא הישן, 1014 הוא של פיירפוקס.
function lsIsQuotaErr(e) {
  if (!e) return false;
  var n = e.name || '';
  return n === 'QuotaExceededError' || n === 'NS_ERROR_DOM_QUOTA_REACHED' ||
         e.code === 22 || e.code === 1014;
}

/* ── באנר כישלון קבוע ───────────────────────────────────────────────────
   טוסט נעלם אחרי שלוש שניות; כישלון שמירה חייב להישאר על המסך עד שהמשתמש
   סוגר אותו, אחרת הוא בדיוק "הכישלון השקט" שאנחנו מונעים. */
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

/* ── כתיבה מוגנת ────────────────────────────────────────────────────────
   **כל כתיבה ל-localStorage באפליקציה עוברת דרך כאן.** אין קריאה ישירה
   ל-`localStorage.setItem` מחוץ למודול הזה (למעט `lsSetRaw` שבתוכו).
   מחזירה true/false — ומסלול קריטי שמתעלם מהערך המוחזר הוא באג. */
var _lsSweeping = false;
var _lsToastAt = 0;

/* ── שער "אין טוסט הצלחה אחרי כישלון שמירה" ─────────────────────────────
   נקודת אכיפה **אחת** במקום עשרות בדיקות פזורות שאפשר לשכוח באחת: `toast()`
   של כל אפליקציה פותחת ב-`if (!lsGuardToast(msg)) return;`, וכל הודעה
   שמתחילה ב-✅ נבלעת אם כתיבה מקומית נכשלה בשתי וחצי השניות האחרונות —
   כלומר בתוך אותה פעולת משתמש. הבאנר האדום כבר על המסך, והוא ההודעה
   הנכונה. **אין להסיר את השורה הזו מ-`toast`** — בלעדיה — כתיבה שנכשלה
   ומשתמש שמקבל "נשמר בהצלחה". */
var _lsLastFailAt = 0;
var LS_SUCCESS_MUTE_MS = 2500;
function lsSuccessBlocked() { return (Date.now() - _lsLastFailAt) < LS_SUCCESS_MUTE_MS; }
function lsGuardToast(msg) {
  return !(String(msg == null ? '' : msg).indexOf('✅') === 0 && lsSuccessBlocked());
}
function lsSet(key, value) {
  var v = (value == null ? '' : String(value));
  try { localStorage.setItem(key, v); return true; } catch (e) {
    // בתוך פינוי — כישלון הוא תוצאה, לא טריגר לפינוי נוסף (רקורסיה).
    if (_lsSweeping) return false;
    _lsLastFailAt = Date.now();
    if (lsIsQuotaErr(e)) {
      // מנגנון חירום: פינוי נוסף לפי **אותו סדר** בדיוק, וניסיון אחד נוסף.
      var need = lsEntryBytes(key, v) + 64 * 1024;
      var freed = lsSweepGuarded('חירום — כתיבה נכשלה במכסה: ' + key, need);
      if (freed > 0) {
        // הצליח בניסיון השני — לא כישלון. חלון ההשתקה נסגר כדי שטוסט
        // ההצלחה יעבור, שהרי הנתון באמת נשמר.
        try { localStorage.setItem(key, v); _lsLastFailAt = 0; lsLog('כתיבה חוזרת הצליחה', key, 0); return true; }
        catch (e2) { e = e2; }
      }
      lsLog('❌ כתיבה נכשלה (מכסה)', key, lsEntryBytes(key, v));
      lsAlert(MSG_LS_FULL);
      lsToastThrottled(MSG_LS_FULL);
    } else {
      lsLog('❌ כתיבה נכשלה (אחסון חסום)', key, 0);
      lsAlert(MSG_LS_BLOCK);
      lsToastThrottled(MSG_LS_BLOCK);
    }
    try { console.warn('[ls] setItem נכשל עבור ' + key + ':', e && e.message); } catch (e3) { }
    return false;
  }
}
// הבאנר אידמפוטנטי ולכן מוצג בכל כישלון; הטוסט מווסת כדי שסדרת כתיבות
// כושלת לא תהפוך למטר טוסטים שמסתיר את ההודעה עצמה.
function lsToastThrottled(msg) {
  var now = Date.now();
  if (now - _lsToastAt < 8000) return;
  _lsToastAt = now;
  try { lsToast(msg, 6000, 'bad'); } catch (e) { }
}
function lsGet(key, fallback) {
  try {
    var v = localStorage.getItem(key);
    return v == null ? (fallback === undefined ? null : fallback) : v;
  } catch (e) { return fallback === undefined ? null : fallback; }
}
function lsRemove(key) {
  try { localStorage.removeItem(key); return true; } catch (e) { return false; }
}

/* ── אופק הפינוי ────────────────────────────────────────────────────────
   פינוי הרשומות הישנות גורע רשומות ישנות מהעותק **שעל הדיסק** בלבד. כדי שהן לא
   יחזרו לדיסק בשמירה הבאה (מנוע המיזוג מחזיר כל רשומה מרוחקת שאין לה
   מקבילה מקומית — ולכן פינוי בלי אופק הוא חסר משמעות), נשמר לכל מפתח
   "אופק": חותמת הזמן של הרשומה החדשה ביותר שפונתה. `lsSetArray` מסננת
   מתחתיו בכל כתיבה. **הזיכרון והענן לא נוגעים** — רק הדיסק מצטמצם. */
function lsHorizon(key) {
  var v = parseInt(lsGet(app.LS_CFG.hzPrefix + key, '0'), 10);
  return isFinite(v) && v > 0 ? v : 0;
}
function lsHorizonKeys() {
  var out = [];
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(app.LS_CFG.hzPrefix) === 0) out.push(k);
    }
  } catch (e) { }
  return out;
}
function lsClearHorizons() {
  var ks = lsHorizonKeys();
  ks.forEach(lsRemove);
  if (ks.length) lsLog('אופק הפינוי נוקה', ks.length + ' מפתחות', 0);
  return ks.length;
}
/*  ⛔ אופק הפינוי נוקה מהסנכרון — ⚠️ **מה נכנס**: ירידה מתחת לסף האזהרה,
 *  ⛔ **ומה מפיל**: השארת האופק על כנו — ⭐ הסימן שהפינוי משאיר אומר «מכאן
 *  ואילך יש לי, את הישן זרקתי», ⚠️ וכל עוד הוא עומד המשיכה אינה מחזירה את
 *  הישן: ⛔ סימן שרק המשתמש יכול לנקות נשאר לנצח ביום שבו הכפתור יורד. */
function lsHorizonRelease() {
  try {
    if (!lsHorizonKeys().length) return 0;
    if (lsUsage().total >= LS_WARN_BYTES) return 0;
    var n = lsClearHorizons();
    if (n) { try { lsToast(MSG_LS_RESTORED, 5000, 'good'); } catch (e1) { } }
    return n;
  } catch (e) { return 0; }
}
// כתיבת מערך מכובדת-אופק. `tsOf(rec)` מחזירה חותמת זמן במילישניות.
function lsSetArray(key, arr, tsOf) {
  var list = Array.isArray(arr) ? arr : [];
  var hz = lsHorizon(key), keep = list;
  if (hz > 0 && typeof tsOf === 'function') {
    keep = list.filter(function (r) {
      var t = Number(tsOf(r));
      return !(isFinite(t) && t > 0 && t <= hz);
    });
  }
  return lsSet(key, JSON.stringify(keep));
}

/* ── פינוי יזום ─────────────────────────────────────────────────────────
   סדר קפדני:
     א. מטמונים וערכים שניתן לשחזר מהענן בכל רגע.
     ב. ארכיון ורשומות ישנות **שכבר מסונכרנות** — הישן ביותר קודם.
     ג. ⛔ נתון שטרם הסתנכרן לענן לא מפונה בשום מצב, גם אם המקום נגמר
        לגמרי. במצב כזה עדיף להיכשל ברעש מאשר למחוק. */
function lsSweepGuarded(reason, needBytes) {
  if (_lsSweeping) return 0;
  _lsSweeping = true;
  try { return lsSweep(reason, needBytes); }
  finally { _lsSweeping = false; }
}
function lsSweep(reason, needBytes) {
  var need = Number(needBytes) || 0, freed = 0, i;
  lsLog('פינוי התחיל', reason, 0);

  // ⛔ כלל ג נאכף לפני **שתי** הרשימות: יש **משהו** בתור שטרם עלה
  // לענן ⇒ אי אפשר לדעת מה כבר בטוח שם, ולא מפנים דבר. ⚠️ פינוי המפתחות השלמים הוא
  // המסוכן מבין השניים דווקא — הוא מוחק **מפתח שלם**, ומפתח שנכתב
  // מקומית-תחילה ופונה לפני שנדחף אינו חוזר משום מקום. ⛔ ומחסום אחד
  // לשתי הרשימות ולא שניים: תנאי שנכפל הוא תנאי שאחד מעותקיו יתיישן.
  if (app.LS_CFG.pending && app.LS_CFG.pending()) {
    lsLog('פינוי דולג', 'יש נתונים שטרם סונכרנו — לא מפנים דבר', 0);
    return 0;
  }

  // ── מפתחות שלמים: מטמונים שניתן לשחזר מהענן ──
  // ⛔ העֵד נבדק **פר-פריט**, בתוך המערך — ⚠️ ולא בכניסה
  // לרשימה: פינוי המפתחות השלמים מוחק מפתח **שלם**, ומפתח שנכתב מקומית-תחילה ולא נדחף
  // אינו חוזר משום מקום. ⭐ ולכן כל פריט נושא `syncedThrough` משלו, בדיוק
  // כמו ב-oldRecords, ⛔ ומחסום `pending()` שלמעלה אינו מחליף אותו: «התור ריק»
  // הוא ראיה על **התור** ⛔ ולא על המפתח.
  var through = lsGlobalWitness();
  var sized = [];
  (app.LS_CFG.wholeKeys || []).forEach(function (spec) {
    if (!lsSpecWitness(spec, through)) return;
    var v = lsGet(spec.key, null);
    if (v != null) sized.push({ k: spec.key, b: lsEntryBytes(spec.key, v) });
  });
  sized.sort(function (a, b) { return b.b - a.b; });   // הגדול קודם — מפנה מהר
  var hit = [];
  for (i = 0; i < sized.length; i++) {
    if (need && freed >= need) break;
    if (lsRemove(sized[i].k)) { freed += sized[i].b; hit.push(sized[i].k); }
  }
  if (hit.length) lsLog('פינוי מפתחות שלמים', hit.join(', '), freed);
  if (need && freed >= need) return freed;

  // ── רשומות ישנות מסונכרנות ──
  var specs = (app.LS_CFG.oldRecords || []).filter(function (s) { return !lsIsChild(s); });
  // מפתח בלי עֵד מקומי אך עם מסלול אימות מול הענן אינו מפונה כאן — האימות
  // אסינכרוני ולכן הוא רץ ב-`lsBootDeferred`, אחרי העלייה. מדווח כדי
  // שהיומן לא יראה כאילו לא נעשה כלום.
  var defer = lsVerifySpecs(through);
  if (defer.length) lsLog('פינוי רשומות ישנות — ' + defer.length + ' מפתחות ללא עֵד מקומי', 'ימשיכו באימות מול הענן', 0);
  // מפתח יכול להביא עֵד סנכרון משלו (`spec.syncedThrough`) כשהחותמת הגלובלית
  // אינה מעידה עליו — למשל מערך שנדחף בנפרד ובהצלחה נפרדת.
  var anyOwn = false;
  for (i = 0; i < specs.length; i++) if (typeof specs[i].syncedThrough === 'function') anyOwn = true;
  if (!through && !anyOwn) {
    lsLog('פינוי רשומות ישנות דולג', 'אין חותמת סנכרון מאומתת', 0);
    return freed;
  }
  for (i = 0; i < specs.length; i++) specs[i]._b = lsEntryBytes(specs[i].key, lsGet(specs[i].key, ''));
  specs.sort(function (a, b) { return b._b - a._b; });
  for (i = 0; i < specs.length; i++) {
    if (need && freed >= need) break;
    freed += lsPruneKey(specs[i], through, need ? Math.max(0, need - freed) : 0);
    freed += lsPruneChildren(specs[i]);
  }
  return freed;
}
function lsPruneKey(spec, through, want) {
  var raw = lsGet(spec.key, null);
  if (raw == null) return 0;
  var arr;
  try { arr = JSON.parse(raw); } catch (e) { return 0; }
  if (!Array.isArray(arr) || arr.length < 2) return 0;

  // חלון הגיל נגזר מסוג האפליקציה: גם רשומה מסונכרנת לא מפונה אם היא טרייה
  // מדי. בלעדיו היינו מפנים דווקא את מה שהמשתמש עובד עליו עכשיו.
  var cut = lsSpecWitness(spec, through);
  if (!cut) return 0;   // אין עֵד מקומי — המסלול הנכון הוא האימות מול הענן
  cut = Math.min(cut, Date.now() - lsWindowMs());
  if (cut <= 0) return 0;

  var before = lsEntryBytes(spec.key, raw);
  var cand = [];
  for (var i = 0; i < arr.length; i++) {
    var t = Number(spec.ts(arr[i]));
    if (isFinite(t) && t > 0 && t <= cut) cand.push({ i: i, t: t });
  }
  if (!cand.length) return 0;
  cand.sort(function (a, b) { return a.t - b.t; });     // הישן ביותר קודם

  var target = want > 0 ? want : Math.max(0, before - Math.floor(before * 0.5));
  var drop = {}, hz = 0, est = 0, kept = arr.length;
  for (i = 0; i < cand.length && est < target && kept > 1; i++) {
    var rec = arr[cand[i].i];
    var s = '';
    try { s = JSON.stringify(rec) || ''; } catch (e2) { s = ''; }
    est += s.length * 2;
    drop[cand[i].i] = 1;
    hz = cand[i].t;
    kept--;
  }
  if (!hz) return 0;
  var next = arr.filter(function (r, ix) { return !drop[ix]; });
  var json = JSON.stringify(next);
  if (!lsSetRaw(spec.key, json)) return 0;
  lsSetRaw(app.LS_CFG.hzPrefix + spec.key, String(hz));
  var gained = Math.max(0, before - lsEntryBytes(spec.key, json));
  lsLog('פינוי רשומות ישנות — ' + (spec.label || spec.key),
        (arr.length - next.length) + ' רשומות ישנות, עד ' + new Date(hz).toLocaleDateString('he-IL'),
        gained);
  if (typeof spec.after === 'function') { try { spec.after(next); } catch (e3) { } }
  return gained;
}

/*  ⛔ רשומת בן יורדת עם אביה — ⚠️ **מה נכנס**: פריט ב-`oldRecords` שנושא
 *  `parent` (מפתח האב) ו-`parentOf` (מזהה האב שבשורת הבן); ⛔ **ומה מפיל**:
 *  בן שנגרע בזכות עצמו — ⭐ אב שנשאר בלי בניו מוצג ריק אופליין, ⚠️ ודחיפה
 *  שלו אחר כך נקראת בענן כמחיקת הבנים.
 *  ⛔ ולכן הבן יורד רק כשאביו ירד, ⚠️ ורק כשהעֵד שלו מכסה את חותמת
 *  האב: ⭐ בלי עֵד הבן נשאר יתום עד הפינוי הבא — ⛔ יתום צורך מקום,
 *  ⚠️ ובן שנגרע בלי ראיה אובד. */
function lsIsChild(spec) {
  return !!spec && typeof spec.parent === 'string' && typeof spec.parentOf === 'function';
}
function lsChildrenOf(spec) {
  return (app.LS_CFG.oldRecords || []).filter(function (c) { return lsIsChild(c) && c.parent === spec.key; });
}
/*  ⛔ בן שאביו אינו במראה ושחותמתו בתוך אופק האב — ⚠️ והוא יורד רק אם
 *  `proven` מאשרת אותו: ⭐ ראיה פר-שורה, ⛔ ושורה בלי ראיה נשארת. */
function lsDropOrphans(c, parent, proven) {
  var hz = lsHorizon(parent.key), parr, arr, alive = {};
  if (!hz || typeof parent.idOf !== 'function') return 0;
  try { parr = JSON.parse(lsGet(parent.key, null) || '[]'); } catch (e) { return 0; }
  if (!Array.isArray(parr)) return 0;
  parr.forEach(function (r) { var id = parent.idOf(r); if (id != null) alive[String(id)] = 1; });
  var raw = lsGet(c.key, null);
  if (raw == null) return 0;
  try { arr = JSON.parse(raw); } catch (e2) { return 0; }
  if (!Array.isArray(arr)) return 0;
  var keep = arr.filter(function (r) {
    var p = c.parentOf(r), t = Number(c.ts(r));
    if (p == null || alive[String(p)] || !(isFinite(t) && t > 0 && t <= hz)) return true;
    return !proven(r);
  });
  if (keep.length === arr.length) return 0;
  var json = JSON.stringify(keep);
  if (!lsSetRaw(c.key, json)) return 0;
  if (hz > lsHorizon(c.key)) lsSetRaw(app.LS_CFG.hzPrefix + c.key, String(hz));
  var g = Math.max(0, lsEntryBytes(c.key, raw) - lsEntryBytes(c.key, json));
  lsLog('פינוי רשומות ישנות — ' + (c.label || c.key),
        (arr.length - keep.length) + ' רשומות בן יחד עם אביהן', g);
  return g;
}
function lsPruneChildren(spec) {
  var through = lsGlobalWitness(), gained = 0;
  lsChildrenOf(spec).forEach(function (c) {
    var w = lsSpecWitness(c, through);
    if (!w) return;
    gained += lsDropOrphans(c, spec, function (r) { return Number(c.ts(r)) <= w; });
  });
  return gained;
}
/*  ⚠️ הבן בלי עֵד מקומי — ⛔ הראיה מהענן, פר-שורה, ⭐ כמו אביו. */
function lsVerifyChildren(spec) {
  var kids = lsChildrenOf(spec).filter(function (c) {
    return typeof c.verify === 'function' && typeof c.idOf === 'function';
  });
  var freed = 0, i = 0;
  function step() {
    if (i >= kids.length) return Promise.resolve(freed);
    var c = kids[i++], p;
    try { p = Promise.resolve(c.verify()); } catch (e) { p = Promise.reject(e); }
    return p.then(function (res) {
      if (!res || res.ok !== true || !Array.isArray(res.rows)) return;
      var idx = lsCloudIndex(c, res.rows);
      freed += lsDropOrphans(c, spec, function (r) {
        var id = c.idOf(r);
        return id != null && (String(id) in idx) && idx[String(id)] >= Number(c.ts(r));
      });
    }, function () { }).then(step);
  }
  return step();
}

/* ── עדות סנכרון חלופית: אימות ישיר מול הענן ─────────────────────────────
   פינוי הרשומות הישנות מותנה בעֵד סנכרון **מקומי** — חותמת שנכתבת רק אחרי דחיפה מוצלחת
   מהמכשיר הזה. בדפדפן שקורא ולא כותב (המחשב שממנו רק מסתכלים) אין דחיפה,
   ולכן אין עֵד, ולכן פינוי הרשומות הישנות מדולג לגמרי: הפינוי מחזיר 0 וההתרעה הצהובה
   נשארת קבועה — בזמן שכל הנתונים כבר בענן, והפינוי מחזיר 0.

   התיקון אינו הרפיה של הדרישה אלא **החלפת מקור הראיה**: במקום להסיק
   "זה בענן" מחותמת מקומית, שואלים את הענן. `spec.verify()` מושכת את העותק
   הענני של אותו מפתח, ורשומה נמחקת רק אם היא נמצאת שם לפי `spec.idOf`
   **וגם** חותמת הענן אינה ישנה מהחותמת המקומית — כלומר הענן מחזיק את
   הגרסה הזו או חדשה ממנה.

   ⛔ **נכשל סגור.** אין רשת, `verify` זרקה, החזירה `ok:false`, או שהמפתח
      כלל אינו קיים בענן ⇒ לא מפנים דבר. היעדר ראיה אינו ראיה.
   ⛔ **חלון הגיל (`lsWindowMs`) חל גם כאן** — הוא שכבת בטיחות נפרדת
      מהראיה, ולא תחליף לה.
   ⛔ **`LS_CFG.pending()` נבדק כאן בדיוק כמו בפינוי הרשומות הישנות הסינכרוני**: יש משהו
      שטרם עלה ⇒ לא מפנים דבר.
   ⛔ **פינוי רצף בלבד.** הרשומות נבדקות מהישנה לחדשה, והפינוי **נעצר**
      בראשונה שלא אומתה — לא מדלג עליה וממשיך מעליה. הסיבה היא האופק:
      אחרי הפינוי נשמר `hz` = חותמת הרשומה החדשה ביותר שנמחקה,
      ו-`lsSetArray` מסננת **בכל כתיבה** כל רשומה שחותמתה ≤ hz. דילוג
      והמשך היו מוחקים בכתיבה הבאה, בשקט, דווקא את הרשומה שאין לה עותק
      בענן — ההפך הגמור מהכוונה.
   ⚠️ **אסינכרוני.** `lsBoot` סינכרונית ורצה לפני שהמסך עולה, ולכן מסלול
      האימות רץ אחריה (`lsBootDeferred`) — וההתרעה נדחית איתו, אחרת
      המשתמש מקבל אזהרה צהובה על מצב שנפתר שתי שניות אחר כך. */

var LS_DEFER_MS = 3000;   // המתנה אחרי העלייה לפני האימות — שהאפליקציה תספיק לעלות

function lsGlobalWitness() {
  try { return Number(app.LS_CFG.syncedThrough && app.LS_CFG.syncedThrough()) || 0; } catch (e) { return 0; }
}
/* עֵד הסנכרון של מפתח בודד: משלו אם הוגדר, אחרת הגלובלי. **מפתח שהגדיר
   `syncedThrough` משלו אינו נופל חזרה לגלובלי** — עֵד של מערך אחד אינו
   מעיד על אחר. */
function lsSpecWitness(spec, through) {
  if (spec && typeof spec.syncedThrough === 'function') {
    try { return Number(spec.syncedThrough()) || 0; } catch (e) { return 0; }
  }
  return Number(through) || 0;
}
// המפתחות שאין להם עֵד מקומי אך יש להם מסלול אימות מול הענן.
function lsVerifySpecs(through) {
  var t = (through === undefined) ? lsGlobalWitness() : through;
  return (app.LS_CFG.oldRecords || []).filter(function (s) {
    return !!s && !lsIsChild(s) && typeof s.verify === 'function' && typeof s.idOf === 'function' && !lsSpecWitness(s, t);
  });
}
function lsHasVerifiers() { return lsVerifySpecs().length > 0; }

// מפת {מזהה: החותמת הגבוהה ביותר} מתוך העותק הענני.
function lsCloudIndex(spec, rows) {
  if (!Array.isArray(rows) || !spec || typeof spec.idOf !== 'function') return null;
  var idx = {}, i, id, t;
  for (i = 0; i < rows.length; i++) {
    id = spec.idOf(rows[i]);
    if (id == null || id === '') continue;
    id = String(id);
    t = Number(spec.ts(rows[i]));
    if (!isFinite(t) || t < 0) t = 0;
    if (!(id in idx) || t > idx[id]) idx[id] = t;
  }
  return idx;
}

// גריעה ממפתח אחד כשהראיה היא מפת הענן ולא חותמת מקומית.
function lsPruneKeyVerified(spec, idx, want) {
  if (!idx || !spec || typeof spec.idOf !== 'function') return 0;
  var raw = lsGet(spec.key, null);
  if (raw == null) return 0;
  var arr;
  try { arr = JSON.parse(raw); } catch (e) { return 0; }
  if (!Array.isArray(arr) || arr.length < 2) return 0;

  // הראיה החליפה את העֵד, **לא** את חלון הגיל.
  var cut = Date.now() - lsWindowMs();
  if (cut <= 0) return 0;

  var before = lsEntryBytes(spec.key, raw), i;
  var cand = [];
  for (i = 0; i < arr.length; i++) {
    var t0 = Number(spec.ts(arr[i]));
    if (isFinite(t0) && t0 > 0 && t0 <= cut) cand.push({ i: i, t: t0 });
  }
  if (!cand.length) return 0;
  cand.sort(function (a, b) { return a.t - b.t; });   // הישן ביותר קודם

  var target = want > 0 ? want : Math.max(0, before - Math.floor(before * 0.5));
  var drop = {}, hz = 0, est = 0, kept = arr.length, stopped = '';
  for (i = 0; i < cand.length && est < target && kept > 1; i++) {
    var rec = arr[cand[i].i];
    var id = spec.idOf(rec);
    id = (id == null) ? '' : String(id);
    // ⛔ עצירה, לא דילוג — ר' ההסבר על האופק למעלה.
    if (!id) { stopped = 'רשומה בלי מזהה'; break; }
    if (!(id in idx)) { stopped = 'רשומה שאינה בענן'; break; }
    if (idx[id] < cand[i].t) { stopped = 'הענן מחזיק גרסה ישנה יותר'; break; }
    var s = '';
    try { s = JSON.stringify(rec) || ''; } catch (e2) { s = ''; }
    est += s.length * 2;
    drop[cand[i].i] = 1;
    hz = cand[i].t;
    kept--;
  }
  if (!hz) {
    lsLog('אימות — לא פונה דבר מ' + (spec.label || spec.key), stopped || 'אין רשומה מעל רצפת הגיל', 0);
    return 0;
  }
  var next = arr.filter(function (r, ix) { return !drop[ix]; });
  var json = JSON.stringify(next);
  if (!lsSetRaw(spec.key, json)) return 0;
  lsSetRaw(app.LS_CFG.hzPrefix + spec.key, String(hz));
  var gained = Math.max(0, before - lsEntryBytes(spec.key, json));
  lsLog('פינוי רשומות ישנות (אומת מול הענן) — ' + (spec.label || spec.key),
        (arr.length - next.length) + ' רשומות ישנות, עד ' + new Date(hz).toLocaleDateString('he-IL') +
        (stopped ? ' · נעצר ב' + stopped : ''),
        gained);
  if (typeof spec.after === 'function') { try { spec.after(next); } catch (e3) { } }
  return gained;
}

// כמה בתים צריך לפנות כדי לרדת אל יעד הפינוי. 0 = אין צורך.
function lsSweepNeed() {
  var u = lsUsage();
  if (u.total < u.quota * LS_SWEEP_PCT) return 0;
  return Math.max(0, u.total - Math.floor(u.quota * LS_SWEEP_TO));
}

/* פינוי הרשומות הישנות בגרסה האסינכרונית: לכל מפתח בלי עֵד מקומי — משיכת העותק הענני
   ופינוי של מה שאומת בלבד. מחזירה Promise עם מספר הבתים שפונו. */
var _lsVerifying = false;
function lsSweepVerified(reason, needBytes) {
  if (_lsVerifying) return Promise.resolve(0);
  var specs = lsVerifySpecs();
  if (!specs.length) return Promise.resolve(0);
  if (app.LS_CFG.pending && app.LS_CFG.pending()) {
    lsLog('אימות מול הענן דולג', 'יש נתונים שטרם סונכרנו — לא מפנים דבר', 0);
    return Promise.resolve(0);
  }
  _lsVerifying = true;
  var need = Number(needBytes) || 0, freed = 0, i = 0;
  lsLog('אימות מול הענן התחיל', reason, 0);
  function step() {
    if (i >= specs.length || (need && freed >= need)) return Promise.resolve(freed);
    var spec = specs[i++], p;
    try { p = Promise.resolve(spec.verify()); } catch (e) { p = Promise.reject(e); }
    return p.then(function (res) {
      // נכשל סגור: כל תשובה שאינה {ok:true, rows:[...]} אינה ראיה.
      if (!res || res.ok !== true || !Array.isArray(res.rows)) {
        lsLog('אימות נכשל — ' + (spec.label || spec.key), 'לא מפנים דבר (נכשל סגור)', 0);
        return;
      }
      freed += lsPruneKeyVerified(spec, lsCloudIndex(spec, res.rows),
                                  need ? Math.max(0, need - freed) : 0);
      freed += lsPruneChildren(spec);
      return lsVerifyChildren(spec).then(function (g) { freed += g; });
    }, function (e) {
      lsLog('אימות נכשל — ' + (spec.label || spec.key),
            (e && e.message) ? String(e.message) : 'שגיאת רשת', 0);
    }).then(step);
  }
  function done() { _lsVerifying = false; return freed; }
  return step().then(done, done);
}

/* ── המסלול הנדחה ───────────────────────────────────────────────────────
   רץ אחרי שהאפליקציה כבר עלתה, כדי שהאימות (רשת) לא יחסום את הטעינה. */
var _lsDeferTimer = null;
function lsScheduleDeferred(delayMs) {
  if (_lsDeferTimer) return false;
  _lsDeferTimer = setTimeout(function () {
    _lsDeferTimer = null;
    try { lsBootDeferred(); } catch (e) { }
  }, delayMs == null ? LS_DEFER_MS : delayMs);
  return true;
}
function lsBootDeferred() {
  var need = lsSweepNeed();
  var p = need ? lsSweepVerified('פינוי נדחה בעלייה — אימות מול הענן', need) : Promise.resolve(0);
  function finish(freed) {
    freed = Number(freed) || 0;
    var u = lsUsage();
    if (freed > 0) lsLog('פינוי נדחה הסתיים', lsFmtBytes(freed) + ' · נותרו ' + Math.round(u.pct * 100) + '%', freed);
    lsBootAlert(u);
    return { usage: u, freed: freed };
  }
  return p.then(finish, function () { return finish(0); });
}

/* ── בדיקת העלייה ───────────────────────────────────────────────────────
   נקראת פעם אחת בכל עליית אפליקציה, לפני שהמשתמש מספיק לכתוב משהו.
   **סינכרונית בכוונה** — היא חייבת לרוץ לפני הטעינה. כשיש מפתחות שניתן
   לאמת מול הענן, ההתרעה נדחית יחד עם האימות (`lsBootDeferred`). */
function lsBoot(opts) {
  var u = lsUsage(), swept = 0;
  if (u.total >= u.quota * LS_SWEEP_PCT) {
    swept = lsSweepGuarded('פינוי יזום בעלייה — ' + Math.round(u.pct * 100) + '% מהמכסה',
                           Math.max(0, u.total - Math.floor(u.quota * LS_SWEEP_TO)));
    if (swept > 0) u = lsUsage();
  }
  var deferred = false;
  if (u.total >= LS_WARN_BYTES && !(opts && opts.noDefer) && lsHasVerifiers()) {
    deferred = lsScheduleDeferred(opts && opts.deferMs);
  }
  if (!deferred) lsBootAlert(u);
  return { usage: u, swept: swept, deferred: deferred };
}
function lsBootAlert(u) {
  if (u.total >= LS_CRIT_BYTES) {
    lsLog('⚠️ מעל סף הקריטי', lsFmtBytes(u.total), u.total);
    lsAlert(MSG_LS_CRIT + ' (' + lsFmtBytes(u.total) + ' מתוך ' + lsFmtBytes(u.quota) + ')');
  } else if (u.total >= LS_WARN_BYTES) {
    lsLog('⚠️ מעל סף האזהרה', lsFmtBytes(u.total), u.total);
    try { lsToast(MSG_LS_WARN + ' (' + lsFmtBytes(u.total) + ')', 5000, 'bad'); } catch (e) { }
  }
  if (lsHorizonKeys().length) { try { lsToast(MSG_LS_PRUNED, 6000, 'bad'); } catch (e1) { } }
}

/* ═══════════════ סוף המודול המשותף ═══════════════════════════════════ */

/* ═══ חלון חם ושחזור מקומי — מודול משותף ═════════════════════════════════
   ══════════════════════════════════════════════════════════════════════ */
var HW_BOOT_DEFER_MS = 3000;      // כמו הפינוי הנדחה — רשת אחרי עלייה
var _hwCloudSeen = {};            // ראיה עננית בזיכרון בלבד: מפתח → {מזהה → חותמת}
/*  ⛔ הראיה חיה במודול — ⚠️ ובהחלפת הקשר היא נשכחת כאן, ⭐ ולא בכתיבה מבחוץ. */
function hwForget() { _hwCloudSeen = {}; }
var _hwSweepBusy = false;
var _hwSwept = 0;                 // כמה רשומות פונו בעלייה הזו — לתיעוד בלבד

function _hwVal(v) { return (typeof v === 'function') ? v() : v; }
function hwEnabled() {
  try { return !!(typeof app.HW_CFG !== 'undefined' && app.HW_CFG && app.HW_CFG.enabled); }
  catch (e) { return false; }
}
function _hwSpecs() {
  try { return (typeof app.HW_CFG !== 'undefined' && app.HW_CFG && app.HW_CFG.specs) || []; }
  catch (e) { return []; }
}
function _hwSpecFor(key) {
  var specs = _hwSpecs();
  for (var i = 0; i < specs.length; i++) {
    try { if (_hwVal(specs[i].key) === key) return specs[i]; } catch (e) { }
  }
  return null;
}
function _hwLive(spec, rec) {
  try { return spec.isLive ? !!spec.isLive(rec) : !(rec && rec.deleted); }
  catch (e) { return true; }
}

// רישום הראיה העננית — כל משיכה מוצלחת מוסיפה ומעדכנת חותמות פר-מזהה.
function hwNoteCloud(key, rows) {
  if (!hwEnabled() || !Array.isArray(rows)) return;
  var spec = _hwSpecFor(key);
  if (!spec) return;
  var idx = _hwCloudSeen[key] || (_hwCloudSeen[key] = {});
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i], id, t;
    try { id = spec.idOf(r); t = Number(spec.ts(r)) || 0; } catch (e) { continue; }
    if (id == null) continue;
    id = String(id);
    if (!(idx[id] >= t)) idx[id] = t;
  }
}

// שער הדיסק. ⛔ כל ספק משאיר את הרשומה — רשומה בלי ראיה עננית
// עדכנית לה-עצמה נכתבת לדיסק כרגיל; רק ודאות מפנה.
function hwDiskFilter(key, rows) {
  if (!hwEnabled() || !Array.isArray(rows)) return rows;
  var spec = _hwSpecFor(key);
  if (!spec) return rows;
  var idx = _hwCloudSeen[key];
  if (!idx) return rows;
  var kept = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i], drop = false;
    try {
      if (!spec.inWindow(r)) {
        var pend = true;
        try { pend = !!spec.isPending(r); } catch (e1) { pend = true; }
        if (!pend) {
          var id = spec.idOf(r);
          if (id != null) {
            var ct = idx[String(id)];
            var lt = Number(spec.ts(r)) || 0;
            if (ct !== undefined && ct >= lt) drop = true;
          }
        }
      }
    } catch (e) { drop = false; }
    if (!drop) kept.push(r);
  }
  return kept;
}

// הפינוי עצמו — מושך את העותק הענני של כל מפרט, ואז כותב לדיסק את הנשאר.
async function hwSweep() {
  if (!hwEnabled() || _hwSweepBusy) return { swept: 0 };
  try {
    if (typeof app.LS_CFG !== 'undefined' && app.LS_CFG &&
        typeof app.LS_CFG.pending === 'function' && app.LS_CFG.pending()) {
      try { lsLog('hw-skip', 'תור יוצא לא ריק'); } catch (e0) { }
      return { swept: 0 };
    }
  } catch (e) { return { swept: 0 }; }
  _hwSweepBusy = true;
  var swept = 0;
  try {
    var specs = _hwSpecs();
    for (var i = 0; i < specs.length; i++) {
      var s = specs[i], key;
      try { key = _hwVal(s.key); } catch (e1) { continue; }
      var res = null;
      try { res = await s.fetch(); } catch (e2) { res = null; }
      if (!res || res.ok !== true || !Array.isArray(res.rows)) continue;
      hwNoteCloud(key, res.rows);
      var cur = null;
      try { cur = s.rows(); } catch (e3) { cur = null; }
      if (!Array.isArray(cur)) continue;
      var kept = hwDiskFilter(key, cur);
      if (kept.length === cur.length) continue;
      var okW = false;
      try { okW = !!s.apply(kept); } catch (e4) { okW = false; }
      if (okW) {
        var n = cur.length - kept.length;
        swept += n;
        try { lsLog('hw-sweep', (s.label || key) + ' −' + n); } catch (e5) { }
      }
    }
  } catch (e6) { }
  _hwSwept = swept;
  _hwSweepBusy = false;
  return { swept: swept };
}

// מסך העבר — קריאה בלבד. מחזיר מהענן את הרשומות החיות שמחוץ לחלון,
// מהחדשה לישנה, בלי לגעת בדיסק ובלי לגעת בזיכרון האפליקציה.
async function hwPastLoad(key, filter) {
  var spec = _hwSpecFor(key);
  if (!spec) return { ok: false, rows: [] };
  var res = null;
  try { res = await spec.fetch(); } catch (e) { res = null; }
  if (!res || res.ok !== true || !Array.isArray(res.rows)) return { ok: false, rows: [] };
  hwNoteCloud(key, res.rows);
  var out = [];
  for (var i = 0; i < res.rows.length; i++) {
    var r = res.rows[i];
    var inW = true;
    try { inW = !!spec.inWindow(r); } catch (e1) { }
    if (inW || !_hwLive(spec, r)) continue;
    if (filter) { try { if (!filter(r)) continue; } catch (e2) { continue; } }
    out.push(r);
  }
  out.sort(function (a, b) {
    var ta = 0, tb = 0;
    try { ta = Number(spec.ts(a)) || 0; tb = Number(spec.ts(b)) || 0; } catch (e3) { }
    return tb - ta;
  });
  return { ok: true, rows: out };
}

/* ── נקודת ההפעלה ──────────────────────────────────────────────────────── */
// ⛔ נקודת ההפעלה היחידה היא `hwBoot()` מפונקציית העלייה — הפינוי
//    מושהה מפני שהוא דורש רשת, בדיוק כמו הפינוי הנדחה. כשהמודול רדום (`HW_CFG.enabled` כבוי) היציאה מיידית,
//    וכפתור השחזור נשאר פעיל בנפרד.
function hwBoot() {
  if (!hwEnabled()) return;
  try { setTimeout(function () { hwSweep(); }, HW_BOOT_DEFER_MS); } catch (e) { }
}
/* ═══════════════ סוף מודול החלון החם ══════════════════════════════════ */

/*  ⛔ הייצוא בשם ⛔ ואינו `default` — ⚠️ קורא שמייבא שם שנעלם נשבר בטעינה,
 *  ⭐ ו-`default` היה נבלע בשקט. */
export { MSG_LS_FULL, hwBoot, hwDiskFilter, hwForget, hwNoteCloud,
         hwPastLoad, lsBoot, lsClearHorizons, lsGet, lsGuardToast,
         lsHorizonRelease, lsLog, lsRemove, lsSet, lsSetArray, lsSetRaw };
