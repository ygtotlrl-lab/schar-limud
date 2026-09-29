// app/screens/txn.js — מסך התשלומים
import { MSG_SAVED_LOCAL, dayToday, readNum } from '../../core/util.js';
import { idEq, schedulePush, tombKill } from '../../core/sync.js';
import { MIRROR } from '../../core/mirror.js';
import { sessUserId } from '../../core/auth.js';
import { ask, comboDef, comboHTML, comboValue, esc, toast } from '../../core/ui.js';
import { CREDIT_METHOD, MSG_CONFIRM, MSG_DEL_NOT_SAVED, MSG_DEL_TXN_BODY,
         MSG_DEL_TXN_TITLE, MSG_NEED_AMOUNT, MSG_PAY_DELETED, MSG_PAY_MISSING,
         MSG_PAY_SAVE_FAIL, MSG_PICK_DATE,
         MSG_PICK_STUDENT_PLAIN, TXN_FILTER_ALL } from '../constants.js';
import { S, shell } from '../state.js';
import { hasCreditItem, isCreditTxn, isCreditValue, pendTxnTag, pendingCid,
         releaseCid, slLocalWrite, txnAmountHTML,
         txnMethodPill } from '../domain.js';

function screenTxnHTML() {
  return `
<div id="panel-txn" class="panel">
  <div class="card">
    <div class="card-hdr"><h3>הוספת תשלום</h3></div>
    <div class="card-body" data-ks>
      <div class="frm-row">
        <label>תלמיד</label>
        ${comboHTML('student', { id: 'txn-student', label: 'הקלד לחיפוש', placeholder: 'הקלד לחיפוש...' })}
      </div>
      <div class="frm-row">
        <label for="txn-date">תאריך</label>
        <input id="txn-date" type="date">
      </div>
      <div class="frm-row">
        <label for="txn-amount">סכום (&#8362;)</label>
        <input id="txn-amount" type="text" inputmode="decimal" placeholder="0">
      </div>
      <div class="frm-row">
        <label for="txn-method">אמצעי תשלום</label>
        <select id="txn-method" data-chg="txn-method">
          <option value="">-- בחר --</option>
        </select>
        <div id="txn-method-hint" class="hidden credit-sub"></div>
      </div>
      <div class="frm-row">
        <label for="txn-note">הערה</label>
        <textarea aria-label="הערה אופציונלית" id="txn-note" placeholder="הערה אופציונלית..."></textarea>
      </div>
      <button class="txn-save btn" data-act="txn-save" data-ksave>שמור תשלום</button>
    </div>
  </div>
  <div class="card">
    <div class="card-hdr">
      <h3>יומן תשלומים</h3>
      ${comboHTML('txn-filter', { id: 'txn-filter', cls: 'txn-filter', label: 'סנן לפי תלמיד', placeholder: 'סנן לפי תלמיד...' })}
    </div>
    <div id="txn-log"></div>
  </div>
</div>
`;
}

function studentOpts(a){return a.map(function(s){return{value:s.client_id,label:s.name};});}

// תשלום נרשם לתלמיד פעיל בלבד; הסינון ביומן — לכל תלמיד, ו«כולם» הוא ערך ריק.
comboDef('student',{val:true,items:function(){return studentOpts(S.STUDENTS.filter(function(s){return s.active;}));}});
comboDef('txn-filter',{val:true,items:function(){return [{value:'',label:TXN_FILTER_ALL}].concat(studentOpts(S.STUDENTS));},pick:function(){renderTxnLog();}});

function updateDropdowns(){
  var ml=S.LISTS['payment_methods']||[],sel=document.getElementById('txn-method'),cur=sel.value;
  sel.innerHTML='<option value="">-- בחר --</option>';ml.forEach(function(m){sel.innerHTML+='<option value="'+esc(m.value)+'">'+esc(m.value)+'</option>';});
  // סעיף הזיכוי מוזרק תמיד, גם כשאינו ברשימה — אחרת מחיקה אחת בהגדרות משביתה בשקט את ניצול יתרת הזכות.
  if(!hasCreditItem())sel.innerHTML+='<option value="'+esc(CREDIT_METHOD)+'">'+esc(CREDIT_METHOD)+'</option>';
  if(cur)sel.value=cur;
  var dt=document.getElementById('txn-date');if(!dt.value)dt.value=dayToday();
  var at=document.getElementById('txn-amount');if(!at.value)at.value=S.SETTINGS['default_tuition']||'';
  txnMethodHint();
}

function txnMethodHint(){
  var sel=document.getElementById('txn-method'),h=document.getElementById('txn-method-hint');
  if(!sel||!h)return;
  var on=isCreditValue(sel.value);
  h.classList.toggle('hidden',!on);
  if(on)h.innerHTML='<span class="credit-mark">↩ ניצול יתרת זכות</span> — התנועה תקטין את חוב התלמיד אך <b>לא תיספר כגבייה או כהכנסה</b> בדשבורד.';
}

// ── תשלומים — רישום, יומן ומחיקה רכה ──
// אין לחסום רישום כשאין רשת — חסימה כזו מבטלת את מה שהכתיבה המקומית-תחילה באה לאפשר.
async function saveTxn(){
  var sid=comboValue('txn-student'),date=document.getElementById('txn-date').value,amount=readNum(document.getElementById('txn-amount'), 0),method=document.getElementById('txn-method').value,note=document.getElementById('txn-note').value.trim();
  if(!sid){toast(MSG_PICK_STUDENT_PLAIN, null, 'bad');return;}if(!date){toast(MSG_PICK_DATE, null, 'bad');return;}if(!amount||amount<=0){toast(MSG_NEED_AMOUNT, null, 'bad');return;}
  // client_id נוצר במכשיר ונקשר לתוכן הטופס — שליחה חוזרת מעדכנת את אותה שורה ואינה מכפילה תשלום.
  var cid=pendingCid('txn',[sid,date,amount,method,note].join(' '));
  var row={client_id:cid,student_client_id:sid,txn_date:date,amount:amount,payment_method:method||null,note:note||null,created_by_client_id:sessUserId(),deleted:false,deleted_at:null,deleted_by:null};
  // כשל כתיבה מקומית עוצר כאן ברעש — בכסף אסור להציג «נשמר» על משהו שלא נכתב.
  if(!slLocalWrite('sl_transactions',row)){toast(MSG_PAY_SAVE_FAIL,5000, 'bad');return;}
  releaseCid('txn');
  document.getElementById('txn-amount').value=S.SETTINGS['default_tuition']||'';
  document.getElementById('txn-note').value='';
  return true;
}

function renderTxnLog(){
  var fid=comboValue('txn-filter');
  var txns=S.TRANSACTIONS.slice().sort(function(a,b){return a.txn_date>b.txn_date?-1:1;}).slice(0,60);
  if(fid)txns=txns.filter(function(t){return idEq(t.student_client_id, fid);});
  document.getElementById('txn-log').innerHTML=txns.map(function(t){var st=S.STUDENTS.find(function(s){return idEq(s.client_id, t.student_client_id);});return'<div class="txn-row'+(isCreditTxn(t)?' credit':'')+'"><span class="txn-date">'+esc(t.txn_date)+'</span><span class="student-name">'+esc(st?st.name:'#'+t.student_client_id)+'</span>'+pendTxnTag(t)+txnAmountHTML(t)+txnMethodPill(t)+'<button class="btn sm danger" data-act="txn-del" data-id="'+esc(t.client_id)+'">&#10005;</button></div>';}).join('')||'<div class="empty">אין תשלומים</div>';
}

function deleteTxn(key){ask(MSG_DEL_TXN_TITLE,MSG_DEL_TXN_BODY,MSG_CONFIRM).then(function(yes){
  if(!yes)return;
  var t=(MIRROR.sl_transactions||[]).filter(function(x){return idEq(x.client_id,key);})[0];
  if(!t){toast(MSG_PAY_MISSING, null, 'bad');return;}
  var row=tombKill(Object.assign({},t));
  if(!slLocalWrite('sl_transactions',row,row.updated_at)){toast(MSG_DEL_NOT_SAVED,5000, 'bad');return;}
  shell.refreshUI();
  toast(navigator.onLine?MSG_PAY_DELETED:MSG_SAVED_LOCAL,4000, 'good');
  schedulePush();
});}

export { deleteTxn, renderTxnLog, saveTxn, screenTxnHTML, txnMethodHint,
         updateDropdowns };
