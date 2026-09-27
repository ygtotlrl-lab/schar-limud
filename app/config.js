// app/config.js — התצורה, שמות הטבלאות והמחרוזות
import { MSG_OFF_USER_WRITE, appConfigure, dayToday, getDeviceId, withTimeout } from '../core/util.js';
import { _eraPush, ctxEpoch, ctxStale, eraKeys, pendCount, pendHas } from '../core/sync.js';
import { lsClearHorizons, lsRemove } from '../core/storage.js';
import { MIRROR, mirrorKey, mirrorTables, mirrorWrite } from '../core/mirror.js';
import { authUsersTable, sessActive, sessGet, sessSet } from '../core/auth.js';
import { toast } from '../core/ui.js';
import { S } from './state.js';
import { SL_NEVER_MIRROR_SETTINGS, _slMarkPushed, _slPushOf, _slPushedFor, _slRowId,
         _slVerify, acadYearOf, pendTxnKey, slDirtyRows, slIsAdmin, slKey, slKeyOf,
         slSanitizeRows, slSendRows, slTs, syncAll } from './domain.js';
import { doLogout, slResolveUser } from './screens/login.js';
import { renderSettingsLists } from './screens/settings.js';
import { renderScAnnual } from './screens/student.js';
import { renderTxnLog } from './screens/txn.js';
import { DOM_ACTIONS, SB, saveRefresh } from './main.js';

// התצורה נמסרת בשומרי קריאה — חלקה מוגדר בהמשך, והשומר קורא אותה בזמן הקריאה ולא בזמן המסירה.
appConfigure({
  get BK_CFG() { return BK_CFG; },
  get DATA_ERA() { return DATA_ERA; },
  get DEV_CFG() { return DEV_CFG; },
  get DOM_ACTIONS() { return DOM_ACTIONS; },
  get ERA_CFG() { return ERA_CFG; },
  get HW_CFG() { return HW_CFG; },
  get LK_CFG() { return LK_CFG; },
  get LS_CFG() { return LS_CFG; },
  get MIRROR_CFG() { return MIRROR_CFG; },
  get PEND_CFG() { return PEND_CFG; },
  get PL_CFG() { return PL_CFG; },
  get PUSH_CFG() { return PUSH_CFG; },
  get RTY_CFG() { return RTY_CFG; },
  get TOAST_DEFAULT_MS() { return TOAST_DEFAULT_MS; },
  get USER_CFG() { return USER_CFG; },
  get saveRefresh() { return saveRefresh; }
});

// הערך זהה במקרה ל-LS_SUCCESS_MUTE_MS, אך הוא מושג אחר (משך תצוגה מול חלון השתקה) — אין לאחד
var TOAST_DEFAULT_MS = 2400;

// ── הודעות ועוזרי רשת ──
// MSG_OFFLINE ו-MSG_BAD_LOGIN נבדלים פר-אפליקציה בהחלטת מנהל, ולכן אינם במודול המשותף
var MSG_BAD_LOGIN = 'שם משתמש או סיסמה שגויים';

// ── הודעות פר-אפליקציה ──
var MSG_NO_USER_RELOGIN = '⚠️ אין משתמש מחובר — נא להיכנס מחדש';

var MSG_PASS_UPDATED = '✅ הסיסמה עודכנה';

var MSG_PASS_UPDATED_NO_FP2 = '⚠️ הסיסמה עודכנה — אך ללא הכנה לכניסה ללא רשת';

var MSG_LOAD_FAIL_POST = ') — המוצג הוא העותק שבמכשיר';

var MSG_PICK_STUDENT_PLAIN = 'נא לבחור תלמיד';

var MSG_PICK_DATE = 'נא לבחור תאריך';

var MSG_NEED_AMOUNT = 'נא להזין סכום תקין';

var MSG_PAY_SAVE_FAIL = '❌ השמירה במכשיר נכשלה — התשלום לא נשמר';

var MSG_PAY_MISSING = '⚠️ התשלום לא נמצא';

var MSG_DEL_NOT_SAVED = '❌ המחיקה לא נשמרה במכשיר';

var MSG_PAY_DELETED = '✅ תשלום נמחק';

var MSG_CHANGE_NOT_SAVED = '❌ השינוי לא נשמר במכשיר';

var MSG_STUDENT_ON = '✅ תלמיד הופעל';

var MSG_STUDENT_OFF = '✅ תלמיד הושהה';

var MSG_START_MONTH_BAD = '❌ חודש הצטרפות לא תקין — פורמט YYYY-MM';

var MSG_END_MONTH_BAD = '❌ חודש עזיבה לא תקין — פורמט YYYY-MM';

var MSG_END_BEFORE_START = '❌ חודש העזיבה מוקדם מחודש ההצטרפות';

var MSG_NAME_REQUIRED = 'שם חובה';

var MSG_STUDENT_MISSING2 = '⚠️ התלמיד לא נמצא';

var MSG_TUITION_POSITIVE = '❌ שכר לימוד חייב להיות מספר חיובי';

var MSG_DEBT_POSITIVE = '❌ חוב קודם חייב להיות מספר חיובי';

var MSG_SETTINGS_NOT_SAVED = '❌ ההגדרות לא נשמרו במכשיר';

var MSG_VALUE_BAD = 'ערך לא תקין';

var MSG_VALUE_SAVE_FAIL = '❌ השמירה במכשיר נכשלה — הערך לא נשמר';

var MSG_VALUE_EXISTS = '⚠️ הערך כבר קיים ברשימה';

var MSG_ITEM_SAVE_FAIL = '❌ השמירה במכשיר נכשלה — הפריט לא נוסף';

var MSG_CREDIT_ITEM_LOCKED = '» הוא סעיף מערכת ואינו נמחק — בלעדיו אי אפשר לרשום ניצול יתרת זכות';

var MSG_ITEM_MISSING = '⚠️ הפריט לא נמצא';

var MSG_DELETED_OK = '✅ נמחק';

var MSG_ADD_STUDENT = 'הוספת תלמיד';

var MSG_STUDENT_SAVE_FAIL = '❌ השמירה במכשיר נכשלה — התלמיד לא נשמר';

var MSG_STUDENT_DELETED = '✅ תלמיד נמחק';

var MSG_CONFIRM = 'אישור';

var MSG_DEL_TXN_TITLE = 'מחיקת תשלום';

var MSG_DEL_TXN_BODY = 'למחוק תשלום זה?';

var MSG_DEL_ITEM_TITLE = 'מחיקת פריט';

var MSG_DEL_ITEM_BODY = 'למחוק פריט זה?';

var MSG_DEL_STUDENT_TITLE = 'מחיקת תלמיד';

var MSG_DEL_STUDENT_PRE = 'למחוק את ';

var MSG_DEL_STUDENT_ANON = 'תלמיד';

var MSG_DEL_STUDENT_POST = '? התלמיד יוסר מהרשימות; רשומות התשלומים שלו יישמרו במערכת.';

// ── עמידות אחסון מקומי ──
var KV_TABLE = 'sl_settings';

// ── MIRROR_CFG ──
// tables היא פונקציה ולא מערך — PUSH_TABLES מוצהר אחרי הבלוק, וקריאה כאן הייתה מקבלת undefined
var MIRROR_CFG = {
  prefix: self.APP.prefix + 'mirror_',
  app:    self.APP.prefix,
  tables: function () { return PUSH_TABLES.concat([authUsersTable()]); },
  noPush: [{ t: 'sl_users', via: 'writeUser', adds: 'secret' }],
  empty:  function () { return []; },
  ts:     function (r) { return slTs(r); },
  clean:  function (t, rows) { return slSanitizeRows(t, rows); },
  fail:   function (where, e) { console.error('[mirror] ' + where, e); },
};

// ── מדיניות האחסון המקומי ──
var LS_CFG = {
  // cachePrefix נגזר משם האפליקציה שבתצורה ולא מקידומת האחסון — שם אחסון שישתנה היה מחזיר רשימה ריקה, והבאנר היה חוזר בכל טעינה.
  cachePrefix: self.APP.id + '-',
  logKey: 'sl_ls_log',
  hzPrefix: 'sl_ls_hz_',
  // חובה בתחילית האפליקציה — ה-origin משותף, וסימן בלי תחילית נדרס בכל דחייה.
  dismissKey: 'sl_sw_dismissed',
  // מפתח שאינו במרשם נמחק בעלייה.
  keys: function () {
    return [LS_CFG.logKey, LS_CFG.dismissKey, DEV_CFG.key, PEND_CFG.key,
            BK_CFG.flagKey, BK_CFG.logQueueKey]
      .concat(eraKeys(), mirrorTables().map(mirrorKey));
  },

  // חלון הפינוי נגזר מסוג האפליקציה — אין מספר ימים באף רשומה.
  appType: { type: 'annual', why: 'החישוב שלה נפרש על שנה — ⚠️ דרישה, שולם ויתרה לתלמיד נסכמים מכל תנועות שנת הלימודים' },

  // wholeKeys ריק בכוונה — ההגדרות והרשימות קבועות בגודלן, ומחיקת מפתח שלם מרוקנת את המסך אופליין
  wholeKeys: [],
  // החותמת היא updated_at, אותה שהמראה מסננת בה את האופק — שתי חותמות היו מוחקות תנועה שלא פונתה
  oldRecords: [
    { key: mirrorKey('sl_transactions'), label: 'תנועות', ts: slTs,
      idOf: _slRowId, syncedThrough: _slPushedFor('sl_transactions'), verify: _slVerify(function () { return SB.from('sl_transactions').select('client_id,updated_at'); }) }
  ],
  // טבלה שגדלה ואינה בפינוי ממלאת אחסון של origin משותף — לכן כאן רק טבלה קבועה בגודלה, עם נימוקה.
  fixedSize: [
    { t: 'sl_students', why: 'תלמידים — שורה לתלמיד, ⛔ והם אבות התנועות שנשארות' },
    { t: KV_TABLE,      why: 'הגדרות — שורה למפתח, ⛔ ומספר המפתחות קבוע בקוד' },
    { t: 'sl_lists',    why: 'רשימות בחירה — פריטים שנערכים בהגדרות, ⛔ ואינם גדלים עם התנועות' },
    { t: 'sl_users',    why: 'משתמשים — שורה למשתמש, ⚠️ והיא מסלול הכניסה האופליין' }
  ],

  // ספק נחשב «יש ממתין» — ואז אין פינוי כלל
  pending: function () { try { return pendCount() > 0; } catch (e) { return true; } },
  // 0 בכוונה — sl_synced_at היא חותמת משיכה, ופינוי שנשען עליה מוחק רשומה שמעולם לא עלתה; העֵד הוא _slPushedAt פר-מפתח
  syncedThrough: function () { return 0; }
};

// ── BK_CFG ──
// sl_users אינה ברשימה — sh_backup קריא ל-anon, וגיבוי שלה היה מעתיק את pass_salt ו-pass_fp למקום שני
// שחזור משתמשים נעשה ידנית מלוח הבקרה
var BK_CFG = {
  client: function () { return SB; },
  flagKey: 'sl_last_backup',
  logQueueKey: 'sl_log_queue',
  prefix: '',
  device: function () { try { return getDeviceId(); } catch (e) { return null; } },
  user: function () { try { var u = sessGet(); return (u && u.username) ? u.username : null; } catch (e) { return null; } },
  // סוד שנכתב לגיבוי שורד בו גם אחרי שנמחק מהמקור — ולכן רשימת הסודות של הגיבוי היא רשימת המראה
  secrets: function () { return SL_NEVER_MIRROR_SETTINGS; },
  // שליפה בעמודים חייבת סדר יציב — בלי ORDER BY פוסטגרס אינו מבטיח אותו
  // אין כאן id: order על עמודה שאינה בסכימה מחזיר 42703, שנקרא «סכימה מיושנת» ומציג באנר עדכון
  sources: function () {
    return [
      { kind: 'table', name: 'sl_students',     order: 'client_id', ts: 'updated_at' },
      { kind: 'table', name: 'sl_transactions', order: 'client_id', ts: 'updated_at' },
      { kind: 'table', name: KV_TABLE,          order: 'key',       ts: 'updated_at' },
      { kind: 'table', name: 'sl_lists',        order: 'client_id', ts: 'updated_at' }
    ];
  }
};

// ── PEND_CFG ──
var PEND_CFG = {
  app: 'schar-limud', key: 'sl_pending',
  // סימון שקידומתו אינה כאן יורד בעלייה — אין לו כותב ואין שורה שתידחף ותוריד אותו
  marks: function () { return PUSH_TABLES.map(function (t) { return _slPushOf(t).pk; }); },
  // בתום ההחזקה, תגית ממתין שנותרה צריכה להיכנס לשורות שכבר צוירו בלעדיה
  // renderScAnnual אינה מאפסת את שדות העריכה של הכרטיס; כל מצייר עטוף לחוד, וכשל באחד אינו מפיל את השאר
  redraw: function () {
    try { renderTxnLog(); } catch (e) { }
    try { renderScAnnual(); } catch (e) { }
    try { renderSettingsLists(); } catch (e) { }
  }
};

// ── RTY_CFG ──
// הריקון הוא syncAll עצמה — אין ליצור פונקציית דחיפה נפרדת: דחיפה בלי משיכה שקדמה לה מחזירה לחיים שורה שנמחקה במכשיר אחר
var RTY_CFG = {
  flush:   function () { return syncAll(); },
  pending: function () { try { return pendCount() > 0; } catch (e) { return false; } },
};

// ── LK_CFG ──
// אין להוסיף כאן הודעה משלה — חלון האזהרה של הליבה הוא ההודעה
var LK_CFG = {
  active: function () { return sessActive(); },
  lock:   function () { doLogout(); },
};

// ── PL_CFG ──
// שורת החותמת מוחרגת מהמראה ב-slStripMeta — דחיפת-מצב שלה הייתה מחזירה לענן חותמת ישנה
// ok() אינו נוגע ב-_slLastPullOk — הזנתו משיחה שאינה משיכה מלאה הייתה הופכת חותמת תצוגה לעֵד פינוי
var PL_CFG = {
  every:  3000,
  active: function () { return sessActive(); },
  seen:   function () { return S._slSeenTs; },
  note:   function (ts) { S._slSeenTs = ts; },
  ok:     function () { S._slLastSeenOk = Date.now(); },
  pull:   function () { return syncAll(); },
  client: function () { return SB; },
  table:  function () { return KV_TABLE; },
};

// ── PUSH_CFG ──
// sl_users אינה נדחפת לעולם — המראה מחזיקה טביעות בלבד, ודחיפת-מצב הייתה כותבת סיסמה ריקה; מסלולה writeUser
// סדר הטבלאות שומר על המפתח הזר — תלמידים לפני תנועות
var PUSH_TABLES = ['sl_students', 'sl_transactions', KV_TABLE, 'sl_lists'];

var PUSH_CFG = {
  tables: PUSH_TABLES,
  chunk:  500,
  delay:  400,
  dirty:  function (t, ctx) {
    var c = _slPushOf(t), remote = ctx && ctx[t];
    if (!remote) return null;
    S._slPushEp = ctxEpoch();
    return slDirtyRows(t, remote, function (k) { return pendHas(c.pk + k); });
  },
  key:    function (t, row) { var c = _slPushOf(t); return c.pk + slKeyOf(t, row); },
  send:   function (t, rows) { return slSendRows(t, rows); },
  mark:   function (t) { if (!ctxStale(S._slPushEp)) _slMarkPushed(t); },
  run:    function () { syncAll(); },
};

// ── HW_CFG ──
// החלון הוא גבול שנת לימודים מפורש ולא פינוי לפי גיל — תנועה ישנה שנעלמת משנה סכום כספי
// תנועה בלי תאריך תקין נשארת חמה — ספק אינו מפנה
var HW_CFG = {
  enabled: true,
  admin: function () { return slIsAdmin(); },
  specs: [{
    key: mirrorKey('sl_transactions'),
    label: 'תנועות שנים סגורות',
    inWindow: function (t) {
      var d = t && t.date;
      if (!d) return true;
      var y = acadYearOf(String(d).slice(0, 10));
      if (!isFinite(y)) return true;
      return y >= acadYearOf(dayToday());
    },
    idOf: function (r) { return slKey(r); },
    ts: function (r) { return slTs(r); },
    isPending: function (r) { return pendHas(pendTxnKey(r)); },
    fetch: async function () {
      try {
        var res = await withTimeout(SB.from('sl_transactions').select('*'));
        return (res && !res.error && Array.isArray(res.data))
          ? { ok: true, rows: res.data } : { ok: false, rows: [] };
      } catch (e) { return { ok: false, rows: [] }; }
    },
    rows: function () { return MIRROR.sl_transactions; },
    apply: function (kept) { return mirrorWrite('sl_transactions', kept); }
  }]
};

// ── ERA_CFG ──
// העידן עולה רק בשינוי צורת שורה — שורה ישנה שנדחפת נושאת מפתח שאין לו עמודה, נופלת ב-42703 וחוסמת את התור
var DATA_ERA = 2;

var ERA_CFG = {
  prefix: self.APP.prefix,
  client: function () { return SB; },
  table:  function () { return KV_TABLE; },
  // גם אופק הפינוי נמחק — אופק ששרד מסנן את מה שהמשיכה מחזירה, והמכשיר היה נשאר ריק.
  wipe:   function () {
    mirrorTables().forEach(function (t) { MIRROR[t] = MIRROR_CFG.empty(); lsRemove(mirrorKey(t)); });
    lsClearHorizons();
  },
  // מחזור הסנכרון בונה את מפות הענן, ובלעדיהן שכבת הדחיפה מחזירה «אין ראיה» — ולכן התוצאה נאספת ממנו
  push:   function () { return syncAll().then(function () { return _eraPush; }); },
  refresh: function () { return syncAll(); }
};

var MSG_SET_DENIED  = '🔒 מסך ההגדרות פתוח למשתמשי ניהול בלבד. המשתמש שאיתו נכנסת אינו מוגדר כך — יש לפנות למנהל המערכת.';

// ── כתיבת משתמש ──
var USER_CFG = {
  ready: function () { return !!SB && navigator.onLine; },
  // נקראת בזמן הקריאה ולא בהשמה — הקבוע מוצהר מתחת לבלוק, וקריאה בהשמה נותנת undefined בשקט
  offMsg: function () { return MSG_OFF_USER_WRITE; },
  from: function () { return SB.from(authUsersTable()); },
  run: function (q) { return withTimeout(q); },
  after: function (res) { return res; },
  // המשתמש המחובר מסונכרן מול המראה אחרי שנשמרה — הפוך מזה קורא ערך שטרם נכתב
  refreshed: function () { var cu = sessGet(); if (cu) sessSet(slResolveUser(cu)); },
  revalidated: function (row) { sessSet(slResolveUser(Object.assign({}, sessGet(), row))); },
  logout: function (msg) { doLogout(); toast(msg, null, 'bad'); }
};

// ── אימות אופליין מול הטביעה ──
// «המשתמש אינו בעותק המקומי» ו«אין לו טביעה» אינם «סיסמה שגויה» — הם דורשים חיבור, ולכן הודעה נפרדת לכל אחד
var MSG_NO_USERS      = '⚠️ אין עדיין משתמשים במערכת — יש ליצור משתמש ראשון ב-SQL Editor של Supabase';

// האימות המקוון עובר דרך הטביעה, ולכן המצב קיים גם עם רשת — אין לאחד עם MSG_BAD_LOGIN
// ההודעה נוקבת בשדות ולא ב«סיסמה» — אין עמודת סיסמה, ומה שנקבע ב-SQL Editor הוא הטביעה
var MSG_NO_FP_ONLINE  = '❌ למשתמש הזה אין טביעת סיסמה במערכת — יש לקבוע לו `pass_salt` ו-`pass_fp` ב-SQL Editor של Supabase';

// ── מזהה מכשיר, client_id ונעילה ──
var DEV_CFG = { key: 'sl_device_id' };

export { KV_TABLE, MSG_ADD_STUDENT, MSG_BAD_LOGIN, MSG_CHANGE_NOT_SAVED, MSG_CONFIRM,
         MSG_CREDIT_ITEM_LOCKED, MSG_DEBT_POSITIVE, MSG_DELETED_OK, MSG_DEL_ITEM_BODY,
         MSG_DEL_ITEM_TITLE, MSG_DEL_NOT_SAVED, MSG_DEL_STUDENT_ANON,
         MSG_DEL_STUDENT_POST, MSG_DEL_STUDENT_PRE, MSG_DEL_STUDENT_TITLE,
         MSG_DEL_TXN_BODY, MSG_DEL_TXN_TITLE, MSG_END_BEFORE_START, MSG_END_MONTH_BAD,
         MSG_ITEM_MISSING, MSG_ITEM_SAVE_FAIL, MSG_LOAD_FAIL_POST, MSG_NAME_REQUIRED,
         MSG_NEED_AMOUNT, MSG_NO_FP_ONLINE, MSG_NO_USERS, MSG_NO_USER_RELOGIN,
         MSG_PASS_UPDATED, MSG_PASS_UPDATED_NO_FP2, MSG_PAY_DELETED, MSG_PAY_MISSING,
         MSG_PAY_SAVE_FAIL, MSG_PICK_DATE, MSG_PICK_STUDENT_PLAIN,
         MSG_SETTINGS_NOT_SAVED, MSG_SET_DENIED, MSG_START_MONTH_BAD,
         MSG_STUDENT_DELETED, MSG_STUDENT_MISSING2, MSG_STUDENT_OFF, MSG_STUDENT_ON,
         MSG_STUDENT_SAVE_FAIL, MSG_TUITION_POSITIVE, MSG_VALUE_BAD, MSG_VALUE_EXISTS,
         MSG_VALUE_SAVE_FAIL };
