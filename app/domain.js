// app/domain.js — הסנכרון, הכתיבה המקומית, החישוב והתאריכים
import { MSG_LOAD_FAIL_PRE, MSG_SYNC_BACK, errMsg, isNetErr,
         kvParse } from '../core/util.js';
import { PL_STAMP_KEY, _rowsPaged, ctxEpoch, ctxStale, eraNotePush, idEq, mergeCore,
         newClientId, pendAll, pendClearMany, pendFailed, pendHas, pendMark, pendMarkMany,
         pendTag, pushDirty, rtyNote, schedulePush, tombInherit } from '../core/sync.js';
import { hwNoteCloud } from '../core/storage.js';
import { MIRROR, mirrorKey, mirrorSave } from '../core/mirror.js';
import { logAction } from '../core/backup.js';
import { authUsersTable, isAdminOf, sessGet, usersRefresh,
         usersSanitize } from '../core/auth.js';
import { esc, pullRender, toast } from '../core/ui.js';
import { CREDIT_METHOD, KV_TABLE, MSG_END_BEFORE_START, MSG_END_MONTH_BAD,
         MSG_LOAD_FAIL_POST, MSG_START_MONTH_BAD, SL_NEVER_MIRROR_SETTINGS,
         YEAR_MONTHS } from './constants.js';
import { S, shell } from './state.js';

// ── מיון עברי ──
try { S._heColl = new Intl.Collator('he'); } catch (e) { S._heColl = null; }

var HE = S._heColl || { compare: function (a, b) { return String(a).localeCompare(String(b), 'he'); } };

var MONTH_HE=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

// ── עֵד הדחיפה פר-מפתח ──
// נכתב רק בסוף מעבר דחיפה נקי שבא אחרי משיכה מוצלחת, גם במכשיר שרק קורא — אין לגזור אותו ממשיכה לבדה
var _slPushedAt = {};

function _slMarkPushed(t) { _slPushedAt[t] = Date.now(); }

function _slPushedThrough(t) { return _slPushedAt[t] || 0; }

function _slPushedFor(t) { return function () { return _slPushedThrough(t); }; }

function _slRowId(r) { return r ? r.client_id : null; }

// נכשל סגור — עמוד שנכשל מחזיר null, ו«אין ראיה» אינו «הענן ריק»
function _slVerify(mkQuery) {
  return function () {
    if (!S.SB) return Promise.resolve({ ok: false, rows: [] });
    return _rowsPaged(mkQuery, 'client_id', null)
      .then(function (rs) { return Array.isArray(rs) ? { ok: true, rows: rs } : { ok: false, rows: [] }; },
            function () { return { ok: false, rows: [] }; });
  };
}

// התחילית נקראת בזמן ריצה ולא בהצהרה — הקבועים מוגדרים בהמשך הדף
function _slPushOf(t) {
  return { sl_students:     { pk: PK_STU },
           sl_transactions: { pk: PK_TXN },
           [KV_TABLE]:      { pk: PK_SET },
           sl_lists:        { pk: PK_LST } }[t];
}

// ── חיבור למודול הסימון ──
// הסימון מכסה גם תשובה שאבדה ברשת — הוא נשאר עד שמשיכה מוצלחת תראה את ה-client_id בענן
// מחיקה אינה מפתח נפרד — היא כתיבה של deleted=true על אותה רשומה
var PK_TXN = 'txn:', PK_STU = 'student:', PK_SET = 'setting:', PK_LST = 'list:';

function pendTxnKey(row) { return PK_TXN + row.client_id; }

function pendStuKey(row) { return PK_STU + row.client_id; }

// מפתח ההגדרה הוא key ולא client_id — מיפתוח לפי client_id יוצר שתי שורות לאותה הגדרה
function pendSetKey(row) { return PK_SET + row.key; }

function pendLstKey(row) { return PK_LST + row.client_id; }

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

function pendLstTag(i) { return (i && i.client_id) ? pendTag(PK_LST + i.client_id) : ''; }

// ── עבודה אופליין ──
// המכשיר חותם updated_at בעצמו — חותמת שרת היא זמן ההגעה, והמיזוג היה מעדיף את מי שהגיע ראשון על פני מי שערך אחרון
// רשימת היתר ולא איסור — עמודה חדשה אינה עולה עד שמישהו הכריז עליה
var SL_COLS = {
  sl_transactions: ['client_id','student_client_id','txn_date','amount','payment_method','note','created_by_client_id','deleted','deleted_at','deleted_by','updated_at'],
  sl_students:     ['client_id','name','active','card_settings','start_month','end_month','deleted','deleted_at','deleted_by','updated_at'],
  [KV_TABLE]:      ['client_id','key','value','updated_at'],
  sl_lists:        ['client_id','category','value','deleted','deleted_at','deleted_by','updated_at']
};

// sl_settings ממופתחת לפי key — שני מכשירים מגיעים לאותו key באופן עצמאי, ומיפתוח לפי client_id היה יוצר שני ערכים לאותה הגדרה
function slKeyOf(t, r) {
  var k = r ? r[t === KV_TABLE ? 'key' : 'client_id'] : null;
  return (k == null || k === '') ? '' : String(k);
}

function slTs(r) {
  var x = r && r.updated_at != null ? Number(r.updated_at) : NaN;
  return isFinite(x) ? x : 0;
}

// שער הדיסק — נקודת האכיפה השלישית של הסרת הסודות, כדי שגם נתיב כתיבה חדש לא ידליף ל-localStorage המשותף ל-origin
function slSanitizeRows(t, rows) {
  if (t === KV_TABLE) return slStripMeta(rows);
  // רשימת-היתר ולא רשימת-איסור — נשארת נכונה כשתיווסף לטבלה עמודה רגישה
  if (t === authUsersTable()) return usersSanitize(rows);
  return Array.isArray(rows) ? rows : [];
}

// ── משתמשים, סודות וכניסה ──

function slIsSecretSetting(k) { return SL_NEVER_MIRROR_SETTINGS.indexOf(String(k == null ? '' : k)) >= 0; }

function slStripSecrets(rows) {
  return (Array.isArray(rows) ? rows : []).filter(function (r) { return !(r && slIsSecretSetting(r.key)); });
}

// שורת החותמת אינה הגדרה — במראה היא הייתה נדחפת חזרה ומשתיקה שינוי שמכשיר אחר הרגע דחף
function slStripMeta(rows) {
  return slStripSecrets(rows).filter(function (r) { return !(r && String(r.key) === PL_STAMP_KEY); });
}

// ── הרשאה ──
// נכשל סגור — כל מה שאינו בדיוק 'admin', כולל תפקיד שהוקלד בטעות, אינו מקבל גישה
function slSettingsAccess(u) {
  var who = (u === undefined) ? sessGet() : u;
  if (!who) return 'denied';
  return isAdminOf(who) ? 'ok' : 'denied';
}

function slIsAdmin(u) { return slSettingsAccess(u) === 'ok'; }

// נקודת הסינון היחידה של המחוקים — כל קוראי STUDENTS מקבלים אותו מכאן
function slApplyMirror() {
  S.STUDENTS = (MIRROR.sl_students || []).filter(function (s) { return !s.deleted; })
    .sort(function (a, b) { return HE.compare(a.name || '', b.name || ''); });
  S.TRANSACTIONS = (MIRROR.sl_transactions || []).filter(function (t) { return !t.deleted; })
    .sort(function (a, b) { return String(a.txn_date || '') < String(b.txn_date || '') ? -1 : 1; });
  S.SETTINGS = {};
  // הערך בעמודה הוא JSON — קורא שמתייחס אליו כטקסט היה קורא "5" עם הגרשיים ולא כחמש
  (MIRROR[KV_TABLE] || []).forEach(function (r) {
    if (r && !slIsSecretSetting(r.key)) S.SETTINGS[r.key] = kvParse(r.key, r.value).value;
  });
  S.LISTS = {};
  // כפתור המחיקה מצביע על key, מפתח המיזוג — לפריט שנוצר במכשיר אין שדה אחר
  (MIRROR.sl_lists || []).filter(function (r) { return r && !r.deleted; })
    .slice().sort(function (a, b) { return HE.compare(a.value || '', b.value || ''); })
    .forEach(function (r) { if (!S.LISTS[r.category]) S.LISTS[r.category] = []; S.LISTS[r.category].push({ client_id: r.client_id, value: r.value }); });
}

// מחזירה false כשהכתיבה ל-localStorage נכשלה — בכסף אסור להציג «נשמר» על כתיבה שלא נכתבה
// ts — חותמת המחיקה, כדי ש-deleted_at יישאר רגע ה-updated_at שלה.
function slLocalWrite(tbl, row, ts) {
  if (!MIRROR[tbl]) { console.error('[mirror] טבלה לא מוכרת:', tbl); return false; }
  // localStorage משותף ל-origin כולו — שורת סוד אינה נכתבת מקומית לעולם
  if (tbl === KV_TABLE && slIsSecretSetting(row.key)) { console.error('[mirror] ניסיון לכתוב שורת סוד למראה נחסם'); return false; }
  row.updated_at = (typeof ts === 'number') ? ts : Date.now(); // חותמת המכשיר ולא של השרת
  var k = slKeyOf(tbl, row), arr = MIRROR[tbl], hit = false;
  for (var i = 0; i < arr.length; i++) {
    if (slKeyOf(tbl, arr[i]) === k) { arr[i] = Object.assign({}, arr[i], row); hit = true; break; }
  }
  if (!hit) arr.push(row);
  if (!mirrorSave(tbl)) return false;
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

// אין להסיר את תנאי הסימון — בחותמת שווה שני התנאים הראשונים שקטים, והרשומה הייתה נשארת ממתינה לנצח ולעולם לא נדחפת
function slDirtyRows(t, remoteByKey, isPending) {
  var out = [];
  (MIRROR[t] || []).forEach(function (l) {
    var k = slKeyOf(t, l);
    if (!k) return;
    var r = remoteByKey[k];
    if (!r || slTs(l) > slTs(r) || (isPending && isPending(k))) out.push(l);
  });
  return out;
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

function acadYearOf(s){var d=new Date(s+'T00:00:00');return d.getMonth()>=8?d.getFullYear():d.getFullYear()-1;}

function acadYearLabel(y){var m={2020:'תש"פ',2021:'תשפ"א',2022:'תשפ"ב',2023:'תשפ"ג',2024:'תשפ"ד',2025:'תשפ"ה',2026:'תשפ"ו',2027:'תשפ"ז',2028:'תשפ"ח',2029:'תשפ"ט',2030:'תש"צ'};return (m[y]||y)+'–'+(m[y+1]||(y+1));}

function monthLabel(y,m){return MONTH_HE[m]+' '+(m>=8?y:y+1);}

// ── טווח פעילות התלמיד ──
// YYYY-MM ממוין כרונולוגית כמחרוזת — ולכן ההשוואה לקסיקוגרפית בלי המרה לתאריך
var MONTH_RE=/^[0-9]{4}-(0[1-9]|1[0-2])$/;

// m הוא 0=ינואר; ספטמבר–דצמבר שייכים לשנת הלימודים y והשאר ל-y+1 — ההיפוך של acadYearOf
function acadMonthKey(y,m){return (m>=8?y:y+1)+'-'+String(m+1).padStart(2,'0');}

function monthKeyOf(iso){return String(iso||'').slice(0,7);}

// ערך שאינו YYYY-MM היה משתתף בהשוואה ומחזיר טווח שגוי בשקט — ולכן ערך פסול נחשב «לא הוגדר»
function normMonth(v){v=(v==null?'':String(v)).trim();return MONTH_RE.test(v)?v:'';}

function monthKeyLabel(k){var p=normMonth(k);return p?MONTH_HE[parseInt(p.slice(5,7),10)-1]+' '+p.slice(0,4):'';}

// הטווח כולל את שני קצותיו; בלי start_month אין גבול תחתון, בלי end_month אין גבול עליון
function studentInMonth(s,y,m){
  if(!s)return false;
  var sm=normMonth(s.start_month),em=normMonth(s.end_month);
  if(!sm&&!em)return true;
  var k=acadMonthKey(y,m);
  return (!sm||k>=sm)&&(!em||k<=em);
}

function countInMonth(y,m){return S.STUDENTS.filter(function(s){return s.active&&studentInMonth(s,y,m);}).length;}

function enrollText(s){
  var sm=normMonth(s&&s.start_month),em=normMonth(s&&s.end_month);
  if(!sm&&!em)return '';
  if(sm&&em)return monthKeyLabel(sm)+' – '+monthKeyLabel(em);
  if(sm)return 'מ-'+monthKeyLabel(sm);
  return 'עד '+monthKeyLabel(em);
}

// ── יתרת זכות וזיכוי מיתרה ──

function isCreditValue(v){return String(v==null?'':v).trim()===CREDIT_METHOD;}

function isCreditTxn(t){return !!t&&isCreditValue(t.payment_method);}

// העודף יושב בתוצאת calcDistribution תחת 'credit' — שאר המפתחות הם אינדקסי חודש 0–11, ואין התנגשות
function distCredit(d){return (d&&d.credit)||0;}

function distCredApplied(d){return YEAR_MONTHS.reduce(function(a,m){return a+((d&&d[m]&&d[m].cred)||0);},0);}

function studentCredit(sid,year){return distCredit(calcDistribution(sid,year));}

// לפי מפתח המיזוג ולא לפי id — לפריט שנוצר במכשיר אין עדיין id
function findListItem(cid){var f=null;Object.keys(S.LISTS).forEach(function(c){(S.LISTS[c]||[]).forEach(function(i){if(idEq(i.client_id,cid))f=i;});});return f;}

function hasCreditItem(){return Object.keys(S.LISTS).some(function(c){return (S.LISTS[c]||[]).some(function(i){return isCreditValue(i.value);});});}

var SYNC_LABELS=['תלמידים','תשלומים','הגדרות','רשימות'];

// שליפה בעמודים חייבת סדר יציב — בלי ORDER BY פוסטגרס אינו מבטיח אותו
// עמודה שאינה בסכימה מחזירה 42703, שנקרא «סכימה מיושנת»; sl_settings ממוינת ב-key כי אין לה id
var SYNC_TABLES=[['sl_students','client_id'],['sl_transactions','client_id'],[KV_TABLE,'key'],['sl_lists','client_id']];

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
  // המשתמש יכול להתחלף בין המשיכה לכתיבה — מה שנמזג עבור הקודם היה יורד לדיסק ועולה לענן בהקשר של החדש
  var _ep=ctxEpoch();
  try{
    var rs=await slPullAll();
    if(ctxStale(_ep)) return;
    // supabase-js אינו זורק בכשל אלא מחזיר error — catch לבדו כאן הוא קוד מת, ולכן כל תוצאה נבדקת במפורש.
    var errs=[];
    for(var i=0;i<rs.length;i++){ if(!rs[i]||rs[i].error||!Array.isArray(rs[i].data)) errs.push(SYNC_LABELS[i]); }
    S._lastSyncOk=!errs.length;

    // ממוזגת רק קטגוריה שנמשכה בהצלחה — מיזוג מול ענן ריק שנובע מכשל רשת נראה כמחיקה של הכול.
    var remoteStu={}, remoteTxn={}, remoteSet={}, remoteLst={};
    var pulledStu=false, pulledTxn=false, pulledSet=false, pulledLst=false;
    if(rs[0]&&!rs[0].error&&Array.isArray(rs[0].data)){
      pulledStu=true;
      rs[0].data.forEach(function(r){ remoteStu[r.client_id]=r; });
      MIRROR.sl_students=mergeCore(MIRROR.sl_students,rs[0].data,{isPending:function(k){return pendHas(PK_STU+k);}}); mirrorSave('sl_students');
    }
    if(rs[1]&&!rs[1].error&&Array.isArray(rs[1].data)){
      pulledTxn=true;
      rs[1].data.forEach(function(r){ remoteTxn[r.client_id]=r; });
      hwNoteCloud(mirrorKey('sl_transactions'), rs[1].data);
      MIRROR.sl_transactions=mergeCore(MIRROR.sl_transactions,rs[1].data,{isPending:function(k){return pendHas(PK_TXN+k);}}); mirrorSave('sl_transactions');
    }
    // slStripSecrets רץ לפני המיזוג — admin_pass אינה נכנסת למראה בשום מסלול.
    if(rs[2]&&!rs[2].error&&Array.isArray(rs[2].data)){
      pulledSet=true;
      var setRows=slStripMeta(rs[2].data);
      setRows.forEach(function(r){ remoteSet[r.key]=r; });
      MIRROR[KV_TABLE]=mergeCore(MIRROR[KV_TABLE],setRows,{key:'key',isPending:function(k){return pendHas(PK_SET+k);}}); mirrorSave(KV_TABLE);
    }
    if(rs[3]&&!rs[3].error&&Array.isArray(rs[3].data)){
      pulledLst=true;
      rs[3].data.forEach(function(r){ remoteLst[r.client_id]=r; });
      MIRROR.sl_lists=mergeCore(MIRROR.sl_lists,rs[3].data,{isPending:function(k){return pendHas(PK_LST+k);}}); mirrorSave('sl_lists');
    }
    slApplyMirror();
    pullRender(shell.refreshUI);

    // נדחפת רק טבלה שנמשכה בהצלחה — בלי תמונת הענן, דחיפה עיוורת מחזירה לחיים שורה שנמחקה במכשיר אחר.
    // קטגוריה שלא נמשכה נמסרת כ-null ולא כמפה ריקה — מפה ריקה נקראת «הענן ריק» ומסמנת את עד הפינוי.
    if(ctxStale(_ep)) return;
    var _pushRes=await pushDirty({
      sl_students:     pulledStu?remoteStu:null,
      sl_transactions: pulledTxn?remoteTxn:null,
      [KV_TABLE]:      pulledSet?remoteSet:null,
      sl_lists:        pulledLst?remoteLst:null
    });
    // שניים משלושת תנאי זריקת העידן נמדדים רק בתוצאת הדחיפה הזו.
    eraNotePush(_pushRes);
    var stillPending=_pushRes.still;
    // הסריקה מורידה סימון מכל מה שאינו ב-still — ולכן רצה רק כשכל הקטגוריות נמשכו, אחרת ההורדה היא הסקה ולא ראיה.
    if(ctxStale(_ep)) return;
    if(pulledStu&&pulledTxn&&pulledSet&&pulledLst) pendSyncScan(stillPending,_t0);
    // מראת המשתמשים אינה נדחפת לעולם — היא מחזיקה טביעות בלבד, ודחיפה שלה הייתה כותבת password ריק לכל המשתמשים.
    usersRefresh();

    if(!errs.length){
      S._slLastPullOk=Date.now();
      // אין כאן כתיבת עד פינוי — חותמת משיכה אומרת «ראיתי את הענן» ולא «מה שאצלי עלה לשם».
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

// המזהה נגזר מהקטגוריה והערך — שני מכשירים שזורעים או מוסיפים את אותו פריט מגיעים לאותה שורה.
function slListId(cat, val) { return cat + ':' + val; }

async function ensureCreditMethod(){
  if(S._creditSeedDone||!S._lastSyncOk||!navigator.onLine)return;
  if(hasCreditItem()){S._creditSeedDone=true;return;}
  S._creditSeedDone=true;
  try{
    // כתיבה מקומית עם client_id ודחיפה ב-upsert — insert ישיר יוצר שורה שנייה בכל ניסיון חוזר אחרי תשובה שאבדה.
    var row={client_id:slListId('payment_methods',CREDIT_METHOD),category:'payment_methods',value:CREDIT_METHOD,deleted:false,deleted_at:null,deleted_by:null};
    if(!slLocalWrite('sl_lists',row)){S._creditSeedDone=false;return;}
    pendMark(pendLstKey(row));
    await syncAll();
  }catch(e){S._creditSeedDone=false;console.warn('[credit]',e);}
}

// הפריסה היא תור תשלומים לפי תאריך ולא בריכה — כך כל שקל יודע מאיזו תנועה בא, ואפשר לפצל cash מול cred.
// paid = cash + cred.
function calcDistribution(sid,year){
  var s=S.STUDENTS.find(function(x){return idEq(x.client_id, sid);});if(!s)return{};
  var cs=s.card_settings||{},defT=(parseInt(S.SETTINGS['default_tuition'],10)||0),stuT=cs.monthly_tuition?parseInt(cs.monthly_tuition):defT;
  var txns=S.TRANSACTIONS.filter(function(t){return t.student_client_id===sid&&acadYearOf(t.txn_date)===year;}).sort(function(a,b){return a.txn_date>b.txn_date?1:-1;});
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
function readMonthRange(startId,endId){
  var rawS=(document.getElementById(startId).value||'').trim(),rawE=(document.getElementById(endId).value||'').trim();
  var sm=normMonth(rawS),em=normMonth(rawE);
  if(rawS&&!sm){toast(MSG_START_MONTH_BAD, null, 'bad');return null;}
  if(rawE&&!em){toast(MSG_END_MONTH_BAD, null, 'bad');return null;}
  if(sm&&em&&em<sm){toast(MSG_END_BEFORE_START, null, 'bad');return null;}
  return {start_month:sm||null,end_month:em||null};
}

// זיכוי מיתרה מסומן אחרת מתקבול — כדי שלא ייקרא ככסף שהתקבל בסריקה מהירה.
function txnAmountHtml(t){
  if(isCreditTxn(t))return'<span class="amt-credit" title="זיכוי על חשבון יתרת זכות — אינו כסף שהתקבל">↩ &#8362;'+fmt(t.amount)+'</span>';
  return'<span class="txn-amt">&#8362;'+fmt(t.amount)+'</span>';
}

function txnMethodPill(t){
  if(isCreditTxn(t))return'<span class="pill credit" title="ניצול יתרת זכות משנה קודמת — אינו נספר בגבייה">זיכוי מיתרה</span>';
  return'<span class="pill">'+esc(t.payment_method||'—')+'</span>';
}

export { _slMarkPushed, _slPushOf, _slPushedFor, _slRowId, _slVerify, acadYearLabel,
         acadYearOf, calcDistribution, countInMonth, distCredApplied, distCredit,
         enrollText, ensureCreditMethod, findListItem, fmt, hasCreditItem, isCreditTxn,
         isCreditValue, monthKeyOf, monthLabel, normMonth, pcCascadeDelete, pendLstKey,
         pendLstTag, pendSetKey, pendStuKey, pendStuTag, pendTxnKey, pendTxnTag,
         pendingCid, readMonthRange, releaseCid, slApplyMirror, slDirtyRows, slIsAdmin, slKeyOf, slListId,
         slLocalWrite, slSanitizeRows, slSendRows, slSettingsAccess, slTs,
         studentCredit, studentInMonth, syncAll, txnAmountHtml, txnMethodPill };
