// app/screens/student.js — רשימת התלמידים וכרטיס התלמיד
import { MSG_SAVED_LOCAL, dayToday } from '../../core/util.js';
import { idEq, schedulePush, tombKill } from '../../core/sync.js';
import { ask, esc, openModal, toast, uiNoDialog } from '../../core/ui.js';
import { CLS_LIST, CLS_NAME, CREDIT_METHOD, MSG_ADD_STUDENT, MSG_CHANGE_NOT_SAVED, MSG_CLS_REQUIRED,
         MSG_DEL_NOT_SAVED, MSG_DEL_STUDENT_ANON, MSG_DEL_STUDENT_POST, MSG_DEL_STUDENT_PRE,
         MSG_DEL_STUDENT_TITLE, MSG_STUDENTS_MANAGE, MSG_STUDENTS_UPDATED, MSG_YEAR_ROLL_TITLE, MSG_STUDENT_DELETED, MSG_STUDENT_SAVE_FAIL, MSG_YEAR_ROLL_DONE, MSG_YEAR_UNSET, MSG_CONFIRM, MSG_DEBT_POSITIVE,
         MSG_DEL_PERIOD_BODY, MSG_DEL_PERIOD_TITLE, MSG_HANDLED_OFF, MSG_HANDLED_ON,
         MSG_NAME_REQUIRED, MSG_PERIOD_MISSING,
         MSG_SETTINGS_NOT_SAVED, MSG_STUDENT_MISSING2, MSG_STUDENT_OFF, MSG_STUDENT_ON,
         MSG_TUITION_POSITIVE, YEAR_MONTHS } from '../constants.js';
import { S, shell } from '../state.js';
import { acadYearHeb, acadYearOf, calcDistribution, cycleLabel, distCredApplied, distCredit, enrollText, fmt,
         isCreditTxn, monthKeyLabel, monthKeyOf, monthLabel, pcCascadeDelete, pendStuTag, pendTxnTag, pendingCid,
         periodText, periodsProblem, periodsToggled, readMonthRange, releaseCid, slArchiveGroups, slCycleFor,
         slCycleOf, slHandledToggle, slLocalWrite, slPeriods, slSchoolYear, slYearApply, slYearPlan,
         studentArchived, studentCredit,
         slSortTxns, slSortYears, slStudentGroups, studentContinues, studentHandled, studentInMonth,
         studentTuition, txnAmountHTML, txnMethodPill } from '../domain.js';

function screenStudentHTML() {
  return `
<div id="panel-student" class="panel">
  <div id="sc-list-view">
    <div class="sc-tools">
      <h3 id="sc-view-title">תלמידים</h3>
      <button class="btn sm out" data-act="sc-manage">&#9881; ניהול</button>
    </div>
    <div class="sc-search">
      <input id="sc-q" class="sc-q" type="search" data-inp="sc-q" placeholder="חיפוש" aria-label="חיפוש תלמיד" autocomplete="off">
    </div>
    <div id="sc-list"></div>
    <button class="sc-arch-btn" id="sc-arch-btn" data-act="sc-archive"></button>
  </div>
  <div id="sc-main" class="hidden">
    <div class="card" id="sc-card">
      <div class="sc-hdr">
        <div class="sc-head">
          <div class="sc-meta" id="sc-meta"></div>
          <div class="sc-togs">
            <button class="sc-tog tog-act-off" id="sc-handled-tog" data-act="student-handled" aria-pressed="false">טופל</button>
            <button class="sc-tog tog-act-off" id="sc-active-tog" data-act="student-toggle-active">פעיל</button>
            <button class="sc-close" data-act="sc-back" aria-label="סגירת הכרטיס" title="סגירה">&#10005;</button>
          </div>
        </div>
      </div>
      <div class="sc-annual">
        <div class="sc-sub-title" id="sc-annual-title"></div>
        <div id="sc-annual"></div>
      </div>
      <div id="sc-past-wrap" class="hidden">
        <div class="acc-hdr-split acc-hdr" data-act="acc-toggle" data-acc="sc-past">
          <span>&#128220; שנים קודמות</span><span id="acc-icon-sc-past">&#9660;</span>
        </div>
        <div class="acc-body" id="acc-sc-past"></div>
      </div>
      <div class="acc-hdr-split acc-hdr" data-act="acc-toggle" data-acc="sc-settings">
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
          <label for="sc-edit-cls">שיעור</label>
          <select id="sc-edit-cls" data-chg="sc-cls"></select>
        </div>
        <div class="frm-row">
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
        <div class="row-acts">
          <button class="btn" data-act="student-settings-save" data-ksave>שמור</button>
          <button class="btn sm danger" data-act="student-del">&#10005; מחיקת התלמיד</button>
        </div>
        <div class="sc-part">
          <div class="sc-sub-title">&#128197; תקופות פעילות</div>
          <div id="sc-periods-list"></div>
          <button class="btn sm" data-act="period-open" data-id="">+ הוסף תקופה</button>
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
// האריח — סמל · שם · יתרת זכות · ו«טופל» לחודש הנוכחי (בארכיון — בלי «טופל»); המחזור והתקופות — בכרטיס בלבד.
// שני אריחים בשורה מ-560px, אחד בטלפון; הכרטיס הפתוח נפרש לכל רוחב הקבוצה בשורה שמתחת לאריח שלו.
function stuInitials(name){var p=String(name||'?').trim().split(/\s+/);return (p[0]||'?').charAt(0)+(p[1]?p[1].charAt(0):'');}
function studentRowHTML(s,arch){
  var cr=studentCredit(s.client_id,acadYearOf(dayToday())),k=monthKeyOf(dayToday()),hd=!arch&&studentHandled(s,k);
  return '<div class="stu-row"><button class="stu-open" data-act="student-open" data-id="'+esc(s.client_id)+'">'+
    '<span class="stu-av" aria-hidden="true">'+esc(stuInitials(s.name))+'</span>'+
    '<span class="stu-txt"><span class="stu-name"><span class="student-name">'+esc(s.name)+'</span>'+pendStuTag(s)+'</span>'+
    '<span class="stu-credit">'+(cr>0?'<span class="badge blue" title="יתרת זכות — שולם מראש, אינו מקוזז מהחוב">&#128142; &#8362;'+fmt(cr)+'</span>':'')+'</span></span></button>'+
    (arch?'':'<button class="st-handled'+(hd?' is-on':'')+'" data-act="handled-toggle" data-id="'+esc(s.client_id)+'" data-month="'+esc(k)+'" aria-pressed="'+(hd?'true':'false')+'">'+(hd?'טופל ✓':'טופל')+'</button>')+
    '</div>';
}

function groupsHTML(groups,done,count,arch){
  return groups.map(function(g){
    return '<section class="sc-grp'+(done?' is-done':'')+'">'+
      '<div class="sc-grp-hd"><h3>'+esc(g.label)+'</h3>'+
      (count?'<span class="sc-grp-cnt">'+g.rows.length+' '+count+'</span>':'')+'</div>'+
      '<div class="stu-tiles">'+g.rows.map(function(s){return studentRowHTML(s,arch);}).join('')+'</div></section>';
  }).join('');
}

function renderStudentList(){
  var box=document.getElementById('sc-list');if(!box)return;
  var q=String(S.SC_Q||'').trim(),k=monthKeyOf(dayToday()),arch=!!S.SC_ARCH;
  var hit=function(s){return !q||String(s.name||'').indexOf(q)>=0;};
  var archAll=S.STUDENTS.filter(studentArchived),live=S.STUDENTS.filter(function(s){return !studentArchived(s);});
  document.getElementById('sc-view-title').textContent=arch?'ארכיון':'תלמידים';
  var ab=document.getElementById('sc-arch-btn');
  ab.innerHTML=arch?'&#8250; חזרה לתלמידים':'&#128451; ארכיון · '+archAll.length;
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
    '<button class="admin-item menu-plain" data-act="student-open-add"><span class="admin-ico">&#10133;</span>הוסף תלמיד</button>'+
    '<button class="admin-item menu-warn" data-act="year-open"><span class="admin-ico">&#128260;</span>מעבר שנתי</button>'+
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
    +'<div class="frm-row"><label for="new-st-start">חודש הצטרפות</label><input aria-label="2025-09" id="new-st-start" type="month" placeholder="2025-09" dir="ltr" class="month-inp" value="'+esc(monthKeyOf(dayToday()))+'"></div>'
    +'<div class="frm-row-last frm-row"><label for="new-st-end">חודש עזיבה (ריק = עדיין פעיל)</label><input aria-label="2026-08" id="new-st-end" type="month" placeholder="2026-08" dir="ltr" class="month-inp"></div>'
    +'<div class="range-hint-sm">החיוב מחושב רק לחודשים שבתקופה (כולל).</div>';
  var foot='<button class="btn out" data-act="modal-close">ביטול</button>'
          +'<button class="btn" data-act="student-add" data-ksave>הוסף</button>';
  openModal(MSG_ADD_STUDENT, body, foot);
}

function saveNewStudent(){var name=document.getElementById('new-st-name').value.trim(),tuition=document.getElementById('new-st-tuition').value,cls=document.getElementById('new-st-cls').value;if(!name){toast(MSG_NAME_REQUIRED, null, 'bad');return;}if(CLS_LIST.indexOf(cls)<0){toast(MSG_CLS_REQUIRED, null, 'bad');return;}var rng=readMonthRange('new-st-start','new-st-end');if(!rng)return;var cs={};var tuitionVal=parseInt(tuition,10);if(tuition&&(!isFinite(tuitionVal)||tuitionVal<0)){toast(MSG_TUITION_POSITIVE, null, 'bad');return;}if(tuition)cs.monthly_tuition=tuitionVal;
  var cid=pendingCid('student',[name,tuition,cls,rng.start,rng.end].join(' '));
  var row={client_id:cid,name:name,card_settings:cs,periods:[rng],handled:[],cls:cls,cycle:slCycleFor(cls)||null,deleted:false,deleted_at:null,deleted_by:null};
  if(!slLocalWrite('sl_students',row)){toast(MSG_STUDENT_SAVE_FAIL,5000, 'bad');return;}
  releaseCid('student');
  return true;}

// מחיקה פיזית של תלמיד היא מחיקת כל היסטוריית הכספים שלו — המפתח הזר restrict רק עוצר אותה במסד.
function deleteStudent(){var s=scStudent();
 ask(MSG_DEL_STUDENT_TITLE,MSG_DEL_STUDENT_PRE+(s?s.name:MSG_DEL_STUDENT_ANON)+MSG_DEL_STUDENT_POST,MSG_CONFIRM).then(function(yes){
  if(!yes)return;
  if(!s){toast(MSG_STUDENT_MISSING2, null, 'bad');return;}
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
  var plan=slYearPlan();if(!plan){toast(MSG_YEAR_UNSET, null, 'bad');return;}
  var nb=plan.up.filter(function(s){return s.cls==='b';}).length,na=plan.up.length-nb;
  openModal(MSG_YEAR_ROLL_TITLE,
    '<div class="year-note">'+
      '<strong class="danger-strong">⚠️ פעולה בלתי הפיכה!</strong><br>'+
      '• שיעור ג׳ ('+plan.grad.length+') — התקופה נסגרת ב'+esc(monthKeyLabel(plan.close))+', ועוברים לארכיון ('+esc(cycleLabel(plan.year))+')<br>'+
      '• שיעור ב׳ ⟵ שיעור ג׳ ('+nb+')<br>'+
      '• שיעור א׳ ⟵ שיעור ב׳ ('+na+')<br>'+
      '• שנת הלימודים: '+esc(cycleLabel(plan.year).replace('מחזור ',''))+' ⟵ '+esc(cycleLabel(plan.year+1).replace('מחזור ',''))+
      (plan.skip.length?'<br>• לא נסגרים — תקופה שמתחילה אחרי '+esc(monthKeyLabel(plan.close))+': '+plan.skip.map(function(s){return esc(s.name);}).join(', '):'')+
    '</div>'+
    '<div class="year-danger">לא ניתן לבטל פעולה זו לאחר האישור.</div>',
    '<button class="btn out" data-act="modal-close">ביטול</button>'+
    '<button class="btn danger" data-act="year-go">&#128260; בצע מעבר שנתי</button>');
}

function doYearTransition(){
  var plan=slYearPlan();if(!plan){toast(MSG_YEAR_UNSET, null, 'bad');return;}
  var n=slYearApply(plan);
  shell.refreshUI();
  if(n<0){toast(MSG_CHANGE_NOT_SAVED,5000,'bad');return;}
  toast(MSG_YEAR_ROLL_DONE+n+MSG_STUDENTS_UPDATED, null, 'good');
}

// הרשימה והכרטיס מתחלפים בנקודה אחת — תלמיד שנמחק במכשיר אחר מחזיר לרשימה.
// הכרטיס נפתח בתוך הרשימה, מתחת לשורת התלמיד — הרשימה נשארת מעליו ומתחתיו. רכיב הכרטיס אחד,
// וחונה ב-sc-main בין ציור לציור: ציור הרשימה מחליף את תוכנה, ורכיב שבתוכה היה נמחק.
function scRowOf(id){
  var rows=document.querySelectorAll('#sc-list .stu-open');
  for(var i=0;i<rows.length;i++){if(idEq(rows[i].getAttribute('data-id'),id))return rows[i].parentNode;}
  return null;
}

function renderStudentPanel(){
  var card=document.getElementById('sc-card'),park=document.getElementById('sc-main');
  if(card&&card.parentNode!==park)park.appendChild(card);
  if(S.SC_STUDENT_ID&&!scStudent())S.SC_STUDENT_ID=null;
  renderStudentList();
  var row=S.SC_STUDENT_ID?scRowOf(S.SC_STUDENT_ID):null;
  // תלמיד שאינו ברשימה המוצגת (חיפוש, ארכיון) — הכרטיס נסגר
  if(!row){S.SC_STUDENT_ID=null;return;}
  row.classList.add('is-open');
  row.parentNode.insertBefore(card,row.nextSibling);
  renderStudentCard();
}

// המזהה נשמר כמחרוזת — client_id הוא טקסט, ו-parseInt עליו מחזיר NaN. לחיצה על התלמיד הפתוח — סוגרת.
function studentOpen(id){
  S.SC_STUDENT_ID=idEq(S.SC_STUDENT_ID,id)?null:String(id);
  renderStudentPanel();
  var row=S.SC_STUDENT_ID?scRowOf(S.SC_STUDENT_ID):null;
  if(row&&row.scrollIntoView)row.scrollIntoView({block:'nearest'});
}

function studentBack(){S.SC_STUDENT_ID=null;renderStudentPanel();}

function toggleStudentHandled(){
  var k=monthKeyOf(dayToday());
  if(!slHandledToggle(S.SC_STUDENT_ID,k)){toast(MSG_CHANGE_NOT_SAVED,5000,'bad');return;}
  shell.refreshUI();
  toast(studentHandled(scStudent(),k)?MSG_HANDLED_ON:MSG_HANDLED_OFF,null,'good');
}

// ── כרטיס התלמיד ──
function renderStudentCard(){
  var s=S.STUDENTS.find(function(x){return idEq(x.client_id, S.SC_STUDENT_ID);});if(!s)return;
  var cs=s.card_settings||{};
  var meta=[];if(CLS_NAME[s.cls])meta.push(CLS_NAME[s.cls]);var cyl=cycleLabel(slCycleOf(s));if(cyl)meta.push(cyl);meta.push(studentInMonth(s)?'פעיל':'לא פעיל');var er=enrollText(s);if(er)meta.push(er);
  document.getElementById('sc-meta').textContent=meta.join(' • ');
  var on=studentContinues(s),tog=document.getElementById('sc-active-tog');tog.textContent=on?'פעיל ✓':'לא פעיל';tog.className='sc-tog '+(on?'tog-act-on':'tog-act-off');
  var hd=studentHandled(s),ht=document.getElementById('sc-handled-tog');ht.textContent=hd?'טופל ✓':'טופל';ht.className='sc-tog '+(hd?'tog-act-on':'tog-act-off');ht.setAttribute('aria-pressed',hd?'true':'false');
  document.getElementById('sc-edit-name').value=s.name;document.getElementById('sc-edit-tuition').value=cs.monthly_tuition||'';
  document.getElementById('sc-edit-debt').value=cs.prev_debt||'';document.getElementById('sc-edit-debt-note').value=cs.prev_debt_note||'';
  document.getElementById('sc-edit-cls').innerHTML=clsOptions(s.cls);
  document.getElementById('sc-edit-cycle').innerHTML=cycleOptions(slCycleOf(s));
  renderScPeriods(s);renderScAnnual();
}

// ── תקופות הפעילות ──
// המפתח של תקופה — start: מפתח טבעי שהוא ערכו, ואין שתי תקופות באותו חודש התחלה.
function renderScPeriods(s){
  document.getElementById('sc-periods-list').innerHTML=slPeriods(s).map(function(p){
    return '<div class="set-list-item"><span>'+esc(periodText(p))+'</span><span class="row-acts">'+
      '<button class="btn sm out" data-act="period-open" data-id="'+esc(p.start)+'">&#9998; עריכה</button>'+
      '<button class="btn sm danger" data-act="period-del" data-id="'+esc(p.start)+'">&#10005; מחק</button></span></div>';
  }).join('')||'<div class="empty">אין תקופות — התלמיד אינו מחויב באף חודש</div>';
}

function scStudent(){return S.STUDENTS.find(function(x){return idEq(x.client_id, S.SC_STUDENT_ID);});}

function periodOpen(start){
  var s=scStudent();if(!s)return;
  var p=start?slPeriods(s).filter(function(x){return x.start===start;})[0]:{start:monthKeyOf(dayToday()),end:null};
  if(!p){toast(MSG_PERIOD_MISSING, null, 'bad');return;}
  var body=''
    +'<div class="frm-row"><label for="per-start">חודש הצטרפות</label><input id="per-start" type="month" placeholder="2025-09" dir="ltr" class="month-inp" value="'+esc(p.start)+'"></div>'
    +'<div class="frm-row-last frm-row"><label for="per-end">חודש עזיבה (ריק = עדיין פעיל)</label><input id="per-end" type="month" placeholder="2026-08" dir="ltr" class="month-inp" value="'+esc(p.end||'')+'"></div>';
  var foot='<button class="btn out" data-act="modal-close">ביטול</button>'
          +'<button class="btn" data-act="period-save" data-id="'+esc(start||'')+'" data-ksave>שמירה</button>';
  openModal(start?'עריכת תקופה':'תקופה חדשה', body, foot);
}

// התקופה שנערכה מוחלפת לפי המפתח שלה; הרשימה החדשה עוברת את בדיקת המסד לפני הכתיבה.
function periodSave(start){
  var s=scStudent();if(!s)return;
  if(!document.getElementById('per-start')){uiNoDialog('periodSave','per-start');return;}
  var rng=readMonthRange('per-start','per-end');if(!rng)return;
  var ps=slPeriods(s).filter(function(p){return p.start!==start;}).concat([rng]);
  var bad=periodsProblem(ps);if(bad){toast(bad, null, 'bad');return;}
  var row=Object.assign({},s,{periods:slPeriods({periods:ps})});
  if(!slLocalWrite('sl_students',row)){toast(MSG_CHANGE_NOT_SAVED,5000, 'bad');return;}
  return true;
}

function periodDelete(start){
  ask(MSG_DEL_PERIOD_TITLE,MSG_DEL_PERIOD_BODY,MSG_CONFIRM).then(function(yes){
    if(!yes)return;
    var s=scStudent();if(!s)return;
    var ps=slPeriods(s).filter(function(p){return p.start!==start;});
    if(!slLocalWrite('sl_students',Object.assign({},s,{periods:ps}))){toast(MSG_CHANGE_NOT_SAVED,5000, 'bad');return;}
    shell.refreshUI();
  });
}

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
  var cr=distCredit(dist),applied=distCredApplied(dist);
  if(cr>0)html+='<div class="credit-note"><span>&#128142; יתרת זכות</span><span>&#8362;'+fmt(cr)+'</span></div>'+
    '<div class="credit-sub">שולם מעבר לסך החיוב בטווח החודשים של התלמיד בשנה זו. אינה חוב שלילי ואינה מקוזזת מסך החוב. לניצולה בשנה הבאה — רשום תשלום באמצעי «'+esc(CREDIT_METHOD)+'».</div>';
  if(applied>0)html+='<div class="credit-applied credit-sub">↩ מזה זיכוי על חשבון יתרת זכות: &#8362;'+fmt(applied)+' — הקטין את החוב אך אינו כסף שהתקבל (גבייה בפועל בשנה זו: &#8362;'+fmt(Math.round((tP-applied)*100)/100)+').</div>';
  var yt=slSortTxns(S.TRANSACTIONS.filter(function(t){return t.student_client_id===s.client_id&&acadYearOf(t.txn_date)===year;}), true);
  html+='<div class="sc-part"><div class="sc-sub-title">תשלומים בשנה זו</div>'+(yt.map(function(t){return'<div class="txn-row'+(isCreditTxn(t)?' credit':'')+'"><span class="txn-date">'+esc(t.txn_date)+'</span>'+pendTxnTag(t)+'<span class="txn-note">'+esc(t.note||'—')+'</span>'+txnAmountHTML(t)+txnMethodPill(t)+'<button class="btn sm danger" data-act="txn-del" data-id="'+esc(t.client_id)+'">&#10005;</button></div>';}).join('')||'<div class="empty">אין תשלומים בשנה זו</div>')+'</div>';
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

function toggleStudentActive(){var s=S.STUDENTS.find(function(x){return idEq(x.client_id, S.SC_STUDENT_ID);});if(!s)return;
  var row=Object.assign({},s,{periods:periodsToggled(s)});
  if(!slLocalWrite('sl_students',row)){toast(MSG_CHANGE_NOT_SAVED,5000, 'bad');return;}
  shell.refreshUI();
  toast(studentContinues(row)?MSG_STUDENT_ON:MSG_STUDENT_OFF, null, 'good');schedulePush();}

// בחירת שיעור בכרטיס ממלאת את המחזור מהחישוב — והבורר נשאר לעריכה ידנית.
function scClsChanged(){
  var c=slCycleFor(document.getElementById('sc-edit-cls').value);if(!c)return;
  document.getElementById('sc-edit-cycle').innerHTML=cycleOptions(c);
}

function saveStudentSettings(){
  var name=document.getElementById('sc-edit-name').value.trim(),tuition=document.getElementById('sc-edit-tuition').value,cls=document.getElementById('sc-edit-cls').value,cycle=parseInt(document.getElementById('sc-edit-cycle').value,10)||null;
  if(!name){toast(MSG_NAME_REQUIRED, null, 'bad');return;}
  if(CLS_LIST.indexOf(cls)<0){toast(MSG_CLS_REQUIRED, null, 'bad');return;}
  var s=S.STUDENTS.find(function(x){return idEq(x.client_id, S.SC_STUDENT_ID);});if(!s){toast(MSG_STUDENT_MISSING2, null, 'bad');return;}
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
  var row=Object.assign({},s,{name:name,card_settings:cs,cls:cls,cycle:cycle});
  if(!slLocalWrite('sl_students',row)){toast(MSG_SETTINGS_NOT_SAVED,5000, 'bad');return;}
  return true;
}

export { deleteStudent, doYearTransition, openAddStudent, openStudentsManage, openYearTransition,
         periodDelete, periodOpen, periodSave, renderScAnnual, renderStudentPanel,
         saveNewStudent, saveStudentSettings, scClsChanged, screenStudentHTML, studentArchiveToggle,
         studentBack, studentOpen, studentSearch, toggleStudentActive, toggleStudentHandled };
