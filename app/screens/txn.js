// app/screens/txn.js — מסך התשלומים
import { MSG_SAVED_LOCAL, dayToday, readNum } from '../../core/util.js';
import { idEq, schedulePush, tombKill } from '../../core/sync.js';
import { MIRROR } from '../../core/mirror.js';
import { ask, closeModal, comboDef, comboHTML, comboSet, comboValue, esc, methodGridHTML, methodIcon, methodPick, openModal, toast } from '../../core/ui.js';
import { CREDIT_METHOD, LK_METHOD, MSG_CONFIRM, MSG_DEL_NOT_SAVED, MSG_DEL_TXN_BODY,
         MSG_DEL_TXN_TITLE, MSG_NEED_AMOUNT, MSG_PAY_DELETED, MSG_PAY_EDITED, MSG_PAY_MISSING,
         MSG_PAY_SAVE_FAIL, MSG_PICK_DATE,
         MSG_PICK_STUDENT_PLAIN, TXN_FILTER_ALL } from '../constants.js';
import { S, shell } from '../state.js';
import { icon } from '../icons.js';
import { stIcon } from '../../core/icons.js';
import { acadYearOf, hasCreditItem, isCreditTxn, isCreditValue, pendTxnTag, pendingCid, releaseCid,
         slLocalWrite, slLookups, slSortTxns, studentInMonth, studentTuition, txnAmountHTML } from '../domain.js';

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
      <div class="frm-2">
        <div class="frm-row">
          <label for="txn-amount">סכום (&#8362;)</label>
          <input id="txn-amount" type="text" inputmode="decimal" placeholder="0">
        </div>
        <div class="frm-row">
          <label for="txn-date">תאריך</label>
          <input id="txn-date" type="date">
        </div>
      </div>
      <div class="frm-row">
        <span class="frm-lbl" id="txn-method-lbl">אמצעי תשלום</span>
        <input id="txn-method" type="hidden" value="">
        <div id="txn-method-chips"></div>
        <div id="txn-method-hint" class="hidden credit-sub"></div>
      </div>
      <div class="frm-row">
        <label for="txn-note">הערה</label>
        <input id="txn-note" type="text" placeholder="הערה (לא חובה)">
      </div>
      <button class="txn-save btn" data-act="txn-save" data-ksave>שמור תשלום</button>
    </div>
  </div>
  <div class="card">
    <div class="card-hdr">
      <h3>יומן תשלומים</h3>
      ${comboHTML('txn-filter', { id: 'txn-filter', cls: 'txn-filter', label: 'סנן לפי תלמיד', placeholder: 'סנן לפי תלמיד...' })}
    </div>
    <div id="txn-log" class="txn-log"></div>
  </div>
</div>
`;
}

function studentOpts(a){return a.map(function(s){return{value:s.client_id,label:s.name};});}

// תשלום נרשם לתלמיד פעיל בלבד; הסינון ביומן — לכל תלמיד, ו«כולם» הוא ערך ריק.
// בחירת תלמיד קובעת את הסכום בשכר הלימוד שלו בכל בחירה — ערך שנשאר מתלמיד קודם הוא סכום שגוי שנראה נכון.
comboDef('student',{val:true,items:function(){return studentOpts(S.STUDENTS.filter(function(s){return studentInMonth(s);}));},pick:function(it){
  var at=document.getElementById('txn-amount'),st=it?S.STUDENTS.find(function(s){return idEq(s.client_id,it.value);}):null;
  if(at)at.value=st?(studentTuition(st)||''):'';
}});
comboDef('txn-filter',{val:true,items:function(){return [{value:'',label:TXN_FILTER_ALL}].concat(studentOpts(S.STUDENTS));},pick:function(){renderTxnLog();}});

// אמצעי התשלום — כפתורים עגולים עם אייקון ושם מתחתיו, ולחיצה על הנבחר מבטלת אותו (האמצעי אינו חובה); הערך בשדה הנסתר txn-method.
// הרשת — אחת לטופס התשלום ולעריכת תנועה; target — השדה הנסתר שמחזיק את הערך.
function methodGrid(target,cur){
  var ml=slLookups(LK_METHOD).map(function(m){return m.label;});
  // סעיף הזיכוי מוזרק תמיד, גם כשאינו ברשימה — אחרת מחיקה אחת בהגדרות משביתה בשקט את ניצול יתרת הזכות.
  if(!hasCreditItem())ml.push(CREDIT_METHOD);
  return methodGridHTML({target:target,list:ml,cur:cur,label:'אמצעי התשלום',ico:function(l){return icon(methodIco(l));}});
}
function txnMethodChips(){
  document.getElementById('txn-method-chips').innerHTML=methodGrid('txn-method',document.getElementById('txn-method').value);
}

// בחירה — בליבה; וההערה שמתחת מתעדכנת לפי האמצעי (זיכוי מיתרה).
function txnMethodPick(el){
  var h=methodPick(el);if(!h)return;
  if(h.id==='txn-method')txnMethodHint();
}

function updateDropdowns(){
  txnMethodChips();
  var dt=document.getElementById('txn-date');if(!dt.value)dt.value=dayToday();
  txnMethodHint();
}

function txnMethodHint(){
  var sel=document.getElementById('txn-method'),h=document.getElementById('txn-method-hint');
  if(!sel||!h)return;
  var on=isCreditValue(sel.value);
  h.classList.toggle('hidden',!on);
  if(on)h.innerHTML='<span class="credit-mark">'+stIcon(icon('credit'))+'ניצול יתרת זכות</span> — התנועה תקטין את חוב התלמיד אך <b>לא תיספר כגבייה או כהכנסה</b> בדשבורד.';
}

// ── תשלומים — רישום, יומן ומחיקה רכה ──
// אין לחסום רישום כשאין רשת — חסימה כזו מבטלת את מה שהכתיבה המקומית-תחילה באה לאפשר.
async function saveTxn(){
  var sid=comboValue('txn-student'),date=document.getElementById('txn-date').value,amount=readNum(document.getElementById('txn-amount'), 0),method=document.getElementById('txn-method').value,note=document.getElementById('txn-note').value.trim();
  if(!sid){toast(MSG_PICK_STUDENT_PLAIN, null, 'bad');return;}if(!date){toast(MSG_PICK_DATE, null, 'bad');return;}if(!amount||amount<=0){toast(MSG_NEED_AMOUNT, null, 'bad');return;}
  // client_id נוצר במכשיר ונקשר לתוכן הטופס — שליחה חוזרת מעדכנת את אותה שורה ואינה מכפילה תשלום.
  var cid=pendingCid('txn',[sid,date,amount,method,note].join(' '));
  var row={client_id:cid,student_client_id:sid,txn_date:date,amount:amount,payment_method:method||null,note:note||null,deleted:false,deleted_at:null,deleted_by:null};
  // כשל כתיבה מקומית עוצר כאן ברעש — בכסף אסור להציג «נשמר» על משהו שלא נכתב.
  if(!slLocalWrite('sl_transactions',row)){toast(MSG_PAY_SAVE_FAIL,5000, 'bad');return;}
  releaseCid('txn');
  // הטופס מתרוקן לתשלום הבא — תלמיד, סכום, אמצעי והערה; התאריך נשאר.
  comboSet('txn-student',null);
  document.getElementById('txn-method').value='';
  document.getElementById('txn-note').value='';
  txnMethodChips();txnMethodHint();
  return true;
}

// היומן בשלוש דרגות: חמש האחרונות · ▾ עד תחילת שנת הלימודים · ארכיון — הכל. הסינון לפני החיתוך.
var TXN_LOG_FIRST=5;
function txnLogMore(){S.TXN_LOG_LEVEL=Math.min(2,(S.TXN_LOG_LEVEL||0)+1);renderTxnLog();}
function txnLogLess(){S.TXN_LOG_LEVEL=0;renderTxnLog();}

// אייקון לאמצעי התשלום — לפי מילה בשם, כי הרשימה נערכת בהגדרות (כמו בגיוס).
// האייקון של אמצעי — הזיכוי מיתרה ב-repeat, ושאר האמצעים לפי השם; אחד לבורר ולקבלה.
function methodIco(m){return isCreditValue(m)?'repeat':methodIcon(m);}

function txnDay(d){var p=String(d||'').split('-');return p.length<3?(d||'—'):p[2]+'.'+p[1]+'.'+p[0];}

// «קבלה» — ביומן ובכרטיס התלמיד: קבוצה לכל יום, ובשורה הסכום בראש ובירוק · השם (ביומן), ומתחתיו ההערה ·
// ובקצה עמודה ברוחב קבוע — אייקון האמצעי ומתחתיו שמו, ממורכזים · עריכה (תאריך · סכום · אמצעי · הערה, ומחיקה). זיכוי מיתרה — במסגרת מקווקוות והסכום בכחול.
function txnListHTML(txns,withName){
  var last=null;
  return txns.map(function(t){
    var head='',day=txnDay(t.txn_date),cr=isCreditTxn(t);
    if(day!==last){head='<div class="rc-day">'+esc(day)+'</div>';last=day;}
    var st=withName?S.STUDENTS.find(function(s){return idEq(s.client_id,t.student_client_id);}):null;
    var who=withName?'<b><span class="student-name">'+esc(st?st.name:'#'+t.student_client_id)+'</span>'+pendTxnTag(t)+'</b>'+(t.note?'<small>'+esc(t.note)+'</small>':'')
                    :'<small>'+(t.note?esc(t.note):'')+'</small>'+pendTxnTag(t);
    var meth=cr?CREDIT_METHOD:(t.payment_method||'');
    return head+'<div class="rc'+(cr?' credit':'')+'">'+txnAmountHTML(t)+'<div class="rc-who">'+who+'</div>'+
      '<span class="rc-end" title="'+esc(meth)+'">'+icon(methodIco(meth))+'<span>'+esc(meth||'—')+'</span></span>'+
      '<button class="txn-x" data-act="txn-edit" data-id="'+esc(t.client_id)+'" aria-label="עריכת התשלום" title="עריכת התשלום">'+icon('edit')+'</button></div>';
  }).join('');
}

function renderTxnLog(){
  var fid=comboValue('txn-filter'),lvl=S.TXN_LOG_LEVEL||0,cy=acadYearOf(dayToday());
  var all=slSortTxns(S.TRANSACTIONS, true);
  if(fid)all=all.filter(function(t){return idEq(t.student_client_id, fid);});
  var year=all.filter(function(t){return t.txn_date&&acadYearOf(t.txn_date)>=cy;});
  var txns=lvl>=2?all:lvl===1?year:all.slice(0,TXN_LOG_FIRST);
  var more='';
  if(lvl===0&&year.length>txns.length)more='<button class="txn-more" data-act="txn-log-more">'+icon('down')+'עוד '+(year.length-txns.length)+' — עד תחילת השנה</button>';
  else if(lvl<2&&all.length>txns.length)more='<button class="txn-more" data-act="txn-log-more">'+icon('archive')+'ארכיון — שנים קודמות ('+(all.length-txns.length)+')</button>';
  if(lvl>0)more+='<button class="txn-more txn-less" data-act="txn-log-less">'+icon('up')+'צמצם</button>';
  document.getElementById('txn-log').innerHTML=(txnListHTML(txns,true)||'<div class="empty">אין תשלומים</div>')+more;
}

// עריכת תנועה למפרע — תאריך · סכום · אמצעי · הערה, באותה שורה (אותו client_id); והמחיקה — מכאן.
function txnById(key){return (MIRROR.sl_transactions||[]).filter(function(x){return idEq(x.client_id,key)&&!x.deleted;})[0];}
function openTxnEdit(key){
  var t=txnById(key);if(!t){toast(MSG_PAY_MISSING, null, 'warn');return;}
  var st=S.STUDENTS.find(function(s){return idEq(s.client_id,t.student_client_id);});
  var cur=isCreditTxn(t)?CREDIT_METHOD:(t.payment_method||'');
  var body='<div data-ks><div class="frm-2">'
    +'<div class="frm-row"><label for="te-amount">סכום (&#8362;)</label><input id="te-amount" type="text" inputmode="decimal" value="'+esc(t.amount)+'"></div>'
    +'<div class="frm-row"><label for="te-date">תאריך</label><input id="te-date" type="date" value="'+esc(t.txn_date||'')+'"></div></div>'
    +'<div class="frm-row"><span class="frm-lbl" id="te-method-lbl">אמצעי תשלום</span><input id="te-method" type="hidden" value="'+esc(cur)+'">'
    +methodGrid('te-method',cur)+'</div>'
    +'<div class="frm-row frm-row-last"><label for="te-note">הערה</label><input id="te-note" type="text" value="'+esc(t.note||'')+'" placeholder="הערה (לא חובה)"></div></div>';
  var foot='<button class="btn out" data-act="modal-close">ביטול</button>'
    +'<button class="btn danger" data-act="txn-del" data-id="'+esc(t.client_id)+'">מחיקה</button>'
    +'<button class="btn" data-act="txn-edit-save" data-id="'+esc(t.client_id)+'" data-ksave>שמירה</button>';
  openModal('עריכת תשלום — '+(st?st.name:''),body,foot);
}
function saveTxnEdit(key){
  var t=txnById(key);if(!t){toast(MSG_PAY_MISSING, null, 'warn');return;}
  var date=document.getElementById('te-date').value,amount=readNum(document.getElementById('te-amount'),0);
  if(!date){toast(MSG_PICK_DATE, null, 'bad');return;}if(!amount||amount<=0){toast(MSG_NEED_AMOUNT, null, 'bad');return;}
  var method=document.getElementById('te-method').value,note=document.getElementById('te-note').value.trim();
  var row=Object.assign({},t,{txn_date:date,amount:amount,payment_method:method||null,note:note||null});
  // כשל כתיבה מקומית עוצר כאן ברעש — בכסף אסור להציג «נשמר» על משהו שלא נכתב.
  if(!slLocalWrite('sl_transactions',row)){toast(MSG_PAY_SAVE_FAIL,5000, 'bad');return;}
  closeModal();shell.refreshUI();
  toast(navigator.onLine?MSG_PAY_EDITED:MSG_SAVED_LOCAL,4000, 'good');
  schedulePush();
}

function deleteTxn(key){ask(MSG_DEL_TXN_TITLE,MSG_DEL_TXN_BODY,MSG_CONFIRM).then(function(yes){
  if(!yes)return;
  var t=(MIRROR.sl_transactions||[]).filter(function(x){return idEq(x.client_id,key);})[0];
  if(!t){toast(MSG_PAY_MISSING, null, 'warn');return;}
  var row=tombKill(Object.assign({},t));
  if(!slLocalWrite('sl_transactions',row,row.updated_at)){toast(MSG_DEL_NOT_SAVED,5000, 'bad');return;}
  closeModal();shell.refreshUI();
  toast(navigator.onLine?MSG_PAY_DELETED:MSG_SAVED_LOCAL,4000, 'good');
  schedulePush();
});}

export { deleteTxn, openTxnEdit, renderTxnLog, saveTxn, saveTxnEdit, screenTxnHTML, txnLogLess, txnLogMore, txnListHTML, txnMethodPick, updateDropdowns };
