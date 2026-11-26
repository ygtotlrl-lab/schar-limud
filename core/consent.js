// core/consent.js — דף האישור של המחבר של קלוד (OAuth 2.1 של Supabase), אחד לכל האפליקציות.
// הדף באפליקציה — `oauth/consent/index.html`, מעטפת בלבד: התצורה (`app.config.js`), הספרייה, הגיליונות, `<main id="consent">` והמודול הזה.
// הזרימה: כניסה עם Google של האפליקציה ⟵ בדיקה ב-<תחילית>_users (המסד מחזיר את השורה רק למשתמש פעיל ברשימה) ⟵ אישור או סירוב.
// הכתובות היחסיות — מתיקיית הדף, שתי רמות מתחת לשורש האפליקציה.
var ROOT = new URL('../../', location.href);
var MSG_CONSENT_NO_ID = 'חסר מזהה הבקשה. יש להתחיל את החיבור מתוך קלוד.';
var MSG_CONSENT_GSI = 'הכניסה עם Google לא נטענה. נסו לרענן את הדף.';
var MSG_CONSENT_LOGIN = 'הכניסה נכשלה.';
var MSG_CONSENT_STALE = 'הבקשה אינה תקפה או שפג תוקפה. יש להתחיל את החיבור מחדש מתוך קלוד.';
var MSG_CONSENT_APPROVE = 'האישור נכשל. יש לנסות שוב מתוך קלוד.';
var MSG_CONSENT_ERR = 'שגיאה לא צפויה.';

var APP = self.APP || {};
var box = document.getElementById('consent');
var authId = new URLSearchParams(location.search).get('authorization_id');
// אותו מפתח סשן כמו באפליקציה — מי שכבר מחובר בדפדפן הזה אינו נכנס שוב
var sb = self.supabase.createClient(APP.supabase.url, APP.supabase.key, {
  auth: { storageKey: 'sb-auth-' + APP.id, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function show(title, html) {
  box.innerHTML = '<img class="cs-logo" id="cs-logo" alt="" hidden><h1 class="cs-title">' + esc(title) + '</h1><div class="cs-body">' + html + '</div>';
  logo();
}
function fail(msg) { show('לא ניתן להמשיך', '<p class="cs-err">' + esc(msg) + '</p>'); }
function go(d) { var u = d && (d.redirect_url || d.redirect_to || d.url); if (u) { location.replace(u); return true; } return false; }

// הסמל — מהמניפסט, שבו שם הקובץ נושא את החתימה שלו
var logoSrc = null;
function logo() {
  var el = document.getElementById('cs-logo');
  if (logoSrc) { el.src = logoSrc; el.hidden = false; return; }
  fetch(new URL('manifest.json', ROOT)).then(function (r) { return r.json(); }).then(function (m) {
    var i = (m.icons || []).filter(function (x) { return /192/.test(x.sizes || ''); })[0];
    if (!i) return;
    logoSrc = new URL(i.src, ROOT).href;
    var e = document.getElementById('cs-logo'); if (e) { e.src = logoSrc; e.hidden = false; }
  }).catch(function (e) { console.warn('[consent] logo', e); });
}

async function signIn() {
  show('כניסה', '<p>כדי לחבר את קלוד ל' + esc(APP.name) + ', יש להיכנס עם חשבון Google שרשום באפליקציה.</p><div class="cs-gsi" id="cs-gsi"></div>');
  await new Promise(function (resolve) {
    var sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
    sc.onload = resolve; sc.onerror = resolve; document.head.appendChild(sc);
  });
  if (!(self.google && google.accounts && google.accounts.id)) { fail(MSG_CONSENT_GSI); return; }
  google.accounts.id.initialize({
    client_id: (APP.android || {}).google, ux_mode: 'popup', auto_select: false,
    callback: async function (resp) {
      var r = await sb.auth.signInWithIdToken({ provider: 'google', token: resp.credential });
      if (r.error) { fail(MSG_CONSENT_LOGIN); return; }
      run();
    }
  });
  google.accounts.id.renderButton(document.getElementById('cs-gsi'), { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'he', width: 300 });
}

async function run() {
  if (!authId) { fail(MSG_CONSENT_NO_ID); return; }
  var s = (await sb.auth.getSession()).data.session;
  if (!s) { signIn(); return; }
  var email = String(s.user.email || '').toLowerCase();
  var u = await sb.from(APP.prefix + 'users').select('full_name').eq('login', email).maybeSingle();
  if (u.error || !u.data) {
    show('אין גישה', '<p>החשבון <b>' + esc(email) + '</b> אינו ברשימת המשתמשים של ' + esc(APP.name) + '.</p>' +
      '<div class="cs-row"><button class="btn ghost" id="cs-other">כניסה בחשבון אחר</button></div>');
    document.getElementById('cs-other').onclick = async function () { await sb.auth.signOut({ scope: 'local' }); signIn(); };
    return;
  }
  var det = await sb.auth.oauth.getAuthorizationDetails(authId);
  if (det.error) { fail(MSG_CONSENT_STALE); return; }
  if (go(det.data)) return;
  var client = (det.data && det.data.client && (det.data.client.name || det.data.client.client_name)) || 'אפליקציה';
  show('אישור גישה',
    '<p><b>' + esc(client) + '</b> מבקש גישה ל' + esc(APP.name) + ' בשמך.</p>' +
    '<p>מחובר: <b>' + esc(u.data.full_name || email) + '</b></p>' +
    '<p>הגישה כפופה להרשאות שלך באפליקציה: קריאה, הוספה, עדכון ומחיקה רכה.</p>' +
    '<div class="cs-row"><button class="btn" id="cs-yes">אישור</button><button class="btn ghost" id="cs-no">סירוב</button></div>');
  var yes = document.getElementById('cs-yes'), no = document.getElementById('cs-no');
  yes.onclick = async function () {
    yes.disabled = no.disabled = true;
    var r = await sb.auth.oauth.approveAuthorization(authId);
    if (r.error || !go(r.data)) fail(MSG_CONSENT_APPROVE);
  };
  no.onclick = async function () {
    yes.disabled = no.disabled = true;
    var r = await sb.auth.oauth.denyAuthorization(authId);
    if (r.error || !go(r.data)) show('הגישה נדחתה', '<p>אפשר לסגור את הדף.</p>');
  };
}

show('אישור גישה', '<p>טוען…</p>');
run().catch(function (e) { console.error('[consent]', e); fail(MSG_CONSENT_ERR); });
