/* ═══ core/sync.js — ליבת הסנכרון ═══════════════════════════════════════
   ⭐ מזהים, מיזוג, ממתין, ניסיון חוזר, משיכה, דחיפה, עידן ושומר ההקשר.
   השורות: «`ids` — מזהי רשומות» · «`merge` — ליבת המיזוג» ·
   «`tombstones`» · «הקשר נלכד בכניסה לפונקציה» · «משיכה מסוננת בשרת» ·
   «חתימת סכימה» · «פעולה מגיבה מיד» · «`pend` — ממתין לסנכרון» ·
   «`rty` — ניסיון חוזר» · «`pull` — מנגנון המשיכה» ·
   «`push` — שכבת הדחיפה» · «ברירת מחדל אינה ממוזגת» ·
   «כל דחיפה נרשמת ביומן»
   ⛔ המודול זהה בית-לבית בכל ריפו שנושא אותו — ⚠️ והתצורה פר-אפליקציה
      נמסרת ב-`appConfigure` שבראש `index.html`, ⭐ ואינה כתובה כאן.
   ⛔ ושינוי כאן — בכל הריפו שנושאים אותו, באותו סבב.
   ════════════════════════════════════════════════════════════════════ */

import { MSG_SAVED_LOCAL, MSG_SAVE_FAIL, MSG_STALE_CODE, app, isNetErr,
         kvParse, withTimeout } from './util.js';
import { lsGet, lsHorizonRelease, lsLog, lsSet } from './storage.js';
import { closeModal, esc, toast } from './ui.js';

/* ═══ מזהי רשומות — מודול משותף ═══════════════════════════════════════════
   ═══════════════════════════════════════════════════════════════════════ */
function newClientId(){
  try{
    if(typeof crypto!=='undefined'&&crypto&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
  }catch(e){}
  var b=null;
  try{
    if(typeof crypto!=='undefined'&&crypto&&typeof crypto.getRandomValues==='function'){
      b=new Uint8Array(16);crypto.getRandomValues(b);
    }
  }catch(e){b=null;}
  if(!b){b=new Array(16);for(var i=0;i<16;i++)b[i]=Math.floor(Math.random()*256);}
  b[6]=(b[6]&0x0f)|0x40;b[8]=(b[8]&0x3f)|0x80;  // גרסה 4, variant RFC 4122
  var h=[],j;for(j=0;j<16;j++)h.push((b[j]+0x100).toString(16).slice(1));
  return h.slice(0,4).join('')+'-'+h.slice(4,6).join('')+'-'+h.slice(6,8).join('')+'-'+h.slice(8,10).join('')+'-'+h.slice(10,16).join('');
}
// השוואת זהות — תמיד כמחרוזת. עובדת על מזהה ישן (מספר) ועל חדש (uuid)
// באותה מידה, ⛔ וגם על התאמה חוצת-סוגים שנוצרת כשמזהה עובר דרך מאפיין
// HTML וחוזר כמחרוזת.
function idEq(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}
// מזהה כארגומנט למאפיין `onclick`, וכבורר לאיתור האלמנט בחזרה.
// ⛔ **מצוטט תמיד** — uuid בלי מרכאות הוא שם משתנה שאינו קיים,
// וכל כפתורי העריכה והמחיקה היו מתים.
// ⛔ והסינון הוא **רשימת-היתר של תווים** ולא בריחה: ערך המאפיין
//    עובר פענוח-ישויות לפני שהוא נקרא כ-JS, ולכן `&#39;` שנוצר ע"י `esc`
//    היה חוזר להיות גרש וסוגר את המחרוזת. מזהה חוקי כאן הוא ספרות, אותיות
//    לטיניות, מקף וקו תחתון בלבד — כל השאר נחתך.
function idArg(v) {
  return "'" + String(v == null ? '' : v).replace(/[^A-Za-z0-9_-]/g, '') + "'";
}
// ⛔ **נקודת המעבר האחת בין מזהה למספר** — ⚠️ והיא אינה השוואת זהות: ⭐ היא
//    מחלצת **חותמת שנשמרה בשדה המזהה בגרסה ישנה**, מהתקופה שבה המזהה היה
//    `Date.now()`. ⛔ ומחרוזת שאינה ספרות בלבד מחזירה 0 ⛔ ולא `NaN` —
//    ⚠️ `NaN` בהשוואה נכשל בשקט, ⭐ ואפס הוא «אין חותמת» מוצהר.
// ⛔ אין להמיר מזהה למספר בשום מקום אחר — הוא `text`, ⛔ ו-`parseInt` עליו
//    מחזיר `NaN`: ⚠️ ההשוואה נכשלת בלי שאיש רואה.
function legacyIdStamp(v) {
  var s = String(v == null ? '' : v);
  return /^[0-9]+$/.test(s) ? Number(s) : 0;
}
/* ═══════════════ סוף מודול מזהי הרשומות ════════════════════════════════ */

/* ═══ מיזוג רשומות — מודול משותף ═════════════════════════════════════════
   ═══════════════════════════════════════════════════════════════════════ */
// כלל ההכרעה בין שתי גרסאות של **אותה** רשומה — הנקודה היחידה בארגון שבה
// הוא נכתב. ⛔ אין לשכפל אותה — ר' הנימוק שבראש הבלוק.
// `isPend` הוא הסימון ⏳ של הרשומה המקומית; `mergePair`, כשהוא קיים, מקבל
// את ההכרעה כפרמטר ומרחיב אותה (מיזוג פנימי של סנאפשוט).
// ⛔ **⏳ שובר שוויון ⛔ ואינו גובר על חותמת חדשה יותר** — ⚠️ מכשיר א׳ ערך
//    ב-08:00 ולא הספיק לדחוף, ב׳ ערך ב-10:00 וסנכרן, וא׳ עלה ב-14:00:
//    ⭐ ⏳ שמנצח תמיד היה מוחק כאן את עריכת ה-10:00. ⛔ והמקרה שבו ⏳ באמת
//    נחוץ — רשומה שאינה בענן כלל — מטופל במסלול «מפתח שאינו בענן».
function _mergePick(loc, rem, k, isPend, tsOf, mergePair) {
  if (mergePair) return mergePair(loc, rem, k, isPend);
  return tsOf(loc) > tsOf(rem) ? loc
       : (tsOf(loc) === tsOf(rem) && isPend ? loc : rem);   // שוויון → ⏳, אחרת הענן
}
// `opts`: getKey · ts · isPending · mergePair · keepUnversionedLocal · onDrop
//         ובנוסף ארבע ידיות המדיניות שבראש הבלוק.
function mergeCore(local, remote, opts) {
  var o = opts || {};
  var getKey = o.getKey, tsOf = o.ts, mergePair = o.mergePair || null;
  var keepUnversionedLocal = !!o.keepUnversionedLocal, onDrop = o.onDrop || null;
  var dedupe = o.dedupe !== false;
  var remoteDupe = o.remoteDupe || 'ts';        // 'ts' | 'last'
  var keyless = o.keyless || 'drop';            // 'drop' | 'keep-remote'
  var localPick = o.localPick || 'last';        // 'last' | 'first'
  var pend = function (k) { return !!(o.isPending && o.isPending(k)); };
  var L = Array.isArray(local) ? local : [];
  var R = Array.isArray(remote) ? remote : [];

  // ── מסלול א: איחוד כפילויות (map+order) ────────────────────────────────
  if (dedupe) {
    var map = {}, order = [];
    R.forEach(function (r) {
      if (!r) return;
      var k = getKey(r); if (k == null) return; k = String(k);
      if (!(k in map)) { order.push(k); map[k] = r; return; }
      // ⚠️ הסדר כאן הוא (הקיים, החדש) — שוויון נופל על ה**מאוחר** במערך.
      //    היפוך הארגומנטים הופך את שובר-השוויון בשקט.
      map[k] = (remoteDupe === 'last') ? r
             : _mergePick(map[k], r, k, false, tsOf, mergePair);
    });
    L.forEach(function (r) {
      if (!r) return;
      var k = getKey(r); if (k == null) return; k = String(k);
      if (!(k in map)) {
        // רשומה מקומית-בלבד — היעדרות אצל הצד השני אינה מחיקה.
        if (tsOf(r) > 0 || keepUnversionedLocal || remote == null) { order.push(k); map[k] = r; }
        else if (onDrop) { try { onDrop(r, k); } catch (eD) {} }
      } else { map[k] = _mergePick(r, map[k], k, pend(k), tsOf, mergePair); }
    });
    return order.map(function (k) { return map[k]; });
  }

  // ── מסלול ב: שימור כפילויות (דחיפה זורמת) ──────────────────────────────
  var out = [], seen = {}, byKey = {};
  L.forEach(function (l) {
    var k = getKey(l); if (k == null) return; k = String(k);
    if (localPick === 'last' || !(k in byKey)) byKey[k] = l;
  });
  R.forEach(function (r) {
    var k = getKey(r);
    if (k == null) { if (keyless === 'keep-remote') out.push(r); return; }
    k = String(k); seen[k] = 1;
    var l = byKey[k];
    if (!l) { out.push(r); return; }
    out.push(_mergePick(l, r, k, pend(k), tsOf, mergePair));
  });
  L.forEach(function (l) {
    var k = getKey(l); if (k == null) return; k = String(k);
    if (!seen[k]) out.push(l);
  });
  return out;
}
/* ═══════════════ סוף מודול המיזוג ══════════════════════════════════════ */

/* ═══ גריעת tombstones — מודול משותף ═════════════════════════════════════
   ═══════════════════════════════════════════════════════════════════════ */
// כל רשומה שנמחקה משאירה tombstone לנצח. הם נשמרים במכשיר **ונדחפים לענן
// בכל שמירה**, ואיש כבר אינו קורא אותם.
//
// שלושה כללים, כולם קריטיים:
// 1. **רק tombstones.** רשומה חיה אינה נגרעת לעולם, בלי קשר לגיל.
// 2. **רק עם חותמת מספרית.** tombstone בלי חותמת — אי אפשר לדעת מתי נמחק,
//    ולכן הוא **נשאר**: חותמת חסרה נקראת 0, וגריעה לפיה הייתה מוחקת דווקא
//    את הישנים ביותר בלי שום ראיה לגילם.
// 3. **`TOMBSTONE_TTL_MS`.** ⛔ הסף ארוך בהרבה מכל היעדרות סבירה.
//
// ⚠️ המחיר המודע: מכשיר שהיה מנותק מעבר לסף ולא קיבל את ה-tombstone עדיין
// מחזיק את הרשומה כחיה, וכשיסתנכרן היא תחזור **פעם אחת**. מחיקה חוזרת
// יוצרת tombstone חדש ומתוארך. ⛔ והסף עצמו הוא מדיניות נתונים ⛔ ולכן
// החלטת המנהל.
var TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

// דגל חד-פעמי: הטעינה מרימה אותו, והמיזוג הראשון שאחריה צורך אותו.
// ⛔ גריעה מקומית בלבד חסרת משמעות — מנוע המיזוג מחזיר כל רשומה שקיימת
// בענן ואין לה מקבילה מקומית, ולכן ה-tombstones היו חוזרים תוך שניות
// והעותק הענני לעולם לא היה מצטמצם. ⚠️ הגריעה **אינה** רצה בפולינג
// ואינה נוגעת במנוע המיזוג — היא מופעלת על התוצאה, פעם אחת לעלייה.
var _tombPrunePending = false;

// ⛔ שתי צורות החותמת נקראות כאן — ⚠️ `updatedAt` ו-`updated_at` חיות שתיהן
//    בארגון, ⭐ ופונקציה שמכירה אחת מהן אינה מודול משותף: ⛔ היא הייתה
//    מחזירה «בלי חותמת» לכל רשומה בשתי אפליקציות, ומשאירה כל tombstone.
function tombStamp(r) {
  if (!r || typeof r !== 'object') return null;
  if (typeof r.updatedAt === 'number') return r.updatedAt;
  if (typeof r.updated_at === 'number') return r.updated_at;
  return null;
}

function prunePastTombstones(arr, nowTs) {
  if (!Array.isArray(arr)) return [];
  var cutoff = (typeof nowTs === 'number' ? nowTs : Date.now()) - TOMBSTONE_TTL_MS;
  return arr.filter(function (r) {
    if (!r || typeof r !== 'object') return false;
    if (!r.deleted) return true;                 // חי — לא נוגעים
    var t = tombStamp(r);
    if (t === null) return true;                 // בלי חותמת — משאירים
    return t >= cutoff;                          // tombstone טרי — משאירים
  });
}

// ⛔ נקודת ההפעלה האחת — ⚠️ המיזוג של אוסף רשומות מעביר כאן את תוצאתו,
//    ⭐ והגריעה רצה בפעם הראשונה שאחרי הטעינה ותו לא: ⛔ עוטף שני היה
//    מאפשר לכל מקום בקוד לגרוע, ⚠️ ובכל פולינג.
function tombPruneMerged(arr) {
  if (!_tombPrunePending) return arr;
  _tombPrunePending = false;
  var before = Array.isArray(arr) ? arr.length : 0;
  var out = prunePastTombstones(arr);
  if (before !== out.length) console.log('[tomb] נגרעו ' + (before - out.length) + ' tombstones מעבר לסף');
  return out;
}
// ⛔ נקודת ההפעלה היחידה של המודול — ⚠️ העלייה מרימה את הדגל **פעם אחת**,
//    ⭐ והמיזוג הראשון שאחריה צורך אותו: ⛔ הרמה בכל פולינג הייתה גורעת
//    בכל שלוש שניות, ⚠️ וזה בדיוק מה שהדגל בא למנוע.
function tombBoot() { _tombPrunePending = true; }
/* ═══════════════ סוף מודול גריעת ה-tombstones ══════════════════════════ */

/* ═══ שומר ההקשר — מודול משותף ════════════════════════════════════════════
   ⛔ מחזור «קרא ← מזג ← דחוף» נפתח בהקשר אחד ⛔ ואינו רשאי לכתוב באחר —
      ⚠️ בין ה-`await` הראשון לאחרון ההקשר יכול להתחלף, ⭐ ומאותו רגע
      הגלובלים מצביעים על החדש והזיכרון עדיין מחזיק את הישן: ⛔ כל כתיבה
      שאחריו כותבת את נתוני ההקשר הקודם תחת החדש, ⚠️ וכל רישום הצלחה נזקף
      לחשבון הלא נכון — ⭐ ועֵד פינוי כזה מתיר למחוק מהדיסק רשומה שמעולם
      לא עלתה.
   ⛔ **המונה ⛔ ולא שם ההקשר** — ⚠️ החלפה הלוך-ושוב מחזירה את אותו שם,
      ⭐ והזיכרון בינתיים כבר הוחלף: ⛔ שוויון שמות אינו שוויון הקשר.
   ⛔ **ומה נלכד מוצהר פר-אפליקציה** ⛔ ואינו כאן — ⚠️ באפליקציה רב-מוסדית
      זה המוסד, ⭐ ובשאר המשתמש המחובר: ⛔ המנגנון אחד ⚠️ והנלכד נבדל.
   ═══════════════════════════════════════════════════════════════════════ */
var _ctxEpoch = 0;
function ctxEpoch() { return _ctxEpoch; }
/*  ⛔ נקודת הקידום היחידה — ⚠️ כל מסלול שמחליף הקשר קורא לה **לפני**
 *  הטעינה החדשה: ⭐ קידום שאחרי הטעינה משאיר את המחזור שרץ עכשיו סבור
 *  שהוא עדיין בהקשר שלו, ⛔ והכתיבה שלו נזקפת לחשבון החדש. */
function ctxSwitch() { _ctxEpoch++; return _ctxEpoch; }
/*  ⛔ «האם ההקשר התחלף מאז שהתחלתי» — ⚠️ הקורא לוכד את הערך בכניסה
 *  ⛔ ומוסר אותו כאן, ⭐ ואינו קורא את הגלובלי פעמיים. */
function ctxStale(ep) { return ep !== _ctxEpoch; }
/* ═══════════════ סוף שומר ההקשר ═════════════════════════════════════════ */

/* ═══ משיכה מסוננת בשרת — מודול משותף ═════════════════════════════════════
   ⛔ מסך מושך **רק את החלון שהוא מציג** — ⚠️ הנימוק המדוד: מסך ההשגחה מציג
      חודש עברי אחד ⛔ ומשך **18,085 סימונים** בכל כניסה אליו, ⭐ ואת כולם
      סינן בדפדפן. ⛔ סינון שרץ אחרי ההורדה אינו חוסך דבר — ⚠️ הרשת כבר
      שילמה, ⭐ והמסך ממתין לה.
   ⛔ שלושה מסלולים מושכים **מלא**, ⛔ ואין לצמצם אותם — ⚠️ הסנכרון והמיזוג,
      שמנוע ההכרעה שלו חייב את כל הרשומות ⛔ אחרת «אין אצלי» נקרא «נמחקה» ·
      הגיבוי היומי, ⛔ שמגבה טבלה ולא חלון · והחלון החם, ⚠️ שהוא מנגנון
      פינוי נפרד. ⭐ ולכן `win` הוא פרמטר **אופציונלי** — ⛔ מי שאינו מעביר
      אותו מקבל בדיוק את ההתנהגות הקודמת.
   ⛔ `mkQuery` היא פונקציה ⛔ ולא בונה מוכן — ⚠️ בונה PostgREST נצרך בשליחה,
      ⭐ וכל עמוד חייב אחד טרי משלו.
   ⛔ שליפה בעמודים ולא בבקשה אחת — ⚠️ גוף תשובה שגדל עם הנתונים נחתך,
      ⛔ ו-PostgREST יודע להגביל את מספר השורות (`db-max-rows`): ⭐ ביום
      שיוגדר, התשובה תיחתך **בשקט**. ⛔ ותשובה חלקית שנראית שלמה גרועה
      מ«אין ראיה» — ⚠️ ולכן עמוד שנכשל מחזיר `null` ⛔ ולא את מה שהספיק.
   ⛔ ותקרת בטיחות ללולאה שתלויה בגודל התשובה — ⚠️ מסד שמחזיר עמוד מלא
      לנצח תולה את הדף.
   ═══════════════════════════════════════════════════════════════════════ */
var ROWS_PAGE = 1000;
var ROWS_CAP = 500000;
async function _rowsPaged(mkQuery, order, win) {
  var out = [], from = 0;
  for (;;) {
    var q = mkQuery();
    if (win && win.col) {
      if (win.from) q = q.gte(win.col, win.from);
      if (win.to) q = q.lte(win.col, win.to);
    }
    if (order) q = q.order(order, { ascending: true });
    var res = await withTimeout(q.range(from, from + ROWS_PAGE - 1));
    if (!res || res.error || !Array.isArray(res.data)) return null;
    out = out.concat(res.data);
    if (res.data.length < ROWS_PAGE) return out;
    from += ROWS_PAGE;
    if (from > ROWS_CAP) return out;
  }
}
/* ═══════════════ סוף מודול משיכה מסוננת בשרת ═══════════════════════════ */

/* ═══ האזנת הסכימה — מודול משותף ══════════════════════════════════════════
/*  ⛔ **שלוש תשובות מסד מעידות שהקוד ישן מהסכימה** — טבלה שאינה קיימת
 *  (`42P01`) · עמודה שאינה קיימת (`42703`) · ו-404 על טבלה: ⚠️ שלושתן
 *  **אינן שגיאת רשת**, ⛔ וניסיון חוזר עליהן אינו יכול להצליח לעולם.
 *  ⚠️ הנימוק המדוד, מהשטח: המשתמש ראה **איטיות בלבד** — הלולאה ניסתה
 *  שוב ושוב, ⛔ בלי הודעה ובלי סימן. ⭐ ולכן הבאנר עולה **מיד**,
 *  ⛔ והניסיון החוזר נעצר.
 *  ⛔ **והדגל נדלק פעם אחת ואינו נכבה** — ⚠️ הקוד שרץ עכשיו אינו הופך
 *  לעדכני בלי טעינה מחדש, ⭐ וניסיון שני היה מדליק את הבאנר שוב. */
var _staleSchema = false;
function isStaleSchema(e) {
  if (!e) return false;
  var m = ((e.message || e.details || '') + '').toLowerCase();
  var c = ((e.code || '') + '');
  var s = Number(e.status || e.statusCode || 0);
  return c === '42P01' || c === '42703' || s === 404 ||
         m.indexOf('does not exist') !== -1;
}
/*  ⛔ נקודת הפעלה אחת לבאנר — ⚠️ המימוש פרטי לכל אפליקציה, ⭐ והשם
 *  שמתפרסם זהה: ⛔ קורא שמכיר שני שמות הוא שני מסלולים.
 *  ⛔ **ומי שלא הצליח מנסה שוב ב-`load`** — ⚠️ נמדד שהשגיאה מגיעה בזמן
 *  העלייה, ⭐ לפני שהמפרסם הספיק לרוץ: ⛔ הבאנר נבלע והמשתמש ראה טוסט
 *  בלבד. */
function _staleBanner() {
  try { if (window.showAppUpdateBanner) { window.showAppUpdateBanner(); return true; } } catch (x) {}
  return false;
}
function staleSchemaHalt(e) {
  if (!isStaleSchema(e)) return false;
  if (!_staleSchema) {
    _staleSchema = true;
    if (!_staleBanner()) {
      try { window.addEventListener('load', _staleBanner); } catch (x) {}
    }
    try { toast(MSG_STALE_CODE, 6000, 'bad'); } catch (x) {}
  }
  return true;
}
/*  ⛔ **נקודת המעבר האחת של תשובות המסד** — ⚠️ `staleSchemaHalt` בכל אתר
 *  שגיאה בנפרד היה מתגעגע לאתר שנוסף, ⭐ ורק חלק מהקריאות
 *  עוברות ב-`withTimeout`: ⛔ ולכן ההאזנה יושבת על הלקוח עצמו, ⚠️ והיא
 *  רואה כל שאילתה בלי תלות בקורא.
 *  ⛔ **העטיפה על פעלי השאילתה ולא על `from`** — ⚠️ `from()` מחזיר בונה
 *  שאינו thenable, ⭐ וה-thenable נולד רק ב-`select`/`insert`/`update`/
 *  `upsert`/`delete`. ⛔ והדגל מונע עטיפה כפולה. */
function sbWatch(c) {
  if (!c || c._staleWatch || typeof c.from !== 'function') return c;
  c._staleWatch = true;
  var from0 = c.from.bind(c);
  c.from = function (t) {
    var qb = from0(t);
    /*  ⛔ הרשימה יושבת כאן ⛔ ולא כמשתנה מודול — ⚠️ שתיים מהאפליקציות
     *  יוצרות את הלקוח **מעל** הבלוק הזה, ⭐ ומשתנה מודול היה `undefined`
     *  ברגע העטיפה: ⛔ תלות בסדר הטעינה שנשברת בשקט. */
    ['select', 'insert', 'update', 'upsert', 'delete'].forEach(function (v) {
      if (!qb || typeof qb[v] !== 'function') return;
      var f0 = qb[v].bind(qb);
      qb[v] = function () {
        var b = f0.apply(null, arguments);
        if (b && typeof b.then === 'function' && !b._staleWatch) {
          b._staleWatch = true;
          var t0 = b.then.bind(b);
          b.then = function (ok, no) {
            return t0(function (r) { if (r && r.error) staleSchemaHalt(r.error); return ok ? ok(r) : r; }, no);
          };
        }
        return b;
      };
    });
    return qb;
  };
  return c;
}
/* ═══════════════ סוף מודול האזנת הסכימה ════════════════════════════════ */

/* ═══ צינור השמירה — מודול משותף ═════════════════════════════════════════
   ⛔ **כל שמירה מטופס עוברת בצינור אחד** — ⚠️ `runSave` מריצה, ו-`afterSave`
      סוגרת מודאל · מרעננת · מודיעה · ומתזמנת דחיפה: ⭐ ארבעה שלבים בסדר
      קבוע, ⛔ ולא ארבעה סדרים בכל אתר.
   ⚠️ הנימוק המדוד: אותו רצף חי ב-11 אתרי שמירה בשלוש האפליקציות, ⛔ וכל
      אחד השמיט ממנו שלב אחר — ⭐ אחד לא סגר מודאל, אחד לא הבחין בין מקוון
      לאופליין, ⚠️ ואחד השאיר את ההודעה על «נשמר» גם כשלא הייתה רשת.
   ⛔ **ו-`runSave` מחזירה את ההבטחה** — ⚠️ בלעדיה השומר שבניתוב אינו מנטרל
      דבר: ⭐ מטפל סינכרוני נגמר לפני שהלחיצה השנייה נוחתת.
   ⛔ **ו-`undefined` מהמטפל הוא «הוולידציה עצרה»** — ⚠️ המודאל נשאר פתוח
      והמשתמש מתקן את מה שחסר, ⭐ וכל ערך אחר הוא הצלחה.
   ⛔ **ו-`saveRefresh` פר-אפליקציה** — ⚠️ מה שנטען לזיכרון ומה שמצויר נבדל
      ביניהן, ⭐ והסדר שסביבו אינו.
   ═══════════════════════════════════════════════════════════════════════ */
function errToast(e) {
  console.error('[save]', e);
  toast((e && (e.message || e.error_description)) || MSG_SAVE_FAIL, null, 'bad');
}
function afterSave(msg) {
  closeModal();
  app.saveRefresh();
  /*  ⛔ בלי רשת ההודעה אומרת «במכשיר» — ⚠️ «נשמר» סתם נקרא «נשמר בענן»,
   *  ⭐ וזו בדיוק ההטעיה שכתיבה מקומית-תחילה יוצרת. */
  if (msg) toast(navigator.onLine ? msg : MSG_SAVED_LOCAL, null, 'good');
  schedulePush();
  return Promise.resolve();
}
function runSave(fn, msg) {
  return Promise.resolve()
    .then(fn)
    .then(function (r) {
      if (r === undefined) return;
      /*  ⛔ מחרוזת מהמטפל היא ההודעה — ⚠️ יש שמירות שההודעה בהן נגזרת מהנתון
       *  שנשמר, ⭐ והיא ידועה רק בתוך המטפל: ⛔ וההצהרה בניתוב נשארת
       *  ברירת המחדל. */
      return afterSave(typeof r === 'string' ? r : msg);
    })
    .catch(function (e) { errToast(e); });
}
/* ═══════════════ סוף צינור השמירה ═══════════════════════════════════════ */

/* ═══ ממתין לסנכרון — מודול משותף ════════════════════════════════════════
   ═══════════════════════════════════════════════════════════════════════ */
var PEND_LATE_MS = 24 * 60 * 60 * 1000;   // סף ההתרעה
var PEND_MAX = 800;                       // תקרת המפה — הגנה מפני צמיחה בלי גבול
var _pendMap = null;
var _pendAlertDismissed = 0;

/* ---------------------------------------------- השהיית ציור ----
   באונליין תקין האישור מגיע תוך פחות משתי שניות מהסימון, והתגית והסרגל היו
   מהבהבים לשבריר שנייה על כל שמירה. לכן סימון שנוצר **הרגע** בכתיבה חדשה
   מקבל "החזקת ציור" בזיכרון: אם האישור הגיע בתוך PEND_DRAW_DELAY_MS —
   ה-⏳ לא מופיע כלל; אם לא — הוא מופיע וממשיך להתנהג בדיוק כמו היום.
   ⚠️ ההשהיה היא על ה**ציור בלבד**: הסימון הלוגי נכתב ל-localStorage מיידית
   (מנגנוני הבטיחות — פינוי, דחיפה, מיגרציות — נשענים עליו), מסך ההגדרות
   (pendStatusHTML) והמונים הלוגיים (pendCount/pendHas/pendSince) אינם
   מושהים לעולם, וההחזקה חיה **בזיכרון בלבד** — סימון שנטען מהדיסק בעליית
   האפליקציה (המכשיר נסגר בתוך שתי השניות) מצויר מיד. */
var PEND_DRAW_DELAY_MS = 2000;
var _pendDrawHold = {};     // key -> הרגע שממנו מותר לצייר (זיכרון בלבד, לא נשמר)

function pendHoldDraw(key, now) {
  _pendDrawHold[key] = (now || Date.now()) + PEND_DRAW_DELAY_MS;
}
// חותמת לציור: 0 כל עוד הסימון מוחזק. סימון בלי החזקה (נטען מהדיסק) — מיידי.
function pendDrawSince(key) {
  var t = pendSince(key);
  if (!t) return 0;
  var h = _pendDrawHold[key];
  if (h && Date.now() < h) return 0;
  if (h) delete _pendDrawHold[key];
  return t;
}
// כמה סימונים מותר לצייר עכשיו. משמש רק להחלטת "האם להציג את הסרגל" —
// המספר המוצג עצמו הוא תמיד pendCount() המלא.
function pendDrawCount() {
  var m = pendAll(), keys = Object.keys(m), n = 0, now = Date.now();
  for (var i = 0; i < keys.length; i++) {
    var h = _pendDrawHold[keys[i]];
    if (!h || now >= h) n++;
  }
  return n;
}
// בתום ההחזקה: הסימון עדיין קיים (לא אושר — אופליין/רשת איטית) ⇒ מציירים
// אותו עכשיו, כולל רינדור הרשימות דרך PEND_CFG.redraw (פר-אפליקציה).
// אושר בינתיים (המסלול המהיר הרגיל) ⇒ אין מה לצייר ואין רינדור מיותר.
function pendDrawFlush() {
  var m = pendAll(), now = Date.now(), revealed = false;
  Object.keys(_pendDrawHold).forEach(function (k) {
    if (now >= _pendDrawHold[k]) {
      delete _pendDrawHold[k];
      if (m[k]) revealed = true;
    }
  });
  if (!revealed) return;
  pendRender();
  try { if (typeof app.PEND_CFG === 'object' && app.PEND_CFG.redraw) app.PEND_CFG.redraw(); } catch (e) { }
}
function pendScheduleFlush() {
  try { setTimeout(pendDrawFlush, PEND_DRAW_DELAY_MS + 50); } catch (e) { }
}

// `PEND_CFG.key` יכולה להיות מחרוזת או פונקציה. אפליקציה שמחזיקה שני
// מוסדות באותו דומיין — וסימוני האחד אינם תקפים לשני — מוסרת פונקציה.
function pendKeyName() {
  var k = (typeof app.PEND_CFG === 'object') ? app.PEND_CFG.key : null;
  if (typeof k === 'function') { try { k = k(); } catch (e) { k = null; } }
  return k || 'pending_sync';
}
// החלפת הקשר (מוסד/משתמש) — המפה נטענת מחדש מהמפתח החדש.
function pendReload() { _pendMap = null; _pendDrawHold = {}; pendAll(); pendRender(); }
/*  ⛔ המשתנים חיים במודול — ⚠️ ומי שמחוצה לו אינו כותב אליהם: ⭐ הוא קורא לאלה. */
function pendAlertDismiss() { _pendAlertDismissed = Date.now(); pendRenderAlert(); }
/*  ⛔ בלי טעינה מחדש — ⚠️ בהחלפת הקשר הטעינה שייכת להקשר החדש. */
function pendForget() { _pendMap = null; _pendDrawHold = {}; }

function pendAll() {
  if (_pendMap) return _pendMap;
  var v = null;
  try { var raw = lsGet(pendKeyName(), null); v = raw == null ? null : JSON.parse(raw); }
  catch (e) { v = null; }
  _pendMap = (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
  // ניקוי ערכים פגומים — חותמת שאינה מספר חיובי אינה ראיה לכלום
  Object.keys(_pendMap).forEach(function (k) {
    var t = Number(_pendMap[k]);
    if (!isFinite(t) || t <= 0) delete _pendMap[k];
  });
  return _pendMap;
}

// הכתיבה עוברת דרך lsSet. כישלון כאן אינו שקט: lsSet מרימה
// באנר ורושמת ליומן, ו-lsGuardToast יבלע כל "✅" בשתי השניות הבאות.
function pendSave() {
  var m = pendAll();
  var keys = Object.keys(m);
  if (keys.length > PEND_MAX) {
    // גריעה של הישנים ביותר. זו לא "מחיקת נתון שטרם הסתנכרן" — הרשומה עצמה
    // נשארת במקומה; רק הסימון שלה יורד. עדיין נרשם ליומן, כי סימון שנעלם
    // בלי אישור הוא בדיוק מה שהמודול בא למנוע.
    keys.sort(function (a, b) { return m[a] - m[b]; });
    var drop = keys.slice(0, keys.length - PEND_MAX);
    drop.forEach(function (k) { delete m[k]; });
    try { lsLog('pend-overflow', drop.length + ' סימונים נגרעו (תקרה ' + PEND_MAX + ')', 0); } catch (e) { }
  }
  return lsSet(pendKeyName(), JSON.stringify(m));
}

// סימון. חותמת קיימת **אינה נדרסת** — הגיל נמדד מהכתיבה הראשונה שלא אושרה,
// אחרת עריכה חוזרת של אותה רשומה הייתה מאפסת את שעון ההתרעה לנצח.
function pendMark(key) {
  if (!key) return 0;
  var m = pendAll();
  if (!m[key]) {
    // הסימון הלוגי נכתב מיידית (pendSave); רק הציור מוחזק.
    m[key] = Date.now();
    pendHoldDraw(key, m[key]); pendScheduleFlush();
    pendSave(); pendRender();
  }
  return m[key];
}
function pendMarkMany(keys) {
  if (!keys || !keys.length) return;
  var m = pendAll(), now = Date.now(), ch = false;
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] && !m[keys[i]]) { m[keys[i]] = now; pendHoldDraw(keys[i], now); ch = true; }
  }
  if (ch) { pendScheduleFlush(); pendSave(); pendRender(); }
}

// אישור — יש ראיה שהענן קיבל.
function pendClear(key) {
  if (!key) return;
  var m = pendAll();
  if (m[key]) { delete m[key]; delete _pendDrawHold[key]; pendSave(); pendRender(); }
}
function pendClearMany(keys) {
  if (!keys || !keys.length) return;
  var m = pendAll(), ch = false;
  for (var i = 0; i < keys.length; i++) if (m[keys[i]]) { delete m[keys[i]]; delete _pendDrawHold[keys[i]]; ch = true; }
  if (ch) { pendSave(); pendRender(); }
}

// כשל סמכותי — הכתיבה **לא** נכנסה, ולכן הסימון יורד. ראה ההערה בראש המודול.
function pendFailed(key) { pendClear(key); }

// אישור דחיפת-מצב מלא: כל מה שסומן לפני `t0` נכלל בצילום שנדחף בהצלחה.
// `prefix` מגביל לקטגוריה אחת — דחיפה של מפתח אחד אינה מאשרת את השאר.
function pendConfirmPush(prefix, t0) {
  var m = pendAll(), ch = false;
  t0 = Number(t0) || 0;
  if (!t0) return;
  Object.keys(m).forEach(function (k) {
    if (prefix && k.indexOf(prefix) !== 0) return;
    if (m[k] < t0) { delete m[k]; delete _pendDrawHold[k]; ch = true; }
  });
  if (ch) { pendSave(); pendRender(); }
}

function pendHas(key) { return !!pendAll()[key]; }
function pendSince(key) { return pendAll()[key] || 0; }
function pendCount() { return Object.keys(pendAll()).length; }
function pendOldest() {
  var m = pendAll(), keys = Object.keys(m), t = 0;
  for (var i = 0; i < keys.length; i++) if (!t || m[keys[i]] < t) t = m[keys[i]];
  return t;
}
function pendLateCount() {
  var m = pendAll(), keys = Object.keys(m), n = 0, cut = Date.now() - PEND_LATE_MS;
  for (var i = 0; i < keys.length; i++) if (m[keys[i]] < cut) n++;
  return n;
}

function pendFmtAge(ms) {
  if (!isFinite(ms) || ms < 0) ms = 0;
  var mi = Math.floor(ms / 60000);
  if (mi < 1) return 'פחות מדקה';
  if (mi < 60) return mi + ' דק׳';
  var h = Math.floor(mi / 60);
  if (h < 24) return h + ' שע׳';
  return Math.floor(h / 24) + ' ימים';
}

/* --------------------------------------------------------------- תצוגה */
function pendEnsureStyle() {
  if (document.getElementById('pend-style')) return;
  var s = document.createElement('style');
  s.id = 'pend-style';
  s.textContent =
    '.pend-tag{display:inline-block;background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn);' +
    'border-radius:999px;padding:0 7px;font-size:.68rem;font-weight:700;line-height:var(--lh-4);' +
    'white-space:nowrap;vertical-align:middle;margin:0 4px}' +
    '.pend-tag.late{background:var(--bad-soft);color:var(--bad);border-color:var(--bad)}' +
    '#pend-bar{position:fixed;z-index:2147482000;left:0;right:0;bottom:0;padding:8px 12px;' +
    'text-align:center;direction:rtl;font:600 13px/1.5 inherit;color:var(--warn);background:var(--warn-soft);' +
    'box-shadow:0 -2px 10px var(--sh-1)}' +
    '#pend-bar.late{background:var(--bad-soft);color:var(--bad)}' +
    '#pend-alert{position:fixed;z-index:2147483000;left:0;right:0;top:0;padding:10px 14px;' +
    'direction:rtl;font:700 13px/1.6 inherit;color:var(--on-alert);background:var(--alert);' +
    'box-shadow:0 2px 10px var(--sh-2);display:flex;gap:10px;align-items:center;justify-content:center}' +
    '#pend-alert button{background:var(--fill-dark);color:var(--on-dark);border:1px solid var(--on-dark);' +
    'border-radius:6px;padding:2px 10px;font:inherit;cursor:pointer}';
  (document.head || document.documentElement).appendChild(s);
}

// התגית שנכנסת לשורת הרשומה. מחזירה מחרוזת ריקה כשאין מה להציג, כדי
// שאפשר יהיה לשרשר אותה ללא תנאי בכל תבנית.
function pendTag(key) {
  var t = pendDrawSince(key);   // השהיית ציור — לא pendSince
  if (!t) return '';
  pendEnsureStyle();
  var age = Date.now() - t, late = age > PEND_LATE_MS;
  var title = 'ממתין לסנכרון מאז ' + new Date(t).toLocaleString('he-IL') +
              ' (' + pendFmtAge(age) + ') — שמור במכשיר, טרם אושר בענן';
  return '<span class="pend-tag' + (late ? ' late' : '') + '" title="' + esc(title) + '">' +
         (late ? '⚠️' : '⏳') + ' ממתין</span>';
}

function pendCounterText() {
  var n = pendCount(), off = (typeof navigator !== 'undefined' && navigator && navigator.onLine === false);
  // כל הסימונים עדיין מוחזקים (נוצרו הרגע) ⇒ הסרגל לא קופץ לשבריר שנייה.
  // כשהוא כן מוצג — n הוא האמת הלוגית המלאה, לא רק מה שמותר לצייר.
  if (!n || !pendDrawCount()) return off ? '⚠️ אין רשת' : '';
  var late = pendLateCount();
  var s = (late ? '⚠️ ' : (off ? '⚠️ אין רשת · ' : '⏳ ')) + n + ' פעולות ממתינות לסנכרון';
  var old = pendOldest();
  if (old) s += ' · הישנה ביותר לפני ' + pendFmtAge(Date.now() - old);
  return s;
}

function pendRender() {
  if (typeof document === 'undefined' || !document.body) return;
  pendEnsureStyle();
  var txt = pendCounterText(), bar = document.getElementById('pend-bar');
  if (!txt) { if (bar) bar.style.display = 'none'; }
  else {
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pend-bar';
      document.body.appendChild(bar);
    }
    var extra = '';
    try { if (typeof app.PEND_CFG === 'object' && app.PEND_CFG.extra) extra = app.PEND_CFG.extra() || ''; } catch (e) { }
    bar.textContent = txt + (extra ? ' · ' + extra : '');
    bar.className = pendLateCount() ? 'late' : '';
    bar.style.display = '';
  }
  pendRenderAlert();
}

// ההתרעה נפרדת מהמונה בכוונה: מונה הוא מידע, וסרגל תחתון נבלע ברעש המסך.
// משהו שממתין מעל יממה כבר אינו "מסתנכרן ברקע" — זו תקלה שדורשת פעולה.
function pendRenderAlert() {
  var late = pendLateCount(), el = document.getElementById('pend-alert');
  if (!late || (_pendAlertDismissed && (Date.now() - _pendAlertDismissed) < 6 * 60 * 60 * 1000)) {
    if (el) el.remove();
    return;
  }
  var msg = '⚠️ ' + late + ' פעולות ממתינות לסנכרון מעל 24 שעות — בדוק חיבור לאינטרנט. הנתונים שמורים במכשיר בלבד.';
  if (el) { var sp = el.firstChild; if (sp) sp.textContent = msg; return; }
  el = document.createElement('div');
  el.id = 'pend-alert';
  var span = document.createElement('span');
  span.textContent = msg;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'הבנתי';
  btn.dataset.act = 'pend-alert-ok';
  el.appendChild(span);
  el.appendChild(btn);
  document.body.appendChild(el);
}

// פאנל להגדרות — מה בדיוק ממתין, ומאיזה גיל.

// רענון תקופתי — הגיל מוצג בתגיות ובמונה, וסף ה-24 שעות חייב להיחצות
// גם כשהמשתמש לא נגע בכלום.
var _pendTick = null;
function pendBoot() {
  pendAll();
  pendRender();
  if (!_pendTick) _pendTick = setInterval(pendRender, 60000);
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', pendRender);
    window.addEventListener('offline', pendRender);
  }
}
/* ═══════════════ סוף מודול "ממתין לסנכרון" ═════════════════════════════ */

/* ═══ ניסיון חוזר בסנכרון — מודול משותף ═══════════════════════════════════
   ═══════════════════════════════════════════════════════════════════════ */
var RTY_BASE_MS = 15000;   // המרווח הראשון אחרי כישלון
var RTY_MAX_MS  = 60000;   // תקרת הנסיגה — מעבר לה אין טעם להאט עוד
var _rtyTimer = null, _rtyDelay = RTY_BASE_MS, _rtyBusy = false, _rtyWired = false;

function _rtyPending() {
  try { return !!(typeof app.RTY_CFG !== 'undefined' && app.RTY_CFG && app.RTY_CFG.pending && app.RTY_CFG.pending()); }
  catch (e) { return false; }
}
function _rtyOnline() {
  try { return typeof navigator === 'undefined' || navigator.onLine !== false; } catch (e) { return true; }
}
function _rtyVisible() {
  try { return typeof document === 'undefined' || document.visibilityState !== 'hidden'; } catch (e) { return true; }
}
/*  ⛔ קוד מיושן עוצר את הניסיון החוזר — ⚠️ סכימה שהשתנתה אינה כשל
 *  חולף, ⭐ והלולאה שניסתה שוב ושוב היא ה«איטיות» שדווחה מהשטח. */
function rtyReady() { return !_staleSchema && _rtyPending() && _rtyOnline() && _rtyVisible(); }

function rtyStop() { if (_rtyTimer) { clearTimeout(_rtyTimer); _rtyTimer = null; } }

function rtyArm() {
  if (_rtyTimer) return false;
  if (!_rtyPending()) return false;
  _rtyTimer = setTimeout(_rtyFire, _rtyDelay);
  return true;
}

function _rtyFire() {
  _rtyTimer = null;
  if (!_rtyPending()) { _rtyDelay = RTY_BASE_MS; return; }
  if (!_rtyOnline() || !_rtyVisible()) { rtyArm(); return; }
  rtyKick();
}

function rtyKick() {
  if (_rtyBusy) return Promise.resolve(false);
  if (!_rtyPending()) { rtyStop(); _rtyDelay = RTY_BASE_MS; return Promise.resolve(false); }
  if (!_rtyOnline() || !_rtyVisible()) { rtyArm(); return Promise.resolve(false); }
  _rtyBusy = true;
  rtyStop();
  var p;
  try { p = Promise.resolve(app.RTY_CFG.flush()); } catch (e) { p = Promise.reject(e); }
  var grow = function () { _rtyDelay = Math.min(_rtyDelay * 2, RTY_MAX_MS); };
  return p.then(function () { if (_rtyPending()) grow(); else _rtyDelay = RTY_BASE_MS; }, grow)
          .then(function () { _rtyBusy = false; rtyArm(); return true; });
}

function rtyNote() { _rtyDelay = RTY_BASE_MS; rtyArm(); }

function rtyBoot() {
  if (!_rtyWired) {
    _rtyWired = true;
    try {
      window.addEventListener('online', function () { _rtyDelay = RTY_BASE_MS; rtyKick(); });
      document.addEventListener('visibilitychange', function () {
        if (_rtyVisible()) { _rtyDelay = RTY_BASE_MS; rtyKick(); }
      });
    } catch (e) { console.warn('[rty] wiring', e); }
  }
  rtyArm();
}
/* ═══════════════ סוף מודול הניסיון החוזר ════════════════════════════════ */

/* ═══ מנגנון המשיכה — מודול משותף ═════════════════════════════════════════
   ═══════════════════════════════════════════════════════════════════════ */
var PL_FALLBACK_MS = 60000;   // אין שורת חותמת בענן ⇒ משיכה מלאה אחת לדקה
var _plTimer = null, _plBusy = false, _plFullAt = 0, _plWired = false;
/*  ⛔ החותמת חיה במודול — ⚠️ ובהחלפת הקשר היא מתאפסת כאן, ⭐ ולא בכתיבה מבחוץ. */
function plForget() { _plFullAt = 0; }

/* חותמת מהענן: מספר, מחרוזת JSON של מספר, או כל דבר אחר ⇒ 0. */
function plNum(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Math.floor(v) || 0;
  try { var p = JSON.parse(v); if (typeof p === 'number') return Math.floor(p) || 0; } catch (e) { }
  return parseInt(v, 10) || 0;
}

function _plSeen() { try { return plNum(app.PL_CFG.seen()); } catch (e) { return 0; } }

/* ⭐ נקראת אחרי כל כתיבה מוצלחת לענן. היא מקדמת קודם את «מה שכבר נראה»
   מקומית — כדי שהתקתוק הבא לא ימשוך מלא בגלל השינוי של המכשיר הזה
   עצמו — ורק אז כותבת את החותמת לענן. ⛔ כשל בכתיבת החותמת אינו מפיל
   את הכתיבה שקדמה לה — הנתון כבר בענן, והמכשירים האחרים
   יראו אותו בשינוי הבא או בנפילה-חזרה. */
function plTouch(ts) {
  var t = plNum(ts) || Date.now();
  try { app.PL_CFG.note(t); } catch (e) { }
  try {
    return Promise.resolve(app.PL_CFG.stamp(t)).then(function () { return t; }, function () { return t; });
  } catch (e) { return Promise.resolve(t); }
}

function _plFull() {
  var done = function (v) { _plBusy = false; return v; };
  /*  ⛔ שחרור האופק **לפני** המשיכה ⛔ ולא אחריה — ⚠️ הניקוי הוא שמתיר
   *  לכתיבה שבסופה להחזיר את הישן, ⭐ וניקוי שאחריה ממתין למשיכה הבאה. */
  try { lsHorizonRelease(); } catch (e0) { }
  try {
    return Promise.resolve(app.PL_CFG.pull()).then(
      function () { _plFullAt = Date.now(); return done(true); },
      function () { return done(false); });
  } catch (e) { return Promise.resolve(done(false)); }
}

function plTick() {
  if (_plBusy) return Promise.resolve(false);
  var live; try { live = !!app.PL_CFG.active(); } catch (e) { live = false; }
  if (!live) return Promise.resolve(false);
  _plBusy = true;
  var done = function (v) { _plBusy = false; return v; };
  var p;
  try { p = Promise.resolve(app.PL_CFG.remote()); } catch (e) { p = Promise.reject(e); }
  return p.then(function (r) {
    if (!r || !r.ok) return done(false);
    try { app.PL_CFG.ok(); } catch (e) { }
    if (r.ts === null || r.ts === undefined) {
      if (Date.now() - _plFullAt >= PL_FALLBACK_MS) return _plFull();
      return done(false);
    }
    var ts = plNum(r.ts);
    if (ts > _plSeen()) { try { app.PL_CFG.note(ts); } catch (e) { } return _plFull(); }
    return done(false);
  }, function () { return done(false); });
}

function plBoot() {
  if (!_plWired) {
    _plWired = true;
    try { window.addEventListener('online', function () { plTick(); }); }
    catch (e) { console.warn('[pl] wiring', e); }
  }
  if (_plTimer) return false;
  var ms = 0;
  try { ms = parseInt(app.PL_CFG.every, 10) || 0; } catch (e) { ms = 0; }
  if (!ms) ms = 3000;
  _plTimer = setInterval(function () { plTick(); }, ms);
  plTick();
  return true;
}
/* ═══════════════ סוף מנגנון המשיכה ══════════════════════════════════════ */

/* ═══ שכבת הדחיפה — מודול משותף ═══════════════════════════════════════════
   ⛔ שלוש שכבות נפרדות — **מנה · טבלה · טבלאות** — ⚠️ וכל אחת פונקציה
      משלה: ⭐ שכבות שמעורבבות בפונקציה אחת אינן ניתנות לחתימה ואינן
      ניתנות למדידה, ⛔ ולכן אותו תפקיד נכתב בצורות נבדלות בלי שאיש מדד.
   ⛔ המנה היא `PUSH_CFG.chunk` — ⚠️ הדחיפה הראשונה במכשיר נוגעת בכל
      הרשומות, ⭐ ובקשה לשורה היא אלפי בקשות רשת: ⛔ **ומנה שנכשלה נדחפת
      שוב שורה-שורה** — ⚠️ כתיבת מנה היא הכל-או-כלום, ⭐ ושורה פגומה אחת
      חוסמת את כל התקינות שאיתה.
   ⛔ ו«אין ראיה» אינו «אין מה לדחוף» — ⚠️ `dirty` שמחזירה `null` מדלגת על
      הטבלה **בלי לסמן את עֵד הפינוי**, ⭐ ומערך ריק מסמן אותו: ⛔ סימון על
      טבלה שלא נמשכה היה מתיר לפנות מהדיסק רשומה שמעולם לא עלתה. */
var _pushTimer = null;

/*  ⛔ שכבה 1 — **מנה אחת ותו לא** — ⚠️ היא אינה יודעת מה מלוכלך ואינה
 *  נוגעת בסימון ה-⏳: ⭐ כל מה שהיא עושה הוא כתיבה אחת, ⛔ וכשל שלה הוא
 *  זריקה — ⚠️ תשובה שנושאת `error` אינה זורקת מעצמה, ⭐ והבודקת היחידה
 *  שלה היא כאן. */
function pushRow(t, rows) {
  return Promise.resolve(app.PUSH_CFG.send(t, rows)).then(function (res) {
    if (res && res.error) throw res.error;
    return rows.length;
  });
}

/*  ⛔ שכבה 2 — **טבלה אחת**: המנות, סימוני ה-⏳, ועֵד הדחיפה — ⚠️ «אין ראיה»
 *  אינו הצלחה: ⭐ לא נדחף דבר ⛔ ואין לזקוף זאת כדחיפה שעברה · ⚠️ וכשל רשת
 *  אינו ראיה לכלום ולכן הסימון נשאר וננסה שוב, ⭐ וכשל סמכותי (ולידציה ·
 *  מפתח זר · הרשאה · סכימה) יחזור על עצמו לנצח: ⛔ הסימון יורד כדי לא
 *  להבטיח שליחה חוזרת שלא תקרה, ⚠️ והסיבה נרשמת ואינה נבלעת. */
function pushTable(t, ctx) {
  return Promise.resolve(app.PUSH_CFG.dirty(t, ctx)).then(function (rows) {
    if (!rows) return { ok: false, still: [], n: 0 };
    if (!rows.length) { app.PUSH_CFG.mark(t); return { ok: true, still: [], n: 0 }; }
    var still = [], n = 0, bad = 0, i = 0;
    function won(row) {
      var k = app.PUSH_CFG.key(t, row);
      n++;
      if (k != null) pendClear(k);
    }
    function lost(row, e) {
      var k = app.PUSH_CFG.key(t, row);
      console.warn('[push] ' + t, e && (e.message || e));
      if (isNetErr(e)) { if (k != null) still.push(k); }
      else { bad++; if (k != null) pendFailed(k); }
    }
    /*  ⛔ הנפילה-חזרה פר-שורה — ⚠️ המנה כולה נדחתה ואיננו יודעים מי בה
     *  פגומה, ⭐ ולכן כל שורה נשלחת לבדה: ⛔ כך הפגומה מבודדת ⚠️ ואינה
     *  חוסמת את התקינות שנשלחו איתה. */
    function solo(part, j) {
      if (j >= part.length) return Promise.resolve();
      var row = part[j];
      return pushRow(t, [row]).then(function () { won(row); },
                                    function (e) { lost(row, e); })
        .then(function () { return solo(part, j + 1); });
    }
    function batch() {
      if (i >= rows.length) return Promise.resolve();
      var part = rows.slice(i, i + app.PUSH_CFG.chunk);
      i += part.length;
      return pushRow(t, part).then(function () { part.forEach(won); },
                                   function () { return solo(part, 0); })
        .then(batch);
    }
    return batch().then(function () {
      /*  ⭐ «באמת נכתב משהו לענן» נמדד כאן — ⛔ בלי קידום החותמת הדחיפה
       *  נשארת בלתי-נראית לכל מכשיר אחר לנצח: ⚠️ הם מושכים רק כשהיא
       *  מתקדמת. */
      if (n) plTouch();
      /*  ⭐ עֵד הפינוי פר-מפתח — ⛔ רק כשלא נשארה שורה בכשל רשת: ⚠️ «עברנו
       *  על כל המלוכלכות והענן קיבל את כולן» הוא בדיוק התנאי שמתיר לפנות
       *  מהדיסק רשומה ישנה של אותה טבלה. */
      if (!still.length) app.PUSH_CFG.mark(t);
      return { ok: !still.length && !bad, still: still, n: n };
    });
  });
}

/*  ⛔ שכבה 3 — **הטבלאות**, בסדר שמוצהר ב-`PUSH_CFG.tables` — ⚠️ הסדר הוא
 *  מה ששומר על המפתח הזר: ⭐ האב נכתב לפני הבן, ⛔ ואין תלות סדר בין
 *  שורות של אותה טבלה · ⚠️ וכשל בטבלה אחת אינו עוצר את הבאות אחריה. */
function pushDirty(ctx) {
  var acc = [], ok = true, n = 0, i = 0;
  function step() {
    if (i >= app.PUSH_CFG.tables.length) return Promise.resolve({ ok: ok, still: acc, n: n });
    return pushTable(app.PUSH_CFG.tables[i++], ctx).then(function (r) {
      acc = acc.concat(r.still);
      n += r.n;
      if (!r.ok) ok = false;
      return step();
    });
  }
  return step();
}

/*  ⛔ המתזמן — ⚠️ משפך הכתיבה המקומית היחיד, ⭐ ולכן זו נקודת הדריכה של
 *  מודול הניסיון החוזר · ⛔ **וההשהיה מתחילה מחדש בכל כתיבה** — ⚠️ שתי
 *  שמירות רצופות הן מחזור סנכרון אחד ⛔ ולא שניים, ⭐ והרשומה כבר מסומנת
 *  ⏳ לפני ההשהיה. */
function schedulePush() {
  rtyNote();
  if (_pushTimer) clearTimeout(_pushTimer);
  /*  ⛔ ההקשר נלכד **בקביעת המועד** ⛔ ולא בהתעוררות — ⚠️ ההשהיה היא המתנה
   *  לכל דבר, ⭐ והמשתמש או המוסד יכולים להתחלף בתוכה: ⛔ מחזור שמתעורר
   *  בהקשר אחר דוחף שורות ⏳ שנצברו בקודם, ⚠️ וזוקף את הצלחתן לחדש. */
  var _ep = ctxEpoch();
  _pushTimer = setTimeout(function () {
    _pushTimer = null;
    if (ctxStale(_ep)) return;
    app.PUSH_CFG.run();
  }, app.PUSH_CFG.delay);
}
/* ═══════════════ סוף מודול שכבת הדחיפה ══════════════════════════════════ */

/* ═══ עידן הנתונים — מודול משותף ═══════════════════════════════════════════
   ⛔ **העותק המקומי מזדקן בדיוק כמו ערך** — ⚠️ רשומת מראה שנכתבה בצורה
      ישנה נשארת על הדיסק לנצח: ⭐ תיקון בקוד אינו מנקה מכשיר שכבר מזוהם,
      ⛔ והעידן הוא הכלי היחיד שמגיע אליו מהענן.
   ⛔ **וזו הפעולה ההרסנית היחידה במערכת** — ⚠️ נתון שלא נדחף ונזרק אבוד
      ואינו ניתן לשחזור: ⭐ ולכן שלושת התנאים, ⛔ וכולם חובה.
   ⛔ **ומכשיר שמחכה עדיף על מכשיר ריק** — ⚠️ תנאי שאינו מתקיים אינו
      «נזרוק בכל זאת»: ⭐ הוא «ננסה שוב בעלייה הבאה».
   ⚠️ מה שאינו נאכף כאן: **המספר עצמו ומי שנמחק** — ⭐ שניהם ב-`ERA_CFG`,
      ⛔ וצורת השורה נבדלת בין האפליקציות.
   ══════════════════════════════════════════════════════════════════════ */
var ERA_CLOUD_KEY = 'data_era';
var _eraPush = null;
var _eraTried = false;
/*  ⛔ שלושת התנאים לזריקה, ⛔ וכולם חובה — ⚠️ **מה נכנס**: מצב הרשת,
 *  תוצאת הדחיפה (`ok` ו-`still`), ומפת ה-⏳; ⛔ **ומה מפיל**: היעדר רשת,
 *  דחיפה שלא החזירה `ok`, שורה שנשארה ב-`still`, ⛔ ותור שאינו ריק.
 *  ⭐ **ולמה שלושתם**: ⚠️ «הדחיפה הצליחה» אינה «אין מה לדחוף» — ⛔ שורה
 *  שנכתבה אחרי המחזור אינה ב-`still` והיא בתור, ⚠️ ושורה שנדחתה ברשת
 *  היא ב-`still` ואינה בתור. */
function eraMayThrow(o) {
  var s = o || {};
  /*  ⛔ 1 · יש רשת — ⚠️ בלעדיה אין ראיה שהענן קיבל דבר. */
  if (!s.online) return false;
  /*  ⛔ 2 · הדחיפה החזירה `ok` ⛔ ואפס `still` — ⚠️ `still` הוא מה שלא
   *  עלה, ⭐ ושורה אחת שנשארה בו היא נתון שיימחק ואינו ניתן לשחזור. */
  if (!s.push || s.push.ok !== true) return false;
  if (!Array.isArray(s.push.still) || s.push.still.length !== 0) return false;
  /*  ⛔ 3 · והתור ריק — ⚠️ מפת ה-⏳ היא מה שנכתב מקומית ולא הוכרע. */
  if (!s.pending || typeof s.pending !== 'object') return false;
  if (Object.keys(s.pending).length !== 0) return false;
  return true;
}
/*  ⛔ הסימן הוא **חותמת** ⛔ ואינו מונה — ⚠️ מספר סידורי אינו אומר מה
 *  נוקה ומתי, ⭐ וחותמת מתעדת את עצמה. */
function eraResetKey(prefix) { return String(prefix == null ? '' : prefix) + 'era_reset'; }
function eraStamp(now) {
  return new Date(typeof now === 'number' && isFinite(now) ? now : Date.now()).toISOString();
}
/*  ⛔ ההשוואה נכשלת **סגור** — ⚠️ ערך שאינו מספר אינו «הענן חדש»: ⭐ אימוץ
 *  זריקה על סמך כשל הוא הסקה ולא ראיה, ⛔ והיא מוחקת נתונים. */
function eraBehind(local, cloud) {
  var c = Number(cloud), l = Number(local);
  if (!isFinite(c) || !isFinite(l)) return false;
  return c > l;
}
/*  ⛔ הזריקה — ⚠️ **מה נכנס**: העידן המקומי והענני, שלושת התנאים, מוחק
 *  ושומר; ⛔ **ומה מפיל**: כל תנאי שאינו מתקיים — ⭐ ואז לא נמחק דבר.
 *  ⛔ **והמחיקה קודמת לכתיבה** — ⚠️ זריקה שנקטעת באמצע משאירה עידן ישן
 *  מול ענן חדש, ⭐ והעלייה הבאה זורקת שוב ומושכת: ⛔ הסדר ההפוך היה
 *  משאיר מכשיר חצי-ריק שסבור שהוא מעודכן. */
function eraThrow(o) {
  var s = o || {};
  if (!eraBehind(s.local, s.cloud)) return false;
  if (!eraMayThrow(s)) return false;
  s.wipe();
  s.save(Number(s.cloud), eraResetKey(s.prefix), eraStamp());
  return true;
}
/*  ⛔ העידן של **העותק שעל הדיסק** — ⚠️ התקנה טרייה נושאת את עידן הקוד:
 *  ⭐ אין בה עותק ישן שיזדקן, ⛔ ואפס היה זורק אותה בעלייה הראשונה. */
function eraLocalKey() { return app.ERA_CFG.prefix + 'era'; }
function eraLocal() {
  var v = parseInt(lsGet(eraLocalKey(), ''), 10);
  return isFinite(v) ? v : app.DATA_ERA;
}
/*  ⛔ השומר — ⚠️ העידן החדש **וחותמת ה-ISO**: ⭐ שניהם על הדיסק, ⛔ ומי
 *  שפותח את האחסון רואה מה נוקה ומתי. */
function eraSave(era, stampKey, stamp) {
  lsSet(eraLocalKey(), String(era));
  lsSet(stampKey, JSON.stringify(stamp));
}
/*  ⛔ העידן נקרא מטבלת המפתח-ערך של האפליקציה ⛔ ולא מטבלה חדשה — ⚠️ ולכל
 *  אפליקציה מספר משלה: ⭐ צורת השורה נבדלת ביניהן, ⛔ ומספר אחד לכולן היה
 *  זורק בארבע על שינוי שנעשה באחת.
 *  ⚠️ **והקריאה אינה ב-`single`** — ⛔ שורה שאינה קיימת מסומנת שם כשגיאה,
 *  ⭐ ומסד שאין בו עידן הוא המצב הרגיל. */
function eraCloudRead() {
  var c = app.ERA_CFG.client(), eraTbl = app.ERA_CFG.table();
  if (!c || !eraTbl) return Promise.resolve(null);
  return withTimeout(c.from(eraTbl).select('value').eq('key', ERA_CLOUD_KEY).maybeSingle())
    .then(function (r) {
      if (!r || r.error || !r.data) return null;
      var pr = kvParse(ERA_CLOUD_KEY, r.data.value);
      var raw = pr.ok ? pr.value : null;
      return raw == null ? null : Number(raw);
    }, function () { return null; });
}
/*  ⛔ הבדיקה רצה **פעם אחת לעלייה** — ⚠️ ולא בפולינג: ⭐ קידום עידן הוא
 *  פעולת מנהל נדירה, ⛔ וקריאה בכל שלוש שניות היא רשת שנצרכת לחינם.
 *  ⛔ **ותוצאת הדחיפה נמסרת כארגומנט** — ⚠️ קריאת גלובלי אחרי המתנה
 *  מחזירה את מה שהמחזור הבא כתב, ⭐ ולא את מה שנמדד כאן. */
function eraBoot(push, ep) {
  return eraCloudRead().then(function (cloud) {
    if (ctxStale(ep)) return false;
    var threw = eraThrow({
      local: eraLocal(), cloud: cloud, prefix: app.ERA_CFG.prefix,
      online: navigator.onLine, push: push, pending: pendAll(),
      wipe: app.ERA_CFG.wipe, save: eraSave
    });
    if (!threw) return false;
    console.log('[era] עידן ' + cloud + ' — העותק המקומי נזרק ונמשך מלא');
    return app.ERA_CFG.refresh();
  }, function () { return false; });
}
/*  ⛔ המסלול שמוסר את תוצאת הדחיפה — ⚠️ אפליקציה שמחזור הדחיפה שלה אינו
 *  מחזיר תוצאה מוסרת אותה כאן, ⭐ ו-`ERA_CFG.push` קוראת אותה: ⛔ תוצאה
 *  שאינה אובייקט נקראת «אין ראיה» ⛔ ולא «הצליח». */
function eraNotePush(r) {
  _eraPush = (r && typeof r === 'object') ? r : null;
  return r;
}
/*  ⛔ נקודת ההפעלה האחת, ⛔ ופעם אחת לעלייה — ⚠️ ההקשר נלכד לפני הדחיפה,
 *  ⭐ ונבדק אחריה: ⛔ מחזור שמתעורר בהקשר אחר זורק את העותק של האחר. */
function eraKick() {
  if (_eraTried) return Promise.resolve(false);
  _eraTried = true;
  var ep = ctxEpoch();
  return Promise.resolve(app.ERA_CFG.push()).then(function (r) { return eraBoot(r, ep); },
                                              function () { return false; });
}
/* ═══════════════ סוף מודול עידן הנתונים ═════════════════════════════════ */

/*  ⛔ הייצוא בשם ⛔ ואינו `default` — ⚠️ קורא שמייבא שם שנעלם נשבר בטעינה,
 *  ⭐ ו-`default` היה נבלע בשקט. */
export { newClientId, idEq, idArg, legacyIdStamp, mergeCore, tombStamp,
         prunePastTombstones, tombPruneMerged, tombBoot, ctxEpoch,
         ctxSwitch, ctxStale, _eraPush, _rowsPaged, afterSave, eraKick,
         eraNotePush, errToast, pendAlertDismiss, pendAll, pendBoot,
         pendClearMany, pendConfirmPush, pendCount, pendFailed, pendForget,
         pendHas, pendMark, pendMarkMany, pendReload, pendRender, pendTag,
         plBoot, plForget, plNum, plTick, plTouch, pushDirty, pushTable,
         rtyBoot, rtyNote, runSave, sbWatch, schedulePush };
