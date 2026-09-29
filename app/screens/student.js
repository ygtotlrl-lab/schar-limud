// app/screens/student.js — כרטיס התלמיד
import { dayToday } from '../../core/util.js';
import { idEq, schedulePush } from '../../core/sync.js';
import { hwPastLoad } from '../../core/storage.js';
import { mirrorKey } from '../../core/mirror.js';
import { comboDef, comboHTML, esc, toast } from '../../core/ui.js';
import { CREDIT_METHOD, MSG_CHANGE_NOT_SAVED, MSG_DEBT_POSITIVE, MSG_NAME_REQUIRED,
         MSG_SETTINGS_NOT_SAVED, MSG_STUDENT_MISSING2, MSG_STUDENT_OFF, MSG_STUDENT_ON,
         MSG_TUITION_POSITIVE, YEAR_MONTHS } from '../constants.js';
import { S, shell } from '../state.js';
import { acadYearLabel, acadYearOf, calcDistribution, distCredApplied, distCredit, enrollText, fmt,
         isCreditTxn, monthLabel, normMonth, pendTxnTag, readMonthRange, slLocalWrite, slSortTxns,
         slSortYears, txnAmountHTML, txnMethodPill } from '../domain.js';

function screenStudentHTML() {
  return `
<div id="panel-student" class="panel">
  <div class="card">
    <div class="card-hdr"><h3>כרטיס תלמיד</h3></div>
    <div class="sc-body card-body">
      ${comboHTML('student-card', { id: 'sc-student', label: 'בחר תלמיד', placeholder: 'בחר תלמיד...' })}
    </div>
  </div>
  <div id="sc-main" class="hidden">
    <div class="card">
      <div class="sc-hdr">
        <div class="sc-head">
          <div>
            <div class="sc-name" id="sc-name"></div>
            <div class="sc-meta" id="sc-meta"></div>
          </div>
          <button class="sc-tog tog-act-off" id="sc-active-tog" data-act="student-toggle-active">פעיל</button>
        </div>
      </div>
      <div class="acc-hdr" data-act="acc-toggle" data-acc="sc-settings">
        <span>&#9998; הגדרות תלמיד</span><span id="acc-icon-sc-settings">&#9660;</span>
      </div>
      <div class="acc-body" data-ks id="acc-sc-settings">
        <div class="frm-row">
          <label for="sc-edit-name">שם</label>
          <input id="sc-edit-name" type="text">
        </div>
        <div class="frm-row">
          <label for="sc-edit-tuition">שכ"ל חודשי (ריק = ברירת מחדל)</label>
          <input aria-label="ברירת מחדל" id="sc-edit-tuition" type="text" inputmode="decimal" placeholder="ברירת מחדל">
        </div>
        <div class="frm-row">
          <label for="sc-edit-section">סעיף</label>
          <select id="sc-edit-section"></select>
        </div>
        <div class="frm-row">
          <label for="sc-edit-start">חודש הצטרפות</label>
          <input aria-label="2025-09" id="sc-edit-start" type="month" placeholder="2025-09" dir="ltr" class="month-inp">
        </div>
        <div class="frm-row-last frm-row">
          <label for="sc-edit-end">חודש עזיבה (ריק = עדיין פעיל)</label>
          <input aria-label="2026-08" id="sc-edit-end" type="month" placeholder="2026-08" dir="ltr" class="month-inp">
        </div>
        <div class="frm-row">
          <label for="sc-edit-debt">חוב משנים קודמות (הזנה ידנית, ריק = אין)</label>
          <input id="sc-edit-debt" type="text" inputmode="decimal" placeholder="0">
        </div>
        <div class="frm-row">
          <label for="sc-edit-debt-note">הערה לחוב הקודם</label>
          <input aria-label="למשל: יתרת תשפ&quot;ה" id="sc-edit-debt-note" type="text" placeholder="למשל: יתרת תשפ&quot;ה">
        </div>
        <div class="range-hint">החיוב מחושב רק לחודשים שבטווח (כולל). חודש הצטרפות ריק = חיוב לכל חודשי השנה, כמו קודם.</div>
        <button class="btn" data-act="student-settings-save" data-ksave>שמור</button>
      </div>
      <div class="acc-hdr-split acc-hdr" data-act="acc-toggle" data-acc="sc-annual">
        <span>&#128197; כרטיס שנתי</span><span id="acc-icon-sc-annual">&#9660;</span>
      </div>
      <div class="acc-body" id="acc-sc-annual">
        <div class="year-tabs" id="sc-year-tabs"></div>
        <div class="table-scroll">
          <table class="tbl">
            <thead><tr><th>חודש</th><th>דרישה</th><th>שולם</th><th>יתרה</th></tr></thead>
            <tbody id="sc-annual-tbody"></tbody>
            <tfoot id="sc-annual-tfoot"></tfoot>
          </table>
        </div>
        <div id="sc-credit"></div>
        <div class="sc-section">
          <div class="sc-sub-title">תשלומים בשנה זו</div>
          <div id="sc-txn-list"></div>
        </div>
        <div class="sc-section">
          <button class="btn sm" data-act="sc-past-show">&#128220; שנים קודמות (מהענן, קריאה בלבד)</button>
          <div id="sc-past"></div>
        </div>
      </div>
    </div>
  </div>
</div>
`;
}

// המזהה נשמר כמחרוזת — client_id הוא טקסט, ו-parseInt עליו מחזיר NaN.
comboDef('student-card',{val:true,items:function(){return S.STUDENTS.map(function(s){return{value:s.client_id,label:s.name};});},pick:function(it){if(it)selectStudent(it.value);}});

function selectStudent(id){S.SC_STUDENT_ID=String(id);S.SC_YEAR=null;document.getElementById('sc-main').classList.remove('hidden');renderStudentCard();}

// ── כרטיס התלמיד ──
function renderStudentCard(){
  var s=S.STUDENTS.find(function(x){return idEq(x.client_id, S.SC_STUDENT_ID);});if(!s)return;
  var cs=s.card_settings||{};
  document.getElementById('sc-name').textContent=s.name;
  var meta=[];if(cs.section)meta.push(cs.section);meta.push(s.active?'פעיל':'לא פעיל');var er=enrollText(s);if(er)meta.push(er);
  document.getElementById('sc-meta').textContent=meta.join(' • ');
  var tog=document.getElementById('sc-active-tog');tog.textContent=s.active?'פעיל ✓':'לא פעיל';tog.className='sc-tog '+(s.active?'tog-act-on':'tog-act-off');
  document.getElementById('sc-edit-name').value=s.name;document.getElementById('sc-edit-tuition').value=cs.monthly_tuition||'';
  document.getElementById('sc-edit-debt').value=cs.prev_debt||'';document.getElementById('sc-edit-debt-note').value=cs.prev_debt_note||'';
  var pastBox=document.getElementById('sc-past');if(pastBox)pastBox.innerHTML='';
  document.getElementById('sc-edit-start').value=normMonth(s.start_month);document.getElementById('sc-edit-end').value=normMonth(s.end_month);
  var ss=document.getElementById('sc-edit-section');ss.innerHTML='<option value="">-- ללא --</option>';
  (S.LISTS['sections']||[]).forEach(function(sec){ss.innerHTML+='<option value="'+esc(sec.value)+'"'+(cs.section===sec.value?' selected':'')+'>'+esc(sec.value)+'</option>';});
  renderScYearTabs();renderScAnnual();
}

function renderScYearTabs(){
  var y={};S.TRANSACTIONS.filter(function(t){return t.student_client_id===S.SC_STUDENT_ID;}).forEach(function(t){y[acadYearOf(t.txn_date)]=1;});y[acadYearOf(dayToday())]=1;
  var sorted=slSortYears(Object.keys(y).map(Number));if(!S.SC_YEAR||!y[S.SC_YEAR])S.SC_YEAR=acadYearOf(dayToday());
  document.getElementById('sc-year-tabs').innerHTML=sorted.map(function(yr){return'<button class="ytab'+(yr===S.SC_YEAR?' active':'')+'" data-act="sc-year" data-year="'+yr+'">'+acadYearLabel(yr)+'</button>';}).join('');
}

function scSelectYear(y){S.SC_YEAR=y;renderScYearTabs();renderScAnnual();}

function renderScAnnual(){
  if(!S.SC_STUDENT_ID||!S.SC_YEAR)return;
  var s=S.STUDENTS.find(function(x){return idEq(x.client_id, S.SC_STUDENT_ID);});if(!s)return;
  var cs=s.card_settings||{},defT=(parseInt(S.SETTINGS['default_tuition'],10)||0),stuT=cs.monthly_tuition?parseInt(cs.monthly_tuition):defT;
  var dist=calcDistribution(S.SC_STUDENT_ID,S.SC_YEAR),rows='',tR=0,tP=0;
  YEAR_MONTHS.forEach(function(m){
    var i=dist[m]||{req:stuT,paid:0};
    if(i.off){rows+='<tr class="month-off"><td class="month-cell">'+monthLabel(S.SC_YEAR,m)+'</td><td class="off-cell req-cell" colspan="3">לא היה בישיבה</td></tr>';return;}
    var b=i.paid-i.req;tR+=i.req;tP+=i.paid;var bc=b>=0?'amt-ok':i.paid>0?'amt-warn':'amt-bad';
    rows+='<tr><td class="month-cell">'+monthLabel(S.SC_YEAR,m)+'</td><td class="req-cell">'+fmt(i.req)+'</td><td class="paid-cell">'+fmt(i.paid)+'</td><td class="bal-cell '+bc+'">'+(b>=0?'+':'')+fmt(b)+'</td></tr>';
  });
  document.getElementById('sc-annual-tbody').innerHTML=rows;
  var tb=tP-tR,tf='<tr class="sum-row"><td>סה"כ</td><td class="req-cell">'+fmt(tR)+'</td><td class="paid-cell">'+fmt(tP)+'</td><td class="bal-cell '+(tb>=0?'amt-ok':'amt-bad')+'">'+(tb>=0?'+':'')+fmt(tb)+'</td></tr>';
  // חוב משנים קודמות מוזן ידנית ואינו נגרר אוטומטית — המנהל קובע מה נגרר.
  // הוא אינו מתווסף לסה"כ השנה — כדי שיובחן חוב שנולד השנה מחוב שנגרר.
  var pd=parseInt(cs.prev_debt)||0;
  if(pd>0)tf+='<tr class="debt-row"><td>&#128336; חוב משנים קודמות</td><td class="req-cell">'+fmt(pd)+'</td><td></td><td class="bal-cell amt-bad">&#8722;'+fmt(pd)+(cs.prev_debt_note?' <span class="debt-note">('+esc(cs.prev_debt_note)+')</span>':'')+'</td></tr>';
  document.getElementById('sc-annual-tfoot').innerHTML=tf;
  // יתרת זכות מוצגת בשורה נפרדת ובצבע נפרד — אינה נכנסת ל«סה״כ שולם» ואינה מקזזת את שורת החוב.
  var cr=distCredit(dist),applied=distCredApplied(dist),ce=document.getElementById('sc-credit'),ch='';
  if(cr>0)ch+='<div class="credit-note"><span>&#128142; יתרת זכות</span><span>&#8362;'+fmt(cr)+'</span></div>'+
    '<div class="credit-sub">שולם מעבר לסך החיוב בטווח החודשים של התלמיד בשנה זו. אינה חוב שלילי ואינה מקוזזת מסך החוב. לניצולה בשנה הבאה — רשום תשלום באמצעי «'+esc(CREDIT_METHOD)+'».</div>';
  if(applied>0)ch+='<div class="credit-applied credit-sub">↩ מזה זיכוי על חשבון יתרת זכות: &#8362;'+fmt(applied)+' — הקטין את החוב אך אינו כסף שהתקבל (גבייה בפועל בשנה זו: &#8362;'+fmt(Math.round((tP-applied)*100)/100)+').</div>';
  if(ce)ce.innerHTML=ch;
  var yt=slSortTxns(S.TRANSACTIONS.filter(function(t){return t.student_client_id===S.SC_STUDENT_ID&&acadYearOf(t.txn_date)===S.SC_YEAR;}), true);
  document.getElementById('sc-txn-list').innerHTML=yt.map(function(t){return'<div class="txn-row'+(isCreditTxn(t)?' credit':'')+'"><span class="txn-date">'+esc(t.txn_date)+'</span>'+pendTxnTag(t)+'<span class="txn-note">'+esc(t.note||'—')+'</span>'+txnAmountHTML(t)+txnMethodPill(t)+'<button class="btn sm danger" data-act="txn-del" data-id="'+esc(t.client_id)+'">&#10005;</button></div>';}).join('')||'<div class="empty">אין תשלומים בשנה זו</div>';
}

async function scPastShow(){
  var box=document.getElementById('sc-past');if(!box||!S.SC_STUDENT_ID)return;
  box.innerHTML='<div class="empty">טוען מהענן…</div>';
  var sid=S.SC_STUDENT_ID;
  var r=await hwPastLoad(mirrorKey('sl_transactions'),function(t){return t.student_client_id===sid;});
  if(!r.ok){box.innerHTML='<div class="empty">⚠️ אין חיבור — ההיסטוריה זמינה כשיש רשת</div>';return;}
  if(!r.rows.length){box.innerHTML='<div class="empty">אין תנועות משנים קודמות</div>';return;}
  box.innerHTML='<div class="ro-note">קריאה בלבד — מהענן, לא נשמר במכשיר</div>'+
    r.rows.map(function(t){return'<div class="txn-row"><span class="txn-date">'+esc(t.txn_date||'')+'</span><span class="txn-note">'+esc(t.note||'—')+'</span>'+txnAmountHTML(t)+txnMethodPill(t)+'</div>';}).join('');
}

function toggleStudentActive(){var s=S.STUDENTS.find(function(x){return idEq(x.client_id, S.SC_STUDENT_ID);});if(!s)return;
  var row=Object.assign({},s,{active:!s.active});
  if(!slLocalWrite('sl_students',row)){toast(MSG_CHANGE_NOT_SAVED,5000, 'bad');return;}
  shell.refreshUI();
  toast(row.active?MSG_STUDENT_ON:MSG_STUDENT_OFF, null, 'good');schedulePush();}

function saveStudentSettings(){
  var name=document.getElementById('sc-edit-name').value.trim(),tuition=document.getElementById('sc-edit-tuition').value,section=document.getElementById('sc-edit-section').value;
  if(!name){toast(MSG_NAME_REQUIRED, null, 'bad');return;}
  var rng=readMonthRange('sc-edit-start','sc-edit-end');if(!rng)return;
  var s=S.STUDENTS.find(function(x){return idEq(x.client_id, S.SC_STUDENT_ID);});if(!s){toast(MSG_STUDENT_MISSING2, null, 'bad');return;}
  var cs=Object.assign({},s.card_settings||{});
  // אימות מפורש — שדה טקסט מעביר קלט פגום כמות שהוא, ו-parseInt בלי אימות כותב NaN לתוך card_settings.
  var tuitionVal=parseInt(tuition,10);
  if(tuition&&(!isFinite(tuitionVal)||tuitionVal<0)){toast(MSG_TUITION_POSITIVE, null, 'bad');return;}
  if(tuition)cs.monthly_tuition=tuitionVal;else delete cs.monthly_tuition;
  if(section)cs.section=section;else delete cs.section;
  var debtRaw=document.getElementById('sc-edit-debt').value,debtNote=document.getElementById('sc-edit-debt-note').value.trim();
  var debtVal=parseInt(debtRaw);
  if(debtRaw&&(!isFinite(debtVal)||debtVal<0)){toast(MSG_DEBT_POSITIVE, null, 'bad');return;}
  if(debtRaw&&debtVal>0)cs.prev_debt=debtVal;else delete cs.prev_debt;
  if(debtNote)cs.prev_debt_note=debtNote;else delete cs.prev_debt_note;
  var row=Object.assign({},s,{name:name,card_settings:cs,start_month:rng.start_month,end_month:rng.end_month});
  if(!slLocalWrite('sl_students',row)){toast(MSG_SETTINGS_NOT_SAVED,5000, 'bad');return;}
  return true;
}

export { renderScAnnual, renderStudentCard, saveStudentSettings, scPastShow, scSelectYear,
         screenStudentHTML, selectStudent, toggleStudentActive };
