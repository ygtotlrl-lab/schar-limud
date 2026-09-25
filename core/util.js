/* ═══ core/util.js — עוזרי הליבה ════════════════════════════════════════
   ⭐ מסירת התצורה, מחרוזות ההודעה, הרשת, מזהה המכשיר, ערך מפתח-ערך והיום.
   ⛔ **והסיומת `.js` ⛔ ולא `.mjs`** — ⚠️ שרת סטטי שאינו מכיר `.mjs` מחזיר
      `application/octet-stream`, ⭐ והמודול נדחה כולו: ⛔ הדף אינו עולה.
   השורות: «היום — בשעון מקומי, ובמקום אחד» · «`devid` — מזהה מכשיר» ·
   «מחרוזת למשתמש היא קבוע» · «פסק זמן אחיד לקריאות רשת» ·
   «ערך במפתח-ערך הוא JSON» · «רשימה אינה נושאת פריט כפול» · «שדה מספרי»
   ⛔ המודול זהה בית-לבית בכל ריפו שנושא אותו — ⚠️ והתצורה פר-אפליקציה
      נמסרת ב-`appConfigure` שבראש `index.html`, ⭐ ואינה כתובה כאן.
   ⛔ ושינוי כאן — בכל הריפו שנושאים אותו, באותו סבב.
   ════════════════════════════════════════════════════════════════════ */

import { lsGet, lsSetRaw } from './storage.js';
import { toast } from './ui.js';

/* ═══ קריאת ערך מספרי — מודול משותף ═══════════════════════════════════════
   ⛔ **כל קריאת ערך מספרי משדה עוברת כאן** — ⚠️ המרה ישירה מחזירה `NaN`
      על שדה ריק, ⭐ ו-`NaN` שנכנס להשוואה נכשל בשקט: ⛔ `!val` תופס גם
      אפס תקין, ⚠️ ו-`val > 30` על `NaN` הוא `false`.
   ⛔ **והברירה מוצהרת בקריאה** — ⚠️ ולא נגזרת בשקט מהטיפוס: ⭐ מי שקורא
      רואה מה הוא מקבל על שדה ריק, ⛔ ואינו מגלה זאת מהתנהגות.
   ⛔ **והקלט הוא האלמנט** ⛔ ולא ערכו — ⚠️ אלמנט חסר הוא מסלול תקף, ⭐ והוא
      מחזיר את הברירה: ⛔ קורא שמפרק בעצמו `el.value` מקבל `undefined`
      ונופל לפני שהגיע לכאן.
   ═══════════════════════════════════════════════════════════════════════ */
function readNum(inp, dflt) {
  var d = (dflt === undefined) ? 0 : dflt;
  if (!inp) return d;
  var raw = String(inp.value == null ? '' : inp.value).trim();
  if (raw === '') return d;
  var n = Number(raw);
  return isFinite(n) ? n : d;
}
/* ═══════════════ סוף מודול קריאת ערך מספרי ══════════════════════════════ */

/* ═══ כיווץ רשימת ערכים — מודול משותף ═════════════════════════════════════
   ⛔ שני פריטים באותו ערך הם פריט אחד — ⚠️ **והכיווץ הוא בכתיבה ובמיזוג
      כאחד**: ⭐ `uniqHas` מונעת את הכפילות שמכאן ואילך, ⛔ ו-`uniqList`
      מסלקת את מה שכבר נכתב פעמיים.
   ⛔ ושתיהן מכריעות לפי **אותה זהות** — ⚠️ שני מימושים לאותה טענה נבדלים
      בשקט, ⭐ ואז המסך מראה פעמיים את מה שהמיזוג מכווץ לאחד.
   ⛔ והראשון שורד — ⚠️ הסדר של הצד שניצח הוא סדר המסך, ⭐ ומי שדורש
      שהחדש ינצח ממיין לפני הקריאה. */
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
/* ═══════════════ סוף מודול כיווץ רשימת ערכים ═══════════════════════════ */

/* ═══ היום ועוגן הצהריים — מודול משותף ════════════════════════════════════
   ⛔ **«היום» נגזר מהשעון המקומי** — ⚠️ ולא מ-`toISOString().slice(0,10)`:
      ⭐ UTC מקדים את התאריך המקומי בשעות הקצה, ⛔ ותנועה שנרשמת אחרי חצות
      נופלת ליום — ולעיתים לחודש — הקודם.
   ⛔ אין להחליף ב-`toISOString` — זה בדיוק הבאג שהפונקציה מונעת.
   ⚠️ **ו-`n` הוא חשבון לוח** — ⭐ ימים שלמים מהיום המקומי, ⛔ בלי מילישניות:
      יום אינו תמיד 24 שעות.
   ⭐ **ו-`dayIso` הוא הצורה האחת של תאריך כמחרוזת** — `YYYY-MM-DD` מקומי.
   ⛔ **ותאריך שהופך ל-`Date` מעוגן בצהריים מקומיים** — ⚠️ חצות ועוד כפולות
      של 24 שעות נופל ליום הקודם במעבר לשעון חורף: ⭐ `dayNoon` מקבלת
      מחרוזת `YYYY-MM-DD`, `Date`, או שנה-חודש(0)-יום.
   ═══════════════════════════════════════════════════════════════════════ */
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
/* ═══════════════ סוף היום ועוגן הצהריים ════════════════════════════════ */

/* ═══ מסירת התצורה — מודול משותף ════════════════════════════════════════
   ⭐ **התצורה פר-אפליקציה נמסרת פעם אחת, בעלייה** — ⚠️ המודולים זהים
      בית-לבית בכל הריפו, ⛔ ולכן אינם כותבים שום ערך של אפליקציה אחת.
   ⛔ **והמסירה בשומרי קריאה (`get`)** ⛔ ולא בערכים — ⚠️ חלק מהתצורה
      מוגדר ב-`index.html` אחרי ההסבה, ⭐ ושומר קורא אותו בזמן הקריאה.
   ⛔ **ושם שאינו נמסר הוא `undefined`** — ⚠️ ולא שגיאה בטעינה: ⭐ מודול
      שנושא יכולת שאין לאפליקציה אינו קורא לה.
   ═══════════════════════════════════════════════════════════════════════ */
const app = {};
function appConfigure(cfg) {
  Object.defineProperties(app, Object.getOwnPropertyDescriptors(cfg));
}
/* ═══════════════ סוף מסירת התצורה ══════════════════════════════════════ */

/* ═══ מחרוזות ההודעה המשותפות — מודול משותף ══════════════════════════════
   ⭐ הודעה שיותר מאפליקציה אחת אומרת יושבת כאן פעם אחת, ⛔ וגופה אחד:
   ⚠️ עותק פר-אפליקציה של אותה הודעה נפרד בשקט — ⭐ שם אחד נושא טקסט
   אחר בכל ריפו, ⛔ והודעה שנכתבת כליטרל אינה נמדדת כלל.
   ⛔ **והמשפחה תשתית ולא מפקד** — ⚠️ אפליקציה שאינה אומרת הודעה נושאת
   אותה בכל זאת: ⭐ המושג חי בכולן, ⛔ ורשימה שנגזרת ממי שמציג אותה
   היום משתנה עם המוצר ⛔ ואיש אינו מיישר אותה בחזרה.
   ⛔⛔ **ונוסח הכשל נגזר מההתנהגות** — ⚠️ כל אתר חי של
   `MSG_OFFLINE` הוא **קריאה** שנכשלה, ⭐ ולא נכתב שם דבר שאפשר לסנכרן:
   ⛔ «תסתנכרן כשהחיבור יחזור» הוא הבטחה על נתון שאינו קיים.
   ⭐ **וההבטחה נכונה רק על כתיבה שכבר בתור** —
   `MSG_SAVED_LOCAL` ו-`MSG_CLOUD_SYNC_FAIL`, ⛔ ושם היא נאמרת מפורשות.
   ⚠️ **ומה שנבדל בהחלטה אינו כאן** — ⛔ `MSG_BAD_LOGIN` נבדל פר-אפליקציה
   בהחלטת מנהל, ⭐ ונשאר עם נימוקו במקומו.
   ⛔ **וכל הודעת חסימה מתארת מצב אחר** — ⚠️ אין לאחד אותן זו עם זו ולא עם
   «סיסמה שגויה»: ⭐ הודעה מאוחדת שולחת את המשתמש להקליד שוב ושוב סיסמה
   נכונה, ⛔ במקום לומר לו את הדבר היחיד שיפתור — חיבור אחד.
   ═══════════════════════════════════════════════════════════════════════ */
var MSG_SAVED = '✅ נשמר בהצלחה';
var MSG_SAVED_LOCAL = '✅ נשמר במכשיר — יסונכרן כשתחזור הרשת';
var MSG_SAVE_FAIL = '❌ השמירה נכשלה';
var MSG_SYNC_BACK = '☁️ הסנכרון חזר לפעול';
var MSG_CLOUD_SYNC_FAIL = '⚠️ הסנכרון לענן נכשל — הנתונים שמורים במכשיר ויישלחו כשהרשת תחזור';
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
/* ═══════════════ סוף מודול מחרוזות ההודעה ══════════════════════════════ */

/* ═══ עוזרי הרשת — מודול משותף ════════════════════════════════════════════
   ⛔ שלוש הפונקציות משותפות לכל הריפו — ⚠️ צורה שנייה לאחת מהן היא סחיפה
      שאיש אינו רואה: ⭐ ולכן הן כאן, ⛔ ולא ב-`index.html`.
   ⛔ אין לתת להן קידומת פרויקט — ⚠️ השם הזהה הוא מה שמאפשר להשוות ביניהן
      בין כל הריפו, ⛔ ושם עם קידומת מחזיר אותן למצב שאיש אינו מודד בו.
   ⛔ **ו-`MSG_OFFLINE` נקרא מבחוץ** — ⚠️ נוסחו נבדל פר-אפליקציה, ⭐ והבלוק
      מפנה אליו ⛔ ואינו מכיל אותו.
   ═══════════════════════════════════════════════════════════════════════ */
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
/* ═══════════════ סוף מודול עוזרי הרשת ══════════════════════════════════ */

/* ═══ מזהה מכשיר — מודול משותף ════════════════════════════════════════════
   ═══════════════════════════════════════════════════════════════════════ */
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
/* ═══════════════ סוף מודול מזהה המכשיר ═════════════════════════════════ */

/* ═══ ערך מפתח-ערך — מודול משותף ════════════════════════════════════════
   ⛔ «אין ערך» ו«ערך פגום» אינן אותה תשובה — ⚠️ שתיהן חזרו «נכשל», ⭐ והמשתמש
      חיפש רשת שלא נפלה.
   ⛔ ולכן `null` הוא ערך שאינו קיים ⛔ ואינו כשל, ⚠️ וערך שאינו JSON הוא כשל
      שנוקב בשם המפתח.
   ⛔ והנוסח אחד בכולן — ⚠️ הודעה שנבדלת בין האפליקציות היא ארבעה חיפושים
      לאותה תקלה.
   ═══════════════════════════════════════════════════════════════════════ */
function kvParse(key, raw) {
  if (raw === null || raw === undefined || raw === '') return { ok: true, value: null, bad: false };
  try { return { ok: true, value: JSON.parse(raw), bad: false }; }
  catch (e) {
    /*  ⛔ ההודעה יוצאת מכאן ⛔ ולא מאתר הקריאה — ⚠️ כשל שאינו אומר מה קרה
     *  שקול לכשל שקט, ⭐ ונקודת יציאה אחת היא מה שמשאיר את הנוסח אחד. */
    console.error('[sync] ' + MSG_KV_BAD + ' [' + key + ']:', e);
    toast('⚠️ ' + kvBadLabel(key), null, 'bad');
    return { ok: false, value: null, bad: true };
  }
}
function kvBadLabel(name) { return name + ' (' + MSG_KV_BAD + ')'; }
/* ═══════════════ סוף מודול ערך מפתח-ערך ═════════════════════════════════ */

/*  ⛔ הייצוא בשם ⛔ ואינו `default` — ⚠️ קורא שמייבא שם שנעלם נשבר בטעינה,
 *  ⭐ ו-`default` היה נבלע בשקט. */
export { app, appConfigure, readNum, uniqList, uniqHas,
         MSG_CLOUD_SYNC_FAIL, MSG_DELETE, MSG_FILL_ALL, MSG_FILL_LOGIN,
         MSG_KV_BAD, MSG_LOAD_FAIL_PRE, MSG_LOGIN_ERR, MSG_MY_PASS_TITLE,
         MSG_NO_CRYPTO, MSG_OFFLINE, MSG_OFFLINE_LOGIN, MSG_OFF_NO_CRYPTO,
         MSG_OFF_NO_FP, MSG_OFF_UNKNOWN, MSG_OFF_USER_WRITE,
         MSG_PASS_CHANGED_OUT, MSG_PASS_CUR_BAD, MSG_PASS_MISMATCH, MSG_PASS_SIX,
         MSG_PASS_UPDATE_FAIL, MSG_PASS_VERIFY_FAIL, MSG_SAVED,
         MSG_SAVED_LOCAL, MSG_SAVE_FAIL, MSG_SERVER_ERR, MSG_STALE_CODE,
         MSG_SWITCHED_TO, MSG_SW_TIMEOUT, MSG_SYNC_BACK,
         MSG_USER_DISABLED_OUT,
         errMsg, getDeviceId, isNetErr, kvParse, withTimeout, dayIso,
         dayNoon,
         dayToday };
