// app/screens/student.js — רשימת התלמידים וכרטיס התלמיד
import { MSG_SAVED_LOCAL, dayNoon, dayToday } from '../../core/util.js';
import { idEq, schedulePush, tombKill } from '../../core/sync.js';
import { ask, cardWinHTML, esc, openModal, toast, uiNoDialog } from '../../core/ui.js';
import { CLS_LIST, CLS_NAME, CLS_NO_CYCLE, CREDIT_METHOD, MSG_ADD_STUDENT, MSG_CHANGE_NOT_SAVED, MSG_CLS_REQUIRED,
         MSG_DEL_NOT_SAVED, MSG_DEL_STUDENT_ANON, MSG_DEL_STUDENT_POST, MSG_DEL_STUDENT_PRE,
         MSG_DEL_STUDENT_TITLE, MSG_STUDENTS_MANAGE, MSG_STUDENTS_UPDATED, MSG_YEAR_ROLL_TITLE, MSG_STUDENT_DELETED, MSG_STUDENT_SAVE_FAIL, MSG_YEAR_ROLL_DONE, MSG_YEAR_UNSET, MSG_CONFIRM, MSG_DEBT_POSITIVE,
         MSG_NAME_REQUIRED,
         MSG_SETTINGS_NOT_SAVED, MSG_STUDENT_MISSING2, MSG_TUITION_POSITIVE, YEAR_MONTHS } from '../constants.js';
import { S, shell } from '../state.js';
import { icon } from '../icons.js';
import { stIcon } from '../../core/icons.js';
import { bar } from '../../core/chart.js';
import { acadYearHeb, acadYearOf, calcDistribution, cycleLabel, distCredit, enrollText, fmt,
         monthKeyLabel, monthKeyOf, monthLabel, pcCascadeDelete, pendStuTag, pendingCid,
         PER, periodText, periodsProblem, releaseCid, slArchiveGroups, slCycleFor,
         slCycleOf, slLocalWrite, slPeriods, slSchoolYear, slYearApply, slYearPlan,
         studentArchived, studentCredit,
         slSortTxns, slSortYears, slStudentGroups, studentHandled, studentInMonth,
         studentTuition } from '../domain.js';
import { txnListHTML } from './txn.js';

function screenStudentHTML() {
  return `
<div id="panel-student" class="panel">
  <div id="sc-list-view">
    <div class="sc-tools">
      <h3 id="sc-view-title">תלמידים</h3>
      <button class="btn sm out" data-act="sc-manage">${icon('settings')}ניהול</button>
    </div>
    <div class="sc-search">
      <input id="sc-q" class="sc-q" type="search" data-inp="sc-q" placeholder="חיפוש" aria-label="חיפוש תלמיד" autocomplete="off">
    </div>
    <div id="sc-list"></div>
    <button class="sc-arch-btn" id="sc-arch-btn" data-act="sc-archive"></button>
  </div>
  <div id="sc-main" class="hidden">
    <div class="card sc-card" id="sc-card">
      <div class="sc-hdr">
        <div class="sc-head">
          <div class="sc-meta" id="sc-meta"></div>
          <button class="sc-close" data-act="sc-back" aria-label="סגירת הכרטיס" title="סגירה">${icon('close')}</button>
        </div>
      </div>
      <div class="sc-annual">
        <div class="sc-sub-title" id="sc-annual-title"></div>
        <div id="sc-annual"></div>
      </div>
      <div id="sc-past-wrap" class="hidden">
        <div class="acc-hdr-split acc-hdr" data-act="acc-toggle" data-acc="sc-past">
          <span>${icon('archive')}שנים קודמות</span><span id="acc-icon-sc-past">${icon('down')}</span>
        </div>
        <div class="acc-body" id="acc-sc-past"></div>
      </div>
      <div class="acc-hdr-split acc-hdr" data-act="acc-toggle" data-acc="sc-settings">
        <span>${icon('edit')}הגדרות תלמיד</span><span id="acc-icon-sc-settings">${icon('down')}</span>
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
          <label for="sc-edit-cls">שיעור</label>
          <select id="sc-edit-cls" data-chg="sc-cls"></select>
        </div>
        <div class="frm-row" id="sc-cycle-row">
          <label for="sc-edit-cycle">מחזור</label>
          <select id="sc-edit-cycle"></select>
        </div>
        <div class="frm-row">
          <label for="sc-edit-debt">חוב משנים קודמות (הזנה ידנית, ריק = אין)</label>
          <input id="sc-edit-debt" type="text" inputmode="decimal" placeholder="0">
        </div>
        <div class="frm-row">
          <label for="sc-edit-debt-note">הערה לחוב הקודם</label>
          <input aria-label="למשל: יתרת תשפ&quot;ה" id="sc-edit-debt-note" type="text" placeholder="למשל: יתרת תשפ&quot;ה">
        </div>
        <div class="frm-row">
          <span class="frm-lbl">תקופות פעילות</span>
          <div id="sc-periods"></div>
        </div>
        <div class="row-acts">
          <button class="btn" data-act="student-settings-save" data-ksave>שמור</button>
          <button class="btn sm danger" data-act="student-del">${icon('del')}מחיקת התלמיד</button>
        </div>
      </div>
    </div>
  </div>
</div>
`;
}

// ── רשימת התלמידים ──
// הרשימה — מי שיש לו תקופה בחודש הנוכחי או אחריו, מקובץ לפי שיעור: שלא טופלו החודש — מעל הקו, ושטופלו — מתחתיו.
// הארכיון — מי שכל תקופותיו הסתיימו, מקובץ לפי מחזור, החדש ראשון. החיפוש מסנן בשתיהן, ואינו משנה סדר.
// השורה — «רשימת עבודה», כמו המשימות בגיוס: עיגול «טופל» בראשה (לחיצה מסמנת בלי לפתוח) · שם, ומתחתיו מצב החודש ·
// פס «בפועל / צפי» של השנה עד החודש הזה · יתרת זכות. בארכיון — סמל ראשי התיבות במקום העיגול, בלי מצב ובלי פס.
// המחזור והתקופות — בכרטיס בלבד. הכרטיס הפתוח נפרש בשורה שמתחת לתלמיד שלו.
function stuInitials(name){var p=String(name||'?').trim().split(/\s+/);return (p[0]||'?').charAt(0)+(p[1]?p[1].charAt(0):'');}
function curMonth(){return dayNoon(dayToday()).getMonth();}
// מצב החודש — מהחלוקה שבכרטיס: התשלומים נפרסים מתחילת השנה, ולכן החודש הנוכחי מראה מה חסר עד היום.
function stuMonthState(d){
  var c=d&&d[curMonth()];
  if(!c||c.off||!(c.req>0))return '';
  if(c.paid>=c.req-0.005)return '<span class="stu-st ok">שולם החודש</span>';
  if(!(c.paid>0))return '<span class="stu-st bad">לא שולם החודש</span>';
  return '<span class="stu-st warn">חסר &#8362;'+fmt(Math.round((c.req-c.paid)*100)/100)+'</span>';
}
// בפועל / צפי — מתחילת שנת הלימודים ועד החודש הנוכחי, כולל; הנדרש בחודשים שבתקופות, והשולם מהחלוקה (בלי יתרת זכות).
function stuToDate(d){
  var m=curMonth(),req=0,paid=0;
  for(var i=0;i<YEAR_MONTHS.length;i++){var c=d&&d[YEAR_MONTHS[i]];if(c&&!c.off){req+=c.req;paid+=c.paid;}if(YEAR_MONTHS[i]===m)break;}
  return {req:Math.round(req*100)/100,paid:Math.round(paid*100)/100};
}
function progHTML(p){
  if(!(p.req>0))return '';
  var pct=Math.min(100,Math.round(p.paid/p.req*1000)/10);
  return bar(pct,'stu-prog'+(p.paid>=p.req-0.005?' full':''));
}
function studentRowHTML(s,arch,acc){
  var d=calcDistribution(s.client_id,acadYearOf(dayToday())),cr=distCredit(d),k=monthKeyOf(dayToday()),hd=!arch&&studentHandled(s,k);
  var td=arch?null:stuToDate(d);if(td&&acc){acc.req+=td.req;acc.paid+=td.paid;}
  var lead=arch?'<span class="stu-av" aria-hidden="true">'+esc(stuInitials(s.name))+'</span>'
    :'<button class="stu-check'+(hd?' is-on':'')+'" data-act="handled-toggle" data-id="'+esc(s.client_id)+'" data-month="'+esc(k)+'" aria-pressed="'+(hd?'true':'false')+'" aria-label="טופל החודש — '+esc(s.name)+'" title="'+(hd?'טופל החודש':'סמן שטופל החודש')+'">'+(hd?icon('check'):'')+'</button>';
  return '<div class="stu-row'+(hd?' is-handled':'')+'">'+lead+'<button class="stu-open" data-act="student-open" data-id="'+esc(s.client_id)+'">'+
    '<span class="stu-txt"><span class="stu-name"><span class="student-name">'+esc(s.name)+'</span>'+pendStuTag(s)+'</span>'+
    (arch?'':stuMonthState(d)+progHTML(td))+'</span>'+
    (cr>0?'<span class="badge blue" title="יתרת זכות — שולם מראש, אינו מקוזז מהחוב">&#128142; &#8362;'+fmt(cr)+'</span>':'')+'</button>'+
    '</div>';
}

// בכותרת הקבוצה — בפועל / צפי ואחוז, מסכום השורות שבה.
function groupsHTML(groups,done,count,arch){
  return groups.map(function(g){
    var acc={req:0,paid:0},rows=g.rows.map(function(s){return studentRowHTML(s,arch,acc);}).join('');
    var sum=(!arch&&acc.req>0)?'<span class="sc-grp-sum" title="שולם מתחילת השנה מתוך הנדרש עד החודש הזה">&#8362;'+fmt(acc.paid)+' / &#8362;'+fmt(acc.req)+' · '+Math.round(acc.paid/acc.req*100)+'%</span>':'';
    return '<section class="sc-grp'+(done?' is-done':'')+(CLS_NO_CYCLE[g.cls]?' sc-grp-free':'')+'">'+
      '<div class="sc-grp-hd"><h3>'+esc(g.label)+'</h3>'+sum+
      (count?'<span class="sc-grp-cnt">'+g.rows.length+' '+count+'</span>':'')+'</div>'+
      '<div class="stu-list">'+rows+'</div></section>';
  }).join('');
}

function renderStudentList(){
  var box=document.getElementById('sc-list');if(!box)return;
  var q=String(S.SC_Q||'').trim(),k=monthKeyOf(dayToday()),arch=!!S.SC_ARCH;
  var hit=function(s){return !q||String(s.name||'').indexOf(q)>=0;};
  var archAll=S.STUDENTS.filter(studentArchived),live=S.STUDENTS.filter(function(s){return !studentArchived(s);});
  document.getElementById('sc-view-title').textContent=arch?'ארכיון':'תלמידים';
  var ab=document.getElementById('sc-arch-btn');
  ab.innerHTML=arch?icon('prev')+'חזרה לתלמידים':icon('archive')+'ארכיון · '+archAll.length;
  var list=(arch?archAll:live).filter(hit);
  if(!list.length){box.innerHTML='<div class="empty">'+(q?'אין תלמיד התואם את החיפוש':arch?'הארכיון ריק':'אין תלמידים')+'</div>';return;}
  if(arch){box.innerHTML=groupsHTML(slArchiveGroups(list),false,'',true);return;}
  var done=list.filter(function(s){return studentHandled(s,k);});
  box.innerHTML=groupsHTML(slStudentGroups(list.filter(function(s){return !studentHandled(s,k);})),false,'לטיפול')+
    '<div class="sc-line"><span>טופלו החודש · '+done.length+'</span></div>'+groupsHTML(slStudentGroups(done),true,'');
}

function studentSearch(v){S.SC_Q=v;renderStudentPanel();}

function studentArchiveToggle(){S.SC_ARCH=!S.SC_ARCH;renderStudentPanel();window.scrollTo(0,0);}

// ── ניהול — הוספה ומעבר שנתי, כמו בהנהלה ──
function openStudentsManage(){
  openModal(MSG_STUDENTS_MANAGE,'<div class="admin-list">'+
    '<button class="admin-item menu-plain" data-act="student-open-add"><span class="admin-ico">'+icon('plus')+'</span>הוסף תלמיד</button>'+
    '<button class="admin-item menu-warn" data-act="year-open"><span class="admin-ico">'+icon('cycle')+'</span>מעבר שנתי</button>'+
  '</div>','');
}

function clsOptions(cur){
  return '<option value="">-- בחר --</option>'+CLS_LIST.map(function(c){return '<option value="'+c+'"'+(c===cur?' selected':'')+'>'+esc(CLS_NAME[c])+'</option>';}).join('');
}

// בורר המחזור — שבע שנים סביב שנת הלימודים; ערך שמור מחוץ לטווח נוסף כמות שהוא.
function cycleOptions(cur){
  var y=slSchoolYear()||cur,ys=[];
  for(var i=-4;i<=3;i++){if(y)ys.push(y+i);}
  if(cur&&ys.indexOf(cur)<0)ys.push(cur);
  ys.sort(function(a,b){return b-a;});
  return (cur?'':'<option value="">-- בחר --</option>')+ys.map(function(n){
    return '<option value="'+n+'"'+(n===cur?' selected':'')+'>'+esc(cycleLabel(n))+'</option>';}).join('');
}

function openAddStudent(){
  // מזהי השדות הם אלה ש-saveNewStudent קוראת — שינוי שם כאן שובר את השמירה.
  var body=''
    +'<div class="frm-row"><label for="new-st-name">שם</label><input aria-label="שם התלמיד" id="new-st-name" type="text" placeholder="שם התלמיד"></div>'
    +'<div class="frm-row"><label for="new-st-tuition">שכ"ל חודשי (ריק = ברירת מחדל)</label><input aria-label="ברירת מחדל" id="new-st-tuition" type="text" inputmode="decimal" placeholder="ברירת מחדל"></div>'
    +'<div class="frm-row"><label for="new-st-cls">שיעור</label><select id="new-st-cls">'+clsOptions('')+'</select></div>'
    +'<div class="frm-row frm-row-last"><span class="frm-lbl">תקופות פעילות</span>'+PER.editorHTML([])+'</div>'
    +'<div class="range-hint-sm">החיוב מחושב רק לחודשים שבתקופה (כולל).</div>';
  var foot='<button class="btn out" data-act="modal-close">ביטול</button>'
          +'<button class="btn" data-act="student-add" data-ksave>הוסף</button>';
  openModal(MSG_ADD_STUDENT, body, foot);
}

function saveNewStudent(){var name=document.getElementById('new-st-name').value.trim(),tuition=document.getElementById('new-st-tuition').value,cls=document.getElementById('new-st-cls').value;if(!name){toast(MSG_NAME_REQUIRED, null, 'bad');return;}if(CLS_LIST.indexOf(cls)<0){toast(MSG_CLS_REQUIRED, null, 'bad');return;}var per=PER.read(document.getElementById('modal'));if(per.err){toast(per.err, null, 'bad');return;}var cs={};var tuitionVal=parseInt(tuition,10);if(tuition&&(!isFinite(tuitionVal)||tuitionVal<0)){toast(MSG_TUITION_POSITIVE, null, 'bad');return;}if(tuition)cs.monthly_tuition=tuitionVal;
  var cid=pendingCid('student',[name,tuition,cls,JSON.stringify(per.ps)].join(' '));
  var row={client_id:cid,name:name,card_settings:cs,periods:per.ps,handled:[],cls:cls,cycle:slCycleFor(cls)||null,deleted:false,deleted_at:null,deleted_by:null};
  if(!slLocalWrite('sl_students',row)){toast(MSG_STUDENT_SAVE_FAIL,5000, 'bad');return;}
  releaseCid('student');
  return true;}

// מחיקה פיזית של תלמיד היא מחיקת כל היסטוריית הכספים שלו — המפתח הזר restrict רק עוצר אותה במסד.
function deleteStudent(){var s=scStudent();
 ask(MSG_DEL_STUDENT_TITLE,MSG_DEL_STUDENT_PRE+(s?s.name:MSG_DEL_STUDENT_ANON)+MSG_DEL_STUDENT_POST,MSG_CONFIRM).then(function(yes){
  if(!yes)return;
  if(!s){toast(MSG_STUDENT_MISSING2, null, 'warn');return;}
  var row=tombKill(Object.assign({},s));
  if(!slLocalWrite('sl_students',row,row.updated_at)){toast(MSG_DEL_NOT_SAVED,5000, 'bad');return;}
  pcCascadeDelete('sl_students',row);
  S.SC_STUDENT_ID=null;
  shell.refreshUI();
  toast(navigator.onLine?MSG_STUDENT_DELETED:MSG_SAVED_LOCAL,4000, 'good');
  schedulePush();
});}

// ── המעבר השנתי ──
function openYearTransition(){
  var plan=slYearPlan();if(!plan){toast(MSG_YEAR_UNSET, null, 'warn');return;}
  var nb=plan.up.filter(function(s){return s.cls==='b';}).length,na=plan.up.length-nb;
  var ns=S.STUDENTS.filter(function(s){return CLS_NO_CYCLE[s.cls]&&!s.deleted&&!studentArchived(s);}).length;
  openModal(MSG_YEAR_ROLL_TITLE,
    '<div class="year-note">'+
      '<strong class="danger-strong">'+stIcon('warn')+'פעולה בלתי הפיכה!</strong><br>'+
      '• שיעור ג׳ ('+plan.grad.length+') — התקופה נסגרת ב'+esc(monthKeyLabel(plan.close))+', ועוברים לארכיון ('+esc(cycleLabel(plan.year))+')<br>'+
      '• שיעור ב׳ ⟵ שיעור ג׳ ('+nb+')<br>'+
      '• שיעור א׳ ⟵ שיעור ב׳ ('+na+')<br>'+
      (ns?'• '+esc(CLS_NAME.s)+' ('+ns+') — ללא שינוי<br>':'')+
      '• שנת הלימודים: '+esc(cycleLabel(plan.year).replace('מחזור ',''))+' ⟵ '+esc(cycleLabel(plan.year+1).replace('מחזור ',''))+
      (plan.skip.length?'<br>• לא נסגרים — תקופה שמתחילה אחרי '+esc(monthKeyLabel(plan.close))+': '+plan.skip.map(function(s){return esc(s.name);}).join(', '):'')+
    '</div>'+
    '<div class="year-danger">לא ניתן לבטל פעולה זו לאחר האישור.</div>',
    '<button class="btn out" data-act="modal-close">ביטול</button>'+
    '<button class="btn danger" data-act="year-go">'+icon('cycle')+'בצע מעבר שנתי</button>');
}

function doYearTransition(){
  var plan=slYearPlan();if(!plan){toast(MSG_YEAR_UNSET, null, 'warn');return;}
  var n=slYearApply(plan);
  shell.refreshUI();
  if(n<0){toast(MSG_CHANGE_NOT_SAVED,5000,'bad');return;}
  toast(MSG_YEAR_ROLL_DONE+n+MSG_STUDENTS_UPDATED, null, 'good');
}

// הרשימה והכרטיס מתחלפים בנקודה אחת — תלמיד שנמחק במכשיר אחר מחזיר לרשימה.
// הכרטיס נפתח בחלון הכרטיס של הליבה (cardWinHTML, sc-win): הרקע, ✕ ו-Escape סוגרים ב-sc-back.
// רכיב הכרטיס אחד, וחונה ב-sc-main כשהחלון סגור.
function scRowOf(id){
  var rows=document.querySelectorAll('#sc-list .stu-open');
  for(var i=0;i<rows.length;i++){if(idEq(rows[i].getAttribute('data-id'),id))return rows[i].parentNode;}
  return null;
}

function _scWinClose(){
  var card=document.getElementById('sc-card'),park=document.getElementById('sc-main'),w=document.getElementById('sc-win');
  if(card&&park&&card.parentNode!==park)park.appendChild(card);
  if(w)w.remove();
}
function renderStudentPanel(){
  if(S.SC_STUDENT_ID&&!scStudent())S.SC_STUDENT_ID=null;
  renderStudentList();
  var row=S.SC_STUDENT_ID?scRowOf(S.SC_STUDENT_ID):null;
  // תלמיד שאינו ברשימה המוצגת (חיפוש, ארכיון) — הכרטיס נסגר
  if(!row){S.SC_STUDENT_ID=null;_scWinClose();return;}
  row.classList.add('is-open');
  var w=document.getElementById('sc-win');
  if(!w){
    document.body.insertAdjacentHTML('beforeend',cardWinHTML({id:'sc-win',close:'sc-back',label:(scStudent()||{}).name||''}));
    w=document.getElementById('sc-win');
  }
  var card=document.getElementById('sc-card'),inn=w.querySelector('.cw-in');
  if(card&&card.parentNode!==inn)inn.appendChild(card);
  renderStudentCard();
}
// המזהה נשמר כמחרוזת — client_id הוא טקסט, ו-parseInt עליו מחזיר NaN. לחיצה על התלמיד הפתוח — סוגרת.
function studentOpen(id){
  S.SC_STUDENT_ID=idEq(S.SC_STUDENT_ID,id)?null:String(id);
  renderStudentPanel();
}

function studentBack(){S.SC_STUDENT_ID=null;renderStudentPanel();}

// ── כרטיס התלמיד ──
function renderStudentCard(){
  var s=S.STUDENTS.find(function(x){return idEq(x.client_id, S.SC_STUDENT_ID);});if(!s)return;
  var cs=s.card_settings||{};
  var meta=[];if(CLS_NAME[s.cls])meta.push(CLS_NAME[s.cls]);var cyl=cycleLabel(slCycleOf(s));if(cyl)meta.push(cyl);meta.push(studentInMonth(s)?'פעיל':'לא פעיל');var er=enrollText(s);if(er)meta.push(er);
  document.getElementById('sc-meta').textContent=meta.join(' • ');
  document.getElementById('sc-edit-name').value=s.name;document.getElementById('sc-edit-tuition').value=cs.monthly_tuition||'';
  document.getElementById('sc-edit-debt').value=cs.prev_debt||'';document.getElementById('sc-edit-debt-note').value=cs.prev_debt_note||'';
  document.getElementById('sc-edit-cls').innerHTML=clsOptions(s.cls);
  document.getElementById('sc-edit-cycle').innerHTML=cycleOptions(slCycleOf(s));
  document.getElementById('sc-cycle-row').classList.toggle('hidden',!!CLS_NO_CYCLE[s.cls]);
  document.getElementById('sc-periods').innerHTML=PER.editorHTML(slPeriods(s));renderScAnnual();
}

// ── תקופות הפעילות ──
// המפתח של תקופה — start: מפתח טבעי שהוא ערכו, ואין שתי תקופות באותו חודש התחלה.
function scStudent(){return S.STUDENTS.find(function(x){return idEq(x.client_id, S.SC_STUDENT_ID);});}

// ── הכרטיס השנתי ──
// השנה הנוכחית פרוסה תמיד; שנים קודמות — בהרחבה שמתחתיה, ורק כשיש בהן תנועה. כל שנה — אותו כרטיס.
function scYearsWithTxns(){
  var y={};S.TRANSACTIONS.forEach(function(t){if(t.student_client_id===S.SC_STUDENT_ID&&t.txn_date)y[acadYearOf(t.txn_date)]=1;});
  return Object.keys(y).map(Number);
}

function annualHTML(s,year){
  var cs=s.card_settings||{},stuT=studentTuition(s),cur=year===acadYearOf(dayToday());
  var dist=calcDistribution(s.client_id,year),rows='',tR=0,tP=0;
  YEAR_MONTHS.forEach(function(m){
    var i=dist[m]||{req:stuT,paid:0};
    if(i.off){rows+='<tr class="month-off"><td class="month-cell">'+monthLabel(year,m)+'</td><td class="off-cell req-cell" colspan="3">לא היה בישיבה</td></tr>';return;}
    var b=i.paid-i.req;tR+=i.req;tP+=i.paid;var bc=b>=0?'amt-ok':i.paid>0?'amt-warn':'amt-bad';
    rows+='<tr><td class="month-cell">'+monthLabel(year,m)+'</td><td class="req-cell">'+fmt(i.req)+'</td><td class="paid-cell">'+fmt(i.paid)+'</td><td class="bal-cell '+bc+'">'+(b>=0?'+':'')+fmt(b)+'</td></tr>';
  });
  var tb=tP-tR,tf='<tr class="sum-row"><td>סה"כ</td><td class="req-cell">'+fmt(tR)+'</td><td class="paid-cell">'+fmt(tP)+'</td><td class="bal-cell '+(tb>=0?'amt-ok':'amt-bad')+'">'+(tb>=0?'+':'')+fmt(tb)+'</td></tr>';
  // חוב משנים קודמות מוזן ידנית ואינו נגרר אוטומטית — המנהל קובע מה נגרר; מוצג בשנה הנוכחית בלבד,
  // ואינו מתווסף לסה"כ השנה — כדי שיובחן חוב שנולד השנה מחוב שנגרר.
  var pd=parseInt(cs.prev_debt)||0;
  if(cur&&pd>0)tf+='<tr class="debt-row"><td>&#128336; חוב משנים קודמות</td><td class="req-cell">'+fmt(pd)+'</td><td></td><td class="bal-cell amt-bad">&#8722;'+fmt(pd)+(cs.prev_debt_note?' <span class="debt-note">('+esc(cs.prev_debt_note)+')</span>':'')+'</td></tr>';
  var html='<div class="table-scroll"><table class="tbl"><thead><tr><th>חודש</th><th>דרישה</th><th>שולם</th><th>יתרה</th></tr></thead><tbody>'+rows+'</tbody><tfoot>'+tf+'</tfoot></table></div>';
  // יתרת זכות מוצגת בשורה נפרדת ובצבע נפרד — אינה נכנסת ל«סה״כ שולם» ואינה מקזזת את שורת החוב.
  var cr=distCredit(dist);
  if(cr>0)html+='<div class="credit-note"><span>&#128142; יתרת זכות</span><span>&#8362;'+fmt(cr)+'</span></div>'+
    '<div class="credit-sub">שולם מעבר לסך החיוב בטווח החודשים של התלמיד בשנה זו. אינה חוב שלילי ואינה מקוזזת מסך החוב. לניצולה בשנה הבאה — רשום תשלום באמצעי «'+esc(CREDIT_METHOD)+'».</div>';
  var yt=slSortTxns(S.TRANSACTIONS.filter(function(t){return t.student_client_id===s.client_id&&acadYearOf(t.txn_date)===year;}), true);
  html+='<div class="sc-part"><div class="sc-sub-title">תשלומים בשנה זו</div>'+(txnListHTML(yt,false)||'<div class="empty">אין תשלומים בשנה זו</div>')+'</div>';
  return html;
}

function renderScAnnual(){
  var s=scStudent();if(!s)return;
  var cy=acadYearOf(dayToday());
  document.getElementById('sc-annual-title').textContent='כרטיס שנתי · '+acadYearHeb(cy);
  document.getElementById('sc-annual').innerHTML=annualHTML(s,cy);
  var past=slSortYears(scYearsWithTxns().filter(function(y){return y<cy;})).reverse();
  document.getElementById('sc-past-wrap').classList.toggle('hidden',!past.length);
  document.getElementById('acc-sc-past').innerHTML=past.map(function(y){
    return '<div class="sc-past-year"><div class="sc-sub-title">'+esc(acadYearHeb(y))+'</div>'+annualHTML(s,y)+'</div>';}).join('');
}

// בחירת שיעור בכרטיס ממלאת את המחזור מהחישוב — והבורר נשאר לעריכה ידנית.
function scClsChanged(){
  var cls=document.getElementById('sc-edit-cls').value;
  document.getElementById('sc-cycle-row').classList.toggle('hidden',!!CLS_NO_CYCLE[cls]);
  var c=slCycleFor(cls);if(!c)return;
  document.getElementById('sc-edit-cycle').innerHTML=cycleOptions(c);
}

function saveStudentSettings(){
  var name=document.getElementById('sc-edit-name').value.trim(),tuition=document.getElementById('sc-edit-tuition').value,cls=document.getElementById('sc-edit-cls').value,cycle=CLS_NO_CYCLE[cls]?null:(parseInt(document.getElementById('sc-edit-cycle').value,10)||null);
  if(!name){toast(MSG_NAME_REQUIRED, null, 'bad');return;}
  if(CLS_LIST.indexOf(cls)<0){toast(MSG_CLS_REQUIRED, null, 'bad');return;}
  var s=S.STUDENTS.find(function(x){return idEq(x.client_id, S.SC_STUDENT_ID);});if(!s){toast(MSG_STUDENT_MISSING2, null, 'warn');return;}
  var cs=Object.assign({},s.card_settings||{});
  // אימות מפורש — שדה טקסט מעביר קלט פגום כמות שהוא, ו-parseInt בלי אימות כותב NaN לתוך card_settings.
  var tuitionVal=parseInt(tuition,10);
  if(tuition&&(!isFinite(tuitionVal)||tuitionVal<0)){toast(MSG_TUITION_POSITIVE, null, 'bad');return;}
  if(tuition)cs.monthly_tuition=tuitionVal;else delete cs.monthly_tuition;
  var debtRaw=document.getElementById('sc-edit-debt').value,debtNote=document.getElementById('sc-edit-debt-note').value.trim();
  var debtVal=parseInt(debtRaw);
  if(debtRaw&&(!isFinite(debtVal)||debtVal<0)){toast(MSG_DEBT_POSITIVE, null, 'bad');return;}
  if(debtRaw&&debtVal>0)cs.prev_debt=debtVal;else delete cs.prev_debt;
  if(debtNote)cs.prev_debt_note=debtNote;else delete cs.prev_debt_note;
  var per=PER.read(document.getElementById('acc-sc-settings'));if(per.err){toast(per.err, null, 'bad');return;}
  var row=Object.assign({},s,{name:name,card_settings:cs,cls:cls,cycle:cycle,periods:per.ps});
  if(!slLocalWrite('sl_students',row)){toast(MSG_SETTINGS_NOT_SAVED,5000, 'bad');return;}
  return true;
}

export { deleteStudent, doYearTransition, openAddStudent, openStudentsManage, openYearTransition,
         renderScAnnual, renderStudentPanel,
         saveNewStudent, saveStudentSettings, scClsChanged, screenStudentHTML, studentArchiveToggle,
         studentBack, studentOpen, studentSearch };
