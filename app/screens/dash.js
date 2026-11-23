// app/screens/dash.js — לוח הבקרה
import { DAY_MONTHS, dayNoon, dayToday } from '../../core/util.js';
import { esc, openModal, toast } from '../../core/ui.js';
import { MIRROR } from '../../core/mirror.js';
import { newClientId, schedulePush } from '../../core/sync.js';
import { barChart } from '../../core/chart.js';
import { CLS_NAME, DISCOUNT_GOAL, DISC_INSTEAD, DISC_NONE, DISC_TITLE, DISC_TOTAL, KPI_COLS, KPI_GEN, KPI_INFO, KPI_TODAY, KV_TABLE, SNAP_APP, SNAP_DISC_MAX, SNAP_SHARE, MSG_CHANGE_NOT_SAVED, YEAR_MONTHS } from '../constants.js';
import { S } from '../state.js';
import { icon } from '../icons.js';
import { snapShare } from '../../core/snap.js';
import { acadMonthKey, acadYearHeb, acadYearOf, countInMonth, fmt, isCreditTxn, isDebtTxn, monthKeyOf, studentDebtIn, studentCreditIn, monthLabel,
         slDefaultTuition, slHasTuition, slLocalWrite, slStudentGroups, studentInMonth, studentTuition } from '../domain.js';

// הצורה המקוצרת נגזרת מהרשימה שבליבה — שם של עד ארבע אותיות נשאר, וארוך ממנו — שלוש וגרש.
var MONTH_HE_SHORT=DAY_MONTHS.map(function(n){return n.length<=4?n:n.slice(0,3)+'׳';});

// כרטיס לכל בסיס — לפי התלמידים · לפי החובה: הכותרת וכפתור המידע שלה, ושלוש טבעות זו לצד זו (חודש נוכחי · סליקה בפועל · תחזית שנתית).
var KPI_RINGS=[['חודש נוכחי',0],['סליקה בפועל',1],['תחזית שנתית',2]];
function kpiCardHTML(k,ids){var x=KPI_INFO[k];
  return '<div class="kpi-card"><div class="kpi-card-h"><span>'+esc(x.t)+'</span><button type="button" class="kpi-info" data-act="kpi-info" data-k="'+k+'" aria-label="מה מחושב כאן — '+esc(x.t)+'">'+icon('info')+'</button></div>'+
    '<div class="kpi-trio">'+KPI_RINGS.map(function(r){var id=ids[r[1]];return '<div class="kpi-mini"><div class="ring" id="dk-ring'+id+'"><b id="dk-pct'+id+'">—</b></div><span class="kpi-l">'+r[0]+'</span></div>';}).join('')+'</div></div>';}
// ההסבר — חזותי: למעלה הכלל, זהה בשני הכרטיסים חוץ מהבסיס (מודגש); ומתחת שלוש עמודות — לכל טבעת שני פסים על ציר השנה:
// עד היכן נספרת החובה ועד היכן התשלומים, וקו «היום». החלק שאחרי היום בפס התשלומים — חיוור: מה שנרשם מראש.
function kpiNowFrac(){var nowK=dayToday().slice(0,7),i=YEAR_MONTHS.findIndex(function(m){return acadMonthKey(S.DASH_YEAR,m)===nowK;});
  return i<0?(nowK>acadMonthKey(S.DASH_YEAR,YEAR_MONTHS[YEAR_MONTHS.length-1])?1:5/12):(i+1)/YEAR_MONTHS.length;}
function kpiBar(kind,span,lbl,f){var w=span==='all'?100:Math.round(f*100);
  return '<div class="ki-bar"><span class="ki-bl">'+(kind==='due'?KPI_GEN.due[0]:KPI_GEN.pay[0])+'</span><div class="ki-track"><i class="ki-fill ki-'+kind+'" style="width:'+w+'%"></i>'+
    (kind==='pay'&&span==='all'&&f<1?'<i class="ki-ahead" style="inset-inline-start:'+Math.round(f*100)+'%"></i>':'')+'<i class="ki-now" style="inset-inline-start:'+Math.round(f*100)+'%"></i></div><span class="ki-bv">'+esc(lbl)+'</span></div>';}
function openKpiInfo(k){var x=KPI_INFO[k];if(!x)return;var g=KPI_GEN,f=kpiNowFrac(),fy=Math.round(f*100);
  // הכלל — זהה בשתי הקבוצות: שורת בסיס (אייקון בצבע האפליקציה), ועוד מה שעבר משנה קודמת (פלוס כחול), ופחות מה שעבר לשנה הבאה (מינוס ורוד).
  function term(op,ico,t){return '<div class="ki-term"><span class="ki-op ki-'+op+'">'+icon(ico)+'</span><span>'+t+'</span></div>';}
  function eq(r,base,ico){return '<div class="ki-eq"><b class="ki-k">'+esc(r[0])+'</b>'+term('base',ico,base)+term('plus','plus',esc(r[2]))+term('minus','minus',esc(r[3]))+'</div>';}
  var gen='<div class="ki-gen">'+eq(g.due,'<b class="kpi-diff">'+esc(x.basis)+'</b>'+esc(g.due[1]),x.ico)+eq(g.pay,esc(g.pay[1]),'txn')+'</div>';
  var cols='<div class="ki-cols">'+KPI_COLS.map(function(c){return '<div class="ki-col"><b class="ki-t">'+esc(c.t)+'</b>'+kpiBar('due',c.due,c.dueL,f)+kpiBar('pay',c.pay,c.payL,f)+'<small class="ki-n">'+esc(c.note)+'</small></div>';}).join('')+'</div>';
  var leg='<div class="ki-leg"><span><i class="ki-sw ki-due"></i>'+esc(g.due[0])+'</span><span><i class="ki-sw ki-pay"></i>'+esc(g.pay[0])+'</span><span><i class="ki-sw ki-ahead-sw"></i>'+esc(g.ahead)+'</span><span><i class="ki-sw ki-now-sw"></i>'+KPI_TODAY+'</span></div>';
  openModal(x.t,'<div class="ki">'+gen+cols+leg+'<p class="ki-note">'+esc(g.note)+'</p></div>','',icon('info'));}

// ההנחות של השנה — לכל תלמיד בכל חודש פעילות: שכר ברירת המחדל של השיעור פחות השכר שבכרטיס; חודשים רצופים באותו שכר — תקופה אחת.
// תקופה אחת — השכר ליד השיעור; שתיים ומעלה — שורת פירוט לכל תקופה. האחוז — שנתי, מכל חודשי הפעילות.
function discData(){var rows=[],defT=0,perT=0;
  S.STUDENTS.forEach(function(s){if(!slHasTuition(s))return;var d0=0,p0=0,parts=[],cur=null;
    YEAR_MONTHS.forEach(function(m){if(!studentInMonth(s,S.DASH_YEAR,m)){cur=null;return;}
      var d=slDefaultTuition(s),p=studentTuition(s,acadMonthKey(S.DASH_YEAR,m));d0+=d;p0+=p;
      if(d===p){cur=null;return;}
      if(cur&&cur.d===d&&cur.p===p){cur.to=m;cur.n++;}else{cur={from:m,to:m,d:d,p:p,n:1};parts.push(cur);}});
    defT+=d0;perT+=p0;if(d0!==p0)rows.push({s:s,disc:d0-p0,def:d0,parts:parts});});
  rows.sort(function(a,b){return b.disc-a.disc||String(a.s.name).localeCompare(String(b.s.name),'he');});
  return {rows:rows,defT:defT,perT:perT};}
function discPct(a,b){return b>0?Math.round(a/b*1000)/10:0;}
function discRowHTML(r){
  return '<div class="disc-row"><div class="disc-h"><span class="disc-name">'+esc(r.s.name)+'<small>'+esc(CLS_NAME[r.s.cls]||'')+(r.parts.length===1?' · ₪'+fmt(r.parts[0].p)+' '+DISC_INSTEAD+' ₪'+fmt(r.parts[0].d):'')+'</small></span>'+
    '<span class="disc-amt">₪'+fmt(r.disc)+'<small>'+discPct(r.disc,r.def)+'%</small></span></div>'+
    (r.parts.length<2?'':r.parts.map(function(p){var rng=MONTH_HE_SHORT[p.from]+(p.to!==p.from?'–'+MONTH_HE_SHORT[p.to]:'');
      return '<div class="disc-part"><span>'+rng+' · ₪'+fmt(p.p)+' '+DISC_INSTEAD+' ₪'+fmt(p.d)+'</span><span>'+fmt(p.d-p.p)+(p.n>1?' × '+p.n:'')+' = ₪'+fmt((p.d-p.p)*p.n)+'</span></div>';}).join(''))+'</div>';}
function discTotHTML(D){var tot=D.defT-D.perT;
  return '<div class="disc-tot"><span>'+DISC_TOTAL+'</span><span class="disc-amt '+(discPct(tot,D.defT)<DISCOUNT_GOAL?'amt-bad':'amt-ok')+'">₪'+fmt(tot)+'<small>'+discPct(tot,D.defT)+'% מתוך ₪'+fmt(D.defT)+'</small></span></div>';}
function openDiscList(){var D=discData();
  var body=D.rows.length?'<div class="disc-list">'+D.rows.map(discRowHTML).join('')+'</div>'+discTotHTML(D):'<p class="empty">'+DISC_NONE+'</p>';
  openModal(DISC_TITLE+' · '+acadYearHeb(S.DASH_YEAR),body,D.rows.length?'<button type="button" class="btn" data-act="disc-share">'+icon('share')+SNAP_SHARE+'</button>':'',icon('info'));}
// שיתוף רשימת ההנחות כתמונות — עד SNAP_DISC_MAX תלמידים בתמונה; הכותרת בכל אחת, והסה״כ באחרונה.
function discShare(){var D=discData(),t=DISC_TITLE+' · '+acadYearHeb(S.DASH_YEAR),pages=[];
  for(var i=0;i<D.rows.length;i+=SNAP_DISC_MAX){var last=i+SNAP_DISC_MAX>=D.rows.length;
    pages.push('<div class="snap-hd"><small>'+esc(SNAP_APP)+'</small><h2>'+esc(t)+'</h2></div><div class="card snap-card"><div class="disc-list">'+D.rows.slice(i,i+SNAP_DISC_MAX).map(discRowHTML).join('')+'</div>'+(last?discTotHTML(D):'')+'</div>');}
  if(pages.length)snapShare(pages,DISC_TITLE+' '+acadYearHeb(S.DASH_YEAR),t);}

function screenDashHTML() {
  return `
<div id="panel-dash" class="panel active">
  <div class="dash-kpis">
    <div class="kpi"><b id="dk-got" class="kpi-n">—</b><span class="kpi-l">נגבה השנה</span></div>
    <div class="kpi"><b id="dk-tgt" class="kpi-n">—</b><span class="kpi-l">יעד</span></div>
    <button type="button" class="kpi kpi-btn" data-act="disc-list" aria-label="רשימת ההנחות"><b id="dk-disc" class="kpi-n">—</b><span class="kpi-l">הנחות <small>(יעד ${DISCOUNT_GOAL}%)</small></span></button>
  </div>
  <div class="kpi-cards">${kpiCardHTML('students',[2,6,4])}${kpiCardHTML('due',[3,7,5])}</div>
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
// תנועה בסעיף CREDIT_METHOD או DEBT_METHOD אינה כסף שהתקבל ואינה נכנסת לסכום.
function txnMonth(t){return dayNoon(String(t.txn_date)).getMonth();}

// {student_client_id:{monthIdx:סכום}} — תנועות בפועל בלבד, בלי זיכויים.
function actualByMonth(year){
  var map={};
  S.TRANSACTIONS.forEach(function(t){
    if(isCreditTxn(t)||isDebtTxn(t)||!t.txn_date||acadYearOf(t.txn_date)!==year)return;
    var a=parseFloat(t.amount)||0;if(!a)return;
    var m=txnMonth(t);if(isNaN(m))return;
    if(!map[t.student_client_id])map[t.student_client_id]={};
    map[t.student_client_id][m]=Math.round(((map[t.student_client_id][m]||0)+a)*100)/100;
  });
  return map;
}

// היעד של הטבלה והגרף — לפי החובה: השכר שבכרטיס של כל תלמיד פעיל בחודש (studentTuition), כולל «שכר לתקופה».
function monthTarget(year,m){
  return S.STUDENTS.reduce(function(a,s){return a+(studentInMonth(s,year,m)?studentTuition(s,acadMonthKey(year,m)):0);},0);
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
        // סכום שמתחת לשכר ברירת המחדל של השיעור — באדום: הנחה, תשלום חלקי, או חודש שלא הושלם (גם כשהיעד לפי החובה).
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
  tf+='<tr class="sub"><td class="stu" title="השכר שבכרטיס של כל תלמיד פעיל בחודש — לפי החובה">יעד</td>';
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
  // חוב שעבר משנה קודמת — תנועות בסעיף DEBT_METHOD בשנה המוצגת: מוסיף ליעד השנתי ולחובה שבטבעות.
  // ובמראה — מה שעבר מהשנה המוצגת לשנה הבאה: חוב יוצא מהחובה, ויתרת זכות יוצאת מהתשלומים (תנועות השנה הבאה).
  function prevDebt(s){return studentDebtIn(s.client_id,S.DASH_YEAR)-studentDebtIn(s.client_id,S.DASH_YEAR+1);}
  function creditOut(s){return studentCreditIn(s.client_id,S.DASH_YEAR+1);}
  var debtSum=S.STUDENTS.reduce(function(a,s){return a+(slHasTuition(s)?prevDebt(s):0);},0),yearTgt=grandTgt+debtSum;
  var outSum=S.STUDENTS.reduce(function(a,s){return a+creditOut(s);},0);
  // שלוש הקוביות — הנגבה של עמודת הסה״כ, והיעד — של הטבלה ועוד החוב משנים קודמות.
  document.getElementById('dk-got').textContent='₪'+fmt(Math.round((grand-outSum)*100)/100);
  // ההנחה בכרטיסים — בכל חודשי הפעילות של השנה: כמה השכר שבכרטיס נמוך משכר ברירת המחדל של השיעור; בלי קשר לגבייה. היעד — 10%: מתחתיו אדום, וממנו ומעלה ירוק.
  var DD=discData(),defT=DD.defT,perT=DD.perT;
  var disc=defT>0?discPct(defT-perT,defT):null,de=document.getElementById('dk-disc');
  de.textContent=disc===null?'—':disc+'%';de.className='kpi-n '+(disc===null?'':disc<DISCOUNT_GOAL?'amt-bad':'amt-ok');
  de.title=disc===null?'':'הנחה בכרטיסים ‎'+fmt(Math.round(defT-perT))+'‎ מתוך ‎'+fmt(defT)+'‎ לפי שכר ברירת המחדל';
  document.getElementById('dk-tgt').textContent=yearTgt?'₪'+fmt(yearTgt):'—';
  // שלושה זוגות, באותו חישוב: החובה — מתחילת השנה ועד סוף הטווח, ועוד החוב שעבר משנה קודמת; והתשלומים שתאריכם עד סוף הטווח, כולל זיכוי מיתרה.
  // «עד החודש» — שני הטווחים עד סוף החודש הנוכחי; «כולל מראש» — החובה עד החודש, והתשלומים — כל מה שנרשם לשנה; «עד סוף השנה» — השנה כולה.
  // השכר: «לפי התלמידים» — שכר ברירת המחדל של השיעור; «לפי החובה» — השכר שבכרטיס (studentTuition).
  var nowK=dayToday().slice(0,7),endK=acadMonthKey(S.DASH_YEAR,YEAR_MONTHS[YEAR_MONTHS.length-1]);
  function paidTo(s,lim){var p=0;S.TRANSACTIONS.forEach(function(t){if(t.student_client_id===s.client_id&&t.txn_date&&!isDebtTxn(t)&&acadYearOf(t.txn_date)===S.DASH_YEAR&&monthKeyOf(t.txn_date)<=lim)p+=parseFloat(t.amount)||0;});return p;}
  // dl — עד איזה חודש החובה, pl — עד איזה חודש התשלומים.
  // כל תשלום נספר במלואו — גם עודף מעבר לשנה כולה, כמו תרומה (ההעברה ליתרת זכות בשנה הבאה — ידנית), ועודף של תלמיד אחד מכסה על חוב של אחר.
  // ב«חודש נוכחי» — לכל תלמיד עד גובה החובה שעד החודש, ועודף מעבר לשנה כולה — בחלקי החודשים שחלפו (עודף/12 לכל חודש).
  // כך באוגוסט — כשאין עוד חודשים הבאים — שלושת הזוגות מגיעים לאותה תוצאה.
  function owed(s,rate,lim){var d=prevDebt(s);YEAR_MONTHS.forEach(function(m){var k=acadMonthKey(S.DASH_YEAR,m);if(k<=lim&&studentInMonth(s,S.DASH_YEAR,m))d+=rate(s,k);});return d;}
  // החודשים שחלפו בשנת הלימודים, כולל הנוכחי (באוגוסט — 12; בשנה שהסתיימה — 12).
  var elapsed=YEAR_MONTHS.filter(function(m){return acadMonthKey(S.DASH_YEAR,m)<=nowK;}).length;
  function cover(rate,dl,pl,ahead){
    var due=0,cov=0;
    S.STUDENTS.forEach(function(s){
      var p=paidTo(s,pl)-creditOut(s);
      if(!slHasTuition(s)){cov+=p;return;}
      var d=owed(s,rate,dl);due+=d;
      if(ahead){cov+=p;return;}
      // חודש נוכחי — מה ששולם עד היום, עד גובה החובה שעד היום; ועודף מעבר לשנה כולה — מתחלק ל-12, ונספרים החלקים של החודשים שחלפו.
      var yr=owed(s,rate,endK);
      cov+=Math.min(p,d)+Math.max(0,p-yr)*elapsed/12;
    });
    return {due:due,cov:Math.round(cov*100)/100};
  }
  var byDef=function(s){return slDefaultTuition(s);},byCard=function(s,k){return studentTuition(s,k);};
  [['2',byDef,nowK,nowK,'חודש נוכחי'],['3',byCard,nowK,nowK,'חודש נוכחי'],['6',byDef,nowK,endK,'סליקה בפועל'],['7',byCard,nowK,endK,'סליקה בפועל'],
   ['4',byDef,endK,endK,'תחזית שנתית'],['5',byCard,endK,endK,'תחזית שנתית']].forEach(function(r){
    var c=cover(r[1],r[2],r[3],r[2]!==r[3]||r[2]===endK),stu=r[1]===byDef;r=[r[0],r[1],r[3],r[4]];
    paintRing('dk-ring'+r[0],'dk-pct'+r[0],pctNum(c.cov,c.due),c.due?(stu?'נגבה':'שולם')+' ‎'+fmt(c.cov)+'‎ מתוך ‎'+fmt(c.due)+'‎ '+r[3]+(stu?', לפי שכר ברירת המחדל':', לפי השכר שבכרטיס'):'אין עדיין חודשים שחלפו','אחוז הגבייה '+r[3]);
  });

  // הגרף — אחוז הגבייה של כל חודש, והקו המקווקו — יעד הגבייה (90%); מעל העמודה — האחוז, ומתחתיו הסכום שנגבה, מקוצר.
  var chRows=YEAR_MONTHS.map(function(m){
    var v=colT[m]||0,t=tgt[m]||0,p=t>0?v/t*100:0;
    return {lab:MONTH_HE_SHORT[m],val:p,tgt:t>0?COLLECT_GOAL:0,end:pctText(v,t)+(v?'\n'+fmtK(v):''),
            txt:MONTH_HE_SHORT[m]+': '+pctText(v,t)+' — נגבה '+fmt(v)+' מתוך יעד '+fmt(t)};
  }),chEl=document.getElementById('dash-chart');
  chEl.innerHTML=barChart(chRows,'אחוז הגבייה החודשי מול יעד הגבייה');
  // כל עמודה בצבע שלב ההתקדמות, כמו הטבעות — מתחת ל-25 אדום · מתחת ל-50 חרדל · מתחת ל-90 כחול · מ-90 ירוק.
  chEl.querySelectorAll('.brow').forEach(function(el,i){
    var p=chRows[i]&&chRows[i].val;
    if(p>0)el.classList.add(p<25?'st-1':p<50?'st-2':p<90?'st-3':'st-4');
  });
  renderDashNotes();
}

export { discShare, openDiscList, openKpiInfo, dashNextYear, dashNotesInput, dashNotesSave, dashPrevYear, renderDash, screenDashHTML };
