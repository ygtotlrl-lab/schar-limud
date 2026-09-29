// app/main.js — העלייה, מפת הפעולות והניווט
import { MSG_OFF_USER_WRITE, MSG_SAVED, appConfigure, dayNoon, getDeviceId,
         withTimeout } from '../core/util.js';
import { _eraPush, eraKeys, eraKick, pendAlertDismiss, pendBoot, pendCount, pendHas, plBoot,
         pushedFor, rowsVerify, rtyBoot, runSave, sbWatch, tombBoot } from '../core/sync.js';
import { hwBoot, lsBoot, lsClearHorizons, lsRemove, lsWindowFrom } from '../core/storage.js';
import { MIRROR, mirrorBoot, mirrorKey, mirrorLoadOne, mirrorTables,
         mirrorWrite } from '../core/mirror.js';
import { bkBoot, logAwait } from '../core/backup.js';
import { authUsersTable, lkBoot, lkReset, sessActive, sessGet, sessSet,
         usersSaveAll } from '../core/auth.js';
import { actRun, closeAsk, closeModal, comboFocus, comboInput, comboKey,
         comboOutside, comboPick, ksKey, modalBackdrop, modalEsc, swApply, swHideUpdate,
         toast } from '../core/ui.js';
import { KV_TABLE, PUSH_TABLES, SL_NEVER_MIRROR_SETTINGS } from './constants.js';
import { S, shell } from './state.js';
import { _slPushOf, _slRowId,
         pendTxnKey, slApplyMirror,
         slIsAdmin, slKeyOf, slSanitizeRows, slSendRows, slTs,
         syncAll } from './domain.js';
import { closeDashMonth, dashNextYear, dashPrevYear, renderDash, screenDashHTML,
         showDashMonth } from './screens/dash.js';
import { doLogin, doLogout, screenLoginHTML, slResolveUser,
         slShowLogin } from './screens/login.js';
import { addListItem, deleteListItem, deleteStudent, openAddStudent, renderSettingsLists,
         renderSettingsPanel, saveDefaultTuition, saveNewStudent, screenSettingsHTML,
         slMyPassword, slSaveMyPassword, toggleAcc } from './screens/settings.js';
import { renderScAnnual, renderStudentCard, saveStudentSettings, scPastShow, scSelectYear,
         screenStudentHTML,
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
  get HW_CFG() { return HW_CFG; },
  get LK_CFG() { return LK_CFG; },
  get LS_CFG() { return LS_CFG; },
  get MIRROR_CFG() { return MIRROR_CFG; },
  get PEND_CFG() { return PEND_CFG; },
  get PL_CFG() { return PL_CFG; },
  get PUSH_CFG() { return PUSH_CFG; },
  get RTY_CFG() { return RTY_CFG; },
  get USER_CFG() { return USER_CFG; },
  get saveRefresh() { return saveRefresh; }
});

// tables היא פונקציה ולא מערך — PUSH_TABLES מוצהר אחרי הבלוק, וקריאה כאן הייתה מקבלת undefined
var MIRROR_CFG = {
  prefix: self.APP.prefix + 'mirror_',
  tables: function () { return PUSH_TABLES.concat([authUsersTable()]); },
  noPush: [{ t: 'sl_users', via: 'writeUser', adds: 'secret' }],
  empty:  function () { return []; },
  ts:     function (r) { return slTs(r); },
  clean:  function (t, rows) { return slSanitizeRows(t, rows); },
  fail:   function (where, e) { console.error('[mirror] ' + where, e); },
};

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
      idOf: _slRowId, syncedThrough: pushedFor('sl_transactions'), verify: rowsVerify(function () { return S.SB; }, 'sl_transactions') }
  ],
  // ריק ומוצהר — התנועות בפינוי, ואין טבלה שנדרשת במלואה לחישוב.
  fullHistory: [],
  // טבלה שגדלה ואינה בפינוי ממלאת אחסון של origin משותף — לכן כאן רק טבלה קבועה בגודלה, עם נימוקה.
  fixedSize: [
    { t: 'sl_students', why: 'תלמידים — שורה לתלמיד, ⛔ והם אבות התנועות שנשארות' },
    { t: KV_TABLE,      why: 'הגדרות — שורה למפתח, ⛔ ומספר המפתחות קבוע בקוד' },
    { t: 'sl_lists',    why: 'רשימות בחירה — פריטים שנערכים בהגדרות, ⛔ ואינם גדלים עם התנועות' },
    { t: 'sl_users',    why: 'משתמשים — שורה למשתמש, ⚠️ והיא מסלול הכניסה האופליין' }
  ]
};

// sl_users אינה ברשימה — sh_backup קריא ל-anon, וגיבוי שלה היה מעתיק את pass_salt ו-pass_fp למקום שני
// שחזור משתמשים נעשה ידנית מלוח הבקרה
var BK_CFG = {
  client: function () { return S.SB; },
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
      { name: 'sl_students',     order: 'client_id', ts: 'updated_at' },
      { name: 'sl_transactions', order: 'client_id', ts: 'updated_at' },
      { name: KV_TABLE,          order: 'key',       ts: 'updated_at' },
      { name: 'sl_lists',        order: 'client_id', ts: 'updated_at' }
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

// אין להוסיף כאן הודעה משלה — חלון האזהרה של הליבה הוא ההודעה
var LK_CFG = {
  active: function () { return sessActive(); },
  lock:   function () { doLogout(); },
};

// שורת החותמת מוחרגת מהמראה ב-slStripMeta — דחיפת-מצב שלה הייתה מחזירה לענן חותמת ישנה
// ok() אינו נוגע ב-_slLastPullOk — הזנתו משיחה שאינה משיכה מלאה הייתה הופכת חותמת תצוגה לעֵד פינוי
var PL_CFG = {
  every:  3000,
  active: function () { return sessActive(); },
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

// החלון החם הוא חלון הפינוי של האפליקציה — מהליבה, ולא מספר ימים משלו; שנת הלימודים תמיד בתוכו.
// תנועה בלי תאריך תקין נשארת חמה — ספק אינו מפנה
var HW_CFG = {
  specs: [{
    key: mirrorKey('sl_transactions'),
    label: 'תנועות מחוץ לחלון',
    inWindow: function (t) {
      var d = t && t.txn_date;
      if (!d) return true;
      var ms = dayNoon(String(d)).getTime();
      if (!isFinite(ms)) return true;
      return ms >= lsWindowFrom();
    },
    idOf: function (r) { return r.client_id; },
    ts: function (r) { return slTs(r); },
    isPending: function (r) { return pendHas(pendTxnKey(r)); },
    fetch: async function () {
      try {
        var res = await withTimeout(S.SB.from('sl_transactions').select('*'));
        return (res && !res.error && Array.isArray(res.data))
          ? { ok: true, rows: res.data } : { ok: false, rows: [] };
      } catch (e) { return { ok: false, rows: [] }; }
    },
    rows: function () { return MIRROR.sl_transactions; },
    apply: function (kept) { return mirrorWrite('sl_transactions', kept); }
  }]
};

var ERA_CFG = {
  prefix: self.APP.prefix,
  client: function () { return S.SB; },
  table:  function () { return KV_TABLE; },
  // גם אופק הפינוי נמחק — אופק ששרד מסנן את מה שהמשיכה מחזירה, והמכשיר היה נשאר ריק.
  wipe:   function () {
    mirrorTables().forEach(function (t) { MIRROR[t] = MIRROR_CFG.empty(); lsRemove(mirrorKey(t)); });
    lsClearHorizons();
  },
  // מחזור הסנכרון בונה את מפות הענן, ובלעדיהן שכבת הדחיפה מחזירה «אין ראיה» — ולכן התוצאה נאספת ממנו
  push:   function () { return syncAll().then(function () { return _eraPush; }); },
  refresh: function () { return syncAll(); },
  log:    function (action, entries) { return logAwait(action, entries); }
};

var USER_CFG = {
  ready: function () { return !!S.SB && navigator.onLine; },
  // נקראת בזמן הקריאה ולא בהשמה — הקבוע מוצהר מתחת לבלוק, וקריאה בהשמה נותנת undefined בשקט
  offMsg: function () { return MSG_OFF_USER_WRITE; },
  from: function () { return S.SB.from(authUsersTable()); },
  run: function (q) { return withTimeout(q); },
  after: function (res) { return res; },
  // המשתמש המחובר מסונכרן מול המראה אחרי שנשמרה — הפוך מזה קורא ערך שטרם נכתב
  refreshed: function () { var cu = sessGet(); if (cu) sessSet(slResolveUser(cu)); },
  revalidated: function (row) { sessSet(slResolveUser(Object.assign({}, sessGet(), row))); },
  logout: function (msg) { doLogout(); toast(msg, null, 'bad'); }
};

var DEV_CFG = { key: 'sl_device_id' };

document.title = self.APP.name;

// mountView() מציירת את המסכים לפני כל קוד שמחפש אלמנט בתוכם — אין להזיז את הקריאה אליה מטה
function mountView() {
  var v = document.getElementById('view');
  if (!v) { console.error('[ui] אין מיכל תוכן — #view'); return; }
  v.innerHTML = screenLoginHTML() + '<div id="app" class="hidden">' + screenDashHTML() + screenTxnHTML() +
    screenStudentHTML() + screenSettingsHTML() + '</div>';
}

mountView();

S.SB = sbWatch(supabase.createClient(self.APP.supabase.url,self.APP.supabase.key));

// אין להמתין כאן לרשת — הכתיבה כבר במראה ובתור, והסנכרון מרנדר שוב כשהוא מביא משהו חדש.
// מסך ההגדרות מרונדר רק כשיש הרשאה וגם הפאנל פעיל — אחרת כל סנכרון בונה רשימות שאיש אינו רואה.
function saveRefresh(){ refreshUI(); }

function refreshUI(){updateDropdowns();renderDash();renderTxnLog();if(S.SC_STUDENT_ID)renderStudentCard();
  var sp=document.getElementById('panel-settings');
  if(slIsAdmin()&&sp&&sp.classList.contains('active'))renderSettingsLists();}

// ── העברת מזהה ל-DOM ──
// data-id הוא תמיד מחרוזת — ההשוואות עוברות ב-String(key), ואין להחליפן ב-=== על מספר.
var DOM_ACTIONS = {
  'combo-pick':          function (el) { return comboPick(el); },
  'sw-apply':            function (el) { swApply(el); },
  'sw-dismiss':          function () { swHideUpdate(); },
  // התראות התשתית נבנות ב-JS — לכן הן מנותבות במפה ולא במאזין ישיר על הכפתור.
  'ls-alert-close':      function () { var el = document.getElementById('ls-alert'); if (el) el.remove(); },
  'pend-alert-ok':       function () { pendAlertDismiss(); },
  'lk-stay':             function () { lkReset(); },
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
  'dash-month':   function (el) { showDashMonth(Number(el.getAttribute('data-year')),
                                                Number(el.getAttribute('data-month'))); },
  'sc-year':      function (el) { scSelectYear(Number(el.getAttribute('data-year'))); },
  'dash-prev-year':          function () { dashPrevYear(); },
  'dash-next-year':          function () { dashNextYear(); },
  'dash-month-close':        function () { closeDashMonth(); },
  'sc-past-show':            function () { return scPastShow(); },
  'student-toggle-active':   function () { toggleStudentActive(); },
  'student-open-add':        function () { openAddStudent(); },
  'student-settings-save':   function () { return runSave(saveStudentSettings, '✅ הגדרות נשמרו'); },
  'txn-save':                function () { return runSave(saveTxn, '✅ תשלום נשמר'); },
  'tuition-save':            function () { return runSave(saveDefaultTuition, MSG_SAVED); },
  'my-pass':                 function () { slMyPassword(); },
  'my-pass-save':            function () { return slSaveMyPassword(); },
  'login':                   function () { return doLogin(); },
  'logout':                  function () { doLogout(); },
};

// סגירת הרקע קודמת לניתוב — לחיצה על הרקע אינה נושאת data-act.
document.addEventListener('click', function (ev) {
  comboOutside(ev);
  if (modalBackdrop(ev)) return;
  var el = ev.target && ev.target.closest ? ev.target.closest('[data-act]') : null;
  if (!el) return;
  var fn = DOM_ACTIONS[el.getAttribute('data-act')];
  if (!fn) return;
  ev.preventDefault();
  actRun(el, fn);
});

// שמירה בשדה עריכה קודמת לסגירת חלון הדו-שיח — אחרת Escape בשדה שבתוך חלון דו-שיח היה סוגר אותו במקום לבטל את השדה.
document.addEventListener('keydown', function (e) {
  if (comboKey(e) || ksKey(e)) return;
  modalEsc(e);
});

document.addEventListener('input', comboInput);

document.addEventListener('change', function (e) {
  var el = e.target;
  if (el && el.dataset && el.dataset.chg === 'txn-method') txnMethodHint();
});

// focus אינו עולה בעץ — ולכן focusin.
document.addEventListener('focusin', comboFocus);

// אין שער סיסמה נפרד מעל מסך ההגדרות — ההרשאה נגזרת מתפקיד המשתמש המחובר, ושער כזה נופל בהתקנה טרייה לברירת מחדל שכל אחד מקליד.
// אין לזרוע ברירת מחדל לסיסמה או לתפקיד — role הוא NOT NULL בלי DEFAULT, וכל מה שאינו בדיוק 'admin' נדחה.
// אין כאן קריאת רשת — התפקיד יורד עם מראת המשתמשים, ולכן ההרשאה עובדת אופליין כמו הכניסה.
function showPanel(key,btn){
  document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
  document.getElementById('panel-'+key).classList.add('active');
  if(btn)btn.classList.add('active');
  if(key==='settings')renderSettingsPanel();
}

// ── עליית האפליקציה ──
// כל הפעלות המודולים המשותפים יושבות כאן — הפעלה שתלויה במסלול אחר, כמו משיכה שהצליחה, נכבית בשקט כשהמסלול אינו רץ.
async function slBoot(){
  shell.refreshUI = refreshUI;
  // המכסה משותפת ל-origin כולו — גם אפליקציה שכמעט אינה כותבת נפגעת ממה שאחרות מילאו, ולכן מודדים בעלייה.
  try { lsBoot(); } catch (e) { console.warn('[ls] lsBoot', e); }
  // הסימונים נטענים לפני הכניסה — רשומה שלא אושרה בסשן הקודם חייבת להיראות ככזו גם אחרי רענון.
  try { pendBoot(); } catch (e) { console.warn('[pend] pendBoot', e); }
  try { tombBoot(); } catch (e) { console.warn('[tomb] tombBoot', e); }
  try { eraKick(); } catch (e) { console.warn('[era] eraKick', e); }
  // כאן ולא אחרי הכניסה — הגיבוי אינו תלוי בכניסה, ורץ גם במכשיר שנשאר במסך הכניסה.
  try { bkBoot(); } catch (e) { console.warn('[bk] bkBoot', e); }
  try { rtyBoot(); } catch (e) { console.warn('[rty] rtyBoot', e); }
  try { lkBoot(); } catch (e) { console.warn('[lk] lkBoot', e); }
  try { plBoot(); } catch (e) { console.warn('[pl] plBoot', e); }
  try { hwBoot(); } catch (e) { console.warn('[hw] hwBoot', e); }
  // העותק המקומי נטען ראשון — לפני כל נגיעה ברשת.
  try { mirrorBoot(); slApplyMirror(); } catch (e) { console.warn('[mirror] load', e); }
  // מראת המשתמשים נטענת לפני מסך הכניסה — אחרת לכניסה אופליין אין מול מה לאמת.
  try { usersSaveAll(mirrorLoadOne(authUsersTable()) || []); } catch (e) { console.warn('[users] load', e); }
  // אין כאן שחזור סשן — סשן שנשמר בלי תפוגה הוא כניסה קבועה על מכשיר משותף.

  slShowLogin(true);
  setTimeout(function(){document.getElementById('au-user').focus();},50);
  window.bootOk();
}

document.addEventListener('DOMContentLoaded', slBoot);
