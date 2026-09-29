// core/util.js — עוזרי הליבה
// הסיומת .js ולא .mjs — שרת סטטי שאינו מכיר .mjs מחזיר application/octet-stream, והמודול נדחה כולו.

import { lsGet, lsSetRaw } from './storage.js';
import { toast } from './ui.js';

// ── קריאת ערך מספרי ──
// המרה ישירה מחזירה NaN על שדה ריק, ו-NaN בהשוואה נכשל בשקט; והברירה מוצהרת בקריאה.
// הקלט הוא האלמנט ולא ערכו — אלמנט חסר הוא מסלול תקף ומחזיר את הברירה.
function readNum(inp, dflt) {
  var d = (dflt === undefined) ? 0 : dflt;
  if (!inp) return d;
  var raw = String(inp.value == null ? '' : inp.value).trim();
  if (raw === '') return d;
  var n = Number(raw);
  return isFinite(n) ? n : d;
}

// ── כיווץ רשימת ערכים ──
// uniqHas ו-uniqList מכריעות לפי אותה זהות — שני מימושים נבדלים בשקט.
// הראשון שורד — מי שדורש שהחדש ינצח ממיין לפני הקריאה.
function uniqKeyOf(v, keyFn) { return String(keyFn ? keyFn(v) : v); }
function uniqList(list, keyFn) {
  if (!Array.isArray(list)) return list;
  var seen = {}, out = [];
  list.forEach(function (v) {
    var k = uniqKeyOf(v, keyFn);
    if (seen[k]) return;
    seen[k] = 1;
    out.push(v);
  });
  return out;
}
function uniqHas(list, val, keyFn) {
  if (!Array.isArray(list)) return false;
  var k = uniqKeyOf(val, keyFn);
  return list.some(function (v) { return uniqKeyOf(v, keyFn) === k; });
}

// ── היום ועוגן הצהריים ──
// אין להחליף ב-toISOString — UTC מקדים את התאריך המקומי בשעות הקצה, ותנועה אחרי חצות נופלת ליום הקודם.
// Date מעוגן בצהריים מקומיים — חצות ועוד כפולות של 24 שעות נופל ליום הקודם במעבר לשעון חורף.
function _dayPad(n) { return (n < 10 ? '0' : '') + n; }
function dayNoon(a, m0, d) {
  if (a instanceof Date) return new Date(a.getFullYear(), a.getMonth(), a.getDate(), 12, 0, 0);
  if (typeof a === 'string') {
    var p = a.slice(0, 10).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0);
  }
  return new Date(a, m0, d, 12, 0, 0);
}
function dayToday(n) {
  var t = new Date();
  return dayIso(dayNoon(t.getFullYear(), t.getMonth(), t.getDate() + (+n || 0)));
}
function dayIso(d) {
  return d.getFullYear() + '-' + _dayPad(d.getMonth() + 1) + '-' + _dayPad(d.getDate());
}
// חשבון ימים בלוח ולא במילישניות — יום אינו תמיד 24 שעות, וחיבור שלהן חוצה את גבול שעון-הקיץ ליום הלא נכון.
function dayAdd(iso, n) {
  var d = dayNoon(iso);
  return dayIso(dayNoon(d.getFullYear(), d.getMonth(), d.getDate() + (+n || 0)));
}
// הפרש ימים בין שני תאריכים (ISO או Date) — ב-UTC של רכיבי הלוח, שאין בו מעבר שעון.
function dayDiff(a, b) {
  var x = dayNoon(a), y = dayNoon(b);
  return Math.round((Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) -
                     Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / 86400000);
}
// שמות החודשים הלועזיים — רשימה אחת; צורה מקוצרת נגזרת ממנה אצל הצרכן.
var GREG_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

// ── מסירת התצורה ──
// המסירה מצטברת — קריאה לכל שכבה שמוסרת, ושומרי get לחיווט שמוגדר אחרי המסירה.
// שם שאינו נמסר הוא undefined ולא שגיאה — מודול שנושא יכולת שאין לאפליקציה אינו קורא לה.
const app = {};
function appConfigure(cfg) {
  Object.defineProperties(app, Object.getOwnPropertyDescriptors(cfg));
}

// ── מחרוזות ההודעה המשותפות ──
// MSG_OFFLINE נאמר על קריאה שנכשלה ואין בו הבטחת סנכרון; ההבטחה רק ב-MSG_SAVED_LOCAL, על כתיבה שכבר בתור.
// אין לאחד הודעות חסימה זו עם זו או עם «סיסמה שגויה» — כל אחת מתארת מצב אחר.
var MSG_SAVED = '✅ נשמר בהצלחה';
var MSG_SAVED_LOCAL = '✅ נשמר במכשיר — יסונכרן כשתחזור הרשת';
var MSG_SAVE_FAIL = '❌ השמירה נכשלה';
var MSG_SYNC_BACK = '☁️ הסנכרון חזר לפעול';
var MSG_OFFLINE = '📴 אין חיבור לאינטרנט — הפעולה לא בוצעה';
var MSG_STALE_CODE = '⚠️ הגרסה הזו מיושנת — יש לעדכן';
var MSG_SW_TIMEOUT = '⚠️ העדכון לא הושלם — נסה שוב';
var MSG_DELETE = 'מחק';
var MSG_FILL_ALL = '⚠️ נא למלא את כל השדות';
var MSG_FILL_LOGIN = '⚠️ נא למלא שם משתמש וסיסמה';
var MSG_LOAD_FAIL_PRE = '⚠️ טעינת הנתונים נכשלה (';
var MSG_KV_BAD = 'ערך פגום בענן';
var MSG_LOGIN_ERR = '❌ הכניסה נכשלה — ';
var MSG_MY_PASS_TITLE = '🔑 שינוי הסיסמה שלי';
var MSG_NO_MATCH = 'אין תוצאות';
var MSG_OFFLINE_LOGIN = '📴 כניסה במצב אופליין — הנתונים יסונכרנו כשהרשת תחזור';
var MSG_PASS_CUR_BAD = '❌ הסיסמה הנוכחית שגויה';
var MSG_PASS_MISMATCH = '⚠️ הסיסמאות החדשות אינן זהות';
var MSG_PASS_SIX = '⚠️ הסיסמה חייבת להיות שש ספרות';
var MSG_PASS_UPDATE_FAIL = '❌ עדכון הסיסמה נכשל: ';
var MSG_PASS_VERIFY_FAIL = '❌ לא ניתן לאמת את הסיסמה הנוכחית: ';
var MSG_SERVER_ERR = 'שגיאת שרת';
var MSG_SWITCHED_TO = 'הוחלף ל';
var MSG_OFF_UNKNOWN = '📴 אין חיבור — המשתמש הזה אינו בעותק המקומי שבמכשיר. נדרש חיבור לאינטרנט פעם אחת';
var MSG_OFF_NO_FP = '📴 אין חיבור — המשתמש הזה טרם הוכן לכניסה ללא רשת. נדרש חיבור לאינטרנט פעם אחת';
var MSG_OFF_NO_CRYPTO = '❌ הדפדפן אינו תומך בהצפנה הנדרשת לכניסה ללא רשת';
var MSG_NO_CRYPTO = '❌ הדפדפן אינו תומך בהצפנה הנדרשת לאימות הסיסמה';
var MSG_OFF_USER_WRITE = '📴 אין חיבור — ניהול משתמשים דורש חיבור לאינטרנט';
var MSG_USER_DISABLED_OUT = '⚠️ המשתמש הושבת — מתנתק';
var MSG_PASS_CHANGED_OUT = '⚠️ הסיסמה שונתה — יש להיכנס מחדש';

// ── עוזרי הרשת ──
// בלי קידומת אפליקציה — השם הזהה הוא מה שמאפשר להשוות ביניהן.
// MSG_OFFLINE נקרא מבחוץ — נוסחו נבדל פר-אפליקציה.
var NET_TIMEOUT_MS = 8000;
function isNetErr(e) {
  if (!navigator.onLine) return true;
  var m = ((e && (e.message || e.details || '')) + '').toLowerCase();
  return m.indexOf('fetch') !== -1 || m.indexOf('network') !== -1 ||
         m.indexOf('failed to') !== -1 || m.indexOf('timeout') !== -1;
}
function withTimeout(p, ms) {
  return Promise.race([
    Promise.resolve(p),
    new Promise(function(_, reject) {
      setTimeout(function(){ reject(new Error('timeout')); }, ms || NET_TIMEOUT_MS);
    })
  ]);
}
function errMsg(e) {
  return isNetErr(e) ? MSG_OFFLINE : ('שגיאה: ' + ((e && (e.message || e.code)) || e));
}

// ── מזהה מכשיר ──
var _deviceIdMem = null;
function getDeviceId() {
  var id = lsGet(app.DEV_CFG.key, null);
  if (!id) {
    id = _deviceIdMem || _randDeviceId();
    lsSetRaw(app.DEV_CFG.key, id);
  }
  _deviceIdMem = id;
  return id;
}
function _randDeviceId() {
  var c = 'abcdefghijklmnopqrstuvwxyz0123456789', id = '';
  for (var i = 0; i < 8; i++) id += c.charAt(Math.floor(Math.random() * c.length));
  return id;
}

// ── ערך מפתח-ערך ──
// null הוא ערך שאינו קיים ולא כשל, וערך שאינו JSON הוא כשל שנוקב בשם המפתח — «נכשל» לשניהם שולח לחפש רשת שלא נפלה.
function kvParse(key, raw) {
  if (raw === null || raw === undefined || raw === '') return { ok: true, value: null, bad: false };
  try { return { ok: true, value: JSON.parse(raw), bad: false }; }
  catch (e) {
    // ההודעה יוצאת מכאן ולא מאתר הקריאה — נקודת יציאה אחת שומרת על נוסח אחד לכשל.
    console.error('[sync] ' + MSG_KV_BAD + ' [' + key + ']:', e);
    toast('⚠️ ' + kvBadLabel(key), null, 'bad');
    return { ok: false, value: null, bad: true };
  }
}
function kvBadLabel(name) { return name + ' (' + MSG_KV_BAD + ')'; }

// ── משווה עברי ──
// אחד לכל העץ — localeCompare בונה משווה בכל קריאה, ובתוך sort זה O(n log n) פעמים;
// בלי Intl.Collator — נפילה-חזרה ל-localeCompare עם אותו he, באותו סדר.
var HE_COLLATOR = (function () {
  try { return new Intl.Collator('he'); }
  catch (e) { return { compare: function (a, b) { return String(a).localeCompare(String(b), 'he'); } }; }
})();

// ייצוא בשם ולא default — שם שנעלם נשבר בטעינה, ו-default היה נבלע בשקט.
export { app, appConfigure, HE_COLLATOR, readNum, uniqList, uniqHas,
         MSG_DELETE, MSG_FILL_ALL, MSG_FILL_LOGIN,
         MSG_KV_BAD, MSG_LOAD_FAIL_PRE, MSG_LOGIN_ERR, MSG_MY_PASS_TITLE,
         MSG_NO_CRYPTO, MSG_NO_MATCH, MSG_OFFLINE, MSG_OFFLINE_LOGIN, MSG_OFF_NO_CRYPTO,
         MSG_OFF_NO_FP, MSG_OFF_UNKNOWN, MSG_OFF_USER_WRITE,
         MSG_PASS_CHANGED_OUT, MSG_PASS_CUR_BAD, MSG_PASS_MISMATCH, MSG_PASS_SIX,
         MSG_PASS_UPDATE_FAIL, MSG_PASS_VERIFY_FAIL, MSG_SAVED,
         MSG_SAVED_LOCAL, MSG_SAVE_FAIL, MSG_SERVER_ERR, MSG_STALE_CODE,
         MSG_SWITCHED_TO, MSG_SW_TIMEOUT, MSG_SYNC_BACK,
         MSG_USER_DISABLED_OUT,
         errMsg, getDeviceId, isNetErr, kvParse, withTimeout, GREG_MONTHS, dayAdd, dayDiff, dayIso,
         dayNoon,
         dayToday };
