// app/screens/settings.js — מסך ההגדרות
import { MSG_SAVED_LOCAL, uniqHas } from '../../core/util.js';
import { idEq, newClientId, schedulePush, tombKill } from '../../core/sync.js';
import { MIRROR } from '../../core/mirror.js';
import { ask, dragDef, esc, lookupDragApply, toast } from '../../core/ui.js';
import { CREDIT_METHOD, KV_TABLE, LK_METHOD, MSG_CONFIRM, MSG_CREDIT_ITEM_LOCKED,
         MSG_DELETED_OK, MSG_DEL_ITEM_BODY, MSG_DEL_ITEM_TITLE, MSG_DEL_NOT_SAVED,
         MSG_ITEM_MISSING, MSG_ITEM_SAVE_FAIL, MSG_VALUE_BAD, MSG_VALUE_EXISTS,
         MSG_VALUE_SAVE_FAIL } from '../constants.js';
import { S, shell } from '../state.js';
import { isCreditValue, pendLkTag, slLocalWrite, slLookups } from '../domain.js';

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
        <h3>אמצעי תשלום</h3>
        <button class="btn sm" data-act="list-add" data-list="method">+ הוסף</button>
      </div>
      <div id="set-methods-list"></div>
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

function renderSettingsLists(){renderListItems(LK_METHOD,'set-methods-list');}

// הסידור בגרירה מהידית, והסדר נכתב לכל השורות מה-DOM הסופי — במנגנון שבליבה.
dragDef(LK_METHOD, lookupDragApply);

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

export { addListItem, deleteListItem, renderSettingsLists, renderSettingsPanel, saveDefaultTuition,
         screenSettingsHTML, toggleAcc };
