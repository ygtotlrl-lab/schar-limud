// app/domain.js — הסנכרון, הכתיבה המקומית, החישוב והתאריכים
import { DAY_MONTHS, MSG_LOAD_FAIL_PRE, MSG_SYNC_BACK, dayNoon, dayToday, errMsg, isNetErr,
         kvParse, sortCompare, uniqHas } from '../core/util.js';
import { PL_STAMP_KEY, _rowsPaged, ctxEpoch, ctxStale, idEq, mergeCore,
         newClientId, pendAll, pendClearMany, pendFailed, pendHas, pendMark, pendMarkMany,
         pendTag, pushDirty, rtyNote, schedulePush, tombInherit } from '../core/sync.js';
import { MIRROR, mirrorSave } from '../core/mirror.js';
import { logAction } from '../core/backup.js';
import { hebYearLabelFull } from '../core/hebrew.js';
import { esc, pullRender, toast } from '../core/ui.js';
import { CREDIT_METHOD, KV_TABLE, LK_METHOD, LK_SHIUR, MSG_END_BEFORE_START, MSG_END_MONTH_BAD,
         MSG_LOAD_FAIL_POST, MSG_PERIOD_OPEN_LAST, MSG_PERIOD_OVERLAP, MSG_START_MONTH_BAD, SL_NEVER_MIRROR_SETTINGS,
         YEAR_MONTHS } from './constants.js';
import { S, shell } from './state.js';

// התחילית נקראת בזמן ריצה ולא בהצהרה — הקבועים מוגדרים בהמשך הדף
function _slPushOf(t) {
  return { sl_students:     { pk: PK_STU },
           sl_transactions: { pk: PK_TXN },
           [KV_TABLE]:      { pk: PK_SET },
           sl_lookups:      { pk: PK_LK } }[t];
}

// ── חיבור למודול הסימון ──
// הסימון מכסה גם תשובה שאבדה ברשת — הוא נשאר עד שמשיכה מוצלחת תראה את ה-client_id בענן
// מחיקה אינה מפתח נפרד — היא כתיבה של deleted=true על אותה רשומה
var PK_TXN = 'txn:', PK_STU = 'student:', PK_SET = 'setting:', PK_LK = 'lookup:';

function pendTxnKey(row) { return PK_TXN + row.client_id; }

function pendStuKey(row) { return PK_STU + row.client_id; }

// כשל רשת אינו ראיה — הסימון נשאר; כשל סמכותי מוריד אותו, אחרת הוא נתקע לנצח ומזייף את התרעת 24 השעות
function pendResolveErr(pk, e) { if (!isNetErr(e)) pendFailed(pk); }

// נקרא רק אחרי משיכה מוצלחת — ממתין הוא רשומה מקומית חדשה מזו שבענן או שאין לה מקבילה, ולכן כשל רשת לעולם אינו מוריד סימון
// pendMark אינו דורס חותמת קיימת — שעון 24 השעות מונה מהכתיבה הראשונה שלא אושרה
// רשומה שנכתבה אחרי t0 לא נבדקה מול הענן, ולכן הסימון שלה נשאר
function pendSyncScan(keepKeys, t0) {
  var want = {};
  (keepKeys || []).forEach(function (k) { want[k] = 1; });
  pendMarkMany(Object.keys(want));
  var m = pendAll(), gone = [];
  Object.keys(m).forEach(function (k) { if (!want[k] && m[k] < t0) gone.push(k); });
  pendClearMany(gone);
}

function pendTxnTag(t) { return t ? pendTag(pendTxnKey(t)) : ''; }

function pendStuTag(st) { return st ? pendTag(pendStuKey(st)) : ''; }

function pendLkTag(i) { return (i && i.client_id) ? pendTag(PK_LK + i.client_id) : ''; }

// ── עבודה אופליין ──
// המכשיר חותם updated_at בעצמו — חותמת שרת היא זמן ההגעה, והמיזוג היה מעדיף את מי שהגיע ראשון על פני מי שערך אחרון
// רשימת היתר ולא איסור — עמודה חדשה אינה עולה עד שמישהו הכריז עליה
var SL_COLS = {
  sl_transactions: ['client_id','student_client_id','txn_date','amount','payment_method','note','deleted','deleted_at','deleted_by','updated_at'],
  sl_students:     ['client_id','name','card_settings','periods','handled','deleted','deleted_at','deleted_by','updated_at'],
  [KV_TABLE]:      ['client_id','key','value','updated_at'],
  sl_lookups:      ['client_id','kind','label','sort','deleted','deleted_at','deleted_by','updated_at']
};

// sl_settings ממופתחת לפי key — שני מכשירים מגיעים לאותו key באופן עצמאי, ומיפתוח לפי client_id היה יוצר שני ערכים לאותה הגדרה
function slKeyOf(t, r) {
  var k = r ? r[t === KV_TABLE ? 'key' : 'client_id'] : null;
  return (k == null || k === '') ? '' : String(k);
}

// שער הדיסק — נקודת האכיפה השלישית של הסרת הסודות, כדי שגם נתיב כתיבה חדש לא ידליף סוד לדיסק
function slSanitizeRows(t, rows) {
  if (t === KV_TABLE) return slStripMeta(rows);
  return Array.isArray(rows) ? rows : [];
}

// ── סודות ──

function slIsSecretSetting(k) { return SL_NEVER_MIRROR_SETTINGS.indexOf(String(k == null ? '' : k)) >= 0; }

function slStripSecrets(rows) {
  return (Array.isArray(rows) ? rows : []).filter(function (r) { return !(r && slIsSecretSetting(r.key)); });
}

// שורת החותמת אינה הגדרה — במראה היא הייתה נדחפת חזרה ומשתיקה שינוי שמכשיר אחר הרגע דחף
function slStripMeta(rows) {
  return slStripSecrets(rows).filter(function (r) { return !(r && String(r.key) === PL_STAMP_KEY); });
}

// ── המיון ──
// תלמידים — לפי השם, בסדר הא״ב.
function slSortStudents(list) {
  return list.slice().sort(function (a, b) { return sortCompare(a.name || '', b.name || ''); });
}

// תנועות — לפי התאריך, והיציבות שומרת את סדר הקלט בשוויון; desc — החדשה ראשונה.
function slSortTxns(list, desc) {
  var dir = desc ? -1 : 1;
  return list.slice().sort(function (a, b) {
    var x = String(a.txn_date || ''), y = String(b.txn_date || '');
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });
}

// פריטי הרשימות — בסדר הגרירה, ובשוויון לפי התווית.
function slSortLookups(list) {
  return list.slice().sort(function (a, b) {
    return ((+a.sort || 0) - (+b.sort || 0)) || sortCompare(a.label || '', b.label || '');
  });
}

// שנות הלימודים — הראשונה ראשונה.
function slSortYears(list) { return list.slice().sort(function (a, b) { return a - b; }); }

// נקודת הסינון היחידה של המחוקים — כל קוראי STUDENTS מקבלים אותו מכאן
function slApplyMirror() {
  S.STUDENTS = slSortStudents((MIRROR.sl_students || []).filter(function (s) { return !s.deleted; }));
  S.TRANSACTIONS = slSortTxns((MIRROR.sl_transactions || []).filter(function (t) { return !t.deleted; }));
  S.SETTINGS = {};
  // הערך בעמודה הוא JSON — קורא שמתייחס אליו כטקסט היה קורא "5" עם הגרשיים ולא כחמש
  (MIRROR[KV_TABLE] || []).forEach(function (r) {
    if (r && !slIsSecretSetting(r.key)) S.SETTINGS[r.key] = kvParse(r.key, r.value).value;
  });
  S.LOOKUPS = {};
  slSortLookups((MIRROR.sl_lookups || []).filter(function (r) { return r && !r.deleted; }))
    .forEach(function (r) { (S.LOOKUPS[r.kind] = S.LOOKUPS[r.kind] || []).push(r); });
}

// פריטי סוג אחד — אמצעי תשלום או שיעורים — בסדר הגרירה.
function slLookups(kind) { return S.LOOKUPS[kind] || []; }

// מחזירה false כשהכתיבה לאחסון נכשלה — בכסף אסור להציג «נשמר» על כתיבה שלא נכתבה
// ts — חותמת המחיקה, כדי ש-deleted_at יישאר רגע ה-updated_at שלה.
function slLocalWrite(tbl, row, ts) {
  if (!MIRROR[tbl]) { console.error('[mirror] טבלה לא מוכרת:', tbl); return false; }
  // שורת סוד אינה נכתבת מקומית לעולם
  if (tbl === KV_TABLE && slIsSecretSetting(row.key)) { console.error('[mirror] ניסיון לכתוב שורת סוד למראה נחסם'); return false; }
  row.updated_at = (typeof ts === 'number') ? ts : Date.now(); // חותמת המכשיר ולא של השרת
  var k = slKeyOf(tbl, row), arr = MIRROR[tbl], hit = false;
  for (var i = 0; i < arr.length; i++) {
    if (slKeyOf(tbl, arr[i]) === k) { arr[i] = Object.assign({}, arr[i], row); hit = true; break; }
  }
  if (!hit) arr.push(row);
  if (!mirrorSave(tbl)) return false;
  // הסימון בפונקציה שכותבת — מפתח הסימון הוא מפתח המיזוג, ואתר שישכח לסמן לא יעלה לענן לעולם.
  pendMark(_slPushOf(tbl).pk + k);
  slApplyMirror();
  // המשפך היחיד של הכתיבה המקומית — ולכן כאן, ולא בכל קורא, נדרכים הניסיון החוזר והמתזמן; המתזמן מושהה ומאחד, וקריאה כפולה אינה מחזור נוסף
  rtyNote();
  schedulePush();
  return true;
}

// המקום היחיד שאומר מי הבן — בן שיש לו מפתח אב במסד ואינו כאן לא יקבל את מחיקת האב
var PC_CHILDREN = {
  sl_students: [{ t: 'sl_transactions', fk: 'student_client_id', pk: PK_TXN }]
};

// הכתיבה עוברת במראה ולא ב-slLocalWrite — היא חותמת Date.now() על כל שורה ומבטלת את ירושת החותמת
function pcCascadeDelete(table, parent) {
  var kids = PC_CHILDREN[table] || [], pid = parent.client_id, n = 0;
  for (var i = 0; i < kids.length; i++) {
    var k = kids[i], arr = MIRROR[k.t] || [], c = 0;
    for (var j = 0; j < arr.length; j++) {
      if (arr[j].deleted || !idEq(arr[j][k.fk], pid)) continue;
      arr[j] = tombInherit(parent, Object.assign({}, arr[j]));
      pendMark(k.pk + arr[j].client_id);
      c++;
    }
    if (c && !mirrorSave(k.t)) console.error('[mirror] ' + k.t + ' — ירושת המחיקה לא נשמרה');
    n += c;
  }
  // אין כאן דריכה של הניסיון החוזר — כתיבת האב כבר דרכה אותו, ודריכה שנייה היא מחזור נוסף על אותה ראיה
  if (n) { slApplyMirror(); schedulePush(); }
  return n;
}

function slPayload(tbl, row) {
  var cols = SL_COLS[tbl] || [], out = {};
  cols.forEach(function (c) { if (row[c] !== undefined) out[c] = row[c]; });
  return out;
}

// upsert על מזהה שנוצר במכשיר — ניסיון חוזר אחרי תשובה שאבדה מעדכן ואינו מכפיל, ובכסף שורה כפולה היא תשלום כפול
// sl_settings נכתבת על key — המפתח הראשי שלה, ששני מכשירים מגיעים אליו באופן עצמאי
async function slSendRows(tbl, rows) {
  var err = null, out = [];
  var conflict = (tbl === KV_TABLE) ? 'key' : 'client_id';
  rows.forEach(function (row) {
    var body = slPayload(tbl, row);
    if (!body[conflict]) err = err || 'שורה בלי `' + conflict + '` — לא נשלחת';
    out.push(body);
  });
  if (err) return { error: { message: err } };
  var res = await S.SB.from(tbl).upsert(out, { onConflict: conflict });
  if (!(res && res.error)) slSyncLog('push', tbl, out.length);
  return res;
}

// client_id הוא המפתח הראשי ולא SERIAL — מזהה שהמסד מקצה נולד אחרי ההגעה לשרת, ושליחה חוזרת אחרי תשובה שאבדה הייתה יוצרת תשלום כפול

// המזהה קשור לתוכן הטופס (fp) ומשוחרר בשמירה מוצלחת — אותו תוכן אחרי כשל הוא אותה שורה
// תוכן שהשתנה מקבל מזהה חדש — אחרת תשלום שני שנרשם אחרי כשל היה דורס את הראשון
var _pendingCid = {};

function pendingCid(slot, fp){
  var p=_pendingCid[slot];
  if(!p||p.fp!==fp){ p={fp:fp,client_id:newClientId()}; _pendingCid[slot]=p; }
  return p.client_id;
}

function releaseCid(slot){ delete _pendingCid[slot]; }

function fmt(n){return Number(n||0).toLocaleString('he-IL');}

function acadYearOf(s){var d=dayNoon(String(s));return d.getMonth()>=8?d.getFullYear():d.getFullYear()-1;}

// שנת הלימודים נקראת בשם השנה העברית שבה חל התשרי שלה — ספטמבר של y, ולכן y+3761.
function acadYearHeb(y){return hebYearLabelFull(y+3761);}

function monthLabel(y,m){return DAY_MONTHS[m]+' '+(m>=8?y:y+1);}

// ── תקופות הפעילות ──
// YYYY-MM ממוין כרונולוגית כמחרוזת — ולכן ההשוואה לקסיקוגרפית בלי המרה לתאריך
var MONTH_RE=/^[0-9]{4}-(0[1-9]|1[0-2])$/;

// m הוא 0=ינואר; ספטמבר–דצמבר שייכים לשנת הלימודים y והשאר ל-y+1 — ההיפוך של acadYearOf
function acadMonthKey(y,m){return (m>=8?y:y+1)+'-'+String(m+1).padStart(2,'0');}

function monthKeyOf(iso){return String(iso||'').slice(0,7);}

// ערך שאינו YYYY-MM היה משתתף בהשוואה ומחזיר טווח שגוי בשקט — ולכן ערך פסול נחשב «לא הוגדר»
function normMonth(v){v=(v==null?'':String(v)).trim();return MONTH_RE.test(v)?v:'';}

function monthKeyLabel(k){var p=normMonth(k);return p?DAY_MONTHS[parseInt(p.slice(5,7),10)-1]+' '+p.slice(0,4):'';}

// תקופה — { start, end }, ו-end ריק לתקופה פתוחה; תקופה בלי התחלה תקינה אינה תקופה. המפתח — start.
function slPeriods(s){
  return ((s&&Array.isArray(s.periods))?s.periods:[]).map(function(p){
    return {start:normMonth(p&&p.start),end:normMonth(p&&p.end)||null};
  }).filter(function(p){return p.start;}).sort(function(a,b){return a.start<b.start?-1:a.start>b.start?1:0;});
}

// חודש בתוך תקופה — פעיל; מחוץ לכולן — ריק: אין חיוב ואין שורה. בלי חודש — החודש הנוכחי.
function studentInMonth(s,y,m){
  if(!s)return false;
  var k=(y==null)?monthKeyOf(dayToday()):acadMonthKey(y,m);
  return slPeriods(s).some(function(p){return k>=p.start&&(!p.end||k<=p.end);});
}

function countInMonth(y,m){return S.STUDENTS.filter(function(s){return studentInMonth(s,y,m);}).length;}

function periodText(p){return p.end?monthKeyLabel(p.start)+' – '+monthKeyLabel(p.end):'מ-'+monthKeyLabel(p.start);}

function enrollText(s){return slPeriods(s).map(periodText).join(' · ');}

// הסדר, החפיפה והתקופה הפתוחה — כמו sl_students_periods_check: רשימה שהמסד דוחה נכשלת סמכותית ואינה עולה לעולם.
function periodsProblem(ps){
  var l=ps.slice().sort(function(a,b){return a.start<b.start?-1:1;});
  for(var i=1;i<l.length;i++){
    if(!l[i-1].end)return MSG_PERIOD_OPEN_LAST;
    if(l[i].start<=l[i-1].end)return MSG_PERIOD_OVERLAP;
  }
  return '';
}

function periodHas(p,k){return k>=p.start&&(!p.end||k<=p.end);}

function monthKeyAdd(k,n){var y=+k.slice(0,4),m=+k.slice(5,7)-1+n;y+=Math.floor(m/12);m=((m%12)+12)%12;return y+'-'+String(m+1).padStart(2,'0');}

// מצב הכפתור — תקופה שנמשכת מעבר לחודש הנוכחי; תלמיד שנסגר החודש עדיין נספר בו, אך הכפתור כבר כבוי.
function studentContinues(s){var k=monthKeyOf(dayToday());return slPeriods(s).some(function(p){return periodHas(p,k)&&p.end!==k;});}

// כיבוי — התקופה סגורה בחודש הנוכחי: התלמיד נספר החודש ויוצא מהבא.
// הפעלה — תקופה שנסגרה החודש נפתחת מחדש, בלי תקופה שנייה; אחרת תקופה חדשה מהחודש הנוכחי, עד שלפני הבאה אם יש.
function periodsToggled(s){
  var k=monthKeyOf(dayToday()),ps=slPeriods(s);
  if(studentContinues(s))return ps.map(function(p){return periodHas(p,k)?{start:p.start,end:k}:p;});
  var hit=ps.filter(function(p){return periodHas(p,k);})[0];
  var next=ps.filter(function(p){return p.start>k;})[0];
  var end=next?monthKeyAdd(next.start,-1):null;
  if(hit)return ps.map(function(p){return p===hit?{start:p.start,end:end}:p;});
  return ps.concat([{start:k,end:end}]).sort(function(a,b){return a.start<b.start?-1:1;});
}

// ── טופל ──
// מערך חודשים YYYY-MM — החודש הוא המפתח הטבעי, וחודש חדש מתחיל ריק מעצמו, בלי איפוס.
function slHandled(s){return ((s&&Array.isArray(s.handled))?s.handled:[]).map(normMonth).filter(Boolean);}

// בלי חודש — החודש הנוכחי.
function studentHandled(s,k){return slHandled(s).indexOf(k||monthKeyOf(dayToday()))>=0;}

function handledToggled(s,k){
  var l=slHandled(s);
  if(uniqHas(l,k))return l.filter(function(x){return x!==k;});
  return l.concat([k]).sort();
}

// מחזירה false כשהכתיבה לאחסון נכשלה — הקורא אומר זאת, ואינו מציג «טופל» על מה שלא נשמר.
function slHandledToggle(sid,k){
  var s=S.STUDENTS.find(function(x){return idEq(x.client_id,sid);});
  if(!s||!normMonth(k))return false;
  return slLocalWrite('sl_students',Object.assign({},s,{handled:handledToggled(s,k)}));
}

// ── שיעורים ──
// קבוצה לכל שיעור, בסדר הגרירה, ותלמיד בלי שיעור — בקבוצה האחרונה; קבוצה ריקה אינה מוצגת.
function slStudentGroups(list){
  var by={},out=[];
  slLookups(LK_SHIUR).forEach(function(sh){by[sh.label]={label:sh.label,rows:[]};out.push(by[sh.label]);});
  var rest={label:'',rows:[]};
  list.forEach(function(st){var sh=(st.card_settings||{}).shiur;(by[sh]||rest).rows.push(st);});
  return out.concat([rest]).filter(function(g){return g.rows.length;});
}

// הגדרה שלא נקבעה היא 0 ולא ניחוש — סכום מומצא מוצג כחוב אמיתי ונכתב לענן בשמירה הראשונה של ההגדרות.
function studentTuition(s){
  var cs=(s&&s.card_settings)||{},defT=(parseInt(S.SETTINGS['default_tuition'],10)||0);
  return cs.monthly_tuition?parseInt(cs.monthly_tuition):defT;
}

// חוב השנה עד החודש הנוכחי — החיוב פחות מה שנפרס על החודשים שעד היום; חודש מחוץ לתקופות אינו מחויב.
function studentYearDebt(s){
  var y=acadYearOf(dayToday()),k=monthKeyOf(dayToday()),d=calcDistribution(s.client_id,y),t=0;
  YEAR_MONTHS.forEach(function(m){var i=d[m];if(!i||i.off||acadMonthKey(y,m)>k)return;t+=i.req-i.paid;});
  return Math.max(0,Math.round(t*100)/100);
}

// ── יתרת זכות וזיכוי מיתרה ──

function isCreditValue(v){return String(v==null?'':v).trim()===CREDIT_METHOD;}

function isCreditTxn(t){return !!t&&isCreditValue(t.payment_method);}

// העודף יושב בתוצאת calcDistribution תחת 'credit' — שאר המפתחות הם אינדקסי חודש 0–11, ואין התנגשות
function distCredit(d){return (d&&d.credit)||0;}

function distCredApplied(d){return YEAR_MONTHS.reduce(function(a,m){return a+((d&&d[m]&&d[m].cred)||0);},0);}

function studentCredit(sid,year){return distCredit(calcDistribution(sid,year));}

function hasCreditItem(){return slLookups(LK_METHOD).some(function(i){return isCreditValue(i.label);});}

var SYNC_LABELS=['תלמידים','תשלומים','הגדרות','רשימות'];

// שליפה בעמודים חייבת סדר יציב — בלי ORDER BY פוסטגרס אינו מבטיח אותו
// עמודה שאינה בסכימה מחזירה 42703, שנקרא «סכימה מיושנת»; sl_settings ממוינת ב-key כי אין לה id
var SYNC_TABLES=[['sl_students','client_id'],['sl_transactions','client_id'],[KV_TABLE,'key'],['sl_lookups','client_id']];

// הסנכרון מושך מלא — רשומה שלא נמשכה נקראת במיזוג כנמחקה
// המשיכה מעומדת — select('*') בבקשה אחת נחתך בשקט בתקרת db-max-rows
function slPullAll(){
  return Promise.all(SYNC_TABLES.map(function(e){
    return _rowsPaged(function(){ return S.SB.from(e[0]).select('*'); }, e[1], null)
      .then(function(rows){ return rows ? {data:rows,error:null} : {data:null,error:{message:'rows:'+e[0]}}; });
  }));
}

// ── סנכרון ──
// משיכה לפני דחיפה — דחיפה עיוורת מחזירה לחיים רשומות שנמחקו במכשיר אחר
// דוחפים רק לקטגוריה שנמשכה בהצלחה
async function syncAll(){
  if(S._syncBusy) return;
  S._syncBusy=true;
  var _t0=Date.now(); // סימון שנוצר אחרי תחילת המחזור אינו מוכרע בו
  // ההקשר נלכד בכניסה — עידן שנזרק בין המשיכה לכתיבה מבטל את מה שנמזג עבור העותק הקודם
  var _ep=ctxEpoch();
  try{
    var rs=await slPullAll();
    if(ctxStale(_ep)) return;
    // supabase-js אינו זורק בכשל אלא מחזיר error — catch לבדו כאן הוא קוד מת, ולכן כל תוצאה נבדקת במפורש.
    var errs=[];
    for(var i=0;i<rs.length;i++){ if(!rs[i]||rs[i].error||!Array.isArray(rs[i].data)) errs.push(SYNC_LABELS[i]); }
    S._lastSyncOk=!errs.length;

    // ממוזגת רק קטגוריה שנמשכה בהצלחה — מיזוג מול ענן ריק שנובע מכשל רשת נראה כמחיקה של הכול.
    var pulledStu=false, pulledTxn=false, pulledSet=false, pulledLk=false;
    if(rs[0]&&!rs[0].error&&Array.isArray(rs[0].data)){
      pulledStu=true;
      MIRROR.sl_students=mergeCore(MIRROR.sl_students,rs[0].data,{isPending:function(k){return pendHas(PK_STU+k);}}); mirrorSave('sl_students');
    }
    if(rs[1]&&!rs[1].error&&Array.isArray(rs[1].data)){
      pulledTxn=true;
      MIRROR.sl_transactions=mergeCore(MIRROR.sl_transactions,rs[1].data,{isPending:function(k){return pendHas(PK_TXN+k);}}); mirrorSave('sl_transactions');
    }
    // slStripSecrets רץ לפני המיזוג — סוד אינו נכנס למראה בשום מסלול.
    if(rs[2]&&!rs[2].error&&Array.isArray(rs[2].data)){
      pulledSet=true;
      var setRows=slStripMeta(rs[2].data);
      MIRROR[KV_TABLE]=mergeCore(MIRROR[KV_TABLE],setRows,{key:'key',isPending:function(k){return pendHas(PK_SET+k);}}); mirrorSave(KV_TABLE);
    }
    if(rs[3]&&!rs[3].error&&Array.isArray(rs[3].data)){
      pulledLk=true;
      MIRROR.sl_lookups=mergeCore(MIRROR.sl_lookups,rs[3].data,{isPending:function(k){return pendHas(PK_LK+k);}}); mirrorSave('sl_lookups');
    }
    slApplyMirror();
    pullRender(shell.refreshUI);

    // נדחפת רק טבלה שנמשכה בהצלחה — בלי תמונת הענן, דחיפה עיוורת מחזירה לחיים שורה שנמחקה במכשיר אחר.
    if(ctxStale(_ep)) return;
    var _pushRes=await pushDirty({
      sl_students:     pulledStu,
      sl_transactions: pulledTxn,
      [KV_TABLE]:      pulledSet,
      sl_lookups:      pulledLk
    });
    var stillPending=_pushRes.still;
    // הסריקה מורידה סימון מכל מה שאינו ב-still — ולכן רצה רק כשכל הקטגוריות נמשכו, אחרת ההורדה היא הסקה ולא ראיה.
    if(ctxStale(_ep)) return;
    if(pulledStu&&pulledTxn&&pulledSet&&pulledLk) pendSyncScan(stillPending,_t0);

    if(!errs.length){
      S._slLastPullOk=Date.now();
      if(!S._slPullLogged){S._slPullLogged=true;slSyncLog('pull',null,null);}
    }
    // אזהרה פעם אחת בלבד — הסנכרון רץ כל 3 שניות.
    if(errs.length){
      console.error('[sync] נכשלו:',errs.join(', '));
      if(!S._syncWarned){S._syncWarned=true;toast(MSG_LOAD_FAIL_PRE+errs.join(', ')+MSG_LOAD_FAIL_POST,4000, 'bad');}
    }else if(S._syncWarned){S._syncWarned=false;toast(MSG_SYNC_BACK, null, 'good');}
  }catch(e){
    S._lastSyncOk=false;
    console.error('[sync]',e);
    if(!S._syncWarned){S._syncWarned=true;toast(errMsg(e),4000,'bad');}
  }finally{S._syncBusy=false;}
}

// אין לרשום כל מחזור סנכרון — syncAll רץ אחרי כל שמירה, ו-sh_sync_log היא יומן insert בלבד שאי-אפשר לדלל.
// הרישום לעולם אינו חוסם את הסנכרון, ולכן כשלו נבלע.
function slSyncLog(action, key, recordCount, details) {
  try { logAction(action, key, recordCount, details); } catch (e) { }
}

async function ensureCreditMethod(){
  if(S._creditSeedDone||!S._lastSyncOk||!navigator.onLine)return;
  if(hasCreditItem()){S._creditSeedDone=true;return;}
  S._creditSeedDone=true;
  try{
    // כתיבה מקומית עם client_id ודחיפה ב-upsert — insert ישיר יוצר שורה שנייה בכל ניסיון חוזר אחרי תשובה שאבדה.
    // המזהה נגזר מהסוג והתווית — שני מכשירים שזורעים את הסעיף מגיעים לאותה שורה.
    var row={client_id:LK_METHOD+':'+CREDIT_METHOD,kind:LK_METHOD,label:CREDIT_METHOD,sort:slLookups(LK_METHOD).length+1,deleted:false,deleted_at:null,deleted_by:null};
    if(!slLocalWrite('sl_lookups',row)){S._creditSeedDone=false;return;}
    await syncAll();
  }catch(e){S._creditSeedDone=false;console.warn('[credit]',e);}
}

// הפריסה היא תור תשלומים לפי תאריך ולא בריכה — כך כל שקל יודע מאיזו תנועה בא, ואפשר לפצל cash מול cred.
// paid = cash + cred.
function calcDistribution(sid,year){
  var s=S.STUDENTS.find(function(x){return idEq(x.client_id, sid);});if(!s)return{};
  var stuT=studentTuition(s);
  var txns=slSortTxns(S.TRANSACTIONS.filter(function(t){return t.student_client_id===sid&&acadYearOf(t.txn_date)===year;}));
  var total=txns.reduce(function(a,t){return a+(parseFloat(t.amount)||0);},0),result={};
  var idx=0,left=0,EPS=1e-6;
  function draw(n){
    var cash=0,cred=0;
    while(n>EPS&&idx<txns.length){
      if(left<=EPS){left=Math.max(0,parseFloat(txns[idx].amount)||0);if(left<=EPS){idx++;continue;}}
      var t=Math.min(n,left);
      if(isCreditTxn(txns[idx]))cred+=t;else cash+=t;
      left-=t;n-=t;
      if(left<=EPS)idx++;
    }
    return {cash:cash,cred:cred};
  }
  var used=0;
  // הדגל off מבחין בין חודש שאינו מחויב לחודש מחויב שלא שולם.
  YEAR_MONTHS.forEach(function(m){
    if(!studentInMonth(s,year,m)){result[m]={req:0,paid:0,cash:0,cred:0,off:true};return;}
    var d=draw(stuT),paid=Math.round((d.cash+d.cred)*100)/100;
    used+=paid;
    result[m]={req:stuT,paid:paid,cash:Math.round(d.cash*100)/100,cred:Math.round(d.cred*100)/100,off:false};
  });
  // העודף הוא יתרת זכות בשדה נפרד — ולא חוב שלילי בשום סיכום.
  result.credit=Math.max(0,Math.round((total-used)*100)/100);
  return result;
}

// ── משותף למסכים ──
// פיירפוקס אינו תומך ב-input[type=month] ונופל לטקסט חופשי — ולכן הערך מאומת כאן ולא רק במסד.
// תקופה בלי התחלה אינה תקופה — חודש ההצטרפות חובה, והעזיבה ריקה לתקופה פתוחה.
function readMonthRange(startId,endId){
  var rawS=(document.getElementById(startId).value||'').trim(),rawE=(document.getElementById(endId).value||'').trim();
  var sm=normMonth(rawS),em=normMonth(rawE);
  if(!sm){toast(MSG_START_MONTH_BAD, null, 'bad');return null;}
  if(rawE&&!em){toast(MSG_END_MONTH_BAD, null, 'bad');return null;}
  if(em&&em<sm){toast(MSG_END_BEFORE_START, null, 'bad');return null;}
  return {start:sm,end:em||null};
}

// זיכוי מיתרה מסומן אחרת מתקבול — כדי שלא ייקרא ככסף שהתקבל בסריקה מהירה.
function txnAmountHTML(t){
  if(isCreditTxn(t))return'<span class="amt-credit" title="זיכוי על חשבון יתרת זכות — אינו כסף שהתקבל">↩ &#8362;'+fmt(t.amount)+'</span>';
  return'<span class="txn-amt">&#8362;'+fmt(t.amount)+'</span>';
}

function txnMethodPill(t){
  if(isCreditTxn(t))return'<span class="pill credit" title="ניצול יתרת זכות משנה קודמת — אינו נספר בגבייה">זיכוי מיתרה</span>';
  return'<span class="pill">'+esc(t.payment_method||'—')+'</span>';
}

export { _slPushOf, acadMonthKey, acadYearHeb,
         acadYearOf, calcDistribution, countInMonth, distCredApplied, distCredit,
         enrollText, ensureCreditMethod, fmt, hasCreditItem, isCreditTxn,
         isCreditValue, monthKeyOf, monthLabel, pcCascadeDelete, periodsToggled,
         pendLkTag, pendStuKey, pendStuTag, pendTxnTag,
         pendingCid, readMonthRange, releaseCid, slApplyMirror, slHandledToggle, slKeyOf, slLookups,
         slLocalWrite, periodText, periodsProblem, slPeriods, slStudentGroups, studentContinues,
         studentTuition, slSanitizeRows, slSendRows, slSortTxns, slSortYears,
         studentCredit, studentHandled, studentInMonth, studentYearDebt, syncAll, txnAmountHTML,
         txnMethodPill };
