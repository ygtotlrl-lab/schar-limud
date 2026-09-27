// app/main.js — העלייה, מפת הפעולות והניווט
import { MSG_SAVED } from '../core/util.js';
import { eraKick, pendAlertDismiss, pendBoot, plBoot, rtyBoot, runSave, sbWatch,
         tombBoot } from '../core/sync.js';
import { hwBoot, lsBoot } from '../core/storage.js';
import { mirrorBoot, mirrorLoadOne } from '../core/mirror.js';
import { bkBoot } from '../core/backup.js';
import { authUsersTable, lkBoot, lkReset, usersSaveAll } from '../core/auth.js';
import { actRun, closeAsk, closeModal, ksKey, modalBackdrop, modalEsc, swApply,
         swHideUpdate } from '../core/ui.js';
import { S } from './state.js';
import { sdBlur, sdFilter, sdOpen, sdSelectEl, slApplyMirror, slIsAdmin } from './domain.js';
import { closeDashMonth, dashNextYear, dashPrevYear, renderDash, screenDashHTML,
         showDashMonth } from './screens/dash.js';
import { doLogin, doLogout, screenLoginHTML, slShowLogin } from './screens/login.js';
import { addListItem, deleteListItem, deleteStudent, openAddStudent,
         renderSettingsLists, renderSettingsPanel, saveDefaultTuition, saveNewStudent,
         screenSettingsHTML, slMyPassword, slSaveMyPassword, toggleAcc } from './screens/settings.js';
import { renderStudentCard, saveStudentSettings, scPastShow, scSelectYear,
         screenStudentHTML, toggleStudentActive } from './screens/student.js';
import { deleteTxn, renderTxnLog, saveTxn, screenTxnHTML, txnMethodHint, updateDropdowns } from './screens/txn.js';

document.title = self.APP.name;

// mountView() מציירת את המסכים לפני כל קוד שמחפש אלמנט בתוכם — אין להזיז את הקריאה אליה מטה
function mountView() {
  var v = document.getElementById('view');
  if (!v) { console.error('[ui] אין מיכל תוכן — #view'); return; }
  v.innerHTML = screenLoginHTML() + '<div id="app" class="hidden">' + screenDashHTML() + screenTxnHTML() +
    screenStudentHTML() + screenSettingsHTML() + '</div>';
}

mountView();

var SB = sbWatch(supabase.createClient(self.APP.supabase.url,self.APP.supabase.key));

try { S._heColl = new Intl.Collator('he'); } catch (e) { S._heColl = null; }

var HE = S._heColl || { compare: function (a, b) { return String(a).localeCompare(String(b), 'he'); } };

// אין להמתין כאן לרשת — הכתיבה כבר במראה ובתור, והסנכרון מרנדר שוב כשהוא מביא משהו חדש.
// מסך ההגדרות מרונדר רק כשיש הרשאה וגם הפאנל פעיל — אחרת כל סנכרון בונה רשימות שאיש אינו רואה.
function saveRefresh(){ refreshUI(); }

function refreshUI(){updateDropdowns();renderDash();renderTxnLog();if(S.SC_STUDENT_ID)renderStudentCard();
  var sp=document.getElementById('panel-settings');
  if(slIsAdmin()&&sp&&sp.classList.contains('active'))renderSettingsLists();}

// ── העברת מזהה ל-DOM ──
// data-id הוא תמיד מחרוזת — ההשוואות עוברות ב-String(key), ואין להחליפן ב-=== על מספר.
var DOM_ACTIONS = {
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
  if (modalBackdrop(ev)) return;
  var el = ev.target && ev.target.closest ? ev.target.closest('[data-act]') : null;
  if (!el) return;
  var fn = DOM_ACTIONS[el.getAttribute('data-act')];
  if (!fn) return;
  ev.preventDefault();
  actRun(el, fn);
});

// שמירה בשדה עריכה קודמת לסגירת המודאל — אחרת Escape בשדה שבתוך מודאל היה סוגר אותו במקום לבטל את השדה.
document.addEventListener('keydown', function (e) {
  if (ksKey(e)) return;
  modalEsc(e);
});

// בורר החיפוש מסנן בהאצלה — מטפל oninput בתגית אינו רואה שם שחי במודול.
document.addEventListener('input', function (e) {
  var el = e.target;
  if (el && el.dataset && el.dataset.sd) sdFilter(el.dataset.sd);
});

document.addEventListener('change', function (e) {
  var el = e.target;
  if (el && el.dataset && el.dataset.chg === 'txn-method') txnMethodHint();
});

// focus ו-blur אינם מתפשטים — ולכן focusin ו-focusout.
document.addEventListener('focusin', function (e) {
  var el = e.target;
  if (el && el.dataset && el.dataset.sd) sdOpen(el.dataset.sd);
});

document.addEventListener('focusout', function (e) {
  var el = e.target;
  if (el && el.dataset && el.dataset.sd) sdBlur(el.dataset.sd);
});

// הבחירה נתפסת ב-mousedown ולא ב-click — focusout סוגר את הרשימה לפני שה-click מגיע.
document.addEventListener('mousedown', function (e) {
  var el = e.target && e.target.closest ? e.target.closest('.sd-opt[data-k]') : null;
  if (el) sdSelectEl(el);
});

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

export { DOM_ACTIONS, HE, SB, refreshUI, saveRefresh };
