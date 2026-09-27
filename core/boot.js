// core/boot.js — שומר העלייה
(function () {
  var BOOT_TIMEOUT_MS = 20000;
  var MSG_BOOT_STUCK = 'האפליקציה לא עלתה';
  var MSG_BOOT_RELOAD = 'רענון';
  var done = false, failed = false;

  function paint() {
    var o = document.createElement('div');
    o.id = 'boot-fail';
    o.setAttribute('role', 'alertdialog');
    o.setAttribute('aria-labelledby', 'boot-fail-msg');
    // הצבעים מהתצורה נכתבים למשתני CSS — הגיליון בוחר ביניהם לפי הערכה, ואין כאן סגנון מוטבע.
    var off = (self.APP && self.APP.offline) || {};
    var set = function (k, v) { if (v) o.style.setProperty(k, v); };
    if (off.light) { set('--boot-bg', off.light.bg); set('--boot-ink', off.light.ink); }
    if (off.dark) { set('--boot-bg-dark', off.dark.bg); set('--boot-ink-dark', off.dark.ink); }
    var box = document.createElement('div');
    box.className = 'boot-fail-box';
    var msg = document.createElement('p');
    msg.id = 'boot-fail-msg';
    msg.className = 'boot-fail-msg';
    msg.textContent = MSG_BOOT_STUCK;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'boot-fail-btn';
    btn.setAttribute('data-act', 'boot-reload');
    btn.textContent = MSG_BOOT_RELOAD;
    // מאזין על הכפתור עצמו ולא בהאצלה — מטפל הלחיצות של הדף הוא קוד הדף, ובדיוק הוא שלא עלה.
    btn.addEventListener('click', function () { location.reload(); });
    box.appendChild(msg);
    box.appendChild(btn);
    o.appendChild(box);
    document.body.appendChild(o);
    btn.focus();
  }

  function fail(why) {
    if (done || failed) return;
    failed = true;
    clearTimeout(timer);
    console.error('[boot] העלייה נכשלה —', why);
    if (document.body) paint();
    else document.addEventListener('DOMContentLoaded', paint);
  }

  // רק מה שעוצר את קוד הדף: שגיאת ריצה, סקריפט של הדף או מודול שנכשל — לא ספרייה מ-CDN ולא תמונה.
  // מאזין בשלב הלכידה — שגיאת טעינה של משאב אינה מבעבעת.
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'SCRIPT') {
      if (!t.src || new URL(t.src, location.href).origin === location.origin) fail('טעינת ' + (t.src || 'מודול הדף'));
    } else if (e.message) fail(e.message);
  }, true);

  var timer = setTimeout(function () { fail('לא הודיע תוך ' + BOOT_TIMEOUT_MS + 'ms'); }, BOOT_TIMEOUT_MS);

  window.bootOk = function () {
    if (failed) return;
    done = true;
    clearTimeout(timer);
  };
})();
