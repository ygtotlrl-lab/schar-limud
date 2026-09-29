// core/backup.js — הגיבוי היומי ויומן הפעולות

import { app, dayToday, withTimeout } from './util.js';
import { _rowsPaged } from './sync.js';
import { lsGet, lsSet, lsSpace } from './storage.js';

// ── גיבוי יומי ויומן פעולות ──
var BK_TABLE = 'sh_backup'; // הכתיבה היא insert בלבד
var BK_LOG_TABLE = 'sh_sync_log'; // הכתיבה היא insert בלבד
var BK_LOG_MAX = 50;
var _bkRunning = false;

function _bkVal(v) { return (typeof v === 'function') ? v() : v; }
function _bkCfg(name, dflt) {
  try {
    if (typeof app.BK_CFG === 'undefined' || app.BK_CFG[name] === undefined) return dflt;
    return _bkVal(app.BK_CFG[name]);
  } catch (e) { return dflt; }
}
function _bkClient() { try { return app.BK_CFG.client(); } catch (e) { return null; } }

// המנגנון נשאר דרוך גם כשהרשימה ריקה.
function _bkSecrets() {
  var s = _bkCfg('secrets', []);
  return Array.isArray(s) ? s : [];
}

// אורך + FNV-1a — אינה סוד ואינה אימות, רק «האם זה אותו ערך בדיוק».
function bkSig(s) {
  var str = String(s == null ? '' : s), h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return str.length + ':' + h.toString(16);
}

// ── יומן הפעולות ──
function _bkLogRow(action, key, count, details) {
  return {
    device_id: _bkCfg('device', null),
    user_name: _bkCfg('user', null),
    action: action,
    key: key || null,
    record_count: (count === undefined || count === null) ? null : count,
    details: details || null
  };
}
// הרישום אינו משנה את הזרימה — הכתיבה נכשלת כפי שנכשלה אך אינה שקטה; תיעוד שמפיל שמירה גרוע מהיעדרו.
function _bkWriteFail(where, e) {
  try { console.warn('[bk] ' + where, (e && e.message) ? e.message : e); } catch (e0) { }
}
function _bkLogQueue(row) {
  try {
    var qk = _bkVal(app.BK_CFG.logQueueKey);
    var q = JSON.parse(lsGet(qk, '[]') || '[]');
    if (!Array.isArray(q)) q = [];
    q.push(row);
    if (q.length > BK_LOG_MAX) q = q.slice(-BK_LOG_MAX);
    lsSet(qk, JSON.stringify(q));
  } catch (e) { _bkWriteFail('_bkLogQueue', e); }
}
// לעולם אינו חוסם ואינו מפיל את המסלול שקרא לו — תיעוד שמפיל כניסה או שמירה גרוע מהיעדרו.
function logAction(action, key, count, details) {
  var row = null;
  try {
    row = _bkLogRow(action, key, count, details);
    var c = _bkClient();
    if (!c) { _bkLogQueue(row); return; }
    c.from(BK_LOG_TABLE).insert(row).then(
      function (r) { if (r && r.error) _bkLogQueue(row); },
      function () { _bkLogQueue(row); }
    );
  } catch (e) { if (row) _bkLogQueue(row); }
}
// רישום שהמסלול תלוי בו — הזריקה בעידן מחכה לו, ולכן הוא ממתין לתשובה ואינו נופל לתור.
// entries: [{ key, details }] — שורה לכל אחד, בבקשה אחת; true רק כשהמסד קיבל את כולן.
function logAwait(action, entries) {
  var c = _bkClient();
  if (!c || !Array.isArray(entries)) return Promise.resolve(false);
  var rows = entries.map(function (e) { return _bkLogRow(action, e.key, 1, e.details); });
  return withTimeout(c.from(BK_LOG_TABLE).insert(rows)).then(
    function (r) { if (r && r.error) { _bkWriteFail('logAwait', r.error); return false; } return true; },
    function (e) { _bkWriteFail('logAwait', e); return false; });
}
async function logFlush() {
  var qk, q;
  try { qk = _bkVal(app.BK_CFG.logQueueKey); q = JSON.parse(lsGet(qk, '[]') || '[]'); } catch (e) { return 0; }
  if (!Array.isArray(q) || !q.length) return 0;
  var c = _bkClient();
  if (!c) return 0;
  lsSet(qk, '[]');
  var failed = [], sent = 0;
  for (var i = 0; i < q.length; i++) {
    try {
      var r = await c.from(BK_LOG_TABLE).insert(q[i]);
      if (r && r.error) failed.push(q[i]); else sent++;
    } catch (e2) { failed.push(q[i]); }
  }
  if (failed.length) {
    try {
      var q2 = JSON.parse(lsGet(qk, '[]') || '[]');
      if (!Array.isArray(q2)) q2 = [];
      lsSet(qk, JSON.stringify(q2.concat(failed).slice(-BK_LOG_MAX)));
    } catch (e3) { _bkWriteFail('logFlush', e3); }
  }
  return sent;
}

// עוגן מלא אחת לשבוע, דיפ בשאר הימים, והפינוי הלילי במסד אוכף את התקרות —
// גיבוי מלא כל לילה של טבלה בת עשרות אלפי שורות הוא מגה-בייטים ביום.
var BK_ANCHOR_MS = 7 * 24 * 60 * 60 * 1000;
var BK_ANCHOR_PREFIX = 'ANCHOR:';
var BK_DIFF_PREFIX = 'DIFF:';

// ── המפתחות שהגיבוי כותב במכשיר ──
// הם מחוץ לתחילית, ולכן המודול רושם את משפחתם ב-lsSpace — אחרת מפתח של מקור שירד נשאר במכשיר לעולם.
// השייכות נגזרת מהקידומות ומתחילית האפליקציה: מפתח bk_ של אפליקציה אחרת על אותו origin אינו נגע.
var BK_LS = { wm: 'bk_wm_', anch: 'bk_anch_', day: 'bk_day_', sig: 'bk_sig_' };
// prefixes כשהקידומת נבדלת בין הקשרים — המרשם מצהיר על כולם ולא על הפעיל בלבד.
function _bkPrefixes() {
  var p = _bkCfg('prefixes', null);
  return (Array.isArray(p) && p.length) ? p : [_bkCfg('prefix', '') || ''];
}
function bkKeys() {
  var src = _bkCfg('sources', []) || [], pres = _bkPrefixes(), out = [];
  pres.forEach(function (pre) {
    src.forEach(function (s) {
      var bkey = pre + (s.key || s.name);
      out.push(BK_LS.day + bkey);
      out.push(BK_LS.wm + bkey, BK_LS.anch + bkey,
               BK_LS.sig + BK_ANCHOR_PREFIX + bkey, BK_LS.sig + BK_DIFF_PREFIX + bkey);
    });
  });
  return out;
}
function bkOwns(k) {
  var rest = null, fams = Object.keys(BK_LS), i, pres;
  for (i = 0; i < fams.length; i++) {
    if (k.indexOf(BK_LS[fams[i]]) === 0) { rest = k.slice(BK_LS[fams[i]].length); break; }
  }
  if (rest === null) return false;
  if (rest.indexOf(BK_ANCHOR_PREFIX) === 0) rest = rest.slice(BK_ANCHOR_PREFIX.length);
  else if (rest.indexOf(BK_DIFF_PREFIX) === 0) rest = rest.slice(BK_DIFF_PREFIX.length);
  pres = _bkPrefixes();
  for (i = 0; i < pres.length; i++) if (rest.indexOf(pres[i] + self.APP.prefix) === 0) return true;
  return false;
}
lsSpace({ keys: bkKeys, owns: bkOwns });
// נשמרת כמחרוזת ומושווית בשרת בטיפוס העמודה — bigint ו-timestamptz עוברים שניהם ב-gte כמות שהם.
function _bkMarkKey(bkey) { return BK_LS.wm + bkey; }
function _bkSetMark(bkey, v) {
  if (v == null) return;
  lsSet(_bkMarkKey(bkey), String(v));
  lsSet(BK_LS.anch + bkey, String(Date.now()));
}
// המקסימום נגזר מהשורות ולא מהשרת — מספר מושווה מספרית ומחרוזת לקסיקוגרפית: bigint היה נשבר בהשוואת מחרוזות.
function _bkMaxTs(rows, col) {
  var mx = null;
  for (var i = 0; i < rows.length; i++) {
    var v = rows[i] ? rows[i][col] : null;
    if (v == null) continue;
    if (mx === null) { mx = v; continue; }
    if (typeof v === 'number' ? v > mx : String(v) > String(mx)) mx = v;
  }
  return mx;
}
function _bkLayer(bkey, s) {
  var wm = lsGet(_bkMarkKey(bkey), '');
  var at = parseInt(lsGet(BK_LS.anch + bkey, '0'), 10) || 0;
  if (!s || !s.ts || !wm || !at || (Date.now() - at) >= BK_ANCHOR_MS)
    return { diff: false, prefix: BK_ANCHOR_PREFIX, key: bkey, win: null };
  return { diff: true, prefix: BK_DIFF_PREFIX, key: bkey,
           win: { col: s.ts, from: wm } };
}
// תשובה שנחתכה נראית בדיוק כמו שלמה — לכן אימות מול מונה השרת, ואי-התאמה מחזירה null ואינה שומרת חצי גיבוי.
async function _bkReadRows(c, s, win) {
  var sel = s.cols || '*';
  var rows = await _rowsPaged(function () {
    var q = c.from(s.name).select(sel);
    if (s.eq) q = q.eq(s.eq[0], s.eq[1]);
    return q;
  }, s.order || null, win);
  if (!rows) return null;
  try {
    var cq = c.from(s.name).select(sel, { count: 'exact', head: true });
    if (s.eq) cq = cq.eq(s.eq[0], s.eq[1]);
    if (win && win.col) {
      if (win.from) cq = cq.gte(win.col, win.from);
      if (win.to) cq = cq.lte(win.col, win.to);
    }
    var cr = await withTimeout(cq);
    if (!cr || cr.error || typeof cr.count !== 'number') return null;
    if (cr.count !== rows.length) {
      console.error('[bk] הגיבוי נחתך — ' + s.name + ': נמדדו ' + rows.length +
                    ' שורות והשרת מדווח ' + cr.count);
      return null;
    }
  } catch (e) { return null; }
  return rows;
}
// ── הגיבוי היומי ──
// מחזירה true רק כשכל המקורות גובו, או דולגו כבלתי-משתנים.
async function bkMaybeDaily() {
  if (_bkRunning) return false;
  var c = _bkClient();
  if (!c) return false;
  var flag = _bkCfg('flagKey', null);
  if (!flag) return false;
  var today = dayToday();
  if (lsGet(flag, '') === today) return false;
  var src = _bkCfg('sources', []) || [];
  if (!src.length) return false;
  _bkRunning = true;
  var ok = true, wrote = 0, same = 0, failed = [];
  try {
    var pre = _bkCfg('prefix', '') || '';
    var secrets = _bkSecrets();
    for (var i = 0; i < src.length; i++) {
      var s = src[i];
      // מקור-טבלה שמפתחו מתנגש במקור אחר באותו שם מקבל מפתח גיבוי משלו.
      var bkey = pre + (s.key || s.name);
      // דגל-יום פר-מקור: הדגל הגלובלי נכתב רק כשכולם הצליחו, ובלעדיו מקור אחד שנכשל
      // גורם לגבות מחדש את כל השאר בכל עלייה באותו יום.
      var dayKey = BK_LS.day + bkey;
      if (lsGet(dayKey, '') === today) { same++; continue; }
      // Supabase מחזיר 1,000 שורות כברירת מחדל בלי שגיאה — בלי עימוד טבלה גדולה מגובה עד התקרה בלבד, בשקט.
      var layer = _bkLayer(bkey, s);
      var rows = await _bkReadRows(c, s, layer.win);
      if (rows === null) { ok = false; failed.push(bkey); continue; }
      bkey = layer.prefix + bkey;
      // שורה שמפתחה (secretField, ברירת מחדל key) ברשימת הסודות אינה מגיעה לגיבוי, גם כשהיא עדיין במקור.
      if (secrets.length) rows = rows.filter(function (r) {
        return secrets.indexOf(r && r[s.secretField || 'key']) === -1;
      });
      // דיפרנציאלי ריק אינו נכתב ואינו כישלון — עותק ריק בכל לילה מציף את הפינוי.
      if (layer.diff && !rows.length) { same++; continue; }
      var val = JSON.stringify(rows);
      // סימן העוגן נכתב רק אחרי שהעוגן נשמר — סימן שקדם לכתיבה שנכשלה פותח דיפרנציאלי בלי עוגן מתחתיו.
      var mark = (!layer.diff && s.ts) ? _bkMaxTs(rows, s.ts) : null;
      var sig = bkSig(val), sigKey = BK_LS.sig + bkey;
      if (lsGet(sigKey, '') === sig) { if (mark != null) _bkSetMark(layer.key, mark); same++; continue; }
      var ins = await c.from(BK_TABLE).insert({ key: bkey, value: val });
      if (!ins || ins.error) { ok = false; failed.push(bkey); continue; }
      if (mark != null) _bkSetMark(layer.key, mark);
      lsSet(sigKey, sig);
      lsSet(dayKey, today);
      wrote++;
    }
    if (ok) {
      lsSet(flag, today);
      logAction('backup', null, wrote, { date: today, scope: pre || null, wrote: wrote, unchanged: same });
    } else {
      // בלי כתיבת הדגל הגלובלי — דגל שנכתב לפני ההצלחה מדלג על יממה שלמה; המקורות שהצליחו נושאים דגל-יום משלהם,
      // ולכן הניסיון החוזר מכוון למי שנכשל בלבד. failed נושא את שמות המקורות — אחרת «נכשל» הוא מספר בלי מען.
      logAction('backup_fail', null, wrote, { date: today, scope: pre || null, wrote: wrote, unchanged: same, failed: failed });
      console.warn('[bk] מקורות שנכשלו: ' + (failed.join(', ') || '?') + ' — ייבחנו שוב בהזדמנות הבאה');
    }
  } catch (e) { ok = false; }
  _bkRunning = false;
  return ok;
}

// ── נקודת ההפעלה ──
// שתי הקריאות אינן ב-await — העלייה אינה ממתינה לרשת, וכל כשל נבלע בתוך המודול.
// מאזין online אחד נדרך כאן — בלעדיו תור היומן שנצבר בלי רשת מחכה לפתיחה הבאה.
var _bkWired = false;
function bkBoot() {
  try { bkMaybeDaily(); } catch (e) { }
  try { logFlush(); } catch (e) { }
  if (_bkWired || typeof window === 'undefined') return;
  _bkWired = true;
  try { window.addEventListener('online', function () { logFlush(); }); }
  catch (e) { console.warn('[bk] online', e); }
}

// ייצוא בשם ולא default — שם שנעלם נשבר בטעינה, ו-default היה נבלע בשקט.
export { bkBoot, logAction, logAwait, logFlush };
