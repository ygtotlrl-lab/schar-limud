/* ═══ core/backup.js — הגיבוי ═══════════════════════════════════════════
   ⭐ הגיבוי היומי מנקודת העלייה, ויומן הפעולות.
   השורות: «`bk` — גיבוי יומי: מתי ואיך» · «יומן הפעולות — `sh_sync_log`»
   ⛔ המודול זהה בית-לבית בכל ריפו שנושא אותו — ⚠️ והתצורה פר-אפליקציה
      נמסרת ב-`appConfigure` שבראש `index.html`, ⭐ ואינה כתובה כאן.
   ⛔ ושינוי כאן — בכל הריפו שנושאים אותו, באותו סבב.
   ════════════════════════════════════════════════════════════════════ */

import { app, dayToday, withTimeout } from './util.js';
import { _rowsPaged } from './sync.js';
import { lsGet, lsSet } from './storage.js';

/* ═══ גיבוי יומי ויומן פעולות — מודול משותף ═══════════════════════════════
   ══════════════════════════════════════════════════════════════════════ */
var BK_TABLE = 'sh_backup';       // יומן הגיבויים — הכתיבה היא insert בלבד
var BK_LOG_TABLE = 'sh_sync_log';    // יומן הפעולות — insert בלבד
var BK_LOG_MAX = 50;              // תקרת התור המקומי של היומן
var BK_RETENTION_DAYS = 30;       // עותק יומי נשמר 30 יום; ישן מזה נגרע
var _bkRunning = false;           // נעילת ריצה (החליפה את הכתיבה-מראש)

function _bkVal(v) { return (typeof v === 'function') ? v() : v; }
function _bkCfg(name, dflt) {
  try {
    if (typeof app.BK_CFG === 'undefined' || app.BK_CFG[name] === undefined) return dflt;
    return _bkVal(app.BK_CFG[name]);
  } catch (e) { return dflt; }
}
function _bkClient() { try { return app.BK_CFG.client(); } catch (e) { return null; } }

// רשימת הסודות (`BK_CFG.secrets`) — מפתח או שדה שברשימה אינו נכתב לגיבוי
// לעולם; המנגנון נשאר דרוך גם כשהרשימה ריקה.
function _bkSecrets() {
  var s = _bkCfg('secrets', []);
  return Array.isArray(s) ? s : [];
}

// חתימת תוכן לגיבוי הדיפרנציאלי — אורך + FNV-1a. אינה סוד ואינה אימות,
// רק "האם זה אותו ערך בדיוק".
function bkSig(s) {
  var str = String(s == null ? '' : s), h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return str.length + ':' + h.toString(16);
}

/* ── יומן הפעולות ──────────────────────────────────────────────────────── */
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
/*  ⛔ כשל כתיבה נרשם ואינו נבלע — ⚠️ הכתיבה נכשלת כפי שנכשלה,
 *  אבל היא מפסיקה להיות שקטה: ⭐ `catch` ריק סביב כתיבה הוא בדיוק המצב
 *  שבו נתון נעלם ואיש אינו יודע. ⛔ והרישום אינו משנה את הזרימה — ⚠️ תיעוד
 *  אבחון שמפיל שמירה גרוע מהיעדרו. */
function _bkWriteFail(where, e) {
  try { console.warn('[write-fail] ' + where, (e && e.message) ? e.message : e); } catch (e0) { }
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
// רישום fire-and-forget. ⛔ לעולם אינו חוסם ואינו מפיל את המסלול שקרא לו
// — תיעוד אבחון שמפיל כניסה או שמירה גרוע מהיעדרו.
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
// שליחת מה שהצטבר באופליין. נקראת כשיש ראיה שהרשת עובדת.
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

/*  ⛔⛔ שלוש שכבות הגיבוי — ⭐ **עוגן** מלא אחת לשבוע, ⚠️ **דיפ**
 *  בכל שאר הימים (רק שורות שהחותמת שלהן חדשה מהעוגן), ⛔ **והפינוי הקיים**
 *  אוכף את התקרות. ⚠️ הנימוק המדוד: גיבוי מלא בכל לילה של טבלה בת עשרות
 *  אלפי שורות הוא מגה-בייטים ביום, ⭐ ועוגן שבועי ודיפים קטנים נותנים את
 *  אותה יכולת שחזור בשבריר. */
var BK_ANCHOR_MS = 7 * 24 * 60 * 60 * 1000;
var BK_ANCHOR_PREFIX = 'ANCHOR:';
var BK_DIFF_PREFIX = 'DIFF:';
/*  ⛔ חותמת המים של העוגן — ⚠️ נשמרת כמחרוזת, ⭐ ומושווית בשרת בטיפוס
 *  העמודה: ⛔ `bigint` ו-`timestamptz` שניהם עוברים ב-`gte` כמות שהם. */
function _bkMarkKey(bkey) { return 'bk_wm_' + bkey; }
function _bkSetMark(bkey, v) {
  if (v == null) return;
  lsSet(_bkMarkKey(bkey), String(v));
  lsSet('bk_anch_' + bkey, String(Date.now()));
}
/*  ⛔ המקסימום נגזר מהשורות ⛔ ואינו נשאל מהשרת — ⚠️ מספר מושווה מספרית
 *  ומחרוזת לקסיקוגרפית: ⭐ חותמת ISO ממוינת נכון כמחרוזת, ⛔ ו-`bigint`
 *  היה נשבר בהשוואת מחרוזות. */
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
/*  ⛔ איזו שכבה רצה היום — ⚠️ עוגן כשאין חותמת מים, כשאין חותמת עוגן,
 *  או כשעברו שבעה ימים; ⭐ ובכל שאר הימים דיפ מעל חותמת המים. */
function _bkLayer(bkey, s) {
  var wm = lsGet(_bkMarkKey(bkey), '');
  var at = parseInt(lsGet('bk_anch_' + bkey, '0'), 10) || 0;
  if (!s || !s.ts || !wm || !at || (Date.now() - at) >= BK_ANCHOR_MS)
    return { diff: false, prefix: BK_ANCHOR_PREFIX, key: bkey, win: null };
  return { diff: true, prefix: BK_DIFF_PREFIX, key: bkey,
           win: { col: s.ts, from: wm } };
}
/*  ⛔⛔ הקריאה בעימוד, ⛔ ואימות מול מונה השרת — ⚠️ תשובה שנחתכה נראית
 *  בדיוק כמו תשובה שלמה, ⭐ והדרך היחידה לדעת היא לשאול את השרת כמה שורות
 *  יש: ⛔ אי-התאמה מחזירה `null` ⛔ ונכשלת בקול, ⚠️ ואינה שומרת חצי גיבוי. */
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
/* ── הגיבוי היומי ──────────────────────────────────────────────────────── */
// מחזירה true רק כשכל המקורות גובו (או דולגו כבלתי-משתנים) בהצלחה.
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
    var secrets = _bkSecrets(), dailyKeys = [];
    for (var i = 0; i < src.length; i++) {
      var s = src[i], val = null;
      // ⛔ מפתח שברשימת הסודות אינו נכתב לגיבוי לעולם —
      //    admin_pass שרד בגיבויים אחרי שנמחק מהמקור, ונוקה ידנית.
      if (s.kind === 'kv' && secrets.indexOf(s.name) !== -1) continue;
      // ⭐ `key` פר-מקור — מקור-טבלה שמפתחו היה מתנגש במקור
      //    ה-kv ההיסטורי באותו שם מקבל מפתח גיבוי משלו. הרשימה שנצברת
      //    כאן היא רשימת-ההיתר של הגריעה — בלי תלות בהצלחת המקור.
      var bkey = pre + (s.key || s.name);
      dailyKeys.push(bkey);
      /*  ⛔ שתי השכבות נכנסות לרשימת-ההיתר של הגריעה — ⚠️ מפתח
       *  שאינו שם אינו מתפנה לעולם, ⭐ ו-`ANCHOR:`/`DIFF:` הם מפתחות
       *  חדשים: ⛔ בלעדיהם הם היו נצברים בלי גבול. */
      if (s.kind !== 'kv') {
        dailyKeys.push(BK_ANCHOR_PREFIX + bkey);
        dailyKeys.push(BK_DIFF_PREFIX + bkey);
      }
      /* ⭐ דגל-יום פר-מקור — מקור שכבר גובה היום מדולג, גם
         כשהדגל הגלובלי לא נכתב. ⛔ בלעדיו מקור אחד שנכשל החזיק את כל
         השאר בלולאה: הדגל הגלובלי נכתב רק כשכולם הצליחו, ולכן כל עלייה
         גיבתה מחדש את מה שכבר גובה, שוב ושוב באותו יום.
         ⚠️ הדחיפה ל-`dailyKeys` קודמת לדילוג בכוונה: הרשימה היא
         רשימת-ההיתר של הגריעה, ומפתח שנופל ממנה אינו מתפנה לעולם. */
      var dayKey = 'bk_day_' + bkey;
      if (lsGet(dayKey, '') === today) { same++; continue; }
      if (s.kind === 'kv') {
        var res = await c.from(s.table).select('value').eq('key', s.name).maybeSingle();
        if (!res || res.error) { ok = false; failed.push(bkey); continue; }
        val = (res.data && res.data.value != null) ? String(res.data.value) : null;
      } else {
        /*  ⛔⛔ שכבת הגיבוי — עוגן שבועי מלא, ודיפרנציאלי בכל שאר הימים:
         *  ⚠️ הנימוק המדוד — הקריאה הייתה בקשה **אחת** בלי
         *  עימוד, ⛔ ו-Supabase מחזיר 1,000 שורות כברירת מחדל **בלי
         *  שגיאה**: ⭐ טבלה גדולה מהתקרה גובתה עד התקרה, ⛔ וכל השאר
         *  מעולם לא גובה — ⚠️ והכשל היה שקט לחלוטין. */
        var layer = _bkLayer(bkey, s);
        var rows = await _bkReadRows(c, s, layer.win);
        if (rows === null) { ok = false; failed.push(bkey); continue; }
        bkey = layer.prefix + bkey;
        // ⛔ שדה-סוד בשורות טבלה מסונן לפני הסריאליזציה —
        //    שורה שמפתחה (`secretField`, ברירת מחדל `key`) ברשימת הסודות
        //    אינה מגיעה לגיבוי, גם כשהיא עדיין קיימת במקור.
        if (secrets.length) rows = rows.filter(function (r) {
          return secrets.indexOf(r && r[s.secretField || 'key']) === -1;
        });
        /*  ⛔ דיפרנציאלי ריק אינו נכתב ⛔ ואינו כישלון — ⚠️ יום שלא השתנה
         *  בו דבר הוא המצב הרגיל, ⭐ ועותק ריק בכל לילה מציף את הפינוי. */
        if (layer.diff && !rows.length) { same++; continue; }
        val = JSON.stringify(rows);
        if (!layer.diff && s.ts) _bkSetMark(layer.key, _bkMaxTs(rows, s.ts));
      }
      // מקור שאין לו ערך בענן — אין מה לגבות, וזה אינו כישלון.
      if (val == null) continue;
      var sig = bkSig(val), sigKey = 'bk_sig_' + bkey;
      if (lsGet(sigKey, '') === sig) { same++; continue; }
      var ins = await c.from(BK_TABLE).insert({ key: bkey, value: val });
      if (!ins || ins.error) { ok = false; failed.push(bkey); continue; }
      lsSet(sigKey, sig);
      lsSet(dayKey, today);
      wrote++;
    }
    /* ⭐ הגריעה אינה מותנית עוד בהצלחת **כל** המקורות — היא רצה
       על רשימת-ההיתר המלאה בכל פעם שנכתב עותק חדש. ⛔ הכריכה הישנה היא
       ששיתקה אותה: מקור אחד שנכשל מנע גריעה של כל השאר, וזה שורש מצבור
       ה-503 השורות שנוקה ב-26.8. ⚠️ והיא עדיין רצה **אחרי** הכתיבה, כדי
       שלא ייגרע עותק ישן לפני שהחדש נכתב. */
    if (wrote) { try { await _bkRetention(c, dailyKeys); } catch (e2) { } }
    if (ok) {
      lsSet(flag, today);
      logAction('backup', null, wrote, { date: today, scope: pre || null, wrote: wrote, unchanged: same });
    } else {
      /* ⛔ בלי כתיבת הדגל הגלובלי — ההזדמנות הבאה באותו יום תנסה שוב:
         גיבוי שנכשל ודילג על יממה שלמה הוא בדיוק
         מה שהדגל שנכתב-מראש גרם. ⚠️ ומה שכן השתנה: המקורות
         שהצליחו נושאים דגל-יום משלהם ואינם נגבים שוב, ולכן הניסיון החוזר
         מכוון למי שנכשל בלבד. ⛔ וכשל חלקי מדווח ואינו נבלע — `failed`
         נושא את שמות המקורות, אחרת «נכשל» היה מספר בלי מען. */
      logAction('backup_fail', null, wrote, { date: today, scope: pre || null, wrote: wrote, unchanged: same, failed: failed });
      console.warn('[backup] מקורות שנכשלו: ' + (failed.join(', ') || '?') + ' — ייבחנו שוב בהזדמנות הבאה');
    }
  } catch (e) { ok = false; }
  _bkRunning = false;
  return ok;
}

/* ── מדיניות השמירה — גריעת עותקים יומיים ישנים מ-30 יום ──────────────── */
// ⛔ הגריעה מוגבלת ב-`in('key', keys)` לרשימת המפתחות היומיים של
//    האפליקציה הנוכחית בלבד — רשימת-היתר, לא קידומת:
//    רק מפתחות האפליקציה הנוכחית מועמדים.
// ⚠️ נכשלת סגור: `error` (כולל היעדר הרשאת DELETE) מוחזר כאפס
//    בשקט, בלי להפיל את הגיבוי ובלי רישום-סרק יומי ליומן הראיות.
async function _bkRetention(c, keys) {
  if (!c || !Array.isArray(keys) || !keys.length) return 0;
  var cutoff = new Date(Date.now() - BK_RETENTION_DAYS * 86400000).toISOString();
  var del = await c.from(BK_TABLE)['delete']().in('key', keys).lt('created_at', cutoff).select('id');
  if (!del || del.error || !Array.isArray(del.data)) return 0;
  var n = del.data.length;
  if (n > 0) logAction('retention', null, n, { days: BK_RETENTION_DAYS, keys: keys.length });
  return n;
}

/* ── נקודת ההפעלה היחידה ─────────────────────────────────────────────── */
// ⛔ זו הקריאה היחידה שקוד האפליקציה עושה למודול — היא
//    יושבת בפונקציית העלייה, לצד `lsBoot()` ו-`pendBoot()`, ולעולם לא
//    במסלול דחיפה/סנכרון.
// ⚠️ שתי הקריאות אינן ב-`await` ואינן חוסמות: העלייה אינה ממתינה לרשת,
//    וכל כשל נבלע בשקט בתוך המודול.
// ⛔ ותור היומן נשלח גם בחזרת הרשת, ממאזין אחד שנדרך כאן — ⚠️ בלעדיו תור
//    שנצבר בלי רשת מחכה לפתיחה הבאה, ⭐ ואין אפליקציה שמאזינה לו בעצמה.
var _bkWired = false;
function bkBoot() {
  try { bkMaybeDaily(); } catch (e) { }
  try { logFlush(); } catch (e) { }
  if (_bkWired || typeof window === 'undefined') return;
  _bkWired = true;
  try { window.addEventListener('online', function () { logFlush(); }); }
  catch (e) { console.warn('[bk] online', e); }
}
/* ═══════════════ סוף מודול הגיבוי היומי ═══════════════════════════════ */

/*  ⛔ הייצוא בשם ⛔ ואינו `default` — ⚠️ קורא שמייבא שם שנעלם נשבר בטעינה,
 *  ⭐ ו-`default` היה נבלע בשקט. */
export { bkBoot, logAction, logFlush };
