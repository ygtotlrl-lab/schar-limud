// app/screens/dash.js — לוח הבקרה
import { DAY_MONTHS, dayNoon, dayToday } from '../../core/util.js';
import { esc, openModal, toast } from '../../core/ui.js';
import { MIRROR } from '../../core/mirror.js';
import { newClientId, schedulePush } from '../../core/sync.js';
import { barChart } from '../../core/chart.js';
import { KPI_INFO, KV_TABLE, MSG_CHANGE_NOT_SAVED, YEAR_MONTHS } from '../constants.js';
import { S } from '../state.js';
import { icon } from '../icons.js';
import { acadMonthKey, acadYearHeb, acadYearOf, countInMonth, fmt, isCreditTxn, monthKeyOf, monthLabel,
         slDefaultTuition, slHasTuition, slLocalWrite, slStudentGroups, studentInMonth, studentTuition } from '../domain.js';

// הצורה המקוצרת נגזרת מהרשימה שבליבה — שם של עד ארבע אותיות נשאר, וארוך ממנו — שלוש וגרש.
var MONTH_HE_SHORT=DAY_MONTHS.map(function(n){return n.length<=4?n:n.slice(0,3)+'׳';});

// כפתור המידע שבפינת הקובייה — פותח את ההסבר שלה (KPI_INFO).
function kpiInfo(k){return '<button type="button" class="kpi-info" data-act="kpi-info" data-k="'+k+'" aria-label="מה מחושב כאן — '+esc(KPI_INFO[k].t)+'">'+icon('info')+'</button>';}
function openKpiInfo(k){var x=KPI_INFO[k];if(x)openModal(x.t,'<p class="kpi-info-b">'+esc(x.b)+'</p>','',icon('info'));}

function screenDashHTML() {
  return `
<div id="panel-dash" class="panel active">
  <div class="dash-kpis">
    <div class="kpi"><b id="dk-got" class="kpi-n">—</b><span class="kpi-l">נגבה השנה</span></div>
    <div class="kpi"><b id="dk-tgt" class="kpi-n">—</b><span class="kpi-l">יעד</span></div>
    <div class="kpi kpi-ring">${kpiInfo('year')}<div class="ring" id="dk-ring"><b id="dk-pct">—</b></div><span class="kpi-l">כל השנה</span></div>
    <div class="kpi kpi-ring">${kpiInfo('students')}<div class="ring" id="dk-ring2"><b id="dk-pct2">—</b></div><span class="kpi-l">לפי התלמידים</span></div>
    <div class="kpi kpi-ring">${kpiInfo('due')}<div class="ring" id="dk-ring3"><b id="dk-pct3">—</b></div><span class="kpi-l">לפי החובה</span></div>
  </div>
  <div class="card">
    <div class="card-hdr">
      <h3>לוח שנתי</h3>
      <!-- ממשק RTL: קדימה בזמן = שמאלה. הכפתור הימני (הראשון ב-DOM) מוביל
           אחורה ולכן מסמן ימינה, והשמאלי קדימה ולכן מסמן שמאלה. -->
      <div class="year-nav">
        <button class="btn sm out ic" data-act="dash-prev-year" title="שנה קודמת" aria-label="שנה קודמת">${icon('prev')}</button>
        <span id="dash-year-label" class="year-label"></span>
        <button class="btn sm out ic" data-act="dash-next-year" title="שנה הבאה" aria-label="שנה הבאה">${icon('next')}</button>
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
    <div class="card-body"><div id="dash-chart" class="dash-chart"></div></div>
  </div>
  <div class="card">
    <div class="card-hdr"><h3>טיוטת הערות</h3><span id="dash-notes-st" class="notes-st"></span></div>
    <div class="card-body"><textarea id="dash-notes" class="notes-ta" data-inp="dash-notes" data-chg="dash-notes" rows="10" placeholder="הערות, משימות ותזכורות" aria-label="טיוטת הערות"></textarea></div>
  </div>
</div>
`;
}

function dashPrevYear(){S.DASH_YEAR--;renderDash();}

function dashNextYear(){S.DASH_YEAR++;renderDash();}

// ── טיוטת הערות ──
// טקסט חופשי אחד, משותף לכל המכשירים — מפתח dash_notes ב-sl_settings, ומיזוג לפי updated_at כמו כל הגדרה.
// נשמר בהפסקת הקלדה וביציאה מהשדה; הציור אינו דורס שדה שמקלידים בו.
var notesTimer=null;
function renderDashNotes(){
  var ta=document.getElementById('dash-notes');if(!ta||document.activeElement===ta)return;
  ta.value=S.SETTINGS['dash_notes']||'';
}

function dashNotesSave(){
  clearTimeout(notesTimer);notesTimer=null;
  var ta=document.getElementById('dash-notes');if(!ta)return;
  var v=ta.value,st=document.getElementById('dash-notes-st');
  if(v===(S.SETTINGS['dash_notes']||''))return;
  var cur=(MIRROR[KV_TABLE]||[]).filter(function(r){return r&&r.key==='dash_notes';})[0];
  var row=Object.assign({},cur||{client_id:newClientId()},{key:'dash_notes',value:JSON.stringify(v)});
  if(!slLocalWrite(KV_TABLE,row)){toast(MSG_CHANGE_NOT_SAVED,5000,'bad');return;}
  S.SETTINGS['dash_notes']=v;
  if(st)st.textContent='נשמר';
  schedulePush();
}

function dashNotesInput(){
  var st=document.getElementById('dash-notes-st');if(st)st.textContent='';
  clearTimeout(notesTimer);notesTimer=setTimeout(dashNotesSave,1200);
}

// ── לוח הבקרה ──
// כל חודש מציג את סך התנועות לפי תאריך התנועה, בלי פריסה — השאלה כאן היא «כמה נגבה בחודש הזה».
// תנועה בסעיף CREDIT_METHOD אינה כסף שהתקבל ואינה נכנסת לסכום.
function txnMonth(t){return dayNoon(String(t.txn_date)).getMonth();}

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
  return S.STUDENTS.reduce(function(a,s){return a+(studentInMonth(s,year,m)?slDefaultTuition(s):0);},0);
}

// יעד הגבייה — 90%: הקו בגרף, וממנו הטבעת ירוקה.
var COLLECT_GOAL=90;
// סכום מקוצר לעמודה צרה — 93,806 ⟵ 93.8K.
function fmtK(v){return v>=1000?String(Math.round(v/100)/10).replace(/\.0$/,'')+'K':String(Math.round(v));}

function pctNum(got,target){return target>0?Math.round(got/target*100):null;}

function pctText(got,target){var p=pctNum(got,target);return p===null?'—':p+'%';}

// טבעת בצבע שלב ההתקדמות, כמו המד בגיוס: מתחת ל-25 אדום · מתחת ל-50 חרדל · מתחת ל-90 כחול · מ-90 — היעד הושג, ירוק
function paintRing(ringId,txtId,pn,title,aria){
  var rg=document.getElementById(ringId),txt=pn===null?'—':pn+'%';
  document.getElementById(txtId).textContent=txt;
  rg.className='ring'+(pn===null?'':pn<25?' st-1':pn<50?' st-2':pn<90?' st-3':' st-4');
  rg.style.setProperty('--p',pn===null?0:Math.min(100,pn));
  rg.title=title;rg.setAttribute('aria-label',aria+' '+txt);rg.setAttribute('role','img');
}

function pctClass(got,target){var p=pctNum(got,target);return p===null?'':p>=90?'amt-ok':p>=60?'amt-warn':'amt-bad';}

function ofTargetTitle(got,target){return 'נגבה ‎'+fmt(got)+'‎ מתוך יעד ‎'+fmt(target)+'‎';}

function renderDash(){
  if(S.DASH_YEAR===null)S.DASH_YEAR=acadYearOf(dayToday());
  document.getElementById('dash-year-label').textContent=acadYearHeb(S.DASH_YEAR);
  // שורה לכל תלמיד שהיה פעיל בחודש כלשהו בשנה, או שנרשמה לו בה תנועה — כך סכום העמודה שווה לסך התנועות.
  var actual=actualByMonth(S.DASH_YEAR);
  var act=S.STUDENTS.filter(function(s){return actual[s.client_id]||YEAR_MONTHS.some(function(m){return studentInMonth(s,S.DASH_YEAR,m);});});
  var hdr='<tr><th class="stu">תלמיד</th>';
  YEAR_MONTHS.forEach(function(m){
    hdr+='<th class="num mo" title="'+esc(monthLabel(S.DASH_YEAR,m))+'">'+MONTH_HE_SHORT[m]+'</th>';
  });
  hdr+='<th class="num tot">סה"כ</th></tr>';
  document.getElementById('dash-thead').innerHTML=hdr;

  // שורה לכל תלמיד, קבוצה לכל שיעור, והסכומים לכל עמודה.
  function body(list){
    var rows='',colT={},grand=0;
    slStudentGroups(list).forEach(function(g){
    rows+='<tr class="grp"><td class="stu" colspan="14">'+esc(g.label||'ללא שיעור')+'</td></tr>';
    g.rows.forEach(function(s){
      var mm=actual[s.client_id]||{},tot=0,cellsHTML='',defT=slDefaultTuition(s);
      YEAR_MONTHS.forEach(function(m){
        var v=mm[m]||0;tot+=v;colT[m]=Math.round(((colT[m]||0)+v)*100)/100;
        // חודש מחוץ לטווח מוצג כ-'·' רק כשאין בו תנועה — כך סכום העמודה שווה בדיוק לסך תנועות החודש.
        if(!v&&!studentInMonth(s,S.DASH_YEAR,m)){
          cellsHTML+='<td class="num mo off" title="מחוץ לתקופות הפעילות של התלמיד">·</td>';return;
        }
        var extra=v&&!studentInMonth(s,S.DASH_YEAR,m)?' title="תנועה בחודש שמחוץ לתקופות הפעילות של התלמיד"':'';
        // סכום שמתחת לשכר ברירת המחדל של השיעור — באדום: הנחה, תשלום חלקי, או חודש שלא הושלם.
        cellsHTML+='<td class="num mo '+(v?'paid':'zero')+(v&&v<defT?' amt-bad':'')+'"'+extra+'>'+(v?fmt(v):'—')+'</td>';
      });
      grand=Math.round((grand+tot)*100)/100;
      rows+='<tr><td class="stu">'+esc(s.name)+'</td>'+cellsHTML+'<td class="num tot">'+(tot?fmt(tot):'—')+'</td></tr>';
    });
    });
    return {rows:rows,colT:colT,grand:grand};
  }
  var main=body(act),colT=main.colT,grand=main.grand;
  document.getElementById('dash-tbody').innerHTML=main.rows||'<tr><td class="stu">—</td><td class="num" colspan="13">אין תלמידים פעילים</td></tr>';

  // נגבה ויעד מוצגים מעל האחוז — שני המספרים שמהם הוא נגזר.
  var tgt={},grandTgt=0;
  YEAR_MONTHS.forEach(function(m){tgt[m]=monthTarget(S.DASH_YEAR,m);grandTgt+=tgt[m];});
  var tf='<tr class="top"><td class="stu">סה"כ נגבה</td>';
  YEAR_MONTHS.forEach(function(m){tf+='<td class="num">'+(colT[m]?fmt(colT[m]):'—')+'</td>';});
  tf+='<td class="num tot">'+fmt(grand)+'</td></tr>';
  tf+='<tr class="sub"><td class="stu" title="מספר התלמידים הפעילים בחודש × שכר ברירת המחדל של השיעור שלהם">יעד</td>';
  YEAR_MONTHS.forEach(function(m){tf+='<td class="num">'+(tgt[m]?fmt(tgt[m]):'—')+'</td>';});
  tf+='<td class="num tot">'+fmt(grandTgt)+'</td></tr>';
  tf+='<tr class="sub"><td class="stu">אחוז גבייה</td>';
  YEAR_MONTHS.forEach(function(m){tf+='<td class="num '+pctClass(colT[m]||0,tgt[m])+'" title="'+ofTargetTitle(colT[m]||0,tgt[m])+'">'+pctText(colT[m]||0,tgt[m])+'</td>';});
  tf+='<td class="num tot '+pctClass(grand,grandTgt)+'" title="'+ofTargetTitle(grand,grandTgt)+'">'+pctText(grand,grandTgt)+'</td></tr>';
  tf+='<tr class="sub"><td class="stu" title="מספר התלמידים הפעילים בחודש זה, לפי תקופות הפעילות">פעילים</td>';
  YEAR_MONTHS.forEach(function(m){var c=countInMonth(S.DASH_YEAR,m);tf+='<td class="num">'+(c||'—')+'</td>';});
  // כמה תלמידים היו פעילים בשלב כלשהו בשנה — ולא סכום החודשים.
  var yearCnt=S.STUDENTS.filter(function(s){return slHasTuition(s)&&YEAR_MONTHS.some(function(m){return studentInMonth(s,S.DASH_YEAR,m);});}).length;
  tf+='<td class="num tot" title="תלמידים שהיו פעילים בשלב כלשהו בשנה זו">'+(yearCnt||'—')+'</td></tr>';
  document.getElementById('dash-tfoot').innerHTML=tf;
  // שלוש הקוביות — אותם נגבה, יעד ואחוז של עמודת הסה״כ, למעלה.
  document.getElementById('dk-got').textContent='₪'+fmt(grand);
  document.getElementById('dk-tgt').textContent=grandTgt?'₪'+fmt(grandTgt):'—';
  // האחוז — טבעת בצבע שלב ההתקדמות, כמו המד בגיוס: מתחת ל-25 אדום · מתחת ל-50 חרדל · מתחת ל-90 כחול · מ-90 — היעד הושג, ירוק (כמו «אחוז גבייה» בטבלה).
  paintRing('dk-ring','dk-pct',pctNum(grand,grandTgt),ofTargetTitle(grand,grandTgt),'אחוז גבייה שנתי');
  // לפי התלמידים — אחוז משוקלל עד החודש: סך הנגבה בחודשים שחלפו, כולל הנוכחי, מתוך סך היעד שלהם; חודש בלי יעד אינו נספר.
  // כך בשנה שהסתיימה הוא שווה בדיוק ל«כל השנה», וחודש קטן אינו שוקל כמו חודש מלא.
  var nowK=dayToday().slice(0,7),gotTD=0,tgtTD=0;
  YEAR_MONTHS.forEach(function(m){if(acadMonthKey(S.DASH_YEAR,m)<=nowK&&tgt[m]>0){gotTD+=colT[m]||0;tgtTD+=tgt[m];}});
  gotTD=Math.round(gotTD*100)/100;
  paintRing('dk-ring2','dk-pct2',pctNum(gotTD,tgtTD),tgtTD?ofTargetTitle(gotTD,tgtTD)+' עד החודש':'אין עדיין חודשים שחלפו','אחוז הגבייה עד החודש');
  // לפי החובה — לכל תלמיד: מה ששילם השנה עד סוף החודש הנוכחי, כולל זיכוי מיתרה, עד גובה החובה שלו באותם חודשים לפי השכר שבכרטיס (studentTuition).
  // חוב מחודשים קודמים נשאר חוב, ותשלום מראש אינו נספר ואינו מכסה על תלמיד אחר.
  var dueTD=0,covTD=0;
  S.STUDENTS.forEach(function(s){
    if(!slHasTuition(s))return;
    var due=0;
    YEAR_MONTHS.forEach(function(m){var k=acadMonthKey(S.DASH_YEAR,m);if(k<=nowK&&studentInMonth(s,S.DASH_YEAR,m))due+=studentTuition(s,k);});
    if(!due)return;
    var paid=0;
    S.TRANSACTIONS.forEach(function(t){if(t.student_client_id===s.client_id&&t.txn_date&&acadYearOf(t.txn_date)===S.DASH_YEAR&&monthKeyOf(t.txn_date)<=nowK)paid+=parseFloat(t.amount)||0;});
    dueTD+=due;covTD+=Math.min(paid,due);
  });
  covTD=Math.round(covTD*100)/100;
  paintRing('dk-ring3','dk-pct3',pctNum(covTD,dueTD),dueTD?'שולם ‎'+fmt(covTD)+'‎ מתוך החובה ‎'+fmt(dueTD)+'‎ עד החודש, לפי השכר שבכרטיס':'אין עדיין חודשים שחלפו','אחוז החובה ששולם');

  // הגרף — אחוז הגבייה של כל חודש, והקו המקווקו — יעד הגבייה (90%); מעל העמודה — האחוז, ומתחתיו הסכום שנגבה, מקוצר.
  document.getElementById('dash-chart').innerHTML=barChart(YEAR_MONTHS.map(function(m){
    var v=colT[m]||0,t=tgt[m]||0,p=t>0?v/t*100:0;
    return {lab:MONTH_HE_SHORT[m],val:p,tgt:t>0?COLLECT_GOAL:0,end:pctText(v,t)+(v?'\n'+fmtK(v):''),
            txt:MONTH_HE_SHORT[m]+': '+pctText(v,t)+' — נגבה '+fmt(v)+' מתוך יעד '+fmt(t)};
  }),'אחוז הגבייה החודשי מול יעד הגבייה');
  renderDashNotes();
}

export { openKpiInfo, dashNextYear, dashNotesInput, dashNotesSave, dashPrevYear, renderDash, screenDashHTML };
