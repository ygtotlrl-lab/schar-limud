// app/main.js — העלייה, מפת הפעולות והניווט
import { MSG_SAVED, appConfigure, getDeviceId } from '../core/util.js';
import { eraKeys, pendAlertDismiss, pendCount, runSave, sbWatch,
         schedulePush } from '../core/sync.js';
import { lsOpen } from '../core/storage.js';
import { MIRROR, mirrorKey, mirrorTables } from '../core/mirror.js';
import { logAwait } from '../core/backup.js';
import { bootRun } from '../core/boot-run.js';
import { actWire, closeAsk, closeModal, comboFocus, comboInput, comboPick, dragCancel, dragDown,
         dragMove, dragUp, shellBare, swApply, swHideUpdate } from '../core/ui.js';
import { KV_TABLE, PUSH_TABLES, SL_NEVER_MIRROR_SETTINGS } from './constants.js';
import { S, shell } from './state.js';
import { _slPushOf, ensureCreditMethod, slApplyMirror, slKeyOf, slLocalWrite, slLookups,
         slSanitizeRows, slSendRows, syncAll } from './domain.js';
import { dashNextYear, dashPickMonth, dashPrevYear, renderDash,
         screenDashHTML } from './screens/dash.js';
import { addListItem, deleteListItem, deleteStudent, openAddStudent, renderSettingsLists,
         renderSettingsPanel, saveDefaultTuition, saveNewStudent, screenSettingsHTML,
         toggleAcc } from './screens/settings.js';
import { periodDelete, periodOpen, periodSave, renderScAnnual, renderStudentCard,
         saveStudentSettings, scPastShow, scSelectYear, screenStudentHTML,
         toggleStudentActive } from './screens/student.js';
import { deleteTxn, renderTxnLog, saveTxn, screenTxnHTML, txnMethodHint,
         updateDropdowns } from './screens/txn.js';

// ── החיווט ──
// החיווט נמסר בשומרי קריאה — ה-CFG מוגדרים בהמשך, והשומר קורא אותם בזמן הקריאה ולא בזמן המסירה.
appConfigure({
  get BK_CFG() { return BK_CFG; },
  get DEV_CFG() { return DEV_CFG; },
  get DOM_ACTIONS() { return DOM_ACTIONS; },
  get ERA_CFG() { return ERA_CFG; },
  get LOOKUP_CFG() { return LOOKUP_CFG; },
  get LS_CFG() { return LS_CFG; },
  get MIRROR_CFG() { return MIRROR_CFG; },
  get PEND_CFG() { return PEND_CFG; },
  get PL_CFG() { return PL_CFG; },
  get PUSH_CFG() { return PUSH_CFG; },
  get RTY_CFG() { return RTY_CFG; },
  get saveRefresh() { return saveRefresh; }
});

// הרשימות לסידור — השורות והכתיבה של שכר הלימוד, והסידור בליבה; הכתיבה המקומית כבר דורכת את הדחיפה.
var LOOKUP_CFG = {
  rows:   function (kind) { return slLookups(kind); },
  put:    function (row) { slLocalWrite('sl_lookups', row); },
  after:  function () { schedulePush(); },
  render: function () { refreshUI(); }
};

// tables היא פונקציה ולא מערך — PUSH_TABLES מוצהר אחרי הבלוק, וקריאה כאן הייתה מקבלת undefined
var MIRROR_CFG = {
  prefix: self.APP.prefix + 'mirror_',
  tables: function () { return PUSH_TABLES.slice(); },
  // ריק ומוצהר — שדה חסר נקרא «לא נשאל», וריק נקרא «נמדד ואין».
  noPush: [],
  empty:  function () { return []; },
  clean:  function (t, rows) { return slSanitizeRows(t, rows); },
  fail:   function (where, e) { console.error('[mirror] ' + where, e); },
  // הזיכרון נבנה מהמראה לפני כל מנגנון שדוחף — העותק המקומי לפני כל נגיעה ברשת.
  loaded: function () { slApplyMirror(); },
};

var LS_CFG = {
  // cachePrefix נגזר משם האפליקציה שבתצורה ולא מקידומת האחסון — שם אחסון שישתנה היה מחזיר רשימה ריקה, והבאנר היה חוזר בכל טעינה.
  cachePrefix: self.APP.id + '-',
  logKey: 'sl_ls_log',
  // חובה בתחילית האפליקציה — ה-origin משותף, וסימן בלי תחילית נדרס בכל דחייה.
  dismissKey: 'sl_sw_dismissed',
  // מפתח שאינו במרשם נמחק בעלייה.
  keys: function () {
    return [LS_CFG.logKey, LS_CFG.dismissKey, DEV_CFG.key, PEND_CFG.key,
            BK_CFG.flagKey, BK_CFG.logQueueKey]
      .concat(eraKeys(), mirrorTables().map(mirrorKey));
  }
};

var BK_CFG = {
  client: function () { return S.SB; },
  flagKey: 'sl_last_backup',
  logQueueKey: 'sl_log_queue',
  prefix: '',
  device: function () { try { return getDeviceId(); } catch (e) { return null; } },
  // אין כניסה ולכן אין שם משתמש — המכשיר הוא הזהות היחידה, ושדה מומצא היה עדות שאיש לא מסר.
  user: function () { return null; },
  // סוד שנכתב לגיבוי שורד בו גם אחרי שנמחק מהמקור — ולכן רשימת הסודות של הגיבוי היא רשימת המראה
  secrets: function () { return SL_NEVER_MIRROR_SETTINGS; },
  // שליפה בעמודים חייבת סדר יציב — בלי ORDER BY פוסטגרס אינו מבטיח אותו
  // אין כאן id: order על עמודה שאינה בסכימה מחזיר 42703, שנקרא «סכימה מיושנת» ומציג באנר עדכון
  sources: function () {
    return [
      { name: 'sl_students',     order: 'client_id', ts: 'updated_at' },
      { name: 'sl_transactions', order: 'client_id', ts: 'updated_at' },
      { name: KV_TABLE,          order: 'key',       ts: 'updated_at' },
      { name: 'sl_lookups',      order: 'client_id', ts: 'updated_at' }
    ];
  }
};

var PEND_CFG = {
  key: 'sl_pending',
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

// הריקון הוא syncAll עצמה — אין ליצור פונקציית דחיפה נפרדת: דחיפה בלי משיכה שקדמה לה מחזירה לחיים שורה שנמחקה במכשיר אחר
var RTY_CFG = {
  flush:   function () { return syncAll(); },
  pending: function () { try { return pendCount() > 0; } catch (e) { return false; } },
};

// שורת החותמת מוחרגת מהמראה ב-slStripMeta — דחיפת-מצב שלה הייתה מחזירה לענן חותמת ישנה
// ok() אינו נוגע ב-_slLastPullOk — היא חותמת המשיכה המלאה, ו-ok() נקראת גם בבדיקה שלא משכה
var PL_CFG = {
  every:  3000,
  // אין כניסה — הבדיקה המחזורית פעילה כל עוד הלשונית גלויה, ותנאי של משתמש מחובר לא היה מתקיים כאן לעולם.
  active: function () { return document.visibilityState !== 'hidden'; },
  seen:   function () { return S._slSeenTs; },
  note:   function (ts) { S._slSeenTs = ts; },
  ok:     function () { S._slLastSeenOk = Date.now(); },
  pull:   function () { return syncAll(); },
  client: function () { return S.SB; },
  table:  function () { return KV_TABLE; },
};

var PUSH_CFG = {
  tables: PUSH_TABLES,
  chunk:  500,
  delay:  400,
  rows:   function (t, ctx) {
    if (!ctx || !ctx[t]) return null;
    return MIRROR[t] || [];
  },
  key:    function (t, row) { var c = _slPushOf(t); return c.pk + slKeyOf(t, row); },
  send:   function (t, rows) { return slSendRows(t, rows); },
  run:    function () { syncAll(); },
};

var ERA_CFG = {
  prefix: self.APP.prefix,
  client: function () { return S.SB; },
  table:  function () { return KV_TABLE; },
  refresh: function () { return syncAll(); },
  log:    function (action, entries) { return logAwait(action, entries); }
};

var DEV_CFG = { key: 'sl_device_id' };

document.title = self.APP.name;

// mountView() מציירת את המסכים לפני כל קוד שמחפש אלמנט בתוכם — אין להזיז את הקריאה אליה מטה
function mountView() {
  var v = document.getElementById('view');
  if (!v) { console.error('[ui] אין מיכל תוכן — #view'); return; }
  v.innerHTML = '<div id="app">' + screenDashHTML() + screenTxnHTML() +
    screenStudentHTML() + screenSettingsHTML() + '</div>';
}

mountView();

S.SB = sbWatch(supabase.createClient(self.APP.supabase.url,self.APP.supabase.key));

// אין להמתין כאן לרשת — הכתיבה כבר במראה ובתור, והסנכרון מרנדר שוב כשהוא מביא משהו חדש.
// מסך ההגדרות מרונדר רק כשהפאנל פעיל — אחרת כל סנכרון בונה רשימות שאיש אינו רואה.
function saveRefresh(){ refreshUI(); }

function refreshUI(){updateDropdowns();renderDash();renderTxnLog();if(S.SC_STUDENT_ID)renderStudentCard();
  var sp=document.getElementById('panel-settings');
  if(sp&&sp.classList.contains('active'))renderSettingsLists();}

// ── העברת מזהה ל-DOM ──
// data-id הוא תמיד מחרוזת — ההשוואות עוברות ב-String(key), ואין להחליפן ב-=== על מספר.
var DOM_ACTIONS = {
  'combo-pick':          function (el) { return comboPick(el); },
  'sw-apply':            function (el) { swApply(el); },
  'sw-dismiss':          function () { swHideUpdate(); },
  // התראות התשתית נבנות ב-JS — לכן הן מנותבות במפה ולא במאזין ישיר על הכפתור.
  'ls-alert-close':      function () { var el = document.getElementById('ls-alert'); if (el) el.remove(); },
  'pend-alert-ok':       function () { pendAlertDismiss(); },
  'txn-del':     function (el) { deleteTxn(el.getAttribute('data-id')); },
  'student-del': function (el) { deleteStudent(el.getAttribute('data-id')); },
  'list-del':    function (el) { deleteListItem(el.getAttribute('data-id')); },
  'modal-close':  function () { closeModal(); },
  'ask-no':       function () { closeAsk(false); },
  'ask-yes':      function () { closeAsk(true); },
  'student-add':  function () { return runSave(saveNewStudent, '✅ תלמיד נוסף'); },
  'show-panel':   function (el) { showPanel(el.getAttribute('data-panel'), el); },
  'acc-toggle':   function (el) { toggleAcc(el.getAttribute('data-acc')); },
  'list-add':     function (el) { return runSave(function () { return addListItem(el.getAttribute('data-list')); }, '✅ נוסף'); },
  // שנה וחודש מומרים למספר כאן — הם נכנסים לחישוב טווח ולא להשוואת מפתח.
  'dash-month':   function (el) { dashPickMonth(Number(el.getAttribute('data-month'))); },
  'sc-year':      function (el) { scSelectYear(Number(el.getAttribute('data-year'))); },
  'dash-prev-year':          function () { dashPrevYear(); },
  'dash-next-year':          function () { dashNextYear(); },
  'sc-past-show':            function () { return scPastShow(); },
  'student-toggle-active':   function () { toggleStudentActive(); },
  'period-open':             function (el) { periodOpen(el.getAttribute('data-id')); },
  'period-save':             function (el) { return runSave(function () { return periodSave(el.getAttribute('data-id')); }, '✅ התקופה נשמרה'); },
  'period-del':              function (el) { periodDelete(el.getAttribute('data-id')); },
  'student-open-add':        function () { openAddStudent(); },
  'student-settings-save':   function () { return runSave(saveStudentSettings, '✅ הגדרות נשמרו'); },
  'txn-save':                function () { return runSave(saveTxn, '✅ תשלום נשמר'); },
  'tuition-save':            function () { return runSave(saveDefaultTuition, MSG_SAVED); },
};

actWire(DOM_ACTIONS);


document.addEventListener('input', comboInput);

document.addEventListener('change', function (e) {
  var el = e.target;
  if (el && el.dataset && el.dataset.chg === 'txn-method') txnMethodHint();
});

// focus אינו עולה בעץ — ולכן focusin.
document.addEventListener('focusin', comboFocus);

// הגרירה לסידור במנגנון שבליבה.
document.addEventListener('pointerdown', dragDown);
document.addEventListener('pointermove', dragMove);
document.addEventListener('pointerup', dragUp);
document.addEventListener('pointercancel', dragCancel);

function showPanel(key,btn){
  document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
  document.getElementById('panel-'+key).classList.add('active');
  if(btn)btn.classList.add('active');
  if(key==='settings')renderSettingsPanel();
}

// ── עליית האפליקציה ──
// כל הפעלות המודולים המשותפים יושבות כאן — הפעלה שתלויה במסלול אחר, כמו משיכה שהצליחה, נכבית בשקט כשהמסלול אינו רץ.
// אין await syncAll() חוסם — בלי רשת הוא תוקע את המסך, וברשת איטית משאיר ספינר במקום נתונים שכבר על הדיסק.
function slBoot(){
  shell.refreshUI = refreshUI;
  // הזיכרון נבנה מהמראה (MIRROR_CFG.loaded) לפני כל מנגנון שדוחף, והמסך הראשון מצויר ממנו לפני הרשת.
  bootRun();
  shellBare(false);
  slApplyMirror();
  refreshUI();
  syncAll().then(function(){ ensureCreditMethod(); });
  window.bootOk();
}

// האחסון נפתח לפני כל קריאה ממנו — אחרי שה-CFG הוגדרו, כי המרשם קורא אותם.
// העלייה בקריאה ולא ב-DOMContentLoaded — האירוע אינו ממתין ל-await שבראש המודול, ומאזין שנרשם אחריו אינו נקרא.
await lsOpen();
slBoot();
