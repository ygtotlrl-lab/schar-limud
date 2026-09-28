// core/ui.js — שכבת התצוגה המשותפת

import { MSG_SW_TIMEOUT, app } from './util.js';
import { lsGet, lsGuardToast, lsSet } from './storage.js';

// ── כפתור עסוק ──
// ההשבתה בנקודת הניתוב ולא באתר הקריאה — מטפל שמחזיר הבטחה מסמן המתנה; מטפל סינכרוני נגמר לפני שלחיצה שנייה נוחתת.
// התווית היא פרמטר — יש פעולות רשת שאינן שמירה, ו«שומר…» עליהן מתאר פעולה שאינה מתרחשת.
function busy(btn, on, label) {
  if (!btn) return;
  if (on) {
    if (btn._busyTxt === undefined) btn._busyTxt = btn.innerHTML;
    btn.disabled = true; btn.classList.add('is-busy');
    btn.innerHTML = label || '⏳ שומר…';
  } else {
    btn.disabled = false; btn.classList.remove('is-busy');
    if (btn._busyTxt !== undefined) { btn.innerHTML = btn._busyTxt; btn._busyTxt = undefined; }
  }
}
// הדגל נדרש גם לאלמנט שאינו כפתור — disabled אינו קיים על div או על שורת טבלה.
function actRun(el, fn) {
  if (el._actBusy) return;
  var out;
  try { out = fn(el); }
  catch (e) { console.error('[act] ' + el.getAttribute('data-act'), e); return; }
  if (!out || typeof out.then !== 'function') return;
  el._actBusy = true;
  var isBtn = el.tagName === 'BUTTON';
  // התווית מ-data-busy — פעולה שבודקת אינה «שומרת».
  if (isBtn) busy(el, true, el.getAttribute('data-busy') || '⏳ שומר…');
  out.then(function () { }, function (e) {
    console.error('[act] ' + el.getAttribute('data-act'), e);
  }).then(function () {
    el._actBusy = false;
    if (isBtn) busy(el, false);
  });
}

// מסך שמשתמש במסגרת חושף אותה יחד עם הציור שלו, ולא לפניו.
function shellBare(on) {
  var v = document.getElementById('view');
  if (!v || !v.parentElement) { console.error('[ui] אין מיכל תוכן — #view'); return; }
  v.parentElement.classList.toggle('is-bare', !!on);
}

// ── הרשמת service worker ──
// updateViaCache: 'none' — ברירת המחדל מתירה לדפדפן להשוות את sw.js מול עותק ישן שלו במטמון ה-HTTP.
// ההשתלטות הראשונה אינה עדכון — claim() של העובד הראשון יורה controllerchange על דף שכבר מריץ את החדש; ערך קצר ל-SW_APPLY_MS יורה לפני ההשתלטות ויגרום לרענון שני.
var SW_APPLY_MS = 10000;
// _swTaken — העובד החדש כבר שולט והבאנר מוצג במקום רענון: אין עובד ממתין, והלחיצה היא רענון ולא SKIP_WAITING.
var _swReg = null, _swAccepted = false, _swReloaded = false, _swWait = 0, _swTaken = false;
function swBanner() { return document.getElementById('updater'); }
// בזמן התקנה יש שני שמות מטמון, הישן והחדש — ולכן הסימן נושא את שניהם ומשתנה בדיוק כשגרסה נוספת או יורדת.
function swVer() {
  if (typeof caches === 'undefined') return Promise.resolve('');
  return caches.keys().then(function (ks) {
    return ks.filter(function (n) { return n.indexOf(app.LS_CFG.cachePrefix) === 0; }).sort().join('|');
  }).catch(function () { return ''; });
}
// הגובה נמדד מהבאנר ואינו מוקלד — נוסח ארוך נשבר לשתי שורות.
function swToastsLift(h) {
  var t = document.getElementById('toasts');
  if (t) t.style.setProperty('--toasts-lift', h ? 'calc(' + h + 'px + var(--sp-4))' : '0px');
}
function swBannerHide() { var el = swBanner(); if (el) el.classList.remove('show'); swToastsLift(0); }
// סימן הדחייה מתמיד ונושא את הגרסה שנדחתה — סימן בזיכרון מתאפס בטעינה, ועובד ממתין ששרד היה מציג את הבאנר בכל טעינה.
function swShowUpdate() {
  var el = swBanner();
  if (!el) { console.error('[sw] אין מיכל לבאנר העדכון — #updater'); return; }
  swVer().then(function (v) {
    if (v && v === lsGet(app.LS_CFG.dismissKey, '')) return;
    el.classList.add('show');
    swToastsLift(el.offsetHeight);
  });
}
function swHideUpdate() {
  swBannerHide();
  swVer().then(function (v) { if (v) lsSet(app.LS_CFG.dismissKey, v); });
}
// הרענון שאחרי SKIP_WAITING הוא ב-controllerchange — טיימר שמרענן בעצמו יורה לפני ההשתלטות, ו-reg.waiting שורד.
// בלי עובד שולט ובלי עובד ממתין העובד בדרך להשתלטות, והלחיצה ממתינה לה ולא מודיעה «אין גרסה».
function swApply(btn) {
  _swAccepted = true;
  busy(btn, true, 'מעדכן…');
  if (_swTaken) { _swReloaded = true; location.reload(); return; }
  if (_swReg && _swReg.waiting) _swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
  _swWait = setTimeout(function () { swApplyFail(btn, MSG_SW_TIMEOUT); }, SW_APPLY_MS);
}
// עובד ממתין ששרד את הלחיצה הוא כשל — הבאנר יורד והכשל נאמר, ולא מזמין לחיצה נוספת.
function swApplyFail(btn, msg) {
  _swWait = 0;
  if (_swReloaded) return;
  busy(btn, false);
  swBannerHide();
  toast(msg, 6000, 'bad');
}
function swRegister() {
  if (!('serviceWorker' in navigator)) return;
  // המגע הראשון מבטל את הרענון האוטומטי שבהשתלטות — רענון באמצע עבודה מאבד את מה שהוקלד.
  var touched = false;
  ['pointerdown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { touched = true; }, { once: true, capture: true });
  });
  var hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (_swWait) { clearTimeout(_swWait); _swWait = 0; }
    if (_swReloaded || !hadController) return;
    if (!_swAccepted && touched) { _swTaken = true; swShowUpdate(); return; }
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
    // הבאנר יורד כשהעובד מפסיק להמתין — ולא כשהעובד החדש כבר שולט, שם הדף עדיין מריץ את הישן והלחיצה היא הרענון.
    function checkForUpdate() {
      try {
        reg.update().then(function () { if (!reg.waiting && !_swTaken) swBannerHide(); })
           .catch(function () {});
      } catch (e) {}
    }
    checkForUpdate();
    setInterval(checkForUpdate, 30 * 60 * 1000);
  }).catch(function (err) { console.warn('[sw] registration failed:', err); });
}
window.addEventListener('load', swRegister);

// ── שכבת המודאל ──
// הכותרת ב-textContent ולא ב-HTML — היא מגיעה גם משם שהמשתמש הקליד.
// הסרת locked מותנית בכך שהדיאלוג השני סגור — אחרת סגירת אחד משחררת את גלילת השני.
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
// מיכל שאינו ב-DOM מדווח ולא יוצא בשקט — מיכל שיושב בתוך מסך נמחק איתו, ו-return שקט נראה כ«הכפתור לא עשה כלום».
// locked מוסרת גם במסלול הכשל — מחלקה ששרדה חוסמת את גלילת הדף.
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
// מיכל חסר נענה «לא» — הבטחה שלא נפתרת תולה את הקורא, ו-true היה מבצע פעולה הרסנית בלי אישור.
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
// kind הוא שם מחלקה ולא משך — מי שאין לו ערך מוסר null; המשך ב-TOAST_DEFAULT_MS.
function toast(msg, dur, kind) {
  // אין טוסט הצלחה אחרי כישלון שמירה מקומית — אין להסיר.
  if (typeof lsGuardToast === 'function' && !lsGuardToast(msg)) return;
  var box = document.getElementById('toasts');
  // קונסולה בלבד — זה משפך ההודעות היחיד, ודיווח דרך טוסט היה חוזר לכאן.
  if (!box) { try { console.error('[ui] toast: #toasts אינו ב-DOM — ' + msg); } catch (e) {} return; }
  var el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(function () {
    el.classList.add('out');
    setTimeout(function () { el.remove(); }, 260);
  }, dur || app.TOAST_DEFAULT_MS);
}
// ארוך מברירת המחדל — הודעה על כשל כתיבה, והקורא חייב זמן לקרוא אותה.
var LS_TOAST_MS = 5000;
function lsToast(msg, dur, kind) { try { toast(msg, dur || LS_TOAST_MS, kind); } catch (e) {} }
// לחיצה על הרקע ו-Escape נקראים מהמאזין האחד — מאזין נפרד לכל אחד היה מפזר את הסגירה.
function modalBackdrop(e) {
  if (!e.target) return false;
  var v = e.target.getAttribute ? e.target.getAttribute('data-veil') : null;
  if (v === 'modal') { closeModal(); return true; }
  if (v === 'ask') { closeAsk(false); return true; }
  return false;
}
function modalEsc(e) {
  if (e.key !== 'Escape') return false;
  var a = document.getElementById('ask'), m = document.getElementById('modal');
  if (a && a.classList.contains('open')) { closeAsk(false); return true; }
  if (m && m.classList.contains('open')) { closeModal(); return true; }
  return false;
}

// ── ציור שאחרי משיכה ──
// ציור ממשיכה נדחה כשיש קלט פתוח ורץ פעם אחת כשנסגר; ציור שהמשתמש גרם לו אינו עובר כאן — דחייתו נראית כלחיצה שלא עשתה דבר.
// הבדיקה במרווח ולא במאזין — אין אירוע אחד ל«הקלט נסגר»: יציאה ממיקוד, ביטול עריכה וסגירת דיאלוג.
var PULL_WAIT_MS = 400;
var _pullQ = [], _pullT = 0;
var PULL_FIELD = 'input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable="true"]';
// שדה מוסתר אינו קלט פתוח — מיקוד נשאר לעיתים על שדה במסך שירד, והציור היה נדחה לנצח.
function inputOpen() {
  var a = document.activeElement;
  if (a && a.matches && a.matches(PULL_FIELD) && a.getClientRects().length) return true;
  // עריכה בשורה נספרת גם כשהלשונית שלה מוסתרת — ההקלדה מחכה לחזרה, וציור היה מוחק אותה.
  if (document.querySelector('[data-editing]')) return true;
  return !!document.querySelector('#modal.open,#ask.open');
}
function pullRender(fn) {
  if (_pullQ.indexOf(fn) < 0) _pullQ.push(fn);
  pullFlush();
}
function pullFlush() {
  clearTimeout(_pullT); _pullT = 0;
  if (!_pullQ.length) return;
  if (inputOpen()) { _pullT = setTimeout(pullFlush, PULL_WAIT_MS); return; }
  var q = _pullQ; _pullQ = [];
  q.forEach(function (f) { try { f(); } catch (e) { console.error('[pull] ציור אחרי משיכה נכשל', e); } });
}

// ── Enter שומר בשדה עריכה ──
// ההיקף הוא הטופס ולא השדה — שדה שנוסף לטופס מקבל את המקש בלי שאיש ייגע בו.
// textarea אינו נכנס — Enter בו הוא שורה חדשה.
function ksFire(scope, attr) {
  var b = scope.querySelector('[' + attr + ']');
  if (!b || b.disabled) return false;
  var act = b.getAttribute('data-act');
  var fn = app.DOM_ACTIONS[act];
  if (!fn) { console.error('[ks] כפתור ' + attr + ' בלי פעולה במפה: ' + act); return false; }
  fn(b);
  return true;
}
// Escape מחזיר את הערך השמור לפני השחרור — השמירה ביציאה רואה ערך שלא השתנה ואינה כותבת.
function kentKey(e, t) {
  if (!t.hasAttribute('data-kent')) return false;
  if (e.key === 'Escape') t.value = t.defaultValue;
  t.blur();
  e.preventDefault();
  return true;
}
// נקרא מהמאזין האחד שבאפליקציה ואינו רושם משלו — סדר ההרצה בין שני מאזינים אינו מוצהר.
function ksKey(e) {
  if (e.key !== 'Enter' && e.key !== 'Escape') return false;
  var t = e.target;
  if (!t || t.tagName !== 'INPUT' || !t.closest) return false;
  var scope = t.closest('[data-ks]');
  if (!scope) return kentKey(e, t);
  if (!ksFire(scope, e.key === 'Enter' ? 'data-ksave' : 'data-kesc')) return false;
  e.preventDefault();
  return true;
}

// ייצוא בשם ולא default — שם שנעלם נשבר בטעינה, ו-default היה נבלע בשקט.
export { actRun, ask, busy, closeAsk, closeModal, esc, ksKey, lsToast,
         modalBackdrop, modalEsc, openModal, pullRender, shellBare, swApply,
         swHideUpdate, swShowUpdate, toast, uiNoDialog };
