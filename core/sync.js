/* ───────────────────────────────────────────────────────────────────────────
   core/sync.js — ליבת הסנכרון המשותפת

   **מה נאכף:** מזהי הרשומות, מנוע המיזוג, גריעת ה-tombstones ושומר ההקשר
   חיים **כאן פעם אחת** — ⚠️ ולא מוכפלים בתוך `index.html` של כל אחת:
   ⭐ הקובץ נטען כמודול, ⛔ ומוטמן ב-`sw.js`.

   **הנימוק המדוד:** אותו גוף בדיוק ישב בחמישה קבצים, ⛔ וכל תיקון תשתיתי
   דרש חמש עריכות — ⭐ הבאג ב-`pull` דרש תיקון בארבעה, ⚠️ ובאג המחיקה
   המדורגת שלושה תיקונים בשני ריפו.

   **מה יישבר בלעדיו:** ⛔ תיקון שנעשה באחת ולא בארבע — ⚠️ והוא נראה תקין
   בכל ריפו בנפרד, ⭐ והפער נראה רק בהשוואה שאיש אינו מריץ.

   **מה אינו נאכף כאן:** ⛔ המדיניות פר-אפליקציה — ⚠️ הטבלאות, החלון והתצורה
   נשארים ב-`index.html`: ⭐ המודול טהור — אפס תלות בהגדרה פר-אפליקציה,
   ואפס DOM.

   ⛔ **והסיומת `.js` ⛔ ולא `.mjs`** — ⚠️ הקובץ נמסר לדפדפן משרת סטטי,
   ⭐ ומודול שה-MIME שלו אינו JavaScript נדחה כולו: ⛔ נמדד בדפדפן
   ששרת שאינו מכיר `.mjs` מחזיר `application/octet-stream`, ⚠️ והדף אינו
   עולה כלל.
   ──────────────────────────────────────────────────────────────────────── */

/* ═══ מזהי רשומות — מודול משותף ═══════════════════════════════════════════
   ⛔ שינוי כאן — כל האפליקציות, באותו
      סבב: אחרת הבלוק נסחף בין הריפו.
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
   ⛔ שינוי כאן — כל האפליקציות, באותו
      סבב: אחרת הבלוק נסחף בין הריפו.
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
   ⛔ שינוי כאן — כל האפליקציות, באותו
      סבב: אחרת הבלוק נסחף בין הריפו.
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
   ⛔ שינוי כאן — כל האפליקציות, באותו סבב: ⚠️ אחרת
      הבלוק נסחף בין הריפו.
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

/*  ⛔ הייצוא בשם ⛔ ואינו `default` — ⚠️ קורא שמייבא שם שנעלם נשבר בטעינה,
 *  ⭐ ו-`default` היה נבלע בשקט. */
export { newClientId, idEq, idArg, legacyIdStamp, mergeCore, tombStamp,
         prunePastTombstones, tombPruneMerged, tombBoot,
         ctxEpoch, ctxSwitch, ctxStale };
