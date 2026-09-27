// app/screens/login.js — מסך הכניסה
import { MSG_FILL_LOGIN, MSG_LOGIN_ERR, MSG_NO_CRYPTO, MSG_OFFLINE_LOGIN,
         MSG_OFF_NO_CRYPTO, MSG_OFF_NO_FP, MSG_OFF_UNKNOWN, MSG_SERVER_ERR, isNetErr } from '../../core/util.js';
import { ctxSwitch, plTick } from '../../core/sync.js';
import { AUTH_USER_COLS, authLog, authUsersTable, authVerify, lkReset, lkStop,
         sessClear, sessGet, sessSet, usersByName, usersSanitize, usersSaveOne } from '../../core/auth.js';
import { shellBare, toast } from '../../core/ui.js';
import { MSG_BAD_LOGIN, MSG_NO_FP_ONLINE, MSG_NO_USERS } from '../config.js';
import { ensureCreditMethod, slApplyMirror, syncAll } from '../domain.js';
import { SB, refreshUI } from '../main.js';

function screenLoginHTML() {
  return `
<div id="auth-screen">
  <div class="auth-box ksave">
    <div class="auth-title">שכר לימוד</div>
    <div class="auth-sub">מערכת ניהול תשלומי שכר לימוד</div>
    <div class="auth-field">
      <label for="au-user">שם משתמש</label>
      <input aria-label="admin" id="au-user" type="text" placeholder="admin" autocomplete="username">
    </div>
    <div class="auth-field">
      <label for="au-pass">סיסמה</label>
      <input id="au-pass" type="password" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="current-password">
    </div>
    <button class="auth-btn" id="auth-btn" data-act="login" data-busy="⏳ בודק…" data-ksave>כניסה</button>
    <div class="auth-err" id="auth-err"></div>
    <div class="auth-spinner" id="auth-spinner"></div>
  </div>
</div>
`;
}

// הכפתור אינו מושבת כאן — actRun מנטרל אותו עד שההבטחה נגמרת, והשבתה שנייה היא מסלול שני
function showAuthErr(m){document.getElementById('auth-err').textContent=m;document.getElementById('auth-spinner').classList.remove('on');}

function startAuthLoad(){document.getElementById('auth-err').textContent='';document.getElementById('auth-spinner').classList.add('on');}

// select של עמודות מפורשות ולא * — הסיסמה אינה מגיעה לזיכרון
// אין כאן אכיפת פורמט שש ספרות — היא הייתה נועלת בחוץ סיסמה תקפה שנקבעה לפני התקן, בלי מסלול שחזור
async function doLogin(){
  var u=document.getElementById('au-user').value.trim(),p=document.getElementById('au-pass').value;
  if(!u||!p){showAuthErr(MSG_FILL_LOGIN);return;}
  if(!navigator.onLine){ return doLoginOffline(u,p); }
  startAuthLoad();
  try{
    // השורה נשלפת לפי שם המשתמש בלבד וההשוואה מול הטביעה — סינון לפי password היה הופך את הסיסמה הגלויה למפתח הכניסה, קריא לכל מי שמחזיק את מפתח ה-anon
    var r=await SB.from(authUsersTable()).select(AUTH_USER_COLS.join(',')).eq('username',u).maybeSingle();
    if(r.error)throw r.error;
    if(r.data){
      var vOn=await authVerify(r.data,p);
      // אין למזג את המצבים — «אין למשתמש טביעה» אינו «סיסמה שגויה», והודעה מאוחדת שולחת להקליד שוב סיסמה נכונה
      if(vOn==='no-crypto'){ authLog(false,'no_crypto_online',u); showAuthErr(MSG_NO_CRYPTO); return; }
      // אין עמודת סיסמה במסד — משתמש נולד עם טביעה, ומשתמש בלי טביעה מקבל הודעה משלו
      if(vOn==='no-fp'){ authLog(false,'no_fp_online',u); showAuthErr(MSG_NO_FP_ONLINE); return; }
      else if(vOn!=='ok'){ authLog(false,'wrong_credentials_online',u); showAuthErr(MSG_BAD_LOGIN); return; }
    }
    if(!r.data){
      // טבלה ריקה היא התקנה שטרם נוצר בה משתמש ולא סיסמה שגויה; אין משתמש ברירת מחדל — סיסמה ידועה לכל היא חשבון פתוח
      authLog(false,'wrong_credentials_online',u);
      var any=await SB.from(authUsersTable()).select('client_id').limit(1);
      showAuthErr((any&&!any.error&&Array.isArray(any.data)&&!any.data.length)?MSG_NO_USERS:MSG_BAD_LOGIN);
      return;
    }
    var pub=usersSanitize(r.data)[0];
    // השורה נכנסת למראה מיד — המשיכה המלאה שברקע עשויה לא להגיע ברשת שנפלה, והמראה היא מסלול הכניסה האופליין
    usersSaveOne(pub);
    ctxSwitch();
    sessSet(pub);
    authLog(true,'online',u);
    document.getElementById('auth-spinner').classList.remove('on');
    enterApp();
  }catch(e){
    // navigator.onLine משקר לא פעם ב-WebView — בכשל רשת מנסים אופליין ולא מציגים שגיאה
    authLog(false,isNetErr(e)?'net_error':'server_error',u);
    if(isNetErr(e)) return doLoginOffline(u,p);
    // .auth-err שמור למה שהמשתמש יכול לתקן בהקלדה — כשל מערכת עובר בטוסט, והמשטח מתאפס כדי שהטופס יהיה שמיש
    showAuthErr('');
    toast(MSG_LOGIN_ERR+((e&&e.message)||MSG_SERVER_ERR),null,'bad');
  }
}

// מחזירה Promise שאיש בקוד אינו נשען עליו — הבדיקות ממתינות לה, וגזירת PBKDF2 אסינכרונית
async function doLoginOffline(u,p){
  var cu=usersByName(u);
  if(!cu){ authLog(false,'unknown_user_offline',u); showAuthErr(MSG_OFF_UNKNOWN); return; }
  startAuthLoad();
  var verdict;
  try{ verdict=await authVerify(cu,p); }
  catch(e){ console.warn('[login] אימות אופליין נכשל',e); authLog(false,'no_crypto_offline',u); showAuthErr(MSG_OFF_NO_CRYPTO); return; }
  if(verdict==='no-fp'){ authLog(false,'no_fp_offline',u); showAuthErr(MSG_OFF_NO_FP); return; }
  if(verdict==='no-crypto'){ authLog(false,'no_crypto_offline',u); showAuthErr(MSG_OFF_NO_CRYPTO); return; }
  if(verdict!=='ok'){ authLog(false,'wrong_credentials_offline',u); showAuthErr(MSG_BAD_LOGIN); return; }
  ctxSwitch();
  sessSet(usersSanitize(cu)[0]);
  authLog(true,'offline',u);
  document.getElementById('auth-spinner').classList.remove('on');
  enterApp();
  toast(MSG_OFFLINE_LOGIN,5000, 'bad');
}

function doLogout(){ctxSwitch();sessClear();lkStop();slShowLogin(true);document.getElementById('au-pass').value='';}

// מסך הכניסה, הלוחות והמסגרת מתחלפים בנקודה אחת — שלוש קריאות פזורות הן שלושה מקומות לשכוח אחד
function slShowLogin(on) {
  document.getElementById('auth-screen').classList.toggle('hidden', !on);
  document.getElementById('app').classList.toggle('hidden', on);
  shellBare(on);
}

// אין await syncAll() חוסם — בלי רשת הוא תוקע את המסך, וברשת איטית משאיר ספינר במקום נתונים שכבר על הדיסק
function enterApp(){
  slShowLogin(false);
  document.getElementById('nav-username').textContent=sessGet().username;
  slApplyMirror();
  refreshUI();
  syncAll();
  // אין כאן פולינג שדוחף — הוא היה מושך הכול ודוחף כל שלוש שניות בלי ראיה לשינוי
  // הדחיפה מונעת-אירוע, הניסיון החוזר רץ רק כשהתור אינו ריק, ו-plTick מושך רק כשהחותמת התקדמה
  plTick();
  // אין לקרוא כאן ל-bkMaybeDaily() — הגיבוי אינו תלוי בכניסה, ונקודת ההפעלה שלו היא bkBoot() בעלייה
  lkReset();ensureCreditMethod();
}

// ── המשתמש המחובר ──
// הסשן בזיכרון בלבד — סשן ב-localStorage בלי תפוגה משאיר מחובר לנצח על מכשיר משותף ומוריד את role לדיסק
// המראה מנצחת כשהמשתמש קיים בה — היא מתרעננת בכל משיכה ותופסת שינוי תפקיד ממכשיר אחר
function slResolveUser(sess){
  if(!sess)return null;
  var m=usersByName(sess.username);
  return m?Object.assign({},sess,usersSanitize(m)[0]):sess;
}

function slWhoName(){ var u=sessGet(); return (u&&u.username)?u.username:null; }

export { doLogin, doLogout, screenLoginHTML, slResolveUser, slShowLogin, slWhoName };
