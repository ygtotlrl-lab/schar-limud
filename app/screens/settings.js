// app/screens/settings.js — מסך ההגדרות
import { MSG_FILL_ALL, MSG_MY_PASS_TITLE, MSG_OFF_NO_CRYPTO, MSG_OFF_NO_FP,
         MSG_OFF_USER_WRITE, MSG_PASS_CUR_BAD, MSG_PASS_MISMATCH, MSG_PASS_SIX,
         MSG_PASS_UPDATE_FAIL, MSG_PASS_VERIFY_FAIL, MSG_SAVED_LOCAL, MSG_SERVER_ERR,
         dayToday, uniqHas, withTimeout } from '../../core/util.js';
import { idEq, newClientId, plTouch, schedulePush, tombKill } from '../../core/sync.js';
import { MIRROR } from '../../core/mirror.js';
import { authPassFields, authUsersTable, authVerify, sessGet, usersSaveOne,
         writeUser } from '../../core/auth.js';
import { ask, closeModal, comboSet, esc, openModal, toast, uiNoDialog } from '../../core/ui.js';
import { CREDIT_METHOD, KV_TABLE, MSG_ADD_STUDENT, MSG_CONFIRM, MSG_CREDIT_ITEM_LOCKED,
         MSG_DELETED_OK, MSG_DEL_ITEM_BODY, MSG_DEL_ITEM_TITLE, MSG_DEL_NOT_SAVED,
         MSG_DEL_STUDENT_ANON, MSG_DEL_STUDENT_POST, MSG_DEL_STUDENT_PRE,
         MSG_DEL_STUDENT_TITLE, MSG_ITEM_MISSING, MSG_ITEM_SAVE_FAIL, MSG_NAME_REQUIRED,
         MSG_NO_USER_RELOGIN, MSG_PASS_UPDATED, MSG_PASS_UPDATED_NO_FP2, MSG_SET_DENIED,
         MSG_STUDENT_DELETED, MSG_STUDENT_MISSING2, MSG_STUDENT_SAVE_FAIL,
         MSG_TUITION_POSITIVE, MSG_VALUE_BAD, MSG_VALUE_EXISTS,
         MSG_VALUE_SAVE_FAIL } from '../constants.js';
import { S, shell } from '../state.js';
import { acadYearLabel, acadYearOf, enrollText, findListItem, fmt, isCreditValue,
         monthKeyOf, pcCascadeDelete, pendLstTag, pendStuTag, pendingCid, readMonthRange,
         releaseCid, slListId,
         slLocalWrite, slSettingsAccess, studentCredit } from '../domain.js';

// נאכפת ביצירה ובשינוי בלבד — אכיפה במסלול הכניסה נועלת בחוץ סיסמה תקפה שנקבעה לפני התקן
var PASS_SIX_RE = /^[0-9]{6}$/;

function screenSettingsHTML() {
  return `
<div id="panel-settings" class="panel">
  <!-- ⭐ אין כאן שער סיסמה. ההרשאה נגזרת מ-\`sl_users.role\`
       של המשתמש המחובר, ⛔ ולא מסיסמת שער. הכרטיס הזה הוא
       ההודעה שמוצגת למי שאינו admin — לא טופס. -->
  <div id="settings-denied" class="hidden card">
    <div class="card-hdr"><h3>&#128274; הגדרות</h3></div>
    <div class="card-body">
      <div id="set-denied-msg" class="denied-msg"></div>
    </div>
  </div>
  <div id="settings-main" class="hidden">
    <div class="card">
      <div class="card-hdr"><h3>שכר לימוד ברירת מחדל</h3></div>
      <div class="tuition-row card-body" data-ks>
        <input aria-label="שכר לימוד חודשי ברירת מחדל" id="set-def-tuition" type="text" inputmode="decimal" class="tuition-inp" placeholder="לא הוגדר">
        <button class="btn" data-act="tuition-save" data-ksave>שמור</button>
      </div>
    </div>
    <!-- ⭐ שינוי הסיסמה של המשתמש המחובר. יצירת משתמש נשארה
         בלוח הבקרה של Supabase — אין כאן מסך ניהול משתמשים, וזו
         החלטה מתועדת; שינוי סיסמה אינו יצירה. -->
    <div class="card">
      <div class="card-hdr">
        <h3>&#128273; הסיסמה שלי</h3>
        <button class="btn sm" data-act="my-pass">שינוי סיסמה</button>
      </div>
    </div>
    <div class="card">
      <div class="card-hdr">
        <h3>&#128100; תלמידים</h3>
        <button class="btn sm" data-act="student-open-add">+ הוסף</button>
      </div>
      <div id="set-students-list"></div>
    </div>
    <div class="card">
      <div class="card-hdr">
        <h3>אמצעי תשלום</h3>
        <button class="btn sm" data-act="list-add" data-list="payment_methods">+ הוסף</button>
      </div>
      <div id="set-methods-list"></div>
    </div>
    <div class="card">
      <div class="card-hdr">
        <h3>סעיפים</h3>
        <button class="btn sm" data-act="list-add" data-list="sections">+ הוסף</button>
      </div>
      <div id="set-sections-list"></div>
    </div>
    <!-- אזור מצב — שני האלמנטים האחרונים במסך, בסדר הזה -->
  </div>
</div>
`;
}

// מסך שינוי סיסמה אף שהמשתמש יחיד — בלעדיו כל שינוי סיסמה תלוי ב-SQL Editor; יצירת משתמש נשארת בלוח הבקרה
function slMyPassword() {
  var body = ''
    + '<div class="frm-row"><label for="mp-cur">סיסמה נוכחית</label><input id="mp-cur" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password"></div>'
    + '<div class="frm-row"><label for="mp-new">סיסמה חדשה (שש ספרות)</label><input id="mp-new" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>'
    + '<div class="frm-row-last frm-row"><label for="mp-new2">אימות סיסמה חדשה</label><input id="mp-new2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>';
  var foot = '<button class="btn out" data-act="modal-close">ביטול</button>'
           + '<button class="btn" data-act="my-pass-save" data-ksave>שמירה</button>';
  openModal(MSG_MY_PASS_TITLE, body, foot);
  var el = document.getElementById('mp-cur');
  if (el) el.focus();
}

async function slSaveMyPassword() {
  var c1 = document.getElementById('mp-cur');
  var n1 = document.getElementById('mp-new');
  var n2 = document.getElementById('mp-new2');
  if (!c1 || !n1 || !n2) { uiNoDialog('slSaveMyPassword', 'mp-cur'); return; }
  var cur = c1.value.trim(), p1 = n1.value.trim(), p2 = n2.value.trim();
  if (!cur || !p1 || !p2) { toast(MSG_FILL_ALL, null, 'bad'); return; }
  if (!PASS_SIX_RE.test(p1)) { toast(MSG_PASS_SIX, null, 'bad'); return; }
  if (p1 !== p2) { toast(MSG_PASS_MISMATCH, null, 'bad'); return; }
  var u = sessGet();
  if (!u || u.client_id == null) { toast(MSG_NO_USER_RELOGIN, null, 'bad'); return; }
  if (!S.SB || !navigator.onLine) { toast(MSG_OFF_USER_WRITE, null, 'bad'); return; }
  // מאומת מול הטביעה שבענן ולא מול המראה — מראה שהתיישנה הייתה מאשרת סיסמה שכבר הוחלפה במכשיר אחר
  var chk;
  try { chk = await withTimeout(S.SB.from(authUsersTable()).select('client_id,active,pass_salt,pass_fp').eq('client_id', u.client_id).limit(1)); }
  catch (e) { toast(MSG_OFF_USER_WRITE, null, 'bad'); return; }
  if (chk && chk.error) { toast(MSG_PASS_VERIFY_FAIL + (chk.error.message || MSG_SERVER_ERR), null, 'bad'); return; }
  var row = chk && Array.isArray(chk.data) && chk.data[0];
  if (!row) { toast(MSG_PASS_CUR_BAD, null, 'bad'); return; }
  var v = await authVerify(row, cur);
  if (v === 'no-fp')     { toast('❌ ' + MSG_OFF_NO_FP, null, 'bad'); return; }
  if (v === 'no-crypto') { toast('❌ ' + MSG_OFF_NO_CRYPTO, null, 'bad'); return; }
  if (v !== 'ok')        { toast(MSG_PASS_CUR_BAD, null, 'bad'); return; }
  var body = await authPassFields(p1);
  var res;
  try { res = await writeUser(u.client_id, body); }
  catch (e2) { toast(MSG_OFF_USER_WRITE, null, 'bad'); return; }
  if (!res || res.error) { toast(MSG_PASS_UPDATE_FAIL + ((res && res.error && res.error.message) || MSG_SERVER_ERR), null, 'bad'); return; }
  // בלי עדכון המראה הכניסה האופליין הבאה מאמתת מול הטביעה שזה עתה הוחלפה
  u.pass_salt = body.pass_salt; u.pass_fp = body.pass_fp;
  try { usersSaveOne(u); } catch (e3) { console.warn('[pass] כתיבה למראה נכשלה', e3); }
  plTouch();
  closeModal();
  if (body.pass_fp) toast(MSG_PASS_UPDATED, null, 'good');
  else toast(MSG_PASS_UPDATED_NO_FP2, null, 'bad');
}

function toggleAcc(key){var b=document.getElementById('acc-'+key),ic=document.getElementById('acc-icon-'+key),o=b.classList.toggle('open');ic.innerHTML=o?'&#9650;':'&#9660;';}

function renderSettingsPanel(){
  var acc=slSettingsAccess(), ok=(acc==='ok');
  var denied=document.getElementById('settings-denied'), main=document.getElementById('settings-main');
  if(denied)denied.classList.toggle('hidden',ok);
  if(main)main.classList.toggle('hidden',!ok);
  if(!ok){
    var m=document.getElementById('set-denied-msg');
    if(m)m.textContent=MSG_SET_DENIED;
    return;
  }
  document.getElementById('set-def-tuition').value=S.SETTINGS['default_tuition']||'';
  renderSettingsLists();
}

// אין לחסום שמירה כשאין רשת — המיזוג מכריע על ההגדרה לפי updated_at כמו על כל שורה.
function saveDefaultTuition(){
  var v=document.getElementById('set-def-tuition').value;
  if(!v||isNaN(v)){toast(MSG_VALUE_BAD, null, 'bad');return;}
  var cur=(MIRROR[KV_TABLE]||[]).filter(function(r){return r&&r.key==='default_tuition';})[0];
  var row=Object.assign({},cur||{client_id:newClientId()},{key:'default_tuition',value:JSON.stringify(Number(v))});
  if(!slLocalWrite(KV_TABLE,row)){toast(MSG_VALUE_SAVE_FAIL,5000, 'bad');return;}
  return true;
}

// אין אכיפת פורמט שש ספרות כאן ובאף מסלול כניסה — היא נועלת בחוץ סיסמה קיימת ותקפה בלי מסלול שחזור.
function renderSettingsLists(){
  // יתרת הזכות לשנת הלימודים הנוכחית — שדה נפרד שאינו מעורבב בשום סיכום חוב.
  var cy=acadYearOf(dayToday());
  document.getElementById('set-students-list').innerHTML=S.STUDENTS.map(function(s){var er=enrollText(s),cr=studentCredit(s.client_id,cy);return'<div class="set-list-item"><span class="student-name">'+esc(s.name)+'</span>'+pendStuTag(s)+(er?'<span class="pill">'+esc(er)+'</span>':'')+(cr>0?'<span class="badge blue" title="יתרת זכות ב'+esc(acadYearLabel(cy))+' — שולם מראש, אינו מקוזז מהחוב">&#128142; זכות &#8362;'+fmt(cr)+'</span>':'')+'<span class="badge '+(s.active?'green':'gray')+'">'+(s.active?'פעיל':'לא פעיל')+'</span><button class="btn sm danger" data-act="student-del" data-id="'+esc(s.client_id)+'">&#10005; מחק</button></div>';}).join('')||'<div class="empty">אין תלמידים</div>';
  renderListItems('payment_methods','set-methods-list');renderListItems('sections','set-sections-list');
}

// סעיף הזיכוי מוצג נעול, בלי כפתור מחיקה — מחיקתו מסתירה אותו מהטופס ומונעת רישום זיכויים חדשים.
// הסיווג ההיסטורי אינו נשען על הפריט — הוא נקרא מהמחרוזת ששמורה על התנועה.
function renderListItems(cat,elId){document.getElementById(elId).innerHTML=(S.LISTS[cat]||[]).map(function(i){
  if(isCreditValue(i.value))return'<div class="set-list-item"><span>'+esc(i.value)+'</span><span class="pill credit" title="סעיף מערכת — משמש לסימון ניצול יתרת זכות ואינו נספר כהכנסה. לא ניתן למחיקה.">&#128274; סעיף מערכת</span></div>';
  return'<div class="set-list-item"><span>'+esc(i.value)+'</span>'+pendLstTag(i)+'<button class="btn sm danger" data-act="list-del" data-id="'+esc(i.client_id)+'">&#10005;</button></div>';
}).join('')||'<div class="empty">ריק</div>';}

// client_id נוצר במכשיר לפני השליחה — בלעדיו ניסיון חוזר אחרי תשובה שאבדה ברשת יוצר שורה שנייה.
function addListItem(cat){
  var v=prompt('הזן ערך חדש:');
  if(!v||!v.trim())return;
  var val=v.trim();
  // ההשוואה על הערך ולא על client_id — הרשימה מזינה בוררים, ושתי אפשרויות באותו טקסט אינן ניתנות להבחנה.
  if(uniqHas(S.LISTS[cat]||[], {value:val}, function(it){return it.value;})){toast(MSG_VALUE_EXISTS,4000, 'bad');return;}
  var row={client_id:slListId(cat,val),category:cat,value:val,deleted:false,deleted_at:null,deleted_by:null};
  if(!slLocalWrite('sl_lists',row)){toast(MSG_ITEM_SAVE_FAIL,5000, 'bad');return;}
  return true;
}

// מחיקה פיזית מקומית חוזרת מהענן בסנכרון הבא — היעדר רשומה אצל צד אחד אינו מחיקה.
function deleteListItem(key){
  // חסימה מפורשת ולא כשל שקט — הכפתור עשוי להופיע מרינדור ישן.
  var it=findListItem(key);
  if(it&&isCreditValue(it.value)){toast('⚠️ «'+CREDIT_METHOD+MSG_CREDIT_ITEM_LOCKED,4200, 'bad');return;}
  ask(MSG_DEL_ITEM_TITLE,MSG_DEL_ITEM_BODY,MSG_CONFIRM).then(function(yes){
    if(!yes)return;
    var r0=(MIRROR.sl_lists||[]).filter(function(x){return idEq(x.client_id,key);})[0];
    if(!r0){toast(MSG_ITEM_MISSING, null, 'bad');return;}
    var row=tombKill(Object.assign({},r0));
    if(!slLocalWrite('sl_lists',row,row.updated_at)){toast(MSG_DEL_NOT_SAVED,5000, 'bad');return;}
    shell.refreshUI();
    toast(navigator.onLine?MSG_DELETED_OK:MSG_SAVED_LOCAL,4000, 'good');
    schedulePush();
  });}

function openAddStudent(){
  // מזהי השדות הם אלה ש-saveNewStudent קוראת — שינוי שם כאן שובר את השמירה.
  var optsHtml='<option value="">-- ללא --</option>';
  (S.LISTS['sections']||[]).forEach(function(s){optsHtml+='<option value="'+esc(s.value)+'">'+esc(s.value)+'</option>';});
  var body=''
    +'<div class="frm-row"><label for="new-st-name">שם</label><input aria-label="שם התלמיד" id="new-st-name" type="text" placeholder="שם התלמיד"></div>'
    +'<div class="frm-row"><label for="new-st-tuition">שכ"ל חודשי (ריק = ברירת מחדל)</label><input aria-label="ברירת מחדל" id="new-st-tuition" type="text" inputmode="decimal" placeholder="ברירת מחדל"></div>'
    +'<div class="frm-row"><label for="new-st-section">סעיף</label><select id="new-st-section">'+optsHtml+'</select></div>'
    +'<div class="frm-row"><label for="new-st-start">חודש הצטרפות</label><input aria-label="2025-09" id="new-st-start" type="month" placeholder="2025-09" dir="ltr" class="month-inp" value="'+esc(monthKeyOf(dayToday()))+'"></div>'
    +'<div class="frm-row-last frm-row"><label for="new-st-end">חודש עזיבה (ריק = עדיין פעיל)</label><input aria-label="2026-08" id="new-st-end" type="month" placeholder="2026-08" dir="ltr" class="month-inp"></div>'
    +'<div class="range-hint-sm">החיוב מחושב רק לחודשים שבטווח (כולל). ריק = חיוב לכל חודשי השנה.</div>';
  var foot='<button class="btn out" data-act="modal-close">ביטול</button>'
          +'<button class="btn" data-act="student-add" data-ksave>הוסף</button>';
  openModal(MSG_ADD_STUDENT, body, foot);
}

function saveNewStudent(){var name=document.getElementById('new-st-name').value.trim(),tuition=document.getElementById('new-st-tuition').value,section=document.getElementById('new-st-section').value;if(!name){toast(MSG_NAME_REQUIRED, null, 'bad');return;}var rng=readMonthRange('new-st-start','new-st-end');if(!rng)return;var cs={};var tuitionVal=parseInt(tuition,10);if(tuition&&(!isFinite(tuitionVal)||tuitionVal<0)){toast(MSG_TUITION_POSITIVE, null, 'bad');return;}if(tuition)cs.monthly_tuition=tuitionVal;if(section)cs.section=section;
  var cid=pendingCid('student',[name,tuition,section,rng.start_month,rng.end_month].join(' '));
  var row={client_id:cid,name:name,active:true,card_settings:cs,start_month:rng.start_month,end_month:rng.end_month,deleted:false,deleted_at:null,deleted_by:null};
  if(!slLocalWrite('sl_students',row)){toast(MSG_STUDENT_SAVE_FAIL,5000, 'bad');return;}
  releaseCid('student');
  return true;}

// מחיקה פיזית של תלמיד היא מחיקת כל היסטוריית הכספים שלו — המפתח הזר restrict רק עוצר אותה במסד.
function deleteStudent(key){var s=(MIRROR.sl_students||[]).filter(function(x){return idEq(x.client_id,key);})[0];
 ask(MSG_DEL_STUDENT_TITLE,MSG_DEL_STUDENT_PRE+(s?s.name:MSG_DEL_STUDENT_ANON)+MSG_DEL_STUDENT_POST,MSG_CONFIRM).then(function(yes){
  if(!yes)return;
  if(!s){toast(MSG_STUDENT_MISSING2, null, 'bad');return;}
  var row=tombKill(Object.assign({},s));
  if(!slLocalWrite('sl_students',row,row.updated_at)){toast(MSG_DEL_NOT_SAVED,5000, 'bad');return;}
  pcCascadeDelete('sl_students',row);
  if(idEq(S.SC_STUDENT_ID, s.client_id)){S.SC_STUDENT_ID=null;document.getElementById('sc-main').classList.add('hidden');comboSet('sc-student',null);}
  shell.refreshUI();
  toast(navigator.onLine?MSG_STUDENT_DELETED:MSG_SAVED_LOCAL,4000, 'good');
  schedulePush();
});}

export { addListItem, deleteListItem, deleteStudent, openAddStudent, renderSettingsLists,
         renderSettingsPanel, saveDefaultTuition, saveNewStudent, screenSettingsHTML,
         slMyPassword, slSaveMyPassword, toggleAcc };
