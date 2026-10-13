// app/screens/settings.js — מסך ההגדרות
import { MSG_SAVED_LOCAL, dayToday, uniqHas } from '../../core/util.js';
import { idEq, newClientId, schedulePush, tombKill } from '../../core/sync.js';
import { MIRROR } from '../../core/mirror.js';
import { ask, dragDef, esc, lookupDragApply, openModal, toast } from '../../core/ui.js';
import { CREDIT_METHOD, KV_TABLE, LK_METHOD, LK_SHIUR, MSG_ADD_STUDENT, MSG_CONFIRM, MSG_CREDIT_ITEM_LOCKED,
         MSG_DELETED_OK, MSG_DEL_ITEM_BODY, MSG_DEL_ITEM_TITLE, MSG_DEL_NOT_SAVED,
         MSG_DEL_STUDENT_ANON, MSG_DEL_STUDENT_POST, MSG_DEL_STUDENT_PRE,
         MSG_DEL_STUDENT_TITLE, MSG_ITEM_MISSING, MSG_ITEM_SAVE_FAIL, MSG_NAME_REQUIRED,
         MSG_STUDENT_DELETED, MSG_STUDENT_MISSING2, MSG_STUDENT_SAVE_FAIL,
         MSG_TUITION_POSITIVE, MSG_VALUE_BAD, MSG_VALUE_EXISTS,
         MSG_VALUE_SAVE_FAIL } from '../constants.js';
import { S, shell } from '../state.js';
import { acadYearHeb, acadYearOf, enrollText, fmt, isCreditValue,
         monthKeyOf, pcCascadeDelete, pendLkTag, pendStuTag, pendingCid, readMonthRange,
         releaseCid, slLocalWrite, slLookups, slStudentGroups, studentCredit,
         studentInMonth } from '../domain.js';

function screenSettingsHTML() {
  return `
<div id="panel-settings" class="panel">
  <div id="settings-main">
    <div class="card">
      <div class="card-hdr"><h3>שכר לימוד ברירת מחדל</h3></div>
      <div class="tuition-row card-body" data-ks>
        <input aria-label="שכר לימוד חודשי ברירת מחדל" id="set-def-tuition" type="text" inputmode="decimal" class="tuition-inp" placeholder="לא הוגדר">
        <button class="btn" data-act="tuition-save" data-ksave>שמור</button>
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
        <button class="btn sm" data-act="list-add" data-list="method">+ הוסף</button>
      </div>
      <div id="set-methods-list"></div>
    </div>
    <div class="card">
      <div class="card-hdr">
        <h3>שיעורים</h3>
        <button class="btn sm" data-act="list-add" data-list="shiur">+ הוסף</button>
      </div>
      <div id="set-shiurim-list"></div>
    </div>
    <!-- אזור מצב — שני האלמנטים האחרונים במסך, בסדר הזה -->
  </div>
</div>
`;
}

function toggleAcc(key){var b=document.getElementById('acc-'+key),ic=document.getElementById('acc-icon-'+key),o=b.classList.toggle('open');ic.innerHTML=o?'&#9650;':'&#9660;';}

function renderSettingsPanel(){
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

function renderSettingsLists(){
  // יתרת הזכות לשנת הלימודים הנוכחית — שדה נפרד שאינו מעורבב בשום סיכום חוב.
  // עמודות ברוחב קבוע — שם · תקופות · זכות · מצב · מחיקה — כל תגית באותו מקום בכל שורה.
  var cy=acadYearOf(dayToday());
  document.getElementById('set-students-list').innerHTML=slStudentGroups(S.STUDENTS).map(function(g){
    return '<div class="stu-grp-hd">'+esc(g.label||'ללא שיעור')+'</div>'+g.rows.map(function(s){
      var cr=studentCredit(s.client_id,cy),sh=(s.card_settings||{}).shiur,on=studentInMonth(s);
      return '<div class="stu-row">'+
        '<span class="stu-name"><span class="student-name">'+esc(s.name)+'</span>'+(sh?'<span class="pill shiur">'+esc(sh)+'</span>':'')+pendStuTag(s)+'</span>'+
        '<span class="stu-range">'+esc(enrollText(s))+'</span>'+
        '<span class="stu-credit">'+(cr>0?'<span class="badge blue" title="יתרת זכות ב'+esc(acadYearHeb(cy))+' — שולם מראש, אינו מקוזז מהחוב">&#128142; &#8362;'+fmt(cr)+'</span>':'')+'</span>'+
        '<span class="stu-state"><span class="badge '+(on?'green':'gray')+'">'+(on?'פעיל':'לא פעיל')+'</span></span>'+
        '<span class="stu-del"><button class="btn sm danger" data-act="student-del" data-id="'+esc(s.client_id)+'">&#10005; מחק</button></span>'+
      '</div>';
    }).join('');
  }).join('')||'<div class="empty">אין תלמידים</div>';
  renderListItems(LK_METHOD,'set-methods-list');renderListItems(LK_SHIUR,'set-shiurim-list');
}

// הסידור בגרירה מהידית, והסדר נכתב לכל השורות מה-DOM הסופי — במנגנון שבליבה.
dragDef(LK_METHOD, lookupDragApply);
dragDef(LK_SHIUR, lookupDragApply);

// סעיף הזיכוי נגרר כמו כל אמצעי, אך מוצג נעול ובלי כפתור מחיקה — מחיקתו מסתירה אותו מהטופס ומונעת רישום זיכויים חדשים.
// הסיווג ההיסטורי אינו נשען על הפריט — הוא נקרא מהמחרוזת ששמורה על התנועה.
function renderListItems(kind,elId){document.getElementById(elId).innerHTML=(slLookups(kind).map(function(i){
  var head='<div class="set-list-item" data-drag="'+esc(kind)+'" data-id="'+esc(i.client_id)+'"><span class="grip" data-grip aria-hidden="true">&#10303;</span><span class="lk-label">'+esc(i.label)+'</span>';
  if(isCreditValue(i.label))return head+'<span class="pill credit" title="סעיף מערכת — משמש לסימון ניצול יתרת זכות ואינו נספר כהכנסה. לא ניתן למחיקה.">&#128274; סעיף מערכת</span></div>';
  return head+pendLkTag(i)+'<button class="btn sm danger" data-act="list-del" data-id="'+esc(i.client_id)+'">&#10005;</button></div>';
}).join(''))||'<div class="empty">ריק</div>';}

// client_id נוצר במכשיר לפני השליחה — בלעדיו ניסיון חוזר אחרי תשובה שאבדה ברשת יוצר שורה שנייה.
function addListItem(kind){
  var v=prompt('הזן ערך חדש:');
  if(!v||!v.trim())return;
  var val=v.trim();
  // ההשוואה על התווית ולא על client_id — הרשימה מזינה בוררים, ושתי אפשרויות באותו טקסט אינן ניתנות להבחנה.
  if(uniqHas(slLookups(kind), {label:val}, function(it){return it.label;})){toast(MSG_VALUE_EXISTS,4000, 'bad');return;}
  var row={client_id:newClientId(),kind:kind,label:val,sort:slLookups(kind).length+1,deleted:false,deleted_at:null,deleted_by:null};
  if(!slLocalWrite('sl_lookups',row)){toast(MSG_ITEM_SAVE_FAIL,5000, 'bad');return;}
  return true;
}

// מחיקה פיזית מקומית חוזרת מהענן בסנכרון הבא — היעדר רשומה אצל צד אחד אינו מחיקה.
function deleteListItem(key){
  // חסימה מפורשת ולא כשל שקט — הכפתור עשוי להופיע מרינדור ישן.
  var it=(MIRROR.sl_lookups||[]).filter(function(x){return idEq(x.client_id,key);})[0];
  if(it&&isCreditValue(it.label)){toast('⚠️ «'+CREDIT_METHOD+MSG_CREDIT_ITEM_LOCKED,4200, 'bad');return;}
  ask(MSG_DEL_ITEM_TITLE,MSG_DEL_ITEM_BODY,MSG_CONFIRM).then(function(yes){
    if(!yes)return;
    if(!it){toast(MSG_ITEM_MISSING, null, 'bad');return;}
    var row=tombKill(Object.assign({},it));
    if(!slLocalWrite('sl_lookups',row,row.updated_at)){toast(MSG_DEL_NOT_SAVED,5000, 'bad');return;}
    shell.refreshUI();
    toast(navigator.onLine?MSG_DELETED_OK:MSG_SAVED_LOCAL,4000, 'good');
    schedulePush();
  });}

function openAddStudent(){
  // מזהי השדות הם אלה ש-saveNewStudent קוראת — שינוי שם כאן שובר את השמירה.
  var optsHTML='<option value="">-- ללא --</option>';
  slLookups(LK_SHIUR).forEach(function(s){optsHTML+='<option value="'+esc(s.label)+'">'+esc(s.label)+'</option>';});
  var body=''
    +'<div class="frm-row"><label for="new-st-name">שם</label><input aria-label="שם התלמיד" id="new-st-name" type="text" placeholder="שם התלמיד"></div>'
    +'<div class="frm-row"><label for="new-st-tuition">שכ"ל חודשי (ריק = ברירת מחדל)</label><input aria-label="ברירת מחדל" id="new-st-tuition" type="text" inputmode="decimal" placeholder="ברירת מחדל"></div>'
    +'<div class="frm-row"><label for="new-st-shiur">שיעור</label><select id="new-st-shiur">'+optsHTML+'</select></div>'
    +'<div class="frm-row"><label for="new-st-start">חודש הצטרפות</label><input aria-label="2025-09" id="new-st-start" type="month" placeholder="2025-09" dir="ltr" class="month-inp" value="'+esc(monthKeyOf(dayToday()))+'"></div>'
    +'<div class="frm-row-last frm-row"><label for="new-st-end">חודש עזיבה (ריק = עדיין פעיל)</label><input aria-label="2026-08" id="new-st-end" type="month" placeholder="2026-08" dir="ltr" class="month-inp"></div>'
    +'<div class="range-hint-sm">החיוב מחושב רק לחודשים שבתקופה (כולל).</div>';
  var foot='<button class="btn out" data-act="modal-close">ביטול</button>'
          +'<button class="btn" data-act="student-add" data-ksave>הוסף</button>';
  openModal(MSG_ADD_STUDENT, body, foot);
}

function saveNewStudent(){var name=document.getElementById('new-st-name').value.trim(),tuition=document.getElementById('new-st-tuition').value,shiur=document.getElementById('new-st-shiur').value;if(!name){toast(MSG_NAME_REQUIRED, null, 'bad');return;}var rng=readMonthRange('new-st-start','new-st-end');if(!rng)return;var cs={};var tuitionVal=parseInt(tuition,10);if(tuition&&(!isFinite(tuitionVal)||tuitionVal<0)){toast(MSG_TUITION_POSITIVE, null, 'bad');return;}if(tuition)cs.monthly_tuition=tuitionVal;if(shiur)cs.shiur=shiur;
  var cid=pendingCid('student',[name,tuition,shiur,rng.start,rng.end].join(' '));
  var row={client_id:cid,name:name,card_settings:cs,periods:[rng],handled:[],deleted:false,deleted_at:null,deleted_by:null};
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
  if(idEq(S.SC_STUDENT_ID, s.client_id))S.SC_STUDENT_ID=null;
  shell.refreshUI();
  toast(navigator.onLine?MSG_STUDENT_DELETED:MSG_SAVED_LOCAL,4000, 'good');
  schedulePush();
});}

export { addListItem, deleteListItem, deleteStudent, openAddStudent, renderSettingsLists,
         renderSettingsPanel, saveDefaultTuition, saveNewStudent, screenSettingsHTML,
         toggleAcc };
