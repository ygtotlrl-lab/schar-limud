// core/sync.js — סנכרון, מיזוג ודחיפה

import { MSG_SAVED_LOCAL, MSG_SAVE_FAIL, MSG_STALE_CODE, app, isNetErr,
         kvParse, withTimeout } from './util.js';
import { lsGet, lsHorizonRelease, lsLog, lsSet } from './storage.js';
import { closeModal, esc, toast } from './ui.js';

// ── מזהי רשומות ──
function newClientId(){
  try{
    if(typeof crypto!=='undefined'&&crypto&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
  }catch(e){}
  var b=null;
  try{
    if(typeof crypto!=='undefined'&&crypto&&typeof crypto.getRandomValues==='function'){
      b=new Uint8Array(16);crypto.getRandomValues(b);
    }
  }catch(e){b=null;}
  if(!b){b=new Array(16);for(var i=0;i<16;i++)b[i]=Math.floor(Math.random()*256);}
  b[6]=(b[6]&0x0f)|0x40;b[8]=(b[8]&0x3f)|0x80; // גרסה 4, variant RFC 4122
  var h=[],j;for(j=0;j<16;j++)h.push((b[j]+0x100).toString(16).slice(1));
  return h.slice(0,4).join('')+'-'+h.slice(4,6).join('')+'-'+h.slice(6,8).join('')+'-'+h.slice(8,10).join('')+'-'+h.slice(10,16).join('');
}
// תמיד כמחרוזת — מזהה שעובר דרך מאפיין HTML חוזר כמחרוזת, וההשוואה חוצה סוגים.
function idEq(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

// ── מיזוג רשומות ──
// הסימון הממתין שובר שוויון בלבד ואינו גובר על חותמת חדשה יותר — אחרת עריכה מקומית ישנה שלא נדחפה מוחקת עריכה מאוחרת שכבר סונכרנה.
// mergePair, כשהוא קיים, מקבל את ההכרעה כפרמטר ומרחיב אותה (מיזוג פנימי של סנאפשוט).
function _mergePick(loc, rem, k, isPend, tsOf, mergePair) {
  if (mergePair) return mergePair(loc, rem, k, isPend);
  return tsOf(loc) > tsOf(rem) ? loc
       : (tsOf(loc) === tsOf(rem) && isPend ? loc : rem);
}
function mergeCore(local, remote, opts) {
  var o = opts || {};
  var getKey = o.getKey, tsOf = o.ts, mergePair = o.mergePair || null;
  var keepUnversionedLocal = !!o.keepUnversionedLocal, onDrop = o.onDrop || null;
  var dedupe = o.dedupe !== false;
  var remoteDupe = o.remoteDupe || 'ts'; // 'ts' | 'last'
  var keyless = o.keyless || 'drop'; // 'drop' | 'keep-remote'
  var localPick = o.localPick || 'last'; // 'last' | 'first'
  var pend = function (k) { return !!(o.isPending && o.isPending(k)); };
  var L = Array.isArray(local) ? local : [];
  var R = Array.isArray(remote) ? remote : [];

  // ── איחוד כפילויות ──
  if (dedupe) {
    var map = {}, order = [];
    R.forEach(function (r) {
      if (!r) return;
      var k = getKey(r); if (k == null) return; k = String(k);
      if (!(k in map)) { order.push(k); map[k] = r; return; }
      // הסדר (הקיים, החדש) — שוויון נופל על המאוחר במערך, והיפוך הארגומנטים הופך את שובר-השוויון בשקט.
      map[k] = (remoteDupe === 'last') ? r
             : _mergePick(map[k], r, k, false, tsOf, mergePair);
    });
    L.forEach(function (r) {
      if (!r) return;
      var k = getKey(r); if (k == null) return; k = String(k);
      if (!(k in map)) {
        // רשומה מקומית-בלבד — היעדרות אצל הצד השני אינה מחיקה.
        if (tsOf(r) > 0 || keepUnversionedLocal || remote == null) { order.push(k); map[k] = r; }
        else if (onDrop) { try { onDrop(r, k); } catch (eD) {} }
      } else { map[k] = _mergePick(r, map[k], k, pend(k), tsOf, mergePair); }
    });
    return order.map(function (k) { return map[k]; });
  }

  // ── שימור כפילויות (דחיפה זורמת) ──
  var out = [], seen = {}, byKey = {};
  L.forEach(function (l) {
    var k = getKey(l); if (k == null) return; k = String(k);
    if (localPick === 'last' || !(k in byKey)) byKey[k] = l;
  });
  R.forEach(function (r) {
    var k = getKey(r);
    if (k == null) { if (keyless === 'keep-remote') out.push(r); return; }
    k = String(k); seen[k] = 1;
    var l = byKey[k];
    if (!l) { out.push(r); return; }
    out.push(_mergePick(l, r, k, pend(k), tsOf, mergePair));
  });
  L.forEach(function (l) {
    var k = getKey(l); if (k == null) return; k = String(k);
    if (!seen[k]) out.push(l);
  });
  return out;
}

// ── גריעת tombstones ──
// רק tombstone עם חותמת מספרית נגרע — חותמת חסרה נקראת 0, וגריעה לפיה הייתה מוחקת דווקא את הישנים ביותר.
// המחיר: מכשיר שנותק מעבר לסף מחזיר רשומה מחוקה פעם אחת.
var TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

// הגריעה רצה על תוצאת המיזוג, פעם אחת לעלייה — גריעה מקומית בלבד הייתה מוחזרת מהענן תוך שניות.
var _tombPrunePending = false;

// נקראות שתי צורות החותמת, updatedAt ו-updated_at — אחרת רשומה בצורה השנייה נקראת «בלי חותמת» וה-tombstone שלה נשאר לעולם.
function tombStamp(r) {
  if (!r || typeof r !== 'object') return null;
  if (typeof r.updatedAt === 'number') return r.updatedAt;
  if (typeof r.updated_at === 'number') return r.updated_at;
  return null;
}

// אל תקרא לשעון כשיש חותמת — דחיפה חוזרת של אותה מצבה הייתה מזיזה את זמן המחיקה.
function tombAt(ts) {
  return new Date((typeof ts === 'number' && isFinite(ts)) ? ts : Date.now()).toISOString();
}

function prunePastTombstones(arr, nowTs) {
  if (!Array.isArray(arr)) return [];
  var cutoff = (typeof nowTs === 'number' ? nowTs : Date.now()) - TOMBSTONE_TTL_MS;
  return arr.filter(function (r) {
    if (!r || typeof r !== 'object') return false;
    if (!r.deleted) return true;
    var t = tombStamp(r);
    if (t === null) return true;
    return t >= cutoff;
  });
}

// נקודת ההפעלה האחת — עוטף שני היה מאפשר לגרוע מכל מקום בקוד ובכל פולינג.
function tombPruneMerged(arr) {
  if (!_tombPrunePending) return arr;
  _tombPrunePending = false;
  var before = Array.isArray(arr) ? arr.length : 0;
  var out = prunePastTombstones(arr);
  if (before !== out.length) console.log('[tomb] נגרעו ' + (before - out.length) + ' tombstones מעבר לסף');
  return out;
}
// הדגל מורם פעם אחת בעלייה — הרמה בכל פולינג הייתה גורעת בכל מחזור.
function tombBoot() { _tombPrunePending = true; }

// ── שומר ההקשר ──
// בין ה-await הראשון לאחרון ההקשר יכול להתחלף, וכתיבה שאחריו נזקפת להקשר החדש.
// נלכד מונה ולא שם ההקשר — החלפה הלוך-ושוב מחזירה את אותו שם.
var _ctxEpoch = 0;
function ctxEpoch() { return _ctxEpoch; }
// נקרא לפני הטעינה החדשה — קידום אחריה משאיר את המחזור הרץ סבור שהוא עדיין בהקשר שלו.
function ctxSwitch() { _ctxEpoch++; return _ctxEpoch; }
// הקורא לוכד את הערך בכניסה ומוסר אותו כאן, ואינו קורא את הגלובלי פעמיים.
function ctxStale(ep) { return ep !== _ctxEpoch; }

// ── משיכה מסוננת בשרת ──
// בעמודים ולא בבקשה אחת — db-max-rows של PostgREST חותך בשקט, ועמוד שנכשל מחזיר null ולא את מה שהספיק.
// mkQuery היא פונקציה ולא בונה — בונה PostgREST נצרך בשליחה, וכל עמוד חייב אחד טרי.
var ROWS_PAGE = 1000;
var ROWS_CAP = 500000;
async function _rowsPaged(mkQuery, order, win) {
  var out = [], from = 0;
  for (;;) {
    var q = mkQuery();
    if (win && win.col) {
      if (win.from) q = q.gte(win.col, win.from);
      if (win.to) q = q.lte(win.col, win.to);
    }
    if (order) q = q.order(order, { ascending: true });
    var res = await withTimeout(q.range(from, from + ROWS_PAGE - 1));
    if (!res || res.error || !Array.isArray(res.data)) return null;
    out = out.concat(res.data);
    if (res.data.length < ROWS_PAGE) return out;
    from += ROWS_PAGE;
    if (from > ROWS_CAP) return out;
  }
}

// ── האזנת הסכימה ──
// 42P01, 42703 ו-404 על טבלה אינן שגיאת רשת — ניסיון חוזר לא יצליח לעולם, ולכן הבאנר עולה מיד.
// הדגל אינו נכבה — הקוד הרץ אינו מתעדכן בלי טעינה מחדש.
var _staleSchema = false;
function isStaleSchema(e) {
  if (!e) return false;
  var m = ((e.message || e.details || '') + '').toLowerCase();
  var c = ((e.code || '') + '');
  var s = Number(e.status || e.statusCode || 0);
  return c === '42P01' || c === '42703' || s === 404 ||
         m.indexOf('does not exist') !== -1;
}
// מי שלא הצליח מנסה שוב ב-load — השגיאה יכולה להגיע בעלייה, לפני שמימוש הבאנר פורסם.
function _staleBanner() {
  try { if (window.showAppUpdateBanner) { window.showAppUpdateBanner(); return true; } } catch (x) {}
  return false;
}
function staleSchemaHalt(e) {
  if (!isStaleSchema(e)) return false;
  if (!_staleSchema) {
    _staleSchema = true;
    // הטיימרים נעצרים כאן והדגל לבדו אינו מספיק — טיימר שכבר נדרך היה יורה עוד בקשה.
    rtyStop();
    plStop();
    if (!_staleBanner()) {
      try { window.addEventListener('load', _staleBanner); } catch (x) {}
    }
    try { toast(MSG_STALE_CODE, 6000, 'bad'); } catch (x) {}
  }
  return true;
}
// ההאזנה יושבת על הלקוח ולא בכל אתר שגיאה, כדי לראות כל שאילתה בלי תלות בקורא.
// העטיפה על פעלי השאילתה ולא על from — from() מחזיר בונה שאינו thenable.
function sbWatch(c) {
  if (!c || c._staleWatch || typeof c.from !== 'function') return c;
  c._staleWatch = true;
  var from0 = c.from.bind(c);
  c.from = function (t) {
    var qb = from0(t);
    // הרשימה כאן ולא כמשתנה מודול — לקוח שנוצר לפני טעינת המודול היה פוגש undefined ברגע העטיפה.
    ['select', 'insert', 'update', 'upsert', 'delete'].forEach(function (v) {
      if (!qb || typeof qb[v] !== 'function') return;
      var f0 = qb[v].bind(qb);
      qb[v] = function () {
        var b = f0.apply(null, arguments);
        if (b && typeof b.then === 'function' && !b._staleWatch) {
          b._staleWatch = true;
          var t0 = b.then.bind(b);
          b.then = function (ok, no) {
            return t0(function (r) { if (r && r.error) staleSchemaHalt(r.error); return ok ? ok(r) : r; }, no);
          };
        }
        return b;
      };
    });
    return qb;
  };
  return c;
}

// ── צינור השמירה ──
// runSave מחזירה את ההבטחה — בלעדיה השומר שבניתוב אינו מנטרל דבר.
// undefined מהמטפל פירושו שהוולידציה עצרה והמודאל נשאר פתוח; כל ערך אחר הוא הצלחה.
function errToast(e) {
  console.error('[save]', e);
  toast((e && (e.message || e.error_description)) || MSG_SAVE_FAIL, null, 'bad');
}
function afterSave(msg) {
  closeModal();
  app.saveRefresh();
  // בלי רשת ההודעה אומרת «במכשיר» — «נשמר» סתם נקרא «נשמר בענן».
  if (msg) toast(navigator.onLine ? msg : MSG_SAVED_LOCAL, null, 'good');
  schedulePush();
  return Promise.resolve();
}
function runSave(fn, msg) {
  return Promise.resolve()
    .then(fn)
    .then(function (r) {
      if (r === undefined) return;
      // מחרוזת מהמטפל היא ההודעה — יש הודעות שנגזרות מהנתון שנשמר וידועות רק בתוך המטפל.
      return afterSave(typeof r === 'string' ? r : msg);
    })
    .catch(function (e) { errToast(e); });
}

// ── ממתין לסנכרון ──
var PEND_LATE_MS = 24 * 60 * 60 * 1000; // סף ההתרעה
var PEND_MAX = 800; // תקרת המפה — הגנה מפני צמיחה בלי גבול
var _pendMap = null;
var _pendAlertDismissed = 0;

// ── השהיית ציור ──
// אישור מגיע לרוב תוך פחות משתי שניות וסימון חדש היה מהבהב — לכן רק הציור מושהה, והסימון הלוגי נכתב מיד.
// ההחזקה בזיכרון בלבד — סימון שנטען מהדיסק מצויר מיד.
var PEND_DRAW_DELAY_MS = 2000;
var _pendDrawHold = {}; // key - הרגע שממנו מותר לצייר; בזיכרון בלבד

function pendHoldDraw(key, now) {
  _pendDrawHold[key] = (now || Date.now()) + PEND_DRAW_DELAY_MS;
}
// 0 כל עוד הסימון מוחזק; סימון שנטען מהדיסק מצויר מיד.
function pendDrawSince(key) {
  var t = pendSince(key);
  if (!t) return 0;
  var h = _pendDrawHold[key];
  if (h && Date.now() < h) return 0;
  if (h) delete _pendDrawHold[key];
  return t;
}
// משמש רק להחלטה אם להציג את הסרגל — המספר המוצג הוא תמיד pendCount() המלא.
function pendDrawCount() {
  var m = pendAll(), keys = Object.keys(m), n = 0, now = Date.now();
  for (var i = 0; i < keys.length; i++) {
    var h = _pendDrawHold[keys[i]];
    if (!h || now >= h) n++;
  }
  return n;
}
function pendDrawFlush() {
  var m = pendAll(), now = Date.now(), revealed = false;
  Object.keys(_pendDrawHold).forEach(function (k) {
    if (now >= _pendDrawHold[k]) {
      delete _pendDrawHold[k];
      if (m[k]) revealed = true;
    }
  });
  if (!revealed) return;
  pendRender();
  try { if (typeof app.PEND_CFG === 'object' && app.PEND_CFG.redraw) app.PEND_CFG.redraw(); } catch (e) { }
}
function pendScheduleFlush() {
  try { setTimeout(pendDrawFlush, PEND_DRAW_DELAY_MS + 50); } catch (e) { }
}

// פונקציה כשסימוני מוסד אחד אינם תקפים לשני באותו origin.
function pendKeyName() {
  var k = (typeof app.PEND_CFG === 'object') ? app.PEND_CFG.key : null;
  if (typeof k === 'function') { try { k = k(); } catch (e) { k = null; } }
  return k || 'pending_sync';
}
function pendReload() { _pendMap = null; _pendDrawHold = {}; pendPrune(); pendRender(); }
// סימון שקידומתו אינה מוצהרת אין לו כותב — הוא מקבע את המונה ואת הניסיון החוזר לנצח, וחוסם את זריקת העידן.
// רשימה ריקה או זורקת נקראת «אין ראיה» ואינה מורידה דבר.
function pendPrune() {
  var m = pendAll(), marks = null, drop;
  try { marks = app.PEND_CFG.marks(); } catch (e) { console.error('[pend] הקידומות אינן נקראות — אין ניקוי', e); return 0; }
  if (!Array.isArray(marks) || !marks.length) { console.error('[pend] אין קידומות מוצהרות — אין ניקוי'); return 0; }
  drop = Object.keys(m).filter(function (k) {
    return !marks.some(function (p) { return typeof p === 'string' && p && k.indexOf(p) === 0; });
  });
  if (!drop.length) return 0;
  drop.forEach(function (k) { delete m[k]; });
  pendSave();
  try { lsLog('סימון שקידומתו אינה מוצהרת ירד', drop.join(' · '), 0); } catch (e1) { }
  console.warn('[pend] ' + drop.length + ' סימונים שקידומתם אינה מוצהרת ירדו');
  return drop.length;
}
function pendAlertDismiss() { _pendAlertDismissed = Date.now(); pendRenderAlert(); }
// בלי טעינה מחדש — בהחלפת הקשר הטעינה שייכת להקשר החדש.
function pendForget() { _pendMap = null; _pendDrawHold = {}; }

function pendAll() {
  if (_pendMap) return _pendMap;
  var v = null;
  try { var raw = lsGet(pendKeyName(), null); v = raw == null ? null : JSON.parse(raw); }
  catch (e) { v = null; }
  _pendMap = (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
  Object.keys(_pendMap).forEach(function (k) {
    var t = Number(_pendMap[k]);
    if (!isFinite(t) || t <= 0) delete _pendMap[k];
  });
  return _pendMap;
}

// כישלון כאן אינו שקט — lsSet מרימה באנר ורושמת ליומן.
function pendSave() {
  var m = pendAll();
  var keys = Object.keys(m);
  if (keys.length > PEND_MAX) {
    // רק הסימון יורד והרשומה נשארת — ובכל זאת נרשם ליומן, כי סימון שנעלם בלי אישור הוא מה שהמודול בא למנוע.
    keys.sort(function (a, b) { return m[a] - m[b]; });
    var drop = keys.slice(0, keys.length - PEND_MAX);
    drop.forEach(function (k) { delete m[k]; });
    try { lsLog('pend-overflow', drop.length + ' סימונים נגרעו (תקרה ' + PEND_MAX + ')', 0); } catch (e) { }
  }
  return lsSet(pendKeyName(), JSON.stringify(m));
}

// חותמת קיימת אינה נדרסת — אחרת עריכה חוזרת הייתה מאפסת את שעון ההתרעה לנצח.
function pendMark(key) {
  if (!key) return 0;
  var m = pendAll();
  if (!m[key]) {
    m[key] = Date.now();
    pendHoldDraw(key, m[key]); pendScheduleFlush();
    pendSave(); pendRender();
  }
  return m[key];
}
function pendMarkMany(keys) {
  if (!keys || !keys.length) return;
  var m = pendAll(), now = Date.now(), ch = false;
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] && !m[keys[i]]) { m[keys[i]] = now; pendHoldDraw(keys[i], now); ch = true; }
  }
  if (ch) { pendScheduleFlush(); pendSave(); pendRender(); }
}

function pendClear(key) {
  if (!key) return;
  var m = pendAll();
  if (m[key]) { delete m[key]; delete _pendDrawHold[key]; pendSave(); pendRender(); }
}
function pendClearMany(keys) {
  if (!keys || !keys.length) return;
  var m = pendAll(), ch = false;
  for (var i = 0; i < keys.length; i++) if (m[keys[i]]) { delete m[keys[i]]; delete _pendDrawHold[keys[i]]; ch = true; }
  if (ch) { pendSave(); pendRender(); }
}

// כשל סמכותי — הכתיבה לא נכנסה, וסימון שנשאר היה מקבע את המונה ואת הניסיון החוזר לנצח.
function pendFailed(key) { pendClear(key); }

// prefix מגביל לקטגוריה אחת — דחיפה של מפתח אחד אינה מאשרת את השאר.
function pendConfirmPush(prefix, t0) {
  var m = pendAll(), ch = false;
  t0 = Number(t0) || 0;
  if (!t0) return;
  Object.keys(m).forEach(function (k) {
    if (prefix && k.indexOf(prefix) !== 0) return;
    if (m[k] < t0) { delete m[k]; delete _pendDrawHold[k]; ch = true; }
  });
  if (ch) { pendSave(); pendRender(); }
}

function pendHas(key) { return !!pendAll()[key]; }
function pendSince(key) { return pendAll()[key] || 0; }
function pendCount() { return Object.keys(pendAll()).length; }
function pendOldest() {
  var m = pendAll(), keys = Object.keys(m), t = 0;
  for (var i = 0; i < keys.length; i++) if (!t || m[keys[i]] < t) t = m[keys[i]];
  return t;
}
function pendLateCount() {
  var m = pendAll(), keys = Object.keys(m), n = 0, cut = Date.now() - PEND_LATE_MS;
  for (var i = 0; i < keys.length; i++) if (m[keys[i]] < cut) n++;
  return n;
}

function pendFmtAge(ms) {
  if (!isFinite(ms) || ms < 0) ms = 0;
  var mi = Math.floor(ms / 60000);
  if (mi < 1) return 'פחות מדקה';
  if (mi < 60) return mi + ' דק׳';
  var h = Math.floor(mi / 60);
  if (h < 24) return h + ' שע׳';
  return Math.floor(h / 24) + ' ימים';
}

// ── תצוגה ──
function pendEnsureStyle() {
  if (document.getElementById('pend-style')) return;
  var s = document.createElement('style');
  s.id = 'pend-style';
  s.textContent =
    '.pend-tag{display:inline-block;background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn);' +
    'border-radius:999px;padding:0 7px;font-size:.68rem;font-weight:700;line-height:var(--lh-4);' +
    'white-space:nowrap;vertical-align:middle;margin:0 4px}' +
    '.pend-tag.late{background:var(--bad-soft);color:var(--bad);border-color:var(--bad)}' +
    '#pend-bar{position:fixed;z-index:2147482000;left:0;right:0;bottom:0;padding:8px 12px;' +
    'text-align:center;direction:rtl;font:600 13px/1.5 inherit;color:var(--warn);background:var(--warn-soft);' +
    'box-shadow:0 -2px 10px var(--sh-1)}' +
    '#pend-bar.late{background:var(--bad-soft);color:var(--bad)}' +
    '#pend-alert{position:fixed;z-index:2147483000;left:0;right:0;top:0;padding:10px 14px;' +
    'direction:rtl;font:700 13px/1.6 inherit;color:var(--on-alert);background:var(--alert);' +
    'box-shadow:0 2px 10px var(--sh-2);display:flex;gap:10px;align-items:center;justify-content:center}' +
    '#pend-alert button{background:var(--fill-dark);color:var(--on-dark);border:1px solid var(--on-dark);' +
    'border-radius:6px;padding:2px 10px;font:inherit;cursor:pointer}';
  (document.head || document.documentElement).appendChild(s);
}

// מחזירה מחרוזת ריקה כשאין מה להציג, כדי שאפשר לשרשר בלי תנאי.
function pendTag(key) {
  var t = pendDrawSince(key); // השהיית ציור — ולא pendSince
  if (!t) return '';
  pendEnsureStyle();
  var age = Date.now() - t, late = age > PEND_LATE_MS;
  var title = 'ממתין לסנכרון מאז ' + new Date(t).toLocaleString('he-IL') +
              ' (' + pendFmtAge(age) + ') — שמור במכשיר, טרם אושר בענן';
  return '<span class="pend-tag' + (late ? ' late' : '') + '" title="' + esc(title) + '">' +
         (late ? '⚠️' : '⏳') + ' ממתין</span>';
}

function pendCounterText() {
  var n = pendCount(), off = (typeof navigator !== 'undefined' && navigator && navigator.onLine === false);
  // כשהסרגל מוצג, n הוא הספירה הלוגית המלאה ולא רק מה שמותר לצייר.
  if (!n || !pendDrawCount()) return off ? '⚠️ אין רשת' : '';
  var late = pendLateCount();
  var s = (late ? '⚠️ ' : (off ? '⚠️ אין רשת · ' : '⏳ ')) + n + ' פעולות ממתינות לסנכרון';
  var old = pendOldest();
  if (old) s += ' · הישנה ביותר לפני ' + pendFmtAge(Date.now() - old);
  return s;
}

function pendRender() {
  if (typeof document === 'undefined' || !document.body) return;
  pendEnsureStyle();
  var txt = pendCounterText(), bar = document.getElementById('pend-bar');
  if (!txt) { if (bar) bar.classList.add('hidden'); }
  else {
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pend-bar';
      document.body.appendChild(bar);
    }
    var extra = '';
    try { if (typeof app.PEND_CFG === 'object' && app.PEND_CFG.extra) extra = app.PEND_CFG.extra() || ''; } catch (e) { }
    bar.textContent = txt + (extra ? ' · ' + extra : '');
    bar.className = pendLateCount() ? 'late' : '';
  }
  pendRenderAlert();
}

// ההתרעה נפרדת מהמונה בכוונה — מונה הוא מידע, וממתין מעל יממה הוא תקלה שדורשת פעולה.
function pendRenderAlert() {
  var late = pendLateCount(), el = document.getElementById('pend-alert');
  if (!late || (_pendAlertDismissed && (Date.now() - _pendAlertDismissed) < 6 * 60 * 60 * 1000)) {
    if (el) el.remove();
    return;
  }
  var msg = '⚠️ ' + late + ' פעולות ממתינות לסנכרון מעל 24 שעות — בדוק חיבור לאינטרנט. הנתונים שמורים במכשיר בלבד.';
  if (el) { var sp = el.firstChild; if (sp) sp.textContent = msg; return; }
  el = document.createElement('div');
  el.id = 'pend-alert';
  var span = document.createElement('span');
  span.textContent = msg;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'הבנתי';
  btn.dataset.act = 'pend-alert-ok';
  el.appendChild(span);
  el.appendChild(btn);
  document.body.appendChild(el);
}

// רענון תקופתי — סף ה-24 שעות חייב להיחצות גם כשהמשתמש לא נגע בכלום.
var _pendTick = null;
function pendBoot() {
  pendPrune();
  pendRender();
  if (!_pendTick) _pendTick = setInterval(pendRender, 60000);
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', pendRender);
    window.addEventListener('offline', pendRender);
  }
}

// ── ניסיון חוזר בסנכרון ──
var RTY_BASE_MS = 15000;
var RTY_MAX_MS  = 60000;
var _rtyTimer = null, _rtyDelay = RTY_BASE_MS, _rtyBusy = false, _rtyWired = false;

function _rtyPending() {
  try { return !!(typeof app.RTY_CFG !== 'undefined' && app.RTY_CFG && app.RTY_CFG.pending && app.RTY_CFG.pending()); }
  catch (e) { return false; }
}
function _rtyOnline() {
  try { return typeof navigator === 'undefined' || navigator.onLine !== false; } catch (e) { return true; }
}
function _rtyVisible() {
  try { return typeof document === 'undefined' || document.visibilityState !== 'hidden'; } catch (e) { return true; }
}
// סכימה שהשתנתה אינה כשל חולף — לולאה שמנסה שוב מולה נראית למשתמש כאיטיות בלבד.
function rtyReady() { return !_staleSchema && _rtyPending() && _rtyOnline() && _rtyVisible(); }

function rtyStop() { if (_rtyTimer) { clearTimeout(_rtyTimer); _rtyTimer = null; } }

function rtyArm() {
  if (_rtyTimer || !rtyReady()) return false;
  _rtyTimer = setTimeout(_rtyFire, _rtyDelay);
  return true;
}

function _rtyFire() {
  _rtyTimer = null;
  rtyKick();
}

// כל החלטה לנסות עוברת כאן — בדיקות מפוזרות הן מקומות שבהם תנאי נשכח.
// מה שאינו מוכן אינו נדרך — online ו-visibilitychange מעירים אותו.
function rtyKick() {
  if (_rtyBusy) return Promise.resolve(false);
  if (!rtyReady()) { rtyStop(); return Promise.resolve(false); }
  _rtyBusy = true;
  rtyStop();
  var p;
  try { p = Promise.resolve(app.RTY_CFG.flush()); } catch (e) { p = Promise.reject(e); }
  var grow = function () { _rtyDelay = Math.min(_rtyDelay * 2, RTY_MAX_MS); };
  return p.then(function () { if (_rtyPending()) grow(); else _rtyDelay = RTY_BASE_MS; }, grow)
          .then(function () { _rtyBusy = false; rtyArm(); return true; });
}

function rtyNote() { _rtyDelay = RTY_BASE_MS; rtyArm(); }

function rtyBoot() {
  if (!_rtyWired) {
    _rtyWired = true;
    try {
      window.addEventListener('online', function () { _rtyDelay = RTY_BASE_MS; rtyKick(); });
      document.addEventListener('visibilitychange', function () {
        if (_rtyVisible()) { _rtyDelay = RTY_BASE_MS; rtyKick(); }
      });
    } catch (e) { console.warn('[rty] wiring', e); }
  }
  rtyArm();
}

// ── מנגנון המשיכה ──
var PL_FALLBACK_MS = 60000; // אין שורת חותמת בענן - משיכה מלאה אחת לדקה
var _plTimer = null, _plBusy = false, _plFullAt = 0, _plWired = false;
function plForget() { _plFullAt = 0; }

// חותמת מהענן: מספר, מחרוזת JSON של מספר, או כל דבר אחר - 0.
function plNum(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Math.floor(v) || 0;
  try { var p = JSON.parse(v); if (typeof p === 'number') return Math.floor(p) || 0; } catch (e) { }
  return parseInt(v, 10) || 0;
}

function _plSeen() { try { return plNum(app.PL_CFG.seen()); } catch (e) { return 0; } }

// מקדמת קודם את החותמת המקומית, כדי שהתקתוק הבא לא ימשוך מלא בגלל שינוי של המכשיר הזה.
// כשל בכתיבת החותמת אינו מפיל את הכתיבה שקדמה לה — הנתון כבר בענן.
function plTouch(ts) {
  var t = plNum(ts) || Date.now();
  try { app.PL_CFG.note(t); } catch (e) { }
  return plStampWrite(t).then(function () { return t; });
}

// כותב אחד וקורא אחד — updated_at הוא not null, וכותב שני שנבדל בעמודה נכשל בכל כתיבה.
// הלקוח והטבלה נלכדים בשורה הראשונה — אחרי ההמתנה ההקשר יכול להתחלף.
var PL_STAMP_KEY = 'last_changed';
function plStampWrite(ts) {
  var c, tbl;
  try { c = app.PL_CFG.client(); tbl = app.PL_CFG.table(); } catch (e) { c = null; }
  if (!c || !tbl) return Promise.resolve({ ok: false });
  var row = { key: PL_STAMP_KEY, value: JSON.stringify(plNum(ts)), updated_at: Date.now() };
  var fail = function (e) {
    console.warn('[pl] כתיבת החותמת נכשלה', tbl, e && e.message ? e.message : e);
    return { ok: false, error: e };
  };
  try {
    return withTimeout(c.from(tbl).upsert(row, { onConflict: 'key' })).then(function (r) {
      if (!r || r.error) return fail(r && r.error);
      return { ok: true };
    }, fail);
  } catch (e) { return Promise.resolve(fail(e)); }
}
// ts: null פירושו שאין שורת חותמת, ו-ok: false שאין ראיה — כשל שנקרא «אין שורה» היה מפעיל משיכה מלאה על כל תקלה.
function plStampRead() {
  var c, tbl;
  try { c = app.PL_CFG.client(); tbl = app.PL_CFG.table(); } catch (e) { c = null; }
  if (!c || !tbl) return Promise.resolve({ ok: false, ts: null });
  try {
    return withTimeout(c.from(tbl).select('value').eq('key', PL_STAMP_KEY).maybeSingle())
      .then(function (r) {
        if (!r || r.error) return { ok: false, ts: null };
        return { ok: true, ts: r.data ? plNum(kvParse(PL_STAMP_KEY, r.data.value).value) : null };
      }, function () { return { ok: false, ts: null }; });
  } catch (e) { return Promise.resolve({ ok: false, ts: null }); }
}

function _plFull() {
  var done = function (v) { _plBusy = false; return v; };
  // שחרור האופק לפני המשיכה ולא אחריה — הוא שמתיר לכתיבה שבסופה להחזיר את הישן.
  try { lsHorizonRelease(); } catch (e0) { }
  try {
    return Promise.resolve(app.PL_CFG.pull()).then(
      function () { _plFullAt = Date.now(); return done(true); },
      function () { return done(false); });
  } catch (e) { return Promise.resolve(done(false)); }
}

function plStop() { if (_plTimer) { clearInterval(_plTimer); _plTimer = null; } }

function plTick() {
  if (_plBusy || _staleSchema) return Promise.resolve(false);
  var live; try { live = !!app.PL_CFG.active(); } catch (e) { live = false; }
  if (!live) return Promise.resolve(false);
  _plBusy = true;
  var done = function (v) { _plBusy = false; return v; };
  var p;
  try { p = plStampRead(); } catch (e) { p = Promise.reject(e); }
  return p.then(function (r) {
    if (!r || !r.ok) return done(false);
    try { app.PL_CFG.ok(); } catch (e) { }
    if (r.ts === null || r.ts === undefined) {
      if (Date.now() - _plFullAt >= PL_FALLBACK_MS) return _plFull();
      return done(false);
    }
    var ts = plNum(r.ts);
    if (ts > _plSeen()) { try { app.PL_CFG.note(ts); } catch (e) { } return _plFull(); }
    return done(false);
  }, function () { return done(false); });
}

function plBoot() {
  if (!_plWired) {
    _plWired = true;
    try { window.addEventListener('online', function () { plTick(); }); }
    catch (e) { console.warn('[pl] wiring', e); }
  }
  if (_plTimer || _staleSchema) return false;
  var ms = 0;
  try { ms = parseInt(app.PL_CFG.every, 10) || 0; } catch (e) { ms = 0; }
  if (!ms) ms = 3000;
  _plTimer = setInterval(function () { plTick(); }, ms);
  plTick();
  return true;
}

// ── שכבת הדחיפה ──
// מנה שנכשלה נדחפת שוב שורה-שורה — כתיבת מנה היא הכל-או-כלום.
// dirty שמחזירה null מדלגת בלי לסמן עֵד פינוי — סימון על טבלה שלא נמשכה היה מתיר לפנות רשומה שלא עלתה.
var _pushTimer = null;

// תשובה שנושאת error אינה זורקת מעצמה — הבדיקה שלה היא כאן.
function pushRow(t, rows) {
  return Promise.resolve(app.PUSH_CFG.send(t, rows)).then(function (res) {
    if (res && res.error) throw res.error;
    return rows.length;
  });
}

// כשל רשת משאיר את הסימון וננסה שוב; כשל סמכותי (ולידציה, מפתח זר, הרשאה, סכימה) יחזור לנצח, ולכן הסימון יורד והסיבה נרשמת.
function pushTable(t, ctx) {
  return Promise.resolve(app.PUSH_CFG.dirty(t, ctx)).then(function (rows) {
    if (!rows) return { ok: false, still: [], n: 0 };
    if (!rows.length) { app.PUSH_CFG.mark(t); return { ok: true, still: [], n: 0 }; }
    var still = [], n = 0, bad = 0, i = 0;
    function won(row) {
      var k = app.PUSH_CFG.key(t, row);
      n++;
      if (k != null) pendClear(k);
    }
    function lost(row, e) {
      var k = app.PUSH_CFG.key(t, row);
      console.warn('[push] ' + t, e && (e.message || e));
      if (isNetErr(e)) { if (k != null) still.push(k); }
      else { bad++; if (k != null) pendFailed(k); }
    }
    // המנה נדחתה ואיננו יודעים איזו שורה פגומה — כל שורה נשלחת לבדה, והפגומה אינה חוסמת את התקינות.
    function solo(part, j) {
      if (j >= part.length) return Promise.resolve();
      var row = part[j];
      return pushRow(t, [row]).then(function () { won(row); },
                                    function (e) { lost(row, e); })
        .then(function () { return solo(part, j + 1); });
    }
    function batch() {
      if (i >= rows.length) return Promise.resolve();
      var part = rows.slice(i, i + app.PUSH_CFG.chunk);
      i += part.length;
      return pushRow(t, part).then(function () { part.forEach(won); },
                                   function () { return solo(part, 0); })
        .then(batch);
    }
    return batch().then(function () {
      // בלי קידום החותמת הדחיפה נשארת בלתי-נראית למכשירים האחרים — הם מושכים רק כשהיא מתקדמת.
      if (n) plTouch();
      // עֵד הפינוי מסומן רק כשלא נשארה שורה בכשל רשת — זה התנאי שמתיר לפנות מהדיסק רשומה ישנה של הטבלה.
      if (!still.length) app.PUSH_CFG.mark(t);
      return { ok: !still.length && !bad, still: still, n: n };
    });
  });
}

// הסדר ב-PUSH_CFG.tables שומר על המפתח הזר — האב נכתב לפני הבן; כשל בטבלה אחת אינו עוצר את הבאות.
function pushDirty(ctx) {
  var acc = [], ok = true, n = 0, i = 0;
  function step() {
    if (i >= app.PUSH_CFG.tables.length) return Promise.resolve({ ok: ok, still: acc, n: n });
    return pushTable(app.PUSH_CFG.tables[i++], ctx).then(function (r) {
      acc = acc.concat(r.still);
      n += r.n;
      if (!r.ok) ok = false;
      return step();
    });
  }
  return step();
}

// ההשהיה מתחילה מחדש בכל כתיבה — שתי שמירות רצופות הן מחזור אחד, והרשומה כבר מסומנת לפני ההשהיה.
function schedulePush() {
  rtyNote();
  if (_pushTimer) clearTimeout(_pushTimer);
  // ההקשר נלכד בקביעת המועד ולא בהתעוררות — ההקשר יכול להתחלף בתוך ההשהיה.
  var _ep = ctxEpoch();
  _pushTimer = setTimeout(function () {
    _pushTimer = null;
    if (ctxStale(_ep)) return;
    app.PUSH_CFG.run();
  }, app.PUSH_CFG.delay);
}

// ── עידן הנתונים ──
// זו הפעולה ההרסנית היחידה — נתון שלא נדחף ונזרק אבוד, ולכן כל שלושת התנאים חובה.
// תנאי שאינו מתקיים פירושו «ננסה שוב בעלייה הבאה» ולא «נזרוק בכל זאת».
var ERA_CLOUD_KEY = 'data_era';
var _eraPush = null;
var _eraTried = false;
// «הדחיפה הצליחה» אינה «אין מה לדחוף» — שורה שנכתבה אחרי המחזור אינה ב-still והיא בתור, ושורה שנדחתה ברשת היא ב-still ואינה בתור.
function eraMayThrow(o) {
  var s = o || {};
  // בלי רשת אין ראיה שהענן קיבל דבר.
  if (!s.online) return false;
  // still הוא מה שלא עלה — שורה אחת שנשארה בו היא נתון שיימחק ואינו ניתן לשחזור.
  if (!s.push || s.push.ok !== true) return false;
  if (!Array.isArray(s.push.still) || s.push.still.length !== 0) return false;
  // מפת הממתינים היא מה שנכתב מקומית ולא הוכרע.
  if (!s.pending || typeof s.pending !== 'object') return false;
  if (Object.keys(s.pending).length !== 0) return false;
  return true;
}
// הסימן הוא חותמת ולא מונה — מספר סידורי אינו אומר מה נוקה ומתי.
function eraResetKey(prefix) { return String(prefix == null ? '' : prefix) + 'era_reset'; }
function eraStamp(now) {
  return new Date(typeof now === 'number' && isFinite(now) ? now : Date.now()).toISOString();
}
// ההשוואה נכשלת סגור — ערך שאינו מספר אינו «הענן חדש», וזריקה על סמך כשל מוחקת נתונים.
function eraBehind(local, cloud) {
  var c = Number(cloud), l = Number(local);
  if (!isFinite(c) || !isFinite(l)) return false;
  return c > l;
}
// המחיקה קודמת לכתיבה — זריקה שנקטעת משאירה עידן ישן והעלייה הבאה זורקת שוב; הסדר ההפוך משאיר מכשיר חצי-ריק שסבור שהוא מעודכן.
function eraThrow(o) {
  var s = o || {};
  if (!eraBehind(s.local, s.cloud)) return false;
  if (!eraMayThrow(s)) return false;
  s.wipe();
  s.save(Number(s.cloud), eraResetKey(s.prefix), eraStamp());
  return true;
}
// התקנה טרייה נושאת את עידן הקוד — אין בה עותק ישן, ואפס היה זורק אותה בעלייה הראשונה.
function eraLocalKey() { return app.ERA_CFG.prefix + 'era'; }
// המרשם קורא את המפתחות מכאן — שם מוקלד במקום שני מתיישן, והניקוי בעלייה מוחק אותו.
function eraKeys() { return [eraLocalKey(), eraResetKey(app.ERA_CFG.prefix)]; }
function eraLocal() {
  var v = parseInt(lsGet(eraLocalKey(), ''), 10);
  return isFinite(v) ? v : app.DATA_ERA;
}
function eraSave(era, stampKey, stamp) {
  lsSet(eraLocalKey(), String(era));
  lsSet(stampKey, JSON.stringify(stamp));
}
// כל אפליקציה נושאת מספר עידן משלה — צורת השורה נבדלת, ומספר משותף היה זורק על שינוי שלא נעשה כאן.
// הקריאה אינה ב-single — שם שורה שאינה קיימת מסומנת כשגיאה, ומסד בלי עידן הוא המצב הרגיל.
function eraCloudRead() {
  var c = app.ERA_CFG.client(), eraTbl = app.ERA_CFG.table();
  if (!c || !eraTbl) return Promise.resolve(null);
  return withTimeout(c.from(eraTbl).select('value').eq('key', ERA_CLOUD_KEY).maybeSingle())
    .then(function (r) {
      if (!r || r.error || !r.data) return null;
      var pr = kvParse(ERA_CLOUD_KEY, r.data.value);
      var raw = pr.ok ? pr.value : null;
      return raw == null ? null : Number(raw);
    }, function () { return null; });
}
// פעם אחת לעלייה ולא בפולינג — קידום עידן הוא פעולת מנהל נדירה.
// תוצאת הדחיפה נמסרת כארגומנט — גלובלי אחרי המתנה מחזיר את מה שהמחזור הבא כתב.
function eraBoot(push, ep) {
  return eraCloudRead().then(function (cloud) {
    if (ctxStale(ep)) return false;
    var threw = eraThrow({
      local: eraLocal(), cloud: cloud, prefix: app.ERA_CFG.prefix,
      online: navigator.onLine, push: push, pending: pendAll(),
      wipe: app.ERA_CFG.wipe, save: eraSave
    });
    if (!threw) return false;
    console.log('[era] עידן ' + cloud + ' — העותק המקומי נזרק ונמשך מלא');
    return app.ERA_CFG.refresh();
  }, function () { return false; });
}
// לאפליקציה שמחזור הדחיפה שלה אינו מחזיר תוצאה; תוצאה שאינה אובייקט נקראת «אין ראיה» ולא «הצליח».
function eraNotePush(r) {
  _eraPush = (r && typeof r === 'object') ? r : null;
  return r;
}
// ההקשר נלכד לפני הדחיפה ונבדק אחריה — מחזור שמתעורר בהקשר אחר היה זורק את העותק של האחר.
function eraKick() {
  if (_eraTried) return Promise.resolve(false);
  _eraTried = true;
  var ep = ctxEpoch();
  return Promise.resolve(app.ERA_CFG.push()).then(function (r) { return eraBoot(r, ep); },
                                              function () { return false; });
}

// ייצוא בשם ולא default — שם שנעלם נשבר בטעינה, ו-default היה נבלע בשקט.
export { newClientId, idEq, mergeCore, tombAt, TOMBSTONE_TTL_MS,
         prunePastTombstones, tombPruneMerged, tombBoot, ctxEpoch,
         ctxSwitch, ctxStale, _eraPush, _rowsPaged, afterSave, eraKeys, eraKick,
         eraNotePush, errToast, pendAlertDismiss, pendAll, pendBoot,
         pendClearMany, pendConfirmPush, pendCount, pendFailed, pendForget,
         pendHas, pendMark, pendMarkMany, pendReload, pendRender, pendTag,
         PL_STAMP_KEY, plBoot, plForget, plStampRead, plStampWrite,
         plTick, plTouch, pushDirty, pushTable,
         rtyBoot, rtyNote, runSave, sbWatch, schedulePush };
