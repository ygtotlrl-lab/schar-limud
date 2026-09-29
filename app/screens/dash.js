// app/screens/dash.js — לוח הבקרה
import { GREG_MONTHS, dayNoon, dayToday } from '../../core/util.js';
import { esc } from '../../core/ui.js';
import { barChart } from '../../core/chart.js';
import { YEAR_MONTHS } from '../constants.js';
import { S } from '../state.js';
import { acadYearLabel, acadYearOf, countInMonth, fmt, isCreditTxn, monthLabel,
         studentInMonth } from '../domain.js';

// הצורה המקוצרת נגזרת מהרשימה שבליבה — שם של עד ארבע אותיות נשאר, וארוך ממנו — שלוש וגרש.
var MONTH_HE_SHORT=GREG_MONTHS.map(function(n){return n.length<=4?n:n.slice(0,3)+'׳';});

function screenDashHTML() {
  return `
<div id="panel-dash" class="panel active">
  <div class="card">
    <div class="card-hdr">
      <h3>לוח שנתי</h3>
      <!-- ממשק RTL: קדימה בזמן = שמאלה. הכפתור הימני (הראשון ב-DOM) מוביל
           אחורה ולכן מסמן ימינה, והשמאלי קדימה ולכן מסמן שמאלה. -->
      <div class="year-nav">
        <button class="btn sm out" data-act="dash-prev-year" title="שנה קודמת">&#9654;</button>
        <span id="dash-year-label" class="year-label"></span>
        <button class="btn sm out" data-act="dash-next-year" title="שנה הבאה">&#9664;</button>
      </div>
    </div>
    <div class="dash-scroll">
      <table class="tbl pivot">
        <thead id="dash-thead"></thead>
        <tbody id="dash-tbody"></tbody>
        <tfoot id="dash-tfoot"></tfoot>
      </table>
    </div>
  </div>
  <div class="card">
    <div class="card-hdr"><h3>גרף גביה חודשי</h3></div>
    <div class="card-body"><div id="dash-chart"></div></div>
  </div>
  <div class="hidden card" id="dash-month-card">
    <div class="card-hdr">
      <h3 id="dash-month-title">פירוט חודש</h3>
      <button class="btn sm out" data-act="dash-month-close">סגור</button>
    </div>
    <div id="dash-month-list"></div>
  </div>
</div>
`;
}

function dashPrevYear(){S.DASH_YEAR--;renderDash();}

function dashNextYear(){S.DASH_YEAR++;renderDash();}

// ── לוח הבקרה ──
// כל חודש מציג את סך התנועות לפי תאריך התנועה, בלי פריסה — השאלה כאן היא «כמה נגבה בחודש הזה».
// תנועה בסעיף CREDIT_METHOD אינה כסף שהתקבל ואינה נכנסת לסכום.
function txnMonth(t){return dayNoon(String(t.txn_date)).getMonth();}

// הגדרה שלא נקבעה היא 0 ולא ניחוש — סכום מומצא מוצג כחוב אמיתי ונכתב לענן בשמירה הראשונה של ההגדרות.
function studentTuition(s){
  var cs=(s&&s.card_settings)||{},defT=(parseInt(S.SETTINGS['default_tuition'],10)||0);
  return cs.monthly_tuition?parseInt(cs.monthly_tuition):defT;
}

// {student_client_id:{monthIdx:סכום}} — תנועות בפועל בלבד, בלי זיכויים.
function actualByMonth(year){
  var map={};
  S.TRANSACTIONS.forEach(function(t){
    if(isCreditTxn(t)||!t.txn_date||acadYearOf(t.txn_date)!==year)return;
    var a=parseFloat(t.amount)||0;if(!a)return;
    var m=txnMonth(t);if(isNaN(m))return;
    if(!map[t.student_client_id])map[t.student_client_id]={};
    map[t.student_client_id][m]=Math.round(((map[t.student_client_id][m]||0)+a)*100)/100;
  });
  return map;
}

function monthTarget(year,m){
  return S.STUDENTS.reduce(function(a,s){return a+(s.active&&studentInMonth(s,year,m)?studentTuition(s):0);},0);
}

function pctNum(got,target){return target>0?Math.round(got/target*100):null;}

function pctText(got,target){var p=pctNum(got,target);return p===null?'—':p+'%';}

function pctClass(got,target){var p=pctNum(got,target);return p===null?'':p>=90?'amt-ok':p>=60?'amt-warn':'amt-bad';}

function ofTargetTitle(got,target){return 'נגבה ‎'+fmt(got)+'‎ מתוך יעד ‎'+fmt(target)+'‎';}

function renderDash(){
  if(S.DASH_YEAR===null)S.DASH_YEAR=acadYearOf(dayToday());
  document.getElementById('dash-year-label').textContent=acadYearLabel(S.DASH_YEAR);
  var act=S.STUDENTS.filter(function(s){return s.active;}),actual=actualByMonth(S.DASH_YEAR);
  var hdr='<tr><th class="stu">תלמיד</th>';
  YEAR_MONTHS.forEach(function(m){
    hdr+='<th class="num mo" title="'+esc(monthLabel(S.DASH_YEAR,m))+' — לחיצה לפירוט" data-act="dash-month" data-year="'+S.DASH_YEAR+'" data-month="'+m+'">'+MONTH_HE_SHORT[m]+'</th>';
  });
  hdr+='<th class="num tot">סה"כ</th></tr>';
  document.getElementById('dash-thead').innerHTML=hdr;

  var rows='',colT={},grand=0;
  act.forEach(function(s){
    var mm=actual[s.client_id]||{},tot=0,cellsHTML='';
    YEAR_MONTHS.forEach(function(m){
      var v=mm[m]||0;tot+=v;colT[m]=Math.round(((colT[m]||0)+v)*100)/100;
      // חודש מחוץ לטווח מוצג כ-'·' רק כשאין בו תנועה — כך סכום העמודה שווה בדיוק לסך תנועות החודש.
      if(!v&&!studentInMonth(s,S.DASH_YEAR,m)){
        cellsHTML+='<td class="num mo off" title="מחוץ לטווח הפעילות של התלמיד" data-act="dash-month" data-year="'+S.DASH_YEAR+'" data-month="'+m+'">·</td>';return;
      }
      var extra=v&&!studentInMonth(s,S.DASH_YEAR,m)?' title="תנועה בחודש שמחוץ לטווח הפעילות של התלמיד"':'';
      cellsHTML+='<td class="num mo '+(v?'paid':'zero')+'"'+extra+' data-act="dash-month" data-year="'+S.DASH_YEAR+'" data-month="'+m+'">'+(v?fmt(v):'—')+'</td>';
    });
    grand=Math.round((grand+tot)*100)/100;
    rows+='<tr><td class="stu">'+esc(s.name)+'</td>'+cellsHTML+'<td class="num tot">'+(tot?fmt(tot):'—')+'</td></tr>';
  });
  document.getElementById('dash-tbody').innerHTML=rows||'<tr><td class="stu">—</td><td class="num" colspan="13">אין תלמידים פעילים</td></tr>';

  // נגבה ויעד מוצגים מעל האחוז — שני המספרים שמהם הוא נגזר.
  var tgt={},grandTgt=0;
  YEAR_MONTHS.forEach(function(m){tgt[m]=monthTarget(S.DASH_YEAR,m);grandTgt+=tgt[m];});
  var tf='<tr class="top"><td class="stu">סה"כ נגבה</td>';
  YEAR_MONTHS.forEach(function(m){tf+='<td class="num mo" data-act="dash-month" data-year="'+S.DASH_YEAR+'" data-month="'+m+'">'+(colT[m]?fmt(colT[m]):'—')+'</td>';});
  tf+='<td class="num tot">'+fmt(grand)+'</td></tr>';
  tf+='<tr class="sub"><td class="stu" title="מספר התלמידים הפעילים בחודש × שכר הלימוד החודשי שלהם">יעד</td>';
  YEAR_MONTHS.forEach(function(m){tf+='<td class="num">'+(tgt[m]?fmt(tgt[m]):'—')+'</td>';});
  tf+='<td class="num tot">'+fmt(grandTgt)+'</td></tr>';
  tf+='<tr class="sub"><td class="stu">אחוז גבייה</td>';
  YEAR_MONTHS.forEach(function(m){tf+='<td class="num '+pctClass(colT[m]||0,tgt[m])+'" title="'+ofTargetTitle(colT[m]||0,tgt[m])+'">'+pctText(colT[m]||0,tgt[m])+'</td>';});
  tf+='<td class="num tot '+pctClass(grand,grandTgt)+'" title="'+ofTargetTitle(grand,grandTgt)+'">'+pctText(grand,grandTgt)+'</td></tr>';
  tf+='<tr class="sub"><td class="stu" title="מספר התלמידים הפעילים בחודש זה, לפי חודש ההצטרפות/עזיבה">פעילים</td>';
  YEAR_MONTHS.forEach(function(m){var c=countInMonth(S.DASH_YEAR,m);tf+='<td class="num">'+(c||'—')+'</td>';});
  // כמה תלמידים היו פעילים בשלב כלשהו בשנה — ולא סכום החודשים.
  var yearCnt=act.filter(function(s){return YEAR_MONTHS.some(function(m){return studentInMonth(s,S.DASH_YEAR,m);});}).length;
  tf+='<td class="num tot" title="תלמידים שהיו פעילים בשלב כלשהו בשנה זו">'+(yearCnt||'—')+'</td></tr>';
  document.getElementById('dash-tfoot').innerHTML=tf;

  document.getElementById('dash-chart').innerHTML=barChart(YEAR_MONTHS.map(function(m){
    var v=colT[m]||0,t=tgt[m]||0;
    return {lab:MONTH_HE_SHORT[m],val:v,tgt:t,end:pctText(v,t),
            txt:MONTH_HE_SHORT[m]+': נגבה '+fmt(v)+' מתוך יעד '+fmt(t)};
  }),'גבייה חודשית מול היעד')
}

function showDashMonth(year,month){
  document.getElementById('dash-month-title').textContent=monthLabel(year,month);
  document.getElementById('dash-month-card').classList.remove('hidden');
  var actual=actualByMonth(year);
  // נכלל גם תלמיד מחוץ לטווח שנרשמה לו תנועה בחודש — כדי שהסכום יהיה זהה לעמודת החודש בטבלה.
  var act=S.STUDENTS.filter(function(s){return s.active&&(studentInMonth(s,year,month)||((actual[s.client_id]||{})[month]||0)>0);});
  var html='',tot=0,target=0;
  act.forEach(function(s){
    var v=(actual[s.client_id]||{})[month]||0,inM=studentInMonth(s,year,month),req=inM?studentTuition(s):0;
    tot+=v;target+=req;
    var c=!inM?'':v>=req?'amt-ok':v>0?'amt-warn':'amt-bad';
    html+='<div class="st-row"><span class="st-name">'+esc(s.name)+'</span><span class="st-paid '+c+'">'+fmt(v)+'</span><span class="st-total">('+(inM?fmt(req):'—')+')</span></div>';
  });
  tot=Math.round(tot*100)/100;
  html+='<div class="dash-total">נגבה: <span class="got-amt">&#8362;'+fmt(tot)+'</span> מתוך יעד <span>&#8362;'+fmt(target)+'</span> <span class="'+pctClass(tot,target)+'">• '+pctText(tot,target)+'</span>'+
    '<div class="dash-total-sub">'+countInMonth(year,month)+' תלמידים פעילים • סך התנועות שנרשמו בחודש זה, ללא פריסה</div></div>';
  document.getElementById('dash-month-list').innerHTML=html||'<div class="empty">אין נתונים</div>';
}

function closeDashMonth(){document.getElementById('dash-month-card').classList.add('hidden');}

export { closeDashMonth, dashNextYear, dashPrevYear, renderDash, screenDashHTML,
         showDashMonth };
