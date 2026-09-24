/* ═══ core/ui.js — שכבת התצוגה המשותפת ══════════════════════════════════
   ⭐ כפתור עסוק, הרשמת ה-service worker, המודאל, הטוסט ו-`Enter`.
   השורות: «כפתור שכותב מושבת בזמן הכתיבה» ·
   «עדכון אוטומטי — בדיקה מחזורית» · «באנר עדכון `sw`» · «מודאלים» ·
   «מיכל הדיאלוג — מקומו ושכבתו» · «`toast` — חתימה, גוף ומחלקות» ·
   «`Enter` שומר בכל שדה עריכה»
   ⛔ המודול זהה בית-לבית בכל ריפו שנושא אותו — ⚠️ והתצורה פר-אפליקציה
      נמסרת ב-`appConfigure` שבראש `index.html`, ⭐ ואינה כתובה כאן.
   ⛔ ושינוי כאן — בכל הריפו שנושאים אותו, באותו סבב.
   ════════════════════════════════════════════════════════════════════ */

import { MSG_SW_NO_WAITING, MSG_SW_TIMEOUT, app } from './util.js';
import { lsGet, lsGuardToast, lsSet } from './storage.js';

/* ═══ כפתור עסוק והשומר שבניתוב — מודול משותף ════════════════════════════
   ⛔ **כפתור שמפעיל מסלול שממתין לרשת מושבת עד שהמסלול הסתיים** —
   ⚠️ וההשבתה יושבת בנקודת הניתוב האחת ⛔ ולא באתר הקריאה: ⭐ מטפל
   שמחזיר הבטחה מסמן «יש כאן המתנה», ⛔ ואין מה להצהיר בכל אתר בנפרד.
   ⚠️ הנימוק המדוד: שני מימושים חיו זה לצד זה — ⭐ אחד עם תווית ואחד
   עם ספינר, ⛔ ובשתיים לא היה אף אחד: לחיצה שנייה על «שמור» בזמן
   שהראשונה באוויר שלחה בקשה שנייה, ⚠️ ובכתיבת משתמש היא יוצרת שורה
   כפולה או דורסת עדכון שטרם חזר.
   ⛔ **ומטפל סינכרוני אינו נכנס** — ⚠️ הוא נגמר לפני שהלחיצה השנייה
   יכולה לנחות, ⭐ ואין «בזמן» שאפשר להשבית בו. */
/*  ⛔ התווית היא פרמטר עם ברירת מחדל ⛔ ולא מחרוזת קבועה — ⚠️ יש פעולות
 *  רשת שאינן שמירה, ⭐ ו«שומר…» עליהן מתאר למשתמש פעולה שאינה מתרחשת. */
function busy(btn, on, label) {
  if (!btn) return;
  if (on) {
    if (btn._busyTxt === undefined) btn._busyTxt = btn.innerHTML;
    btn.disabled = true; btn.style.opacity = 'var(--op-4)'; btn.style.cursor = 'wait';
    btn.innerHTML = label || '⏳ שומר…';
  } else {
    btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = '';
    if (btn._busyTxt !== undefined) { btn.innerHTML = btn._busyTxt; btn._busyTxt = undefined; }
  }
}
/*  ⛔ הדגל נדרש גם לאלמנט שאינו כפתור — ⚠️ `disabled` אינו קיים על `div`
 *  או על שורת טבלה, ⭐ ולחיצה שנייה עליהם הייתה נכנסת. */
function actRun(el, fn) {
  if (el._actBusy) return;
  var out;
  try { out = fn(el); }
  catch (e) { console.error('[act] ' + el.getAttribute('data-act'), e); return; }
  if (!out || typeof out.then !== 'function') return;
  el._actBusy = true;
  var isBtn = el.tagName === 'BUTTON';
  if (isBtn) busy(el, true, '⏳ שומר…');
  out.then(function () { }, function (e) {
    console.error('[act] ' + el.getAttribute('data-act'), e);
  }).then(function () {
    el._actBusy = false;
    if (isBtn) busy(el, false);
  });
}
/* ═══════════════ סוף מודול כפתור עסוק ═══════════════════════════════════ */

/* ═══ הרשמת service worker — מודול משותף ════════════════════════════════
   ⛔ מנגנון זיהוי אחד — `reg.update()`: ⚠️ ואין מנגנון שני לאותה שאלה.
   ⛔ ההשתלטות הראשונה אינה עדכון — ⚠️ בביקור ראשון אין מבקר, ⭐ ו-`claim()`
      של העובד הראשון יורה `controllerchange` על דף שכבר מריץ את החדש.
   ⛔ ודף שאיש לא נגע בו נטען מחדש מיד — ⚠️ ואחרי מגע מוצג הבאנר, ⭐ שרענון
      באמצע עבודה מאבד את מה שהוקלד.
   ⛔ ו-`updateViaCache: 'none'` — ⚠️ ברירת המחדל מתירה לדפדפן לענות מתוך
      מטמון ה-HTTP, ⛔ כלומר להשוות את `sw.js` מול עותק ישן של עצמו.
   ⛔ והכפתורים במפת הפעולות — ⚠️ המיכל `#updater` יושב במקור, ⭐ ואין כאן
      מאזין ישיר שאיש אינו רואה.
   ═══════════════════════════════════════════════════════════════════════ */
/*  ⛔ תקרת ההמתנה להשתלטות — ⚠️ **מה נכנס**: המתנה אחת אחרי
 *  `SKIP_WAITING`, ⛔ **ומה מפיל**: ערך קצר, שיורה לפני ההשתלטות
 *  ויהפוך לרענון שני. */
var SW_APPLY_MS = 10000;
var _swReg = null, _swAccepted = false, _swReloaded = false, _swWait = 0;
function swBanner() { return document.getElementById('updater'); }
/*  ⛔ מזהה הגרסה נקרא משם המטמון החי — ⚠️ ואין לו ליטרל שני בדף: ⭐ הוא
 *  מסונן בתחילית האפליקציה, ⛔ ובזמן התקנה יש שני שמות — הישן והחדש:
 *  ⚠️ ולכן הסימן נושא את שניהם, ⭐ והוא משתנה בדיוק כשגרסה נוספת או יורדת. */
function swVer() {
  if (typeof caches === 'undefined') return Promise.resolve('');
  return caches.keys().then(function (ks) {
    return ks.filter(function (n) { return n.indexOf(app.LS_CFG.cachePrefix) === 0; }).sort().join('|');
  }).catch(function () { return ''; });
}
function swBannerHide() { var el = swBanner(); if (el) el.classList.remove('show'); }
/*  ⛔ סימן הדחייה מתמיד ונושא את הגרסה שנדחתה — ⚠️ סימן בזיכרון מתאפס
 *  בטעינה, ⭐ והבאנר חוזר בלי שדבר השתנה: ⛔ ועובד ממתין ששרד היה מציג
 *  אותו בכל טעינה, בלי דרך לצאת. */
function swShowUpdate() {
  var el = swBanner();
  if (!el) { console.error('[sw] אין מיכל לבאנר העדכון — #updater'); return; }
  swVer().then(function (v) {
    if (v && v === lsGet(app.LS_CFG.dismissKey, '')) return;
    el.classList.add('show');
  });
}
window.showAppUpdateBanner = swShowUpdate;
function swHideUpdate() {
  swBannerHide();
  swVer().then(function (v) { if (v) lsSet(app.LS_CFG.dismissKey, v); });
}
/*  ⛔ הרענון אינו כאן — ⚠️ הוא ב-`controllerchange` בלבד: ⭐ טיימר שמרענן
 *  בעצמו יורה לפני שהעובד החדש השתלט, ⛔ ואז `reg.waiting` שורד, הבאנר
 *  חוזר, והלחיצה הבאה חוזרת עליו. */
/*  ⛔ שני כשלים נבדלים ⛔ ושני נוסחים — ⚠️ «אין עובד ממתין» הוא באנר
 *  שגרסתו כבר הוחלה, ⭐ ו«התקרה חלפה» הוא עדכון שהתחיל ולא השתלט:
 *  ⛔ נוסח אחד לשניהם שולח את מי שכבר מעודכן ללחוץ שוב ושוב. */
function swApply(btn) {
  _swAccepted = true;
  busy(btn, true, 'מעדכן…');
  if (!(_swReg && _swReg.waiting)) { swApplyFail(btn, MSG_SW_NO_WAITING); return; }
  _swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
  _swWait = setTimeout(function () { swApplyFail(btn, MSG_SW_TIMEOUT); }, SW_APPLY_MS);
}
/*  ⛔ עובד ממתין ששרד את הלחיצה הוא כשל ⛔ ולא מצב — ⚠️ הבאנר יורד
 *  והכשל נאמר, ⭐ ולא נשאר על המסך ומזמין לחיצה נוספת. */
function swApplyFail(btn, msg) {
  _swWait = 0;
  if (_swReloaded) return;
  busy(btn, false);
  swBannerHide();
  toast(msg, 6000, 'bad');
}
function swRegister() {
  if (!('serviceWorker' in navigator)) return;
  /*  ⛔ המשתמש נגע בדף — ⚠️ **מה נכנס**: המגע הראשון בלבד, ⭐ **ומה הוא
   *  מפיל**: את הרענון האוטומטי שבהשתלטות. */
  var touched = false;
  ['pointerdown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { touched = true; }, { once: true, capture: true });
  });
  var hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (_swWait) { clearTimeout(_swWait); _swWait = 0; }
    if (_swReloaded || !hadController) return;
    if (!_swAccepted && touched) { swShowUpdate(); return; }
    _swReloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
    console.log('[sw] registered:', reg.scope);
    _swReg = reg;
    if (reg.waiting && navigator.serviceWorker.controller) swShowUpdate();
    reg.addEventListener('updatefound', function () {
      var nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) swShowUpdate();
      });
    });
    /*  ⛔ הבאנר יורד כשהעובד מפסיק להמתין ⛔ ולא רק בלחיצה — ⚠️ באנר
     *  שגרסתו כבר הוחלה מזמין לחיצה שאין לה מה להחיל, ⭐ והמשתמש מקבל
     *  כשל על עדכון שהצליח. */
    function checkForUpdate() {
      try {
        reg.update().then(function () { if (!reg.waiting) swBannerHide(); })
           .catch(function () {});
      } catch (e) {}
    }
    checkForUpdate();
    setInterval(checkForUpdate, 30 * 60 * 1000);
  }).catch(function (err) { console.warn('[sw] registration failed:', err); });
}
window.addEventListener('load', swRegister);
/* ═══════════════ סוף מודול הרשמת service worker ═════════════════════════ */

/* ═══ שכבת המודאל — מודול משותף ═══════════════════════════════════════════
   ⛔ שכבת המודאל ושלושת העוזרים ישבו **מחוץ** לכל בלוק חתום ⛔ ונסחפו:
      ⚠️ `esc` לשלוש צורות — והיא הגנת ה-HTML היחידה שיש; `openModal` לשלוש,
      ⛔ ובאחת מהן נעדרה נעילת הגלילה לגמרי; ו-`lsToast` לשתיים.
   ⛔ מיכל אחד ומסלול סגירה יחיד — ⚠️ מסלול נפרד לכל דיאלוג הוא בדיוק מה
      שנשבר בשקט; ⭐ והכותרת ב-`textContent` ⛔ ולא ב-HTML, מפני שהיא מגיעה
      גם משם שהמשתמש הקליד. ⛔ וגוף `ask` ב-`textContent` אף הוא — ⚠️ דיאלוג
      שדורש HTML עובר ב-`openModal`.
   ⛔ ו-`locked` על ה-`body` אינה קישוט — ⚠️ בלעדיה הדף שמאחורי המודאל נגלל
      מתחתיו, ⭐ והמשתמש מאבד את מקומו ברשימה שממנה פתח אותו; ⛔ וההסרה
      מותנית בכך שהדיאלוג השני סגור — ⚠️ אחרת סגירת אחד משחררת את השני.
   ⚠️ `askResolve` יחיד — ⛔ אין תמיכה בשני דיאלוגי אישור פתוחים בו-זמנית,
      וגם אין בכך צורך: `#ask` הוא אלמנט יחיד ב-DOM.
   ═══════════════════════════════════════════════════════════════════════ */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
/*  ⛔ מיכל שאינו ב-DOM ⟵ **זעקה**, ⛔ ולא יציאה בשקט — ⚠️ הנימוק המדוד:
 *  המיכל ישב באחת מהן **בתוך מסך אחד מתוך שבעה** ⛔ ונמחק יחד איתו,
 *  ⭐ ו-`openModal` יצאה ב-`return` בלי שגיאה ובלי הודעה: ⛔ הכפתור «לא
 *  עשה כלום», ⚠️ ושלושה סבבים חיפשו בדלגציה ובמטפל. ⛔ ו-`locked` מוסרת
 *  גם במסלול הכשל — ⚠️ מחלקה ששרדה פתיחה קודמת חוסמת את גלילת הדף,
 *  ⭐ והמשתמש קורא לזה «המסך איטי» ⛔ ולא «המודאל תקוע». */
function uiNoDialog(where, id) {
  try { console.error('[ui] ' + where + ': #' + id + ' אינו ב-DOM'); } catch (e) {}
  try { document.body.classList.remove('locked'); } catch (e) {}
  try { toast('שגיאה: הדיאלוג אינו זמין (#' + id + ')', null, 'bad'); } catch (e) {}
}
function openModal(title, body, foot) {
  var m = document.getElementById('modal');
  var ttl = document.getElementById('modal-title');
  var bd = document.getElementById('modal-body');
  var ft = document.getElementById('modal-foot');
  if (!m || !ttl || !bd || !ft) { uiNoDialog('openModal', 'modal'); return; }
  ttl.textContent = title || '';
  bd.innerHTML = body || '';
  ft.innerHTML = foot || '';
  m.classList.add('open');
  document.body.classList.add('locked');
}
function closeModal() {
  var m = document.getElementById('modal');
  if (!m) { uiNoDialog('closeModal', 'modal'); return; }
  m.classList.remove('open');
  var bd = document.getElementById('modal-body');
  var ft = document.getElementById('modal-foot');
  if (bd) bd.innerHTML = '';
  if (ft) ft.innerHTML = '';
  var a = document.getElementById('ask');
  if (!a || !a.classList.contains('open')) document.body.classList.remove('locked');
}
var askResolve = null;
/*  ⛔ דיאלוג אישור שמיכלו חסר נענה **«לא»** — ⚠️ הבטחה שלא נפתרת משאירה
 *  את הקורא תלוי לנצח, ⭐ ו-`true` היה מבצע את הפעולה ההרסנית בלי שאיש
 *  אישר: ⛔ נכשל-סגור, ⛔ ובקול. */
function ask(title, text, yesLabel) {
  var a = document.getElementById('ask');
  var ttl = document.getElementById('ask-title');
  var bd = document.getElementById('ask-body');
  var yes = document.getElementById('ask-yes');
  if (!a || !ttl || !bd || !yes) { uiNoDialog('ask', 'ask'); return Promise.resolve(false); }
  ttl.textContent = title || '';
  bd.textContent = text || '';
  yes.textContent = yesLabel || 'אישור';
  a.classList.add('open');
  document.body.classList.add('locked');
  return new Promise(function (res) { askResolve = res; });
}
function closeAsk(v) {
  var a = document.getElementById('ask');
  if (!a) uiNoDialog('closeAsk', 'ask');
  else a.classList.remove('open');
  var m = document.getElementById('modal');
  if (!m || !m.classList.contains('open')) document.body.classList.remove('locked');
  if (askResolve) { askResolve(v); askResolve = null; }
}
/*  ⛔ `div` לכל הודעה, ⛔ ולא אלמנט קבוע אחד — ⚠️ הנימוק המדוד: בשלוש
 *  מהן הטוסט היה אלמנט יחיד, ⭐ והודעה שנייה דרסה את הראשונה: ⛔ «נשמר»
 *  ו«שגיאת רשת» ברצף השאירו על המסך אחת בלבד, ⚠️ ומי שקרא את המסך לא ידע
 *  שהייתה שנייה. ⛔ `kind` הוא שם מחלקה ⛔ ולא משך — ⚠️ ומי שאין לו ערך
 *  מוסר `null`; ⭐ והמשך יושב ב-`TOAST_DEFAULT_MS`, ⛔ הערך היחיד שנבדל. */
function toast(msg, dur, kind) {
  // ⛔ אין טוסט הצלחה אחרי כישלון שמירה מקומית. אין להסיר.
  if (typeof lsGuardToast === 'function' && !lsGuardToast(msg)) return;
  var box = document.getElementById('toasts');
  /*  ⛔ מיכל הטוסטים חסר ⟵ קונסולה, ⛔ ולא שתיקה — ⚠️ זהו משפך ההודעות
   *  היחיד, ⭐ ובלעדיו **כל** הודעה שהאפליקציה מנסה להציג נעלמת: ⛔ דיווח
   *  דרך טוסט היה חוזר לכאן, ⚠️ ולכן הוא בקונסולה בלבד. */
  if (!box) { try { console.error('[ui] toast: #toasts אינו ב-DOM — ' + msg); } catch (e) {} return; }
  var el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(function () {
    el.style.transition = 'opacity var(--dur-4)'; el.style.opacity = '0';
    setTimeout(function () { el.remove(); }, 260);
  }, dur || app.TOAST_DEFAULT_MS);
}
/*  ⛔ משך הודעת האחסון ⛔ ואינו ברירת המחדל של הטוסט — ⚠️ היא מדווחת על
   כשל כתיבה, ⭐ והקורא חייב זמן לקרוא אותה. */
var LS_TOAST_MS = 5000;
function lsToast(msg, dur, kind) { try { toast(msg, dur || LS_TOAST_MS, kind); } catch (e) {} }
/*  ⛔ סגירת המודאל היא שני מסלולים שנקראים מהמאזין האחד — ⚠️ לחיצה על
 *  הרקע ו-`Escape`: ⭐ המנגנון זהה בכולן, ⛔ ומאזין נפרד לכל אחד היה
 *  מפזר את הסגירה על פני שלושה מקומות. */
function modalBackdrop(e) {
  if (!e.target) return false;
  if (e.target.id === 'modal') { closeModal(); return true; }
  if (e.target.id === 'ask') { closeAsk(false); return true; }
  return false;
}
function modalEsc(e) {
  if (e.key !== 'Escape') return false;
  var a = document.getElementById('ask'), m = document.getElementById('modal');
  if (a && a.classList.contains('open')) { closeAsk(false); return true; }
  if (m && m.classList.contains('open')) { closeModal(); return true; }
  return false;
}
/* ═══════════════ סוף מודול שכבת המודאל ═════════════════════════════════ */

/* ═══ Enter שומר בשדה עריכה — מודול משותף ═══════════════════════════════
   ⛔ שדה שנשמר בכפתור נשמר גם ב-`Enter` — ⚠️ **וההיקף הוא הטופס** (`.ksave`)
      ⛔ ולא השדה: ⭐ שדה שנוסף לטופס קיים מקבל את המקש בלי שאיש ייגע בו,
      ⚠️ ומטפל פר-שדה נשכח בשדה הבא שנוסף.
   ⛔ והכפתור מסומן — ⚠️ `data-ksave` לשמירה ו-`data-kesc` לביטול: ⭐ בטופס
      יושב יותר מכפתור אחד, ⛔ ובחירה לפי סדר הייתה מפעילה את הראשון.
   ⛔ והניתוב הוא **מפת הפעולות** — ⚠️ הכפתור נמצא בתוך ההיקף והפעולה שלו
      מופעלת: ⭐ מסלול שמירה שני מתיישן ברגע שהראשון משתנה.
   ⛔ ו-`textarea` אינו נכנס — ⚠️ `Enter` בו הוא שורה חדשה.
   ═══════════════════════════════════════════════════════════════════════ */
function ksFire(scope, attr) {
  var b = scope.querySelector('[' + attr + ']');
  if (!b || b.disabled) return false;
  var act = b.getAttribute('data-act');
  var fn = app.DOM_ACTIONS[act];
  if (!fn) { console.error('[ks] כפתור ' + attr + ' בלי פעולה במפה: ' + act); return false; }
  fn(b);
  return true;
}
/*  ⛔ המודול אינו רושם מאזין משלו — ⚠️ הוא נקרא מהמאזין האחד שבאפליקציה:
 *  ⭐ שני מאזינים לאותו אירוע הם שני מקומות שבהם מקש נתפס, ⛔ וסדר
 *  ההרצה ביניהם אינו מוצהר. */
function ksKey(e) {
  if (e.key !== 'Enter' && e.key !== 'Escape') return false;
  var t = e.target;
  if (!t || t.tagName !== 'INPUT' || !t.closest) return false;
  var scope = t.closest('.ksave');
  if (!scope) return false;
  if (!ksFire(scope, e.key === 'Enter' ? 'data-ksave' : 'data-kesc')) return false;
  e.preventDefault();
  return true;
}
/* ═══════════════ סוף מודול Enter שומר בשדה עריכה ════════════════════════ */

/*  ⛔ הייצוא בשם ⛔ ואינו `default` — ⚠️ קורא שמייבא שם שנעלם נשבר בטעינה,
 *  ⭐ ו-`default` היה נבלע בשקט. */
export { actRun, ask, busy, closeAsk, closeModal, esc, ksKey, lsToast,
         modalBackdrop, modalEsc, openModal, swApply, swHideUpdate,
         swRegister, toast, uiNoDialog };
